'use strict';

const convert = require('koa-convert')
const cors = require('kcors')
const Serve = require('koa-static')
const mount = require('koa-mount')
const bodyParser = require('koa-bodyparser')
const session = require('koa-generic-session')
require('./passport')
const passport = require('koa-passport')
const config = require('config')
const _ = require('lodash')
const file_uploader = require('koa-file-upload-fork')
const responseWrapper = require('scirichon-response-wrapper')

module.exports = function middleware(app) {
    app.use(responseWrapper())
    app.use(cors({ credentials: true }))
    app.use(bodyParser())
    app.use(mount("/", convert(Serve(__dirname + '/../public/'))))
    app.keys = [config.get('name')]
    app.use(convert(session()))
    app.use(passport.initialize())
    app.use(passport.session())
    let upload_config = config.get('upload')
    for(let option of _.values(upload_config)){
        app.use(mount(option.url,file_uploader(option).handler))
    }

}