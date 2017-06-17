'use strict';

const compose = require('koa-compose');
const checkauth =require('./checkauth');
const jwt_token = require('./token');
const Redis = require('redis');
const config = require('config')

module.exports = function middleware() {
    const redis_config = config.get('redis')
    const redis_client = Redis.createClient(redis_config);
    return compose(
        [
            jwt_token({
                client: redis_client,
                secret: config.get('secret')
            })
        ]
    )
}