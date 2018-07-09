const passport = require('koa-passport')
const _ = require('lodash')
const LdapAccount = require('../handlers/ldap_account')
const ScirichonError = require('scirichon-common').ScirichonError
const scirichonMapper = require('scirichon-response-mapper')
const handler = require('../handlers/index')
const TokenExpiration = require('../lib/const').TokenExpiration

const isLdapUser = (user)=>{
    return user.cn&&user.dn
}

const getFullUser = async (ctx,user)=>{
    if(ctx.request.body.requestAll){
        user = await handler.handleQuery({category:'User',uuid:user.uuid},ctx)
    }
    return user
}


module.exports = (router)=>{
    router.post('/login', async(ctx, next) => {
        let params = ctx.request.body,token
        await passport.authenticate('local',async(err,user,info) => {
            if(err){
                ctx.throw(new ScirichonError(err.message,401))
            }
            if(params.illegalRoles&&user.roles){
                if(_.intersection(params.illegalRoles,user.roles).length){
                    ctx.throw(new ScirichonError(`user with illegal roles as ${user.roles} can not login`,401))
                }
            }
            await ctx.login(user)
            console.log(`user before mapping:${JSON.stringify(user)}`)
            try{
                user = await scirichonMapper.responseMapper(user,_.assign({category:'User'}))
            }catch(err){
                console.log(err.stack||err)
            }
            console.log(`user after mapping:${JSON.stringify(user)}`)
            token = await ctx.req.session.create(ctx.req.session.passport)
            ctx.body = {token: token,login_date:new Date().toISOString(),expiration_date:new Date(Date.now()+TokenExpiration*1000).toISOString(),local:user}
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
                result = {token: token,local:await getFullUser(ctx,local_user),ldap:passport_user}
            }else{
                result = {token: token,local:await getFullUser(ctx,local_user)}
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