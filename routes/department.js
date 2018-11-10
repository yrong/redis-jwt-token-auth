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
        let params,departments=[],department,
            roots = (ctx.query.roots&&ctx.query.roots.split(','))
        if(roots){
            for(department of roots){
                params = _.assign({category:'Department'},{uuid:department})
                departments.push(await handler.getItemWithMembers(params,ctx))
            }
        }else{
            departments = await handler.getItemWithMembers({category:'Department',root:true},ctx)
        }
        ctx.body = departments||{}
    })

    router.get('/api/departments/membersByMyself',async(ctx,next)=> {
        let params,department, departments = ctx.req.session.passport.user&&ctx.req.session.passport.user.departments,result=[]
        if(departments){
            for(department of departments){
                params = _.assign({category:'Department'},{uuid:department})
                result.push(await handler.getItemWithMembers(params,ctx))
            }
        }
        ctx.body = result||{}
    })
}