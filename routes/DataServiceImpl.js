const _ = require('lodash')
const handler = require('../handlers/index')
const passport = require('koa-passport')
const LdapAccount = require('../handlers/ldap_account')
const ScirichonError = require('scirichon-common').ScirichonError
const user_handler = require('../handlers/user')
const TokenExpiration = require('../lib/const').TokenExpiration

module.exports = (router) =>{

    router.get('/department/params',async(ctx,next)=>{

        let returnArr = [],department = []

        if (ctx.query.roots === 'all'){
            let params = _.merge({category:'Department'},ctx.query,ctx.params,ctx.request.body)
            let departments = await handler.handleQuery(params,ctx)
            let arr = departments||[]
            for (let i = 0; i < arr.length; i++) {
                if(arr[i].root){
                    returnArr.push(arr[i].uuid)
                }
            }
            for(let j = 0; j<returnArr.length; j++){
                params = _.assign({category:'Department'},{uuid:returnArr[j]})
                department.push(await handler.getItemWithMembers(params,ctx))
            }
        }else{
            let params ,depart,
                roots = (ctx.query.roots&&ctx.query.roots&&ctx.query.roots.split(','))
            if(roots){
                for(depart of roots){
                    params = _.assign({category:'Department'},{uuid:depart})
                    department.push(await handler.getItemWithMembers(params,ctx))
                }
            }
        }
        ctx.body = {data: department}
    })

    router.post('/login/filter', async(ctx, next) => {
        let token,local
        await passport.authenticate('local',async(err,user) => {
            if(err){
                ctx.throw(new ScirichonError(err.message,401))
            }
            local = await user_handler.checkLoginUser(ctx,user)
            let roles = local.roles||[];
            for(let i = 0;i<roles.length;i++){
                if(roles[i].status === 'deleted' || roles[i].status === 'disabled'){
                    roles.splice(i,1);
                }
            }
            let departments = local.departments||[];
            for(let j = 0;j<departments.length;j++){
                if(departments[j].status === 'deleted' || departments[j].status === 'disabled'){
                    departments.splice(j,1);
                }
            }
            await ctx.login(user)
            token = await ctx.req.session.create(ctx.req.session.passport)

            ctx.body = {token: token,login_date:new Date().toISOString(),expiration_date:new Date(Date.now()+TokenExpiration*1000).toISOString(),local:local}
        })(ctx, next)
    })

    router.post('/login-ldap/filter', async (ctx, next) => {
        let token,local
        await passport.authenticate('ldapauth',{session: false},async (err,user) => {
            if(err){
                ctx.throw(new ScirichonError(err.message,401))
            }
            local = await LdapAccount.getLocalByLdap(user)
            local = await user_handler.checkLoginUser(ctx,local)
            let roles = local.roles||[];
            for(let i = 0;i<roles.length;i++){
                if(roles[i].status === 'deleted' || roles[i].status === 'disabled'){
                    roles.splice(i,1);
                }
            }
            let departments = local.departments||[];
            for(let j = 0;j<departments.length;j++){
                if(departments[j].status === 'deleted' || departments[j].status === 'disabled'){
                    departments.splice(j,1);
                }
            }
            await ctx.login(user)
            token = await ctx.req.session.create(ctx.req.session.passport)
            ctx.body = {token: token,login_date:new Date().toISOString(),expiration_date:new Date(Date.now()+TokenExpiration*1000).toISOString(),local:local,ldap:_.omit(user,['userPassword'])}
        })(ctx, next)
    });


}
