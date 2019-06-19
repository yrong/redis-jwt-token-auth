const _ = require('lodash')
const scirichonCrudHandler = require('scirichon-crud-handler')
const getItemWithMembers = scirichonCrudHandler.hooks.getItemWithMembers
const scirichonSchema = require('scirichon-json-schema')

const handleRequest = async (params_, ctx)=>{
    if(ctx.method==='POST')
        scirichonSchema.checkObject(params_.category,params_)
    let params = {token:params_.token,uuid:params_.uuid,category:params_.category,data:{category:params_.category,fields:_.clone(_.omit(params_,['token']))}}
    params = await scirichonCrudHandler.hooks.cudItem_preProcess(params,ctx)
    let result = []
    if(_.isArray(params.cypher)){
        result = await scirichonCrudHandler.cypherInvoker.batchExecuteCypher(ctx,params.cypher,params)
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
