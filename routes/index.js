'use strict';

const compose = require('koa-compose')
const Router = require('koa-router')
const RouterAuth = require('./auth')
const router = new Router()
const Account = require('../models/account')
const Role = require('../models/role')
const Department = require('../models/department')
const scirichon_cache = require('scirichon-cache')
const search = require('scirichon-search')

router.use('/auth', RouterAuth.routes(), RouterAuth.allowedMethods())
router.post('/auth/hidden/clean', async(ctx, next) => {
    await Account.destoryAll()
    await Role.clearAll()
    await Department.destroyAll()
    await scirichon_cache.flushAll()
    await search.deleteAll()
    ctx.body = {}
})

module.exports = function routes() {
    return compose(
        [
            router.routes(),
            router.allowedMethods()
        ]
    )
}
