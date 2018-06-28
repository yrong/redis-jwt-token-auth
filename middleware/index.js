'use strict';

const jwt_token = require('./token');
const Redis = require('redis');
const config = require('config')
require('./passport')
const compose = require('koa-compose')
const passport = require('koa-passport')
const session = require('koa-session')

module.exports = {
    load:(app)=>{
        const redisOption = {host:`${process.env['REDIS_HOST']||config.get('redis.host')}`,port:config.get('redis.port')}
        const redis_client = Redis.createClient(Object.assign({db:0},redisOption))
        const secret = config.get('auth.secret')
        app.use(compose([
            passport.initialize(),
            passport.session(),
            jwt_token({
                client: redis_client,
                secret: secret
            }),
        ]));
        app.keys = [secret]
        app.use(session({},app))
    }
}