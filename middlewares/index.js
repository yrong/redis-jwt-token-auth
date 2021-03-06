'use strict';

const jwt_token = require('./token');
const Redis = require('redis');
const config = require('config')
require('./passport')
const compose = require('koa-compose')
const passport = require('koa-passport')
const session = require('koa-session')
const cors = require('kcors')
const bodyParser = require('koa-bodyparser')
const responseWrapper = require('scirichon-response-wrapper')


module.exports = {
    load:(app)=>{
        app.use(cors())
        app.use(bodyParser({
            onerror(error, ctx) {
                ctx.throw(400, `cannot parse request body, ${JSON.stringify(error)}`);
            }
        }));
        if (config.get('checkLicense')) {
            const license_helper = require('license-helper')
            const lincense_file = `${process.env['LICENSE_PATH']}/${process.env['NODE_NAME']}.lic`
            const license_middleware = license_helper.license_middleware
            app.use(license_middleware({ path: lincense_file }))
        }
        app.use(responseWrapper());
        const redisOption = config.get('redis')
        const redis_client = Redis.createClient(Object.assign({db:0},redisOption))
        const secret = config.get('auth.secret')
        app.use(compose([
            passport.initialize(),
            passport.session(),
            jwt_token({
                client: redis_client,
                secret: secret
            }),
        ]));
        app.keys = [secret]
        app.use(session({},app))
    }
}
