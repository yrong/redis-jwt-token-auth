const _ = require('lodash')
const scirichonCrudHandler = require('scirichon-crud-handler')
const getItemWithMembers = scirichonCrudHandler.hooks.getItemWithMembers
const requestHandler = scirichonCrudHandler.hooks.requestHandler
const scirichonSchema = require('scirichon-json-schema')

const handleRequest = async (params, ctx)=>{
    if(ctx.method==='POST')
        scirichonSchema.checkObject(params.category,params)
    params = _.omit(params,['token'])
    requestHandler.fieldsChecker(params)
    params = await scirichonCrudHandler.hooks.cudItem_preProcess(params,ctx)
    let result = []
    if(_.isArray(params.cypher)){
        for(let cypher of params.cypher){
            result.push(await scirichonCrudHandler.cypherInvoker.executeCypher(ctx,cypher,params))
        }
    }else if(_.isString(params.cypher)){
        result = await scirichonCrudHandler.cypherInvoker.executeCypher(ctx,params.cypher,params)
    }
    params = await scirichonCrudHandler.hooks.cudItem_postProcess(result,params,ctx)
    return params
}

const handleQuery = async (params,ctx)=>{
    params = await scirichonCrudHandler.hooks.queryItems_preProcess(params,ctx)
    let result = await scirichonCrudHandler.cypherInvoker.executeCypher(ctx,params.cypher,params)
    result = await scirichonCrudHandler.hooks.queryItems_postProcess(result,params,ctx)
    return result
}

module.exports = {handleRequest,handleQuery,getItemWithMembers}