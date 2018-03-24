const db = require('../lib/db')
const _ = require('lodash')
const acl = require('../lib/acl')
const Role = {}
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError

Role.findOne = async function (name) {
    let roles = await db.queryCql(`MATCH (n:Role{name:{name}}) return n`,{name}),role;
    if(roles.length == 1) {
        role = roles[0]
        role.allows = JSON.parse(role.allows)
        if(role.additional)
            role.additional = JSON.parse(role.additional)
        role = _.omit(role,['id'])
    }
    return role
}

Role.mapRoles = async (roles)=>{
    let result = []
    for(let role of roles){
        role = await Role.findOne(role)
        if(role)
            result.push(role)
    }
    return result
}

Role.findAll = async function () {
    let roles = await db.queryCql(`MATCH (n:Role) return n`);
    roles = _.map(roles,(role)=>{
        if(role.allows)
            role.allows = JSON.parse(role.allows)
        if(role.additional)
            role.additional = JSON.parse(role.additional)
        role = _.omit(role,['id'])
        return role
    })
    return roles
}

Role.addOrUpdate = async function(params) {
    params.category = 'Role'
    if(!params.name || !params.allows)
        throw new ScirichonError('role missing params')
    await acl.removeRole(params.name)
    for(let allow of params.allows){
        await acl.allow(params.name,allow.resources,allow.permissions)
    }
    if(params.inherits)
        await acl.addRoleParents(params.name, params.inherits)
    params.allows = JSON.stringify(params.allows)
    params.additional = JSON.stringify(params.additional)
    let cypher_params = {name:params.name,fields:params}
    let cypher = `MERGE (n:Role {name: {name}})
    ON CREATE SET n = {fields}
    ON MATCH SET n = {fields}`
    return await db.queryCql(cypher,cypher_params);
}

Role.destory = async function(name) {
    let find_user_cypher = `MATCH (r:Role) WHERE r.name = {name}
                    MATCH (u:User)-[:AssocRole]->(r)
                    RETURN u`
    let result = await db.queryCql(find_user_cypher,{name})
    if(result&&result.length){
        throw new ScirichonError(`user already assoc,user:${result[0].uuid}`)
    }
    let cypher = `MATCH (n:Role) WHERE n.name = {name} DETACH DELETE n`
    await db.queryCql(cypher,{name})
    await acl.removeRole(name)
}

Role.clearAll = async function() {
    await db.queryCql(`MATCH (n) WHERE n:Role DETACH DELETE n`)
    await acl.backend.cleanAsync()
}

module.exports = Role