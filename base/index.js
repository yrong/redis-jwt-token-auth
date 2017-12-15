'use strict';

const cors = require('kcors')
const bodyParser = require('koa-bodyparser')
const session = require('koa-session')
require('./passport')
const passport = require('koa-passport')
const config = require('config')
const _ = require('lodash')
const responseWrapper = require('scirichon-response-wrapper')
const log4js_wrapper = require('log4js_wrapper')
const logger = log4js_wrapper.getLogger()

module.exports = function middleware(app) {
    if(config.get('wrapResponse'))
        app.use(responseWrapper())
    else{
        app.use(async (ctx, next) => {
            try {
                const start = new Date()
                await next();
                const ms = new Date() - start
                logger.info('%s %s - %s ms', ctx.method, ctx.originalUrl, ms)
            } catch (error) {
                ctx.body = String(error)
                ctx.status = error.statusCode || 500
                logger.error('%s %s - %s', ctx.method, ctx.originalUrl, error.stack || error)
            }
        })
    }
    app.use(cors({ credentials: true }))
    app.use(bodyParser())
    app.keys = [config.get('secret')]
    app.use(session({},app))
    app.use(passport.initialize())
    app.use(passport.session())

}