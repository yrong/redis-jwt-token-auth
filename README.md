# redis-jwt-token-auth
===============================

features including:

+ Koa2 integrated with mysql and neo4j
+ generate jwt token stored in Redis as koa2 middleware
+ webpack wrapper


### Usage

1. webpack build

```
webpack&&cd build
```

2. sync user from mysql to neo4j

```
node sync.js
```

3. start server

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

