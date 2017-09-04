'use strict';

const Router = require('koa-router')
const router = new Router();
const passport = require('koa-passport')
const Account = require('../models/account')
const _ = require('lodash')
const config = require('config')
const ldap_config = config.get('ldap.server')
const Role = require('../models/role')

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

const mapUserRoles = async (user)=>{
    let roles = [];
    user = _.omit(user,['passwd'])
    if(user.roles){
        for(let role of user.roles){
            role = await Role.findOne(role)
            roles.push(role)
        }
        user.roles = roles
    }
    return user
}

router.post('/login', async(ctx, next) => {
    await passport.authenticate('local',async(user, info) => {
        if(!user)
            ctx.throw('login failed',401)
        await ctx.login(user);
        let token = await ctx.req.session.create(ctx.req.session.passport);
        let local_user = await mapUserRoles(user)
        ctx.body = {token: token,local:local_user};
    })(ctx, next)
});


router.post('/login-ldap', async (ctx, next) => {
    await passport.authenticate('ldapauth',{session: false},async (user,info) => {
        if(user){
            await ctx.login(user);
            let token = await ctx.req.session.create(ctx.req.session.passport);
            let local_user = await Account.getLocalByLdap(user)
            local_user = await mapUserRoles(local_user)
            ctx.body = {token: token,local:local_user,ldap:_.omit(user,['userPassword'])};
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
    let user_passport = await ctx.req.session.reload(),local_user,token=ctx.request.body.token,url=ctx.request.body.url,result
    if(user_passport&&user_passport.passport&&user_passport.passport.user&&user_passport.passport.user.cn){
        local_user = await Account.getLocalByLdap(user_passport.passport.user)
        result = {token: token,local:local_user,ldap:user_passport.passport.user}
    }else{
        result = {token:token,local:user_passport.passport.user}
    }
    ctx.body = result
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

router.get('/enterprise/users',async(ctx)=>{
    let paged_params = _.assign({},ctx.params,ctx.query,ctx.request.body)
    let items = await Account.searchLdapPagination(ldap_config.searchBase,ldap_config.userClass,paged_params,ldap_config.userAttributes)
    ctx.body = items
})

router.get('/enterprise/departments',async(ctx)=>{
    let paged_params = _.assign({},ctx.params,ctx.query,ctx.request.body)
    let items = await Account.searchLdapPagination(ldap_config.departmentSearchBase,ldap_config.departmentClass,paged_params,ldap_config.departmentAttributes)
    ctx.body = items
})

router.post('/role', async(ctx, next) => {
    let params = ctx.request.body
    await Role.addOrUpdate(params)
    ctx.body = {}
})

router.get('/role/:name', async(ctx, next) => {
    ctx.body = await Role.findOne(ctx.params.name)
})

router.get('/role', async(ctx, next) => {
    ctx.body = await Role.findAll()
})

router.del('/role/:name', async(ctx, next) => {
    await Role.destory(ctx.params.name)
    ctx.body = {}
})

router.put('/assocRole/:uuid', async(ctx, next) => {
    let params = _.merge({},ctx.params,ctx.request.body)
    if(!params.uuid||!params.roles)
        throw new Error('assoc role missing params')
    await Account.updateRole(params)
    await ctx.req.session.deleteByUserId(params.uuid)
    ctx.body = {}
})

module.exports = router;
