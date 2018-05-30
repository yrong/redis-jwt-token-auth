'use strict';

const compose = require('koa-compose')
const Router = require('koa-router')
const authRoutes = require('./auth')
const router = new Router()
const scirichonCache = require('scirichon-cache')
const scirichonSearch = require('scirichon-search')
const userHandler = require('../handlers/user')
const departmentHandler = require('../handlers/department')
const roleHandler = require('../handlers/role')

/**
 * legacy routes
 */
router.post('/auth/hidden/clean', async(ctx, next) => {
    await departmentHandler.clear()
    await roleHandler.clear()
    await userHandler.clear()
    await scirichonCache.flushAll()
    await scirichonSearch.deleteAll('role,department,user')
    ctx.body = {}
})
router.use('/auth', authRoutes.routes(), authRoutes.allowedMethods())

/**
 * new routes
 */
const scirichonCrudHandler = require('scirichon-crud-handler')
const crudRoutes = scirichonCrudHandler.routes
const handlers = {'User':userHandler,'Department':departmentHandler,'Role':roleHandler}
scirichonCrudHandler.hooks.setHandlers(handlers)

const customizedRoutes = compose(
        [
            router.routes(),
            router.allowedMethods()
        ]
)


module.exports = {crudRoutes,customizedRoutes}
