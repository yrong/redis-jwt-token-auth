redis-jwt-token-auth
===============================

features including:

+ Koa2 integrated with mysql and neo4j
+ generate jwt token stored in Redis as koa2 middleware
+ local authentication by neo4j
+ ldap authentication
+ ldap account binding with local account
+ user provisioning api(register,login,logout,destroy)
+ sync user with [nextcloud-token-auth](https://github.com/yrong/nextcloud-token-auth) and add public share folder 
+ webpack wrapper


### Usage

1. webpack build

```
webpack&&cd build
```

2. sync user from mysql to neo4j

```
SYNC_TYPE=mysql node sync.js
```

3. sync user from neo4j to nextcloud

```
SYNC_TYPE=nextcloud node sync.js
```

4. start server

```
node server.js
```

4. running postman test cases

```
node ../test/index.js
```

including:

* generate token when login
* check token if valid
* destroy token when logout

### License

MIT

