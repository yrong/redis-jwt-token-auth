'use strict';

const jwt_token = require('./token');
const Redis = require('redis');
const config = require('config')
require('./passport')
const passport = require('koa-passport')

module.exports = function middleware() {
    const redisOption = {host:`${process.env['REDIS_HOST']||config.get('redis.host')}`,port:config.get('redis.port')}
    const redis_client = Redis.createClient(Object.assign({db:0},redisOption))
    return [
        passport.initialize(),
        passport.session(),
        jwt_token({
            client: redis_client,
            secret: config.get('secret')
        }),
    ]
}