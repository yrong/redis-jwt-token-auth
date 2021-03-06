const db = require('../lib/db')
const scirichonCache = require('scirichon-cache')

const preProcess = async (params, ctx)=>{
    if(ctx.method==='POST'||ctx.method==='PUT'||ctx.method==='PATCH') {
        if (!params.fields.parent) {
            params.fields.path = [params.uuid]
        } else {
            let parent = await scirichonCache.getItemByCategoryAndID('Department',params.fields.parent)
            if(parent&&parent.path){
                params.fields.path = parent.path.concat(params.uuid)
            }
        }
        params.fields.staff_cnt = params.fields.staff_cnt||0
    }
    return params
}

const postProcess = async (params, ctx)=>{
    return params
}

const getDepartmentsByPath = async (uuid)=>{
    let cypher = `match (n:Department) where {uuid} in n.path return n`
    let result = await db.queryCql(cypher,{uuid})
    return result
}

const clear = async ()=>{
    await db.queryCql(`MATCH (n:Department) DETACH DELETE n`)
}


module.exports = {preProcess,postProcess,getDepartmentsByPath,clear}