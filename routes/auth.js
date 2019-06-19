const scirichonCache = require('scirichon-cache')
const scirichonSearch = require('scirichon-search')
const userHandler = require('../handlers/user')
const departmentHandler = require('../handlers/department')
const roleHandler = require('../handlers/role')

module.exports = (router)=>{
    require('./token')(router)
    require('./ldap')(router)
    require('./role')(router)
    require('./user')(router)
    require('./department')(router)
    require('./sms')(router)
    require('./DataServiceImpl')(router)
    router.post('/hidden/clean', async(ctx, next) => {
        await departmentHandler.clear()
        await roleHandler.clear()
        await userHandler.clear()
        await scirichonCache.flushAll()
        await scirichonSearch.deleteAll('role,department,user')
        ctx.body = {}
    })
}
