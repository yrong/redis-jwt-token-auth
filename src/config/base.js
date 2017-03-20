'use strict';

import convert from 'koa-convert';
import cors from 'kcors';
import Serve from 'koa-static';
import mount from 'koa-mount';
import bodyParser from 'koa-bodyparser';
import session from 'koa-generic-session';
import views from 'koa-views';
import './passport';
import passport from 'koa-passport';
import log4js from 'log4js';
import config from '../config/config';
import logger from '../logger'
import _ from 'lodash'
import file_uploader from 'koa2-file-upload-local'

export default function middleware(app) {

    app.proxy = true;

    const tag = config.app.name

    log4js.configure({
        appenders: [
            { type: 'console' },
            { type: 'dateFile', filename: __dirname + '/../../tmp/boilerplate.log' , "pattern":"-yyyy-MM-dd-hh.log","alwaysIncludePattern":false, category: tag }
        ],
        replaceConsole: true
    });

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
    for(let option of _.values(config.upload)){
        app.use(mount(option.url,file_uploader(option).handler))
    }

}