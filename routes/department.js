const _ = require('lodash')
const handler = require('../handlers/index')

module.exports = (router)=> {

    router.post('/departments', async (ctx, next) => {
        let params = _.assign({category:'Department'},ctx.request.body)
        params = await handler.handleRequest(params,ctx)
        ctx.body = {uuid:params.uuid}
    })

    router.put('/departments/:uuid', async (ctx, next) => {
        let params = _.assign({category:'Department'},ctx.params,ctx.request.body)
        await handler.handleRequest(params,ctx)
        ctx.body = {}
    })

    router.get('/departments/:uuid', async(ctx, next) => {
        let params = _.merge({category:'Department'},ctx.query,ctx.params,ctx.request.body)
        let department = await handler.handleQuery(params,ctx)
        ctx.body = department||{}
    })

    router.get('/departments', async(ctx, next) => {
        let params = _.merge({category:'Department'},ctx.query,ctx.params,ctx.request.body)
        let departments = await handler.handleQuery(params,ctx)
        ctx.body = departments||[]
    })

    router.del('/departments/:uuid', async(ctx, next) => {
        let params = _.assign({category:'Department'},ctx.params)
        await handler.handleRequest(params,ctx)
        ctx.body = {}
    })

    router.get('/api/departments/members',async(ctx,next)=> {
        let user = ctx.req.session.passport.user,result,params
        if(user.department){
            params = _.assign({category:'Department'},{uuid:user.department})
            result = await handler.getItemWithMembers(params,ctx)
        }
        ctx.body = result||{}
    })
}