'use strict';

const Router = require('koa-router')
const router = new Router();
const passport = require('koa-passport')
const Account = require('../models/account')
const _ = require('lodash')


router.post('/hidden/clean', async(ctx, next) => {
    await Account.destoryAll()
    ctx.body = {}
});

router.get('/userinfo', async(ctx, next) => {
    let users = await Account.findAll()
    ctx.body = users
});

router.get('/userinfo/:uuid',async(ctx,next)=>{
    let user = await Account.findOne(ctx.params.uuid)
    ctx.body = user
})

router.post('/register', async(ctx, next) => {
    let params = ctx.request.body
    await Account.add(params)
    ctx.body = {}
});

router.post('/unregister/:uuid', async(ctx, next) => {
    await Account.destory(ctx.params.uuid)
    ctx.body = {}
});

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
    let params = _.merge({},ctx.params,ctx.request.body)
    await Account.updatePassword(params)
    ctx.body = {}
})

router.put('/userinfo/:uuid',async(ctx,next)=>{
    let params = _.merge({},ctx.params,ctx.request.body)
    await Account.updateInfo(params)
    ctx.body = {}
})

router.put('/assoc/:uuid', async(ctx, next) => {
    let params = _.merge({},ctx.params,ctx.request.body)
    await Account.updateAssoc(params)
    ctx.body = {}
})

module.exports = router;
