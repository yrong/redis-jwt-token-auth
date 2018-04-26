const passport = require('koa-passport')
const _ = require('lodash')
const Account = require('../models/account')
const LdapAccount = require('../models/ldap_account')
const ScirichonError = require('scirichon-common').ScirichonError
const config = require('config')
const responseWrapper = require('../hook/responseWrapper')

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
        let params = ctx.request.body,token
        await passport.authenticate('local',async(err,user,info) => {
            if(!user)
                ctx.throw(401,new ScirichonError('login failed!'))
            if(params.illegalRoles&&user.roles){
                if(_.intersection(params.illegalRoles,user.roles).length){
                    ctx.throw(401,`user with illegal roles as ${user.roles} can not login`)
                }
            }
            await ctx.login(user)
            user = await responseWrapper.responseMapper(user,_.assign({category:'User'}))
            token = await ctx.req.session.create(ctx.req.session.passport)
            ctx.body = {token: token,login_date:new Date().toISOString(),expiration_date:new Date(Date.now()+config.get('expiration')*1000).toISOString(),local:user}
        })(ctx, next)
    })

    router.post('/logout', async(ctx, next) => {
        await ctx.logout()
        await ctx.req.session.destroy()
        ctx.body = {}
    })

    router.post('/check', async(ctx, next) => {
        let passport = (await ctx.req.session.reload()).passport,
            local_user = passport_user = passport.user,
            token = ctx.request.body.token, result
        if(passport_user){
            if(isLdapUser(passport_user)){
                local_user = await LdapAccount.getLocalByLdap(passport_user)
                result = {token: token,local:await getUser(ctx,local_user),ldap:passport_user}
            }else{
                result = {token: token,local:await getUser(ctx,local_user)}
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