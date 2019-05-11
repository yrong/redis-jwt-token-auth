'use strict';

const Redis = require('redis')
const config = require('config')
const Acl = require('acl-fork')

const redisOption = config.get('redis')
const redisClient = Redis.createClient(Object.assign({db:2},redisOption))
const acl = new Acl(new Acl.redisBackend(redisClient, 'acl'))

module.exports = acl
