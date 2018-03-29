const Account = require('../models/account')
const _ = require('lodash')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError
const ScirichonWarning = common.ScirichonWarning
const scirichon_cache = require('scirichon-cache')
const uuid = require('uuid')
const config = require('config')
const search = require('../search')

const deleteUser = async (userid,ctx)=>{
    let notification,user = await Account.findOne(userid),notification_url = common.getServiceApiUrl('notifier'),department
    if(user){
        await scirichon_cache.delItem(user)
        await ctx.req.session.deleteByUserId(userid)
        await Account.destory(userid)
        await search.deleteItem(user,ctx)
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
    if(!_.has(user,'external')){
        user.external = false
    }
    await checkUser(user)
    user.uuid = user.uuid||uuid.v1()
    user.category = 'User'
    user.unique_name = user.name
    await Account.add(user)
    await scirichon_cache.addItem(user)
    await search.addOrUpdateItem(user)
    return user
}

const checkUser = async (user)=>{
    if(user.roles){
        for(let role of user.roles){
            role = await scirichon_cache.getItemByCategoryAndID('Role',role)
            if(!_.isEmpty(role)){
                throw new ScirichonError('role not exist')
            }
        }
    }
    if(user.department){
        let department = await scirichon_cache.getItemByCategoryAndID('Department',user.department)
        if(_.isEmpty(department)){
            throw new ScirichonError('department not exist')
        }else{
            user.department_path = department.path
        }
    }
    if(user.internalId){
        let internalUser = await scirichon_cache.getItemByCategoryAndID('User',user.internalId)
        if(_.isEmpty(internalUser)){
            throw new ScirichonError('internalUser not exist')
        }
    }
    return user
}

const UserOmitFields = ['passwd','id']

module.exports = (router)=>{
    router.get('/userinfo', async(ctx, next) => {
        let users = await Account.findAll()
        users = _.map(users,(user)=>_.omit(user,UserOmitFields))
        ctx.body = users||{}
    });

    router.post('/userinfo/search', async(ctx, next) => {
        let params = ctx.request.body
        params.limit = parseInt(params.per_page||config.get('perPageSize'))
        params.skip = (parseInt(params.page||1)-1) * params.limit
        if(params.fields&&params.fields.external===false){
            params.condition = `where (not exists(n.external) or n.external=false)`
            delete params.fields.external
        }
        let users = await Account.Search(params)
        if(users&&users.results)
            users.results = _.map(users.results,(user)=>_.omit(user,UserOmitFields))
        ctx.body = users||{}
    })

    router.post('/userinfo/v1/search', async(ctx, next) => {
        let params = _.merge({},ctx.query,ctx.request.body)
        ctx.body = await search.searchItem(params)||{}
    })

    router.get('/userinfo/:uuid',async(ctx,next)=>{
        let user = await Account.findOne(ctx.params.uuid)
        ctx.body = _.omit(user,UserOmitFields)
    })

    router.put('/changepwd/:uuid', async(ctx, next) => {
        let params = _.merge({},ctx.params,ctx.request.body)
        await Account.updatePassword(params)
        ctx.body = {}
    })

    router.put('/assocRole/:uuid', async(ctx, next) => {
        let params = _.merge({},ctx.params,ctx.request.body)
        if(!params.uuid||!params.roles)
            throw new ScirichonError('assoc role missing params')
        let user = await Account.findOne(params.uuid)
        user.roles = params.roles
        await scirichon_cache.addItem(user)
        await search.addOrUpdateItem(user)
        await Account.updateRole(params)
        await ctx.req.session.deleteByUserId(params.uuid)
        console.log('user role changed,need relogin')
        ctx.body = {}
    })

    router.put('/userinfo/:uuid',async(ctx,next)=>{
        let user = _.merge({},ctx.params,ctx.request.body)
        await checkUser(user)
        user = await Account.updateInfo(user)
        await scirichon_cache.addItem(user)
        await search.addOrUpdateItem(user)
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

    router.del('/unregister', async(ctx, next) => {
        let uuids = ctx.request.body.uuids
        for(let userid of uuids){
            await deleteUser(userid,ctx)
        }
        ctx.body = {}
    })
}