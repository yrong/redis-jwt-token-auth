const db = require('../lib/db')
const _ = require('lodash')
const acl = require('../lib/acl')
const Role = {}
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError

Role.findOne = async function (uuid) {
    let roles = await db.queryCql(`MATCH (n:Role{uuid:{uuid}}) return n`,{uuid}),role
    role = roles&&roles[0]
    return role
}


Role.findAll = async function () {
    let cypher = `MATCH (n:Role) return n`
    let roles = await db.queryCql(cypher)
    return roles
}

Role.addOrUpdate = async function(params) {
    await acl.removeRole(params.uuid)
    for(let allow of params.allows){
        await acl.allow(params.uuid,allow.resources,allow.permissions)
    }
    if(params.inherits)
        await acl.addRoleParents(params.uuid, params.inherits)
    params.allows = JSON.stringify(params.allows)
    params.additional = JSON.stringify(params.additional)
    let cypher_params = {uuid:params.uuid,fields:params}
    let cypher = `MERGE (n:Role {uuid: {uuid}})
    ON CREATE SET n = {fields}
    ON MATCH SET n = {fields}`
    return await db.queryCql(cypher,cypher_params);
}

Role.destory = async function(uuid) {
    let find_user_cypher = `MATCH (n:User) where {uuid} in n.roles return n`
    let result = await db.queryCql(find_user_cypher,{uuid})
    if(result&&result.length){
        throw new ScirichonError(`已绑定用户:${result[0].uuid}`)
    }
    let cypher = `MATCH (n:Role) WHERE n.uuid = {uuid} DETACH DELETE n`
    await db.queryCql(cypher,{uuid})
    await acl.removeRole(uuid)
}

Role.clearAll = async function() {
    await db.queryCql(`MATCH (n) WHERE n:Role DETACH DELETE n`)
    await acl.backend.cleanAsync()
}

module.exports = Role