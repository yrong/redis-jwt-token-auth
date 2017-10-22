const _ = require('lodash')
const Role = require('../models/role')
const Account = require('../models/account')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError

module.exports = (router)=>{
    router.post('/role', async(ctx, next) => {
        let params = ctx.request.body
        await Role.addOrUpdate(params)
        ctx.body = {}
    })

    router.post('/roles', async(ctx, next) => {
        await Role.clearAll()
        let roles = ctx.request.body
        for(let role of roles){
            await Role.addOrUpdate(role)
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
        await Role.destory(ctx.params.name)
        ctx.body = {}
    })

    router.put('/assocRole/:uuid', async(ctx, next) => {
        let params = _.merge({},ctx.params,ctx.request.body)
        if(!params.uuid||!params.roles)
            throw new ScirichonError('assoc role missing params')
        await Account.updateRole(params)
        await ctx.req.session.deleteByUserId(params.uuid)
        ctx.body = {}
    })
}

