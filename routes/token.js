const passport = require('koa-passport')
const _ = require('lodash')
const Account = require('../models/account')
const Role = require('../models/role')

module.exports = (router)=>{
    router.post('/login', async(ctx, next) => {
        await passport.authenticate('local',async(user, info) => {
            if(!user)
                ctx.throw('login failed',401)
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
        let userInfo = await ctx.req.session.reload(),local_user,token=ctx.request.body.token,result
        if(userInfo.passport.user&&userInfo.passport.user.cn){
            local_user = await Account.getLocalByLdap(userInfo.passport.user)
            result = {token: token,local:local_user,ldap:userInfo.passport.user}
        }else{
            result = {token:token,local:userInfo.passport.user}
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