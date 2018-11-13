const _ = require('lodash')
const config = require('config')
const passport = require('koa-passport')
const ldap_config = config.get('auth.ldap')
const LdapAccount = require('../handlers/ldap_account')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError
const user_handler = require('../handlers/user')
const TokenExpiration = require('../lib/const').TokenExpiration

module.exports = (router)=>{

    router.post('/login-ldap', async (ctx, next) => {
        let token,local
        await passport.authenticate('ldapauth',{session: false},async (err,user) => {
            if(err){
                ctx.throw(new ScirichonError(err.message,401))
            }
            local = await LdapAccount.getLocalByLdap(user)
            local = await user_handler.checkLoginUser(ctx,local)
            await ctx.login(user)
            token = await ctx.req.session.create(ctx.req.session.passport)
            ctx.body = {token: token,login_date:new Date().toISOString(),expiration_date:new Date(Date.now()+TokenExpiration*1000).toISOString(),local:local,ldap:_.omit(user,['userPassword'])}
        })(ctx, next)
    });

    router.post('/ldapsearch',async(ctx)=>{
        let params = ctx.request.body
        let items = await LdapAccount.searchLdap(params.base,params.options||{})
        ctx.body = items
    })

    router.get('/enterprise/users',async(ctx)=>{
        let paged_params = _.assign({},ctx.params,ctx.query,ctx.request.body)
        let items = await LdapAccount.searchLdapPagination(ldap_config.userSearchBase,ldap_config.userClass,paged_params,ldap_config.userAttributes)
        ctx.body = items
    })

    router.get('/enterprise/departments',async(ctx)=>{
        let paged_params = _.assign({},ctx.params,ctx.query,ctx.request.body)
        let items = await LdapAccount.searchLdapPagination(ldap_config.departmentSearchBase,ldap_config.departmentClass,paged_params,ldap_config.departmentAttributes)
        ctx.body = items
    })

}

