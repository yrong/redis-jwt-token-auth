redis-jwt-token-auth
===============================

### Features

+ local authentication/ldap authentication/ldap account binding
+ role and resource based access control support(rbac)
+ user/role/department provisioning api(register,add-role,bind-role,bind-ldap,login,logout,destroy)
+ provide search interface provided by elasticsearch
+ generate jwt token when login/provide token check interface to integrate with other apps
+ sync.js script for user synchronization with [nextcloud-token-auth](https://github.com/yrong/nextcloud-token-auth) which is integrated with this project and customized from [nextcloud](https://github.com/nextcloud/server)
+ webpack wrapper


### Interfaces

#### Restful Apis

import test/auth.postman_collection.json into postman


#### Sync local user to nextcloud

```
SYNC_TYPE=nextcloud node sync.js
```

### Usage

#### configuration

```
git clone https://github.com/yrong/config ../config
ln -s ../config .
```
then config db servers as required,e.g:

```
  ...
  "neo4j": {
    "host": "localhost",
    "port": 7687,
    "user": "neo4j",
    "password": "admin"
  },
  "elasticsearch":{
  	"host": "localhost",
  	"port": 9200,
  	"user":"elastic",
  	"password":"elastic",
  	"mode": "strict"
  },
  "redis": {
    "host": "localhost",
    "port": 6379
  },
  "ldap":{
    "url": "ldap://localhost:389",
    "bindType":"dn",
    "bindDn": "cn=admin,dc=test,dc=com",
    "bindCredentials": "admin",
    "searchFilter": "(cn={{username}})",
    "userSearchBase": "ou=users,dc=test,dc=com",
    "departmentSearchBase": "dc=test,dc=com",
    "userClass": "posixAccount",
    "userAttributes":["dn","cn","uidNumber"],
    "departmentClass":"posixGroup",
    "departmentAttributes":["dn","cn","gidNumber"],
    "reconnect": true
  },
  "nextcloud":{
    "host":"http://localhost:8089/FileStore",
    "adminuser":"admin",
    "password":"admin",
    "group":"share",
    "permissions": 1,//1 = read; 2 = update; 4 = create; 8 = delete; 16 = share; 31 = all
    "publicUpload": true //allow public upload or not
  },
  ...
```

#### start server

```
yarn install

//set envirionment variables required
set -a;source ../config/.env;source .env;set +a

//init schema required when first time started
npm run init

//start server
scirichon-crud-api

```

#### test

```
//run postman testcases with newman
node ../config/config/test/index.js
```


### License

MIT

