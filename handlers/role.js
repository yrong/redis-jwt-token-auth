const _ = require('lodash')
const acl = require('../lib/acl')
const db = require('../lib/db')
const ScirichonError = require('scirichon-common').ScirichonError

const preProcess = async (params, ctx)=>{
    if(ctx.method==='POST'||ctx.method==='PUT'||ctx.method==='PATCH') {
        params.type = params.fields.type = params.fields.type || 'internal'
        params.uuid = params.fields.uuid = params.fields.name
    }
    else if(ctx.method==='DELETE'){
        let cypher = `MATCH (n:User) where {uuid} in n.roles return n`
        let result = await db.queryCql(cypher,{uuid:params.uuid})
        if(result&&result.length){
            throw new ScirichonError(`已绑定用户:${result[0].uuid}`)
        }
    }
    return params
}

const postProcess = async (params, ctx)=>{
    if(ctx.method==='POST'||ctx.method==='PUT'||ctx.method==='PATCH') {
        await acl.removeRole(params.uuid)
        for (let allow of params.allows) {
            await acl.allow(params.uuid, allow.resources, allow.permissions)
        }
        if (params.inherits)
            await acl.addRoleParents(params.uuid, params.inherits)
    }
    else if(ctx.method==='DELETE'){
        await acl.removeRole(params.uuid)
    }
    return params
}

const clear = async ()=>{
    await db.queryCql(`MATCH (n:Role) DETACH DELETE n`)
    await acl.backend.cleanAsync()
}

module.exports = {preProcess,postProcess,clear}