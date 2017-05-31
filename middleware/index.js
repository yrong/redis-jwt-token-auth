'use strict';

const compose = require('koa-compose');
const checkauth =require('./checkauth');
const jwt_token = require('./token');
const Redis = require('ioredis');
const config = require('config')

module.exports = function middleware() {
    const redis_config = config.get('redis')
    const redis = new Redis(redis_config.port, redis_config.host, {dropBufferSupport: true,enableOfflineQueue:false});
    return compose(
        [
            jwt_token({
                client: redis,
                secret: config.get('secret')
            })
        ]
    )
}