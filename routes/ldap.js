const _ = require('lodash')
const config = require('config')
const passport = require('koa-passport')
const ldap_config = config.get('auth.ldap')
const LdapAccount = require('../handlers/ldap_account')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError

module.exports = (router)=>{

    router.post('/login-ldap', async (ctx, next) => {
        await passport.authenticate('ldapauth',{session: false},async (err,ldap_user,info) => {
            if(err){
                ctx.throw(new ScirichonError(err.message,401))
            }
            await ctx.login(ldap_user)
            let passport = ctx.req.session.passport
            let token = await ctx.req.session.create(passport)
            let local_user = await LdapAccount.getLocalByLdap(ldap_user)
            ctx.body = {token: token,local:local_user,ldap:_.omit(ldap_user,['userPassword'])}
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

