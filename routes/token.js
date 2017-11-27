const passport = require('koa-passport')
const _ = require('lodash')
const Account = require('../models/account')
const Role = require('../models/role')
const ScirichonError = require('scirichon-common').ScirichonError

const isLdapUser = (user)=>{
    return user.cn&&user.dn
}

const getUser = async (ctx,user)=>{
    if(ctx.request.body.requestAll){
        user = await Account.findOne(user.uuid)
    }
    return user
}


module.exports = (router)=>{
    router.post('/login', async(ctx, next) => {
        await passport.authenticate('local',async(user, info) => {
            if(!user)
                ctx.throw(401,new ScirichonError('login failed!'))
            await ctx.login(user)
            let token = await ctx.req.session.create(ctx.req.session.passport)
            user = _.omit(user,['passwd'])
            if(user.roles&&user.roles.length)
                user.roles = await Role.mapRoles(user.roles)
            ctx.body = {token: token,local:user}
        })(ctx, next)
    })

    router.post('/logout', async(ctx, next) => {
        await ctx.logout()
        await ctx.req.session.destroy()
        ctx.body = {}
    })

    router.post('/check', async(ctx, next) => {
        let userInfo = await ctx.req.session.reload(),local_user=_.clone(userInfo.passport.user),result
        if(local_user){
            if(isLdapUser(local_user)){
                local_user = await Account.getLocalByLdap(local_user)
                result = {token: ctx.request.body.token,local:await getUser(ctx,local_user),ldap:userInfo.passport.user}
            }else{
                result = {token: ctx.request.body.token,local:await getUser(ctx,local_user)}
            }
        }
        ctx.body = result
    })

    router.get('/active_users',async(ctx,next)=>{
        let results = await ctx.req.session.findAll()
        ctx.body = _.map(results,(result)=>{
            return result.passport.user
        })
    })
}