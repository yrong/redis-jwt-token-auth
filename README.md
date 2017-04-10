koa2-jwt-token-session
====

features including:

+ Koa2 integrated with mysql and neo4j
+ generate jwt token stored in Redis as koa2 middleware
+ webpack wrapper


### Usage

sync user from mysql to neo4j

```
node sync.js
```

usage by running postman test cases

```
node ./test/index.js
```

including:

* generate token when login
* check token if valid
* destroy token when logout

### License

MIT


 