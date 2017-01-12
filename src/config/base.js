'use strict';

import convert from 'koa-convert';
import cors from 'kcors';
import Serve from 'koa-static';
import Logger from 'koa-logger';
import mount from 'koa-mount';
import bodyParser from 'koa-bodyparser';
import session from 'koa-generic-session';
import views from 'koa-views';
import _ from './passport';
import passport from 'koa-passport';
import log4js from 'log4js';
import jwt_token from '../middleware/token';
import Redis from 'ioredis';
import config from './config'

var redis = new Redis(config.redis.port, config.redis.host,{ dropBufferSupport: true });

export default function middleware(app) {

    app.proxy = true;

    log4js.configure({
        appenders: [
            { type: 'console' },
            { type: 'dateFile', filename: __dirname + '/../tmp/boilerplate.log' , "pattern":"-yyyy-MM-dd-hh.log","alwaysIncludePattern":false, category: 'file' }
        ],
        replaceConsole: true
    });

    app.use(async function(ctx, next) {
        try {
            await next();
        } catch (error) {
            ctx.body = error.message;
            ctx.status = 500;
        }
    })

    app.use(cors({ credentials: true }));
    app.use(convert(Logger()))
    app.use(bodyParser())
    app.use(mount("/", convert(Serve(__dirname + '/../public/'))));
    app.keys = ['superalsrk-session-key'];
    app.use(convert(session()))
    app.use(passport.initialize())
    app.use(passport.session())
    app.use(views(__dirname + '/../views', {extension: 'swig'}))

    app.use(jwt_token({
        client: redis,
        secret: config.app.secret
    }));

}