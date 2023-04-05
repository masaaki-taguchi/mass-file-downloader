# mass-file-downloader
<p align="center">
  <img src="https://img.shields.io/badge/Salesforce-00a1e0.svg">
  <img src="https://img.shields.io/badge/JavaScript-yellow.svg?logo=JavaScript&logoColor=white">
  <img src="https://img.shields.io/badge/NodeJS-339933.svg?logo=Node.js&logoColor=white">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg">
</p>

[Japanese](./README-ja.md)  

This tool downloads attached files associated with Salesforce records in bulk.

# Installation
### Install Node.js
Download and install Node.js from https://nodejs.org/ja/download/.

### Deploy the tool
Place the following files in any directory:
* mass-file-downloader.js
* user_config.yaml
* package.json
* package-lock.json

### Installing libraries
Run the following command to install the required libraries for execution:
```
$ npm ci
```

# Editing configuration file
Edit user_config.yaml to set the Salesforce organization information to connect to, the download destination path, and the target object.
You can also specify the start and end dates for extracting records in the configuration file.
```
# Salesforce connection information
hostName: "(DOMAIN NAME).my.salesforce.com"
apiVersion : "57.0"
userName: "(LOGIN USER NAME)"
password: "(LOGIN PASSWORD)"

# Download path
downloadPath: "download"

# Target object
object: "Opportunity"

# Extraction date
#startDate: "2021-01-01"
#endDate: "2021-09-30"
```


# Usage
The following options are available when executing:
```
usage: mass-file-downloader.js [-options]
    -h              output usage information
    -c <pathname>   specifies a config file path (default is ./user_config.yaml)
    -o <objectname> specifies object name
    -s <startdate>  specifies start GMT date criteria (format is yyyy-MM-dd)
    -e <enddate>    specifies end GMT date criteria (format is yyyy-MM-dd)
```
During execution, the names of the records that were targeted and the names of the attached files will be output to the screen.
Also, the attached files are saved in the directory "ObjectName/Name(Salesforce Id)" created in the destination path specified in the configuration file.

### Execution (no options specified)
If executed without any options, the tool will use the default user_config.yaml configuration file.
```
$ node mass-file-downloader.js
```
### Execution (specifying object name)
You can specify an object name with the -o option (this takes precedence over the configuration file).
```
$ node mass-file-downloader.js -o Account
```
### Execution (specifying extraction date)
You can specify the creation date of the records to extract using the -s or -e options (this takes precedence over the configuration file).
```
$ node mass-file-downloader.js -s 2021-01-01 -e 2021-09-30
```

# Notes
* Consumes more than twice the number of API requests as the number of records.
