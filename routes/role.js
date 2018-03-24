const _ = require('lodash')
const Role = require('../models/role')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError
const ScirichonWarning = common.ScirichonWarning
const scirichon_cache = require('scirichon-cache')

const addRole = async(role)=>{
    if(!role.name||!role.allows){
        throw new ScirichonError('add role missing params')
    }
    role.category = 'Role'
    role.uuid = role.unique_name = role.name
    await scirichon_cache.addItem(role)
    await Role.addOrUpdate(role)
    console.log(`role ${role.name} added`)
}

module.exports = (router)=>{
    router.post('/role', async(ctx, next) => {
        let role = ctx.request.body
        await addRole(role)
        ctx.body = {}
    })

    router.post('/roles', async(ctx, next) => {
        await Role.clearAll()
        let roles = ctx.request.body
        for(let role of roles){
            await addRole(role)
        }
        ctx.body = {}
    })

    router.get('/role/:name', async(ctx, next) => {
        ctx.body = await Role.findOne(ctx.params.name)
    })

    router.get('/role', async(ctx, next) => {
        ctx.body = await Role.findAll()
    })

    router.del('/role/:name', async(ctx, next) => {
        let role = await Role.findOne(ctx.params.name),notification_url = common.getServiceApiUrl('notifier'),
            notification = {type:"Role",user:ctx.req.session.passport.user,source:process.env['NODE_NAME']}
        if(role){
            await scirichon_cache.delItem(role)
            await Role.destory(ctx.params.name)
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

