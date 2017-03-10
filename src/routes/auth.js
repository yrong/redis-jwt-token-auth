'use strict';

import Router from 'koa-router';
const router = new Router();
import passport from 'koa-passport';
import _ from 'lodash';
import Account from '../models/account'

router.post('/login', async(ctx, next) => {
    await passport.authenticate('local',async(user, info) => {
        await ctx.login(user);
        let token = await ctx.req.session.create({user: user});
        ctx.body = {token: token};
    })(ctx, next)
});

router.post('/logout', async(ctx, next) => {
    await ctx.logout();
    ctx.body = await ctx.req.session.destroy();
});

router.post('/check', async(ctx, next) => {
    ctx.body = await ctx.req.session.reload()
})

router.put('/changepwd/:uuid', async(ctx, next) => {
    ctx.body = await Account.updatePassword({...ctx.params, ...ctx.request.body})
})

router.put('/userinfo/:uuid',async(ctx,next)=>{
    ctx.body = await Account.updateInfo({...ctx.params, ...ctx.request.body})
})

export default router;
