const _ = require('lodash')
const search = require('scirichon-search')
const handler = require('../handlers/index')
const roleHandler = require('../handlers/role')

module.exports = (router)=>{
    router.post('/role', async(ctx, next) => {
        let params = _.assign({category:'Role'},ctx.params,ctx.request.body)
        params = await handler.handleRequest(params,ctx)
        ctx.body = {uuid:params.uuid}
    })

    router.put('/role/:uuid', async(ctx, next) => {
        let params = _.assign({category:'Role'},ctx.params,ctx.request.body)
        await handler.handleRequest(params,ctx)
        ctx.body = {}
    })

    router.post('/roles', async(ctx, next) => {
        await roleHandler.clear()
        let roles = ctx.request.body,results = [],params
        for(let role of roles){
            params = _.assign({category:'Role'},ctx.params,role)
            params = await handler.handleRequest(params,ctx)
            results.push(params.uuid)
        }
        ctx.body = results
    })

    router.post('/role/search', async(ctx, next) => {
        let params = _.merge({category:'Role'},ctx.query,ctx.request.body)
        ctx.body = await search.searchItem(params)||{}
    })

    router.get('/role/:uuid', async(ctx, next) => {
        let params = _.merge({category:'Role'},ctx.query,ctx.params,ctx.request.body)
        let result = await handler.handleQuery(params,ctx)
        ctx.body = result||{}
    })

    router.get('/role', async(ctx, next) => {
        let params = _.merge({category:'Role'},ctx.query,ctx.params,ctx.request.body)
        let result = await handler.handleQuery(params,ctx)
        ctx.body = result||{}
    })

    router.del('/role/:uuid', async(ctx, next) => {
        let params = _.assign({category:'Role'},ctx.params)
        await handler.handleRequest(params,ctx)
        ctx.body = {}
    })
}

