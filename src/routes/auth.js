'use strict';

import Router from 'koa-router';
// import AccountModel from '../models/account';
const router = new Router();
import passport from 'koa-passport';
import _ from 'lodash';

router.post('/login', async(ctx, next) => {
    await passport.authenticate('local',async(user, info) => {
        await ctx.login(user);
        let token = await ctx.req.session.create({user: user});
        ctx.body = {status: 'ok',token: token};
    })(ctx, next)
});

router.post('/logout', async(ctx, next) => {
    await ctx.logout();
    await ctx.req.session.destroy();
    ctx.body = {status: 'ok'};
});

router.post('/check', async(ctx, next) => {
    let passport = await ctx.req.session.reload();
    ctx.body = _.extend({status: 'ok'},passport);
})


export default router;
