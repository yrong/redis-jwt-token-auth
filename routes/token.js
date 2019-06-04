const passport = require('koa-passport')
const _ = require('lodash')
const LdapAccount = require('../handlers/ldap_account')
const ScirichonError = require('scirichon-common').ScirichonError
const user_handler = require('../handlers/user')
const TokenExpiration = require('../lib/const').TokenExpiration


module.exports = (router)=>{
    router.post('/login', async(ctx, next) => {
        let token,local
        await passport.authenticate('local',async(err,user) => {
            if(err){
                ctx.throw(new ScirichonError(err.message,401))
            }
            if(!user){
                ctx.throw(new ScirichonError("认证需包含username和password字段",401))
            }
            local = await user_handler.checkLoginUser(ctx,user)
            await ctx.login(user)
            token = await ctx.req.session.create(ctx.req.session.passport)
            ctx.body = {token: token,login_date:new Date().toISOString(),expiration_date:new Date(Date.now()+TokenExpiration*1000).toISOString(),local:local}
        })(ctx, next)
    })

    router.post('/logout', async(ctx, next) => {
        await ctx.logout()
        await ctx.req.session.destroy()
        ctx.body = {}
    })

    router.post('/check', async(ctx, next) => {
        let passport = (await ctx.req.session.reload()).passport,
            passport_user = passport.user,
            local_user = passport.user,
            token = ctx.request.body.token, result
        if(passport_user){
            if(user_handler.isLdapUser(passport_user)){
                local_user = await LdapAccount.getLocalByLdap(passport_user)
                result = {token: token,local:await user_handler.getFullUser(ctx,local_user),ldap:passport_user}
            }else{
                result = {token: token,local:await user_handler.getFullUser(ctx,local_user)}
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
