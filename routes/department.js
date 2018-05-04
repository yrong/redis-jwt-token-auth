const _ = require('lodash')
const Department = require('../models/department')
const responseWrapper = require('scirichon-response-mapper')


module.exports = (router)=> {

    router.post('/departments', async (ctx, next) => {
        let department = _.clone(ctx.request.body)
        department = await Department.addDepartment(department)
        ctx.body = {uuid:department.uuid}
    })

    router.get('/departments/:uuid', async(ctx, next) => {
        let uuid = ctx.params.uuid,department
        department = await Department.getDepartment(uuid)
        department = await responseWrapper.responseMapper(department,_.assign({category:'Department'},ctx.query))
        ctx.body = department
    })

    router.get('/departments', async(ctx, next) => {
        let local_user = ctx.req.session.passport.user,result,departments=[]
        if(local_user.department) {
            result = await Department.getDepartments(local_user.department)
            if (result.length) {
                for (let department of result) {
                    department = await responseWrapper.responseMapper(department,_.assign({category:'Department'},ctx.query))
                    departments.push(department)
                }
            }
        }
        ctx.body = departments
    })

    router.del('/departments/:uuid', async(ctx, next) => {
        let uuid = ctx.params.uuid
        await Department.deleteDepartment(uuid)
        ctx.body = {}
    })

    router.get('/api/departments/members',async(ctx,next)=> {
        let local_user = ctx.req.session.passport.user,result
        if(local_user.department){
            result = await Department.getDepartmentTree(local_user.department)
        }
        ctx.body = result||{}
    })
}