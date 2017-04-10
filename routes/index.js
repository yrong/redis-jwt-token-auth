'use strict';

const compose = require('koa-compose')
const Router = require('koa-router')
const RouterAuth = require('./auth')

const router = new Router();

router.get('/', async (ctx, next) => {
    ctx.type = 'html'
    await ctx.render('./main')
})

router.use('/auth', RouterAuth.routes(), RouterAuth.allowedMethods())

module.exports = function routes() {
    return compose(
        [
            router.routes(),
            router.allowedMethods()
        ]
    )
}
