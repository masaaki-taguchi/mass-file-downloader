'use strict';

const jsforce = require('jsforce');
const fs = require('fs');
const https = require('https');

const DEFAULT_USER_CONFIG_PATH = './user_config.yaml';
const COMMAND_OPTION_HELP = '-h'
const COMMAND_OPTION_CONFIG = '-c'
const COMMAND_OPTION_OBJECT = '-o'
const COMMAND_OPTION_START_DATE = '-s'
const COMMAND_OPTION_END_DATE = '-e'

let userConfigPath = DEFAULT_USER_CONFIG_PATH;
let objectName = undefined;
let startDate = undefined;
let endDate = undefined;
let paramList = [];
let paramCnt = 0;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === COMMAND_OPTION_CONFIG) {
    if (i + 1 >= process.argv.length) {
      usage();
    }
    userConfigPath = process.argv[i + 1];
  } else if (process.argv[i] === COMMAND_OPTION_HELP) {
    usage();
  } else if (process.argv[i] === COMMAND_OPTION_OBJECT) {
    objectName = process.argv[i + 1];
  } else if (process.argv[i] === COMMAND_OPTION_START_DATE) {
    startDate = process.argv[i + 1];
    if (!/^\d{4}-\d{2}-\d{2}$/.exec(startDate)) usage();
  } else if (process.argv[i] === COMMAND_OPTION_END_DATE) {
    endDate = process.argv[i + 1];
    if (!/^\d{4}-\d{2}-\d{2}$/.exec(endDate)) usage();
  } else {
    paramList.push(process.argv[i]);
  }
}

loadUserConfig(userConfigPath);

let userConfig = global.userConfig;
let loginUrl = 'https://' + userConfig.hostName;
let conn = new jsforce.Connection({ loginUrl: loginUrl, version: userConfig.apiVersion });

(async () => {
  console.log('LoginUrl: ' + loginUrl + ' ApiVersion:' + userConfig.apiVersion + ' UserName: ' + userConfig.userName);
  await conn.login(userConfig.userName, userConfig.password, function (err, userInfo) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  });

  if (!objectName) {
    objectName = userConfig.object;
  }
  console.log('TargetObjectName: ' + objectName);

  if (!startDate && userConfig.startDate) {
    startDate = userConfig.startDate;
  }
  if (!endDate && userConfig.endDate) {
    endDate = userConfig.endDate;
  }

  let criteria = '';
  if (startDate || endDate) {
    criteria = ' WHERE ';
    if (startDate) {
      console.log('StartDate: ' + startDate);
      criteria += 'CreatedDate >= ' + startDate + 'T00:00:00Z';
    }
    if (endDate) {
      console.log('EndDate: ' + endDate);
      if (startDate) criteria += ' AND ';
      criteria += 'CreatedDate <= ' + endDate + 'T23:59:59Z';
    }
  }

  console.log('');
  let maxFetch = 0;
  await conn.query('SELECT Count(Id) FROM ' + objectName + criteria, function (err, result) {
    if (err) { return console.error(err); }
    maxFetch = result.records[0].expr0;
  });
  if (maxFetch === 0) {
    console.log('Target records is nothing')
    process.exit(0);
  }

  console.log('Executing query...');
  let recordList = [];
  var query = await conn.query('SELECT Id, Name FROM ' + objectName + criteria + ' ORDER BY Name')
    .on('record', function (record) {
      recordList.push(record);
    })
    .on('end', function () {
      downloadFile({ objectName: objectName, query: query, recordList: recordList });
    })
    .on('error', function (err) { console.error(err); })
    .run({ autoFetch: true, maxFetch: maxFetch });

})();

function downloadFile(result) {
  let recordCount = result.recordList.length;
  let currentCnt = 0;
  let progress = function () { return '[' + currentCnt + '/' + recordCount + '] ' };

  (async () => {
    for (let record of result.recordList) {
      currentCnt++;
      let contectDocumentLinkList = [];
      await conn.query('SELECT Id, LinkedEntityId, ContentDocument.LatestPublishedVersionId, ContentDocument.Title, ContentDocument.FileExtension ' +
        '  FROM ContentDocumentLink WHERE LinkedEntityId = \'' + record.Id + '\'')
        .on('record', function (record) { contectDocumentLinkList.push(record); })
        .on('error', function (err) { console.error(err); })
        .run({ autoFetch: true });

      if (contectDocumentLinkList.length === 0) {
        console.log(progress() + 'RecordName: ' + record.Name + ' Nothing files. ');
      }
      for (let cdlRecord of contectDocumentLinkList) {
        let downloadPath = userConfig.downloadPath + '/' + result.objectName + '/' + record.Name + '(' + record.Id + ')';
        if (!fs.existsSync(downloadPath)) {
          fs.mkdirSync(downloadPath, {
            recursive: true
          });
        }

        let urlPath = '/services/data/v' + userConfig.apiVersion + '/sobjects/ContentVersion/' + cdlRecord.ContentDocument.LatestPublishedVersionId + '/VersionData';
        let fileName = cdlRecord.ContentDocument.Title + '.' + cdlRecord.ContentDocument.FileExtension;
        await getFileBinary(userConfig.hostName, urlPath, conn.accessToken).then((fileContent) => {
          let filePath = '';
          let fileCnt = 0;
          let extendFileName = '';
          while (true) {
            if (fileCnt !== 0) {
              extendFileName = '.' + fileCnt;
            }
            filePath = downloadPath + '/' + fileName + extendFileName;
            if (!fs.existsSync(filePath)) {
              break;
            }
            fileCnt++;
          }
          if (extendFileName) {
            console.log(progress() + 'RecordName: ' + record.Name + ' FileName: ' + fileName + extendFileName + ' OrgFileName: ' + fileName);
          } else {
            console.log(progress() + 'RecordName: ' + record.Name + ' FileName: ' + fileName);
          }
          fs.writeFileSync(filePath, fileContent);
        })
      }
    }
  })();
}

async function getFileBinary(hostName, urlPath, accessToken) {
  const options = {
    hostname: hostName,
    port: 443,
    path: urlPath,
    method: 'GET',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Authorization': 'OAuth ' + accessToken
    }
  }

  return new Promise((resolve) => {
    https.get(options, (response) => {
      let chunks = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      response.on('end', () => {
        let body = Buffer.concat(chunks);
        resolve(body);
      });
    }).on('error', (err) => {
      console.error('Error: ' + err.message);
    });
  })
}

function loadYamlFile(filename) {
  const yaml = require('js-yaml');
  const yamlText = fs.readFileSync(filename, 'utf8')
  return yaml.load(yamlText);
}

function loadUserConfig(userConfigPath) {
  let userConfigPathWork = userConfigPath;
  if (userConfigPathWork === undefined) {
    userConfigPathWork = DEFAULT_USER_CONFIG_PATH;
  }
  const path = require('path');
  const config = loadYamlFile(path.join(__dirname, userConfigPathWork));
  global.userConfig = config;
}

function usage() {
  console.log('usage: mass-file-downloader.js [-options]');
  console.log('    -h              output usage information');
  console.log('    -c <pathname>   specifies a config file path (default is ./user_config.yaml)');
  console.log('    -o <objectname> specifies object name');
  console.log('    -s <startdate>  specifies start GMT date criteria (format is yyyy-MM-dd)');
  console.log('    -e <enddate>    specifies end GMT date criteria (format is yyyy-MM-dd)');
  process.exit(0);
}

