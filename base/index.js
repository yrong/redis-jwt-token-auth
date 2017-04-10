'use strict';

const convert = require('koa-convert')
const cors = require('kcors')
const Serve = require('koa-static')
const mount = require('koa-mount')
const bodyParser = require('koa-bodyparser')
const session = require('koa-generic-session')
const views = require('koa-views')
require('./passport')
const passport = require('koa-passport')
const log4js = require('log4js')
const config = require('config')
const logger = require('../logger')
const _ = require('lodash')
const file_uploader = require('koa2-file-upload-local')
const path = require('path')
const fs = require('fs')

module.exports = function middleware(app) {
    app.proxy = true;
    const tag = config.get('name')
    const logger_config = config.get('logger')
    const logDir = path.join('./logs')
    if (!fs.existsSync(logDir)){
        fs.mkdirSync(logDir);
    }
    log4js.configure(logger_config,{ cwd: logDir });

    app.use(async function(ctx, next) {
        try {
            const start = new Date()
            await next();
            const ms = new Date() - start
            if(ctx.type === 'application/json' || ctx.jsonBody == true)
                ctx.body = {status: 'ok',data:ctx.body||{}}
            logger.info('%s %s - %s ms', ctx.method,ctx.url, ms)
        } catch (error) {
            ctx.body = {
                status:"error",
                message:{
                    content: String(error),
                    displayAs:"modal"
                }
            }
            ctx.status = error.status || 500
            logger.error('%s %s - %s', ctx.method,ctx.url, String(error))
        }
    })

    app.use(cors({ credentials: true }))
    app.use(bodyParser())
    app.use(mount("/", convert(Serve(__dirname + '/../public/'))))
    app.keys = [tag]
    app.use(convert(session()))
    app.use(passport.initialize())
    app.use(passport.session())
    app.use(views(__dirname + '/../views', {extension: 'swig'}))
    let upload_config = config.get('upload')
    for(let option of _.values(upload_config)){
        app.use(mount(option.url,file_uploader(option).handler))
    }

}