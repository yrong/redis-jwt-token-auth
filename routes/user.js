const Account = require('../models/account')
const _ = require('lodash')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError
const ScirichonWarning = common.ScirichonWarning
const scirichon_cache = require('scirichon-cache')
const uuid = require('uuid')
const config = require('config')
const search = require('../search')
const responseWrapper = require('../hook/responseWrapper')
const LdapAccount = require('../models/ldap_account')

const deleteUser = async (userid,ctx)=>{
    let notification,user = await Account.findOne(userid),notification_url = common.getServiceApiUrl('notifier'),department
    if(user){
        await scirichon_cache.delItem(user)
        await ctx.req.session.deleteByUserId(userid)
        await Account.destory(userid)
        await search.deleteItem('user',user)
        try {
            if(user.department){
                department = await scirichon_cache.getItemByCategoryAndID('Department',user.department)
                if(!_.isEmpty(department)){
                    user.department = department
                }
            }
            notification = {type: "User", user: ctx.req.session.passport.user, source: process.env['NODE_NAME']}
            notification.action = 'DELETE'
            notification.old = user
            await common.apiInvoker('POST', notification_url, '/api/notifications', '', notification)
        }catch(error){
            throw new ScirichonWarning(`add notification failed:`+ error)
        }
        console.log(`user ${userid} deleted`)
    }else{
        throw new ScirichonError(`user ${userid} not found`)
    }
}

const addUser = async (user)=>{
    if(!user.name || !user.passwd)
        throw new ScirichonError('user missing params')
    await checkUser(user)
    user.type = user.type || 'internal'
    user.uuid = user.uuid||uuid.v1()
    user.category = 'User'
    user.unique_name = user.name
    await Account.add(user)
    await scirichon_cache.addItem(user)
    await search.addOrUpdateItem('user',user,false)
    return user
}

const checkUser = async (user)=>{
    let result
    if(user.roles){
        for(let role of user.roles){
            result = await scirichon_cache.getItemByCategoryAndID('Role',role)
            if(_.isEmpty(result)){
                throw new ScirichonError('role not exist')
            }
        }
    }
    if(user.department){
        result = await scirichon_cache.getItemByCategoryAndID('Department',user.department)
        if(_.isEmpty(result)){
            throw new ScirichonError('department not exist')
        }else{
            user.department_path = result.path
        }
    }
    if(user.internal){
        result = await scirichon_cache.getItemByCategoryAndID('User',user.internal)
        if(_.isEmpty(result)){
            throw new ScirichonError('internalUser not exist')
        }
    }
    if(user.ldapId){
        result = await LdapAccount.searchLdap(user.ldapId,{attributes:config.get('ldap.userAttributes')})
        if(_.isEmpty(result)){
            throw new ScirichonError('ldap user not found')
        }
    }
    return user
}

const updateUser = async (ctx)=>{
    let user = _.merge({},ctx.params,ctx.request.body)
    await checkUser(user)
    user = await Account.updateInfo(user,ctx)
    await scirichon_cache.addItem(user)
    await search.addOrUpdateItem('user',user,true)
}

module.exports = (router)=>{
    router.get('/userinfo', async(ctx, next) => {
        let users = await Account.findAll()
        users = _.map(users,(user)=>_.omit(user,Account.OmitFields))
        users = await responseWrapper.responseMapper(users,{category:'User'})
        ctx.body = users||{}
    })

    router.get('/userinfo/:uuid',async(ctx,next)=>{
        let user = await Account.findOne(ctx.params.uuid)
        user = _.omit(user,Account.OmitFields)
        user = await responseWrapper.responseMapper(user,_.assign({category:'User'},ctx.query))
        ctx.body = user||{}
    })

    router.post('/userinfo/search', async(ctx, next) => {
        let params = _.merge({category:'User'},ctx.query,ctx.request.body)
        ctx.body = await search.searchItem(params)||{}
    })

    router.put('/changepwd/:uuid', async(ctx, next) => {
        let params = _.merge({},ctx.params,ctx.request.body)
        await Account.updatePassword(params)
        ctx.body = {}
    })

    router.put('/userinfo/:uuid',async(ctx,next)=>{
        await updateUser(ctx)
        ctx.body = {}
    })

    router.put('/assocRole/:uuid', async(ctx, next) => {
        await updateUser(ctx)
        ctx.body = {}
    })

    router.put('/assoc/:uuid', async(ctx, next) => {
        await updateUser(ctx)
        ctx.body = {}
    })

    router.post('/register', async(ctx, next) => {
        let user = ctx.request.body
        user = await addUser(user)
        ctx.body = {uuid:user.uuid}
    })

    router.del('/unregister/:uuid', async(ctx, next) => {
        let userid = ctx.params.uuid
        await deleteUser(userid,ctx)
        ctx.body = {}
    })

    router.del('/unregister', async (ctx, next) => {
        let uuids = ctx.request.body.uuids
        for (let userid of uuids) {
            await deleteUser(userid, ctx)
        }
        ctx.body = {}
    })
}