'use strict';

import compose from 'koa-compose';
import Router from 'koa-router';
import RouterAuth from './auth';

const router = new Router();

router.get('/', async (ctx, next) => {
    ctx.type = 'html'
    await ctx.render('./main')
})

router.use('/auth', RouterAuth.routes(), RouterAuth.allowedMethods())

export default function routes() {
    return compose(
        [
            router.routes(),
            router.allowedMethods()
        ]
    )
}
