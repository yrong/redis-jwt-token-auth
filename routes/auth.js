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
        if(!user)
            ctx.throw('login failed',401)
        await ctx.login(user);
        let token = await ctx.req.session.create(ctx.req.session.passport);
        ctx.body = {token: token,local:_.omit(user,['passwd'])};
    })(ctx, next)
});


router.post('/login-ldap', async (ctx, next) => {
    await passport.authenticate('ldapauth',{session: false},async (user,info) => {
        if(user){
            await ctx.login(user);
            let token = await ctx.req.session.create(ctx.req.session.passport);
            let local_user = await Account.getLocalByLdap(user)
            ctx.body = {token: token,local:_.omit(local_user,['passwd']),ldap:_.omit(user,['userPassword'])};
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
    let user_passport = await ctx.req.session.reload(),local_user,token=ctx.request.body.token
    if(user_passport&&user_passport.passport&&user_passport.passport.user&&user_passport.passport.user.cn){
        local_user = await Account.getLocalByLdap(user_passport.passport.user)
        ctx.body = {token: token,local:local_user,ldap:user_passport.passport.user}
    }else{
        ctx.body = {token:token,local:user_passport.passport.user}
    }
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
    await Account.updateLocal2LdapAssoc(params)
    ctx.body = {}
})

router.put('/unassoc/:uuid', async(ctx, next) => {
    await Account.unAssocLocal(ctx.params)
    ctx.body = {}
})

router.get('/active_users',async(ctx,next)=>{
    let results = await ctx.req.session.findAll()
    ctx.body = _.map(results,(result)=>{
        return result.passport.user
    })
})

router.post('/ldapsearch',async(ctx)=>{
    let params = ctx.request.body
    let items = await Account.searchLdap(params.base,params.options)
    ctx.body = items
})

module.exports = router;
