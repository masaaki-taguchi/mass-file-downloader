# mass-file-downloader
<p align="center">
  <img src="https://img.shields.io/badge/Salesforce-00a1e0.svg">
  <img src="https://img.shields.io/badge/JavaScript-yellow.svg?logo=JavaScript&logoColor=white">
  <img src="https://img.shields.io/badge/NodeJS-339933.svg?logo=Node.js&logoColor=white">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg">
</p>

[English](./README.md)  

Salesforceのレコードに紐付く添付ファイルを一括でダウンロードします。

# インストール
### Node.jsのインストール
https://nodejs.org/ja/download/ からNode.jsをダウンロードし、インストールします。

### ツールの配置
任意のディレクトリに以下のファイルを配置します。
* mass-file-downloader.js
* user_config.yaml
* package.json
* package-lock.json

### ライブラリのインストール
以下のコマンドを実行し、実行に必要なライブラリをインストールします。
```
$ npm ci
```

# 設定ファイルの編集
user_config.yamlを編集し、接続するSalesforceの組織情報、ダウンロード先のパス、対象のオブジェクトを設定します。
設定ファイル上でレコードを作成日を対象とした抽出開始日、終了日の指定も可能です。
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


# 使用方法
実行時のオプションは以下となります。
```
usage: mass-file-downloader.js [-options]
    -h              output usage information
    -c <pathname>   specifies a config file path (default is ./user_config.yaml)
    -o <objectname> specifies object name
    -s <startdate>  specifies start GMT date criteria (format is yyyy-MM-dd)
    -e <enddate>    specifies end GMT date criteria (format is yyyy-MM-dd)
```
実行時は対象となったレコードのNameと、添付ファイル名を画面に出力します。
また、添付ファイルは設定ファイルで指定したダウンロード先パス内に オブジェクト名/Name(Salesforce Id) のディレクトリを作成して保存します。

### 実行(オプション無し)
オプション無しで起動した場合、デフォルトのuser_config.yamlの設定ファイルを使用して起動します。
```
$ node mass-file-downloader.js
```
### 実行(オブジェクト名指定)
-oオプションを指定することで、オブジェクト名を指定できます。(設定ファイルよりも優先します)
```
$ node mass-file-downloader.js -o Account
```
### 実行(抽出日指定)
-s、または-eオプションを指定することで、抽出するレコードの作成日を指定できます。(設定ファイルよりも優先します)
```
$ node mass-file-downloader.js -s 2021-04-01 -e 2021-09-30
```

# 留意事項
* レコード数の2倍以上のAPI 要求数を消費します。
