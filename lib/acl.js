'use strict';

const Redis = require('redis')
const config = require('config')
const Acl = require('acl-fork')

const redisOption = {host:`${process.env['REDIS_HOST']||config.get('redis.host')}`,port:config.get('redis.port')}
const redisClient = Redis.createClient(Object.assign({db:2},redisOption))
const acl = new Acl(new Acl.redisBackend(redisClient, 'acl'))

module.exports = acl