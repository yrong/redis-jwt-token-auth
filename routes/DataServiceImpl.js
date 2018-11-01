const _ = require('lodash')
const handler = require('../handlers/index')

module.exports = (router) =>{

    router.get('/department/params',async(ctx,next)=>{

        let returnArr = [],department = []

        if (ctx.query.roots === 'all'){
            let params = _.merge({category:'Department'},ctx.query,ctx.params,ctx.request.body)
            let departments = await handler.handleQuery(params,ctx)
            let arr = departments||[]
            for (let i = 0; i < arr.length; i++) {
                if(arr[i].root){
                    returnArr.push(arr[i].uuid)
                }
            }
            for(let j = 0; j<returnArr.length; j++){
                params = _.assign({category:'Department'},{uuid:returnArr[j]})
                department.push(await handler.getItemWithMembers(params,ctx))
            }
        }else{
            let params ,depart,
                roots = (ctx.query.roots&&ctx.query.roots&&ctx.query.roots.split(','))
            if(roots){
                for(depart of roots){
                    params = _.assign({category:'Department'},{uuid:depart})
                    department.push(await handler.getItemWithMembers(params,ctx))
                }
            }
        }
        ctx.body = {data: department}
    })

}
