const Account = require('../models/account')
const _ = require('lodash')

module.exports = (router)=>{
    router.get('/userinfo', async(ctx, next) => {
        let users = await Account.findAll()
        ctx.body = _.map(users,(user)=>_.omit(user,['passwd','id']))
    });

    router.get('/userinfo/:uuid',async(ctx,next)=>{
        let user = await Account.findOne(ctx.params.uuid)
        ctx.body = _.omit(user,['passwd','id'])
    })

    router.put('/changepwd/:uuid', async(ctx, next) => {
        let params = _.merge({},ctx.params,ctx.request.body)
        await Account.updatePassword(params)
        ctx.body = {}
    })

    router.put('/userinfo/:uuid',async(ctx,next)=>{
        let params = _.merge({},ctx.params,ctx.request.body)
        await Account.updateInfo(params)
        ctx.body = {}
    })

    router.post('/register', async(ctx, next) => {
        let params = ctx.request.body
        ctx.body = await Account.add(params)
    })

    router.del('/unregister/:uuid', async(ctx, next) => {
        await Account.destory(ctx.params.uuid)
        ctx.body = {}
    })
}