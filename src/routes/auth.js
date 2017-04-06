'use strict';

import Router from 'koa-router';
const router = new Router();
import passport from 'koa-passport';
import Account from '../models/account'

router.post('/login', async(ctx, next) => {
    await passport.authenticate('local',async(user, info) => {
        await ctx.login(user);
        let token = await ctx.req.session.create({user: user});
        ctx.body = {token: token};
    })(ctx, next)
});


router.post('/login-ldap', async (ctx, next) => {
    await passport.authenticate('ldapauth',{session: false},async (user,info) => {
        if(user){
            await ctx.login(user);
            let token = await ctx.req.session.create({user: user});
            ctx.body = {token: token};
        }else{
            throw new Error(info.message)
        }
    })(ctx, next)
});

router.post('/logout', async(ctx, next) => {
    await ctx.logout();
    await ctx.req.session.destroy();
    ctx.body = {}
});

router.post('/check', async(ctx, next) => {
    ctx.body = await ctx.req.session.reload()
})

router.put('/changepwd/:uuid', async(ctx, next) => {
    await Account.updatePassword({...ctx.params, ...ctx.request.body})
    ctx.body = {}
})

router.put('/userinfo/:uuid',async(ctx,next)=>{
    await Account.updateInfo({...ctx.params, ...ctx.request.body})
    ctx.body = {}
})

export default router;
