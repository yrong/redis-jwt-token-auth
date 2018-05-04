const _ = require('lodash')
const Role = require('../models/role')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError
const ScirichonWarning = common.ScirichonWarning
const scirichon_cache = require('scirichon-cache')
const search = require('scirichon-search')
const scirichonResponseMapper = require('scirichon-response-mapper')

const addOrUpdateRole = async(role,update)=>{
    role.category = 'Role'
    role.uuid = role.unique_name = role.uuid||role.name
    role.type = role.type || 'internal'
    await scirichon_cache.addItem(role)
    await Role.addOrUpdate(role)
    await search.addOrUpdateItem(role)
    console.log(`role ${role.uuid} added`)
    return role.uuid
}

module.exports = (router)=>{
    router.post('/role', async(ctx, next) => {
        let role = ctx.request.body,uuid
        if(!role.name||!role.allows){
            throw new ScirichonError('add role missing params')
        }
        uuid = await addOrUpdateRole(role)
        ctx.body = {uuid}
    })

    router.post('/roles', async(ctx, next) => {
        await Role.clearAll()
        let roles = ctx.request.body,uuid,results = []
        for(let role of roles){
            uuid = await addOrUpdateRole(role)
            results.push(uuid)
        }
        ctx.body = results
    })

    router.post('/role/search', async(ctx, next) => {
        let params = _.merge({category:'Role'},ctx.query,ctx.request.body)
        ctx.body = await search.searchItem(params)||{}
    })

    router.get('/role/:uuid', async(ctx, next) => {
        let role = await Role.findOne(ctx.params.uuid)
        role = await scirichonResponseMapper.responseMapper(role,ctx.query)
        ctx.body = role||{}
    })

    router.get('/role', async(ctx, next) => {
        let roles = await Role.findAll()
        roles = await scirichonResponseMapper.responseMapper(roles,ctx.query)
        ctx.body = roles||[]
    })

    router.del('/role/:uuid', async(ctx, next) => {
        let role = await Role.findOne(ctx.params.uuid),notification_url = common.getServiceApiUrl('notifier'),
            notification = {type:"Role",user:ctx.req.session.passport.user,source:process.env['NODE_NAME']}
        if(role){
            await Role.destroy(ctx.params.uuid)
            await scirichon_cache.delItem(role)
            await search.deleteItem(role)
            try{
                notification.action = 'DELETE'
                notification.old = role
                await common.apiInvoker('POST',notification_url,'/api/notifications','',notification)
            }catch(error){
                throw new ScirichonWarning(`add notification failed:`+ error)
            }
            console.log(`role ${ctx.params.name} deleted`)
        }else{
            throw new ScirichonError(`role ${ctx.params.name} not found`)
        }
        ctx.body = {}
    })
}

