const Acl = require('acl-fork')
const Redis = require('redis')
const config = require('config')
const redis_config = config.get('redis')
const redisClient = Redis.createClient(redis_config);
redisClient.select(2, function() {})
const acl = new Acl(new Acl.redisBackend(redisClient, 'acl'))
module.exports = acl