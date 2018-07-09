const _ = require('lodash')
const search = require('scirichon-search')
const handler = require('../handlers/index')
const userHandler = require('../handlers/user')
const OmitUserFields = require('../lib/const').OmitUserFields

module.exports = (router)=>{
    router.get('/userinfo', async(ctx, next) => {
        let params = _.merge({category:'User'},ctx.query,ctx.params,ctx.request.body)
        let result = await handler.handleQuery(params,ctx)
        result = _.map(result,(user)=>_.omit(user,OmitUserFields))
        ctx.body = result||{}
    })

    router.get('/userinfo/:uuid',async(ctx,next)=>{
        let params = _.merge({category:'User'},ctx.query,ctx.params,ctx.request.body)
        let result = await handler.handleQuery(params,ctx)
        result = _.omit(result,OmitUserFields)
        ctx.body = result||{}
    })

    router.post('/userinfo/search', async(ctx, next) => {
        let params = _.merge({category:'User'},ctx.query,ctx.request.body)
        ctx.body = await search.searchItem(params)||{}
    })

    router.post('/register', async(ctx, next) => {
        let params = _.assign({category:'User'},ctx.params,ctx.request.body)
        params = await handler.handleRequest(params,ctx)
        ctx.body = {uuid:params.uuid}
    })

    router.put('/userinfo/:uuid',async(ctx,next)=>{
        if(_.isEmpty(ctx.request.body)){
            throw new Error('missing request body')
        }
        let params = _.assign({category:'User'},ctx.params,ctx.request.body)
        await handler.handleRequest(params,ctx)
        ctx.body = {}
    })

    router.put('/assocRole/:uuid', async(ctx, next) => {
        let params = _.assign({category:'User'},ctx.params,ctx.request.body)
        await handler.handleRequest(params,ctx)
        ctx.body = {}
    })

    router.put('/assoc/:uuid', async(ctx, next) => {
        let params = _.assign({category:'User'},ctx.params,ctx.request.body)
        await handler.handleRequest(params,ctx)
        ctx.body = {}
    })

    router.put('/changepwd/:uuid', async(ctx, next) => {
        let params = _.merge({category:'User'},ctx.params,ctx.request.body)
        await handler.handleRequest(params,ctx)
        ctx.body = {}
    })

    router.del('/unregister/:uuid', async(ctx, next) => {
        let params = _.assign({category:'User'},ctx.params)
        await handler.handleRequest(params,ctx)
        ctx.body = {}
    })

    router.del('/unregister', async (ctx, next) => {
        let uuids = ctx.request.body.uuids,params
        for (let uuid of uuids) {
            params = _.assign({category:'User',uuid})
            await handler.handleRequest(params,ctx)
        }
        ctx.body = {}
    })
}