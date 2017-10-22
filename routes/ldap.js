const _ = require('lodash')
const config = require('config')
const passport = require('koa-passport')
const ldap_config = config.get('ldap.server')
const Account = require('../models/account')
const Role = require('../models/role')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError

module.exports = (router)=>{
    router.put('/assoc/:uuid', async(ctx, next) => {
        let params = _.merge({},ctx.params,ctx.request.body)
        await Account.updateLocal2LdapAssoc(params)
        ctx.body = {}
    })

    router.put('/unassoc/:uuid', async(ctx, next) => {
        await Account.unAssocLocal(ctx.params)
        ctx.body = {}
    })

    router.post('/login-ldap', async (ctx, next) => {
        await passport.authenticate('ldapauth',{session: false},async (user,info) => {
            if(user){
                await ctx.login(user);
                let token = await ctx.req.session.create(ctx.req.session.passport);
                let local_user = await Account.getLocalByLdap(user)
                if(local_user&&local_user.roles&&local_user.roles.length)
                    local_user.roles = await Role.mapRoles(user.roles)
                ctx.body = {token: token,local:local_user,ldap:_.omit(user,['userPassword'])};
            }else{
                throw new ScirichonError('ldap authenticate failed,' + info.message)
            }
        })(ctx, next)
    });

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
}

