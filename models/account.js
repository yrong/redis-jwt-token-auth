'use strict';

const db = require('../lib/db')
const _ = require('lodash')
const acl = require('../lib/acl')
const Account = {}
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError
const uuid = require('uuid')

Account.findOne = async function (uuid) {
    let account = await db.queryCql(`MATCH (u:User{uuid:{uuid}}) return u`,{uuid});
    if(account == null || account.length != 1) {
        throw new ScirichonError(`user with name ${uuid} not exist!`)
    }
    return account[0]
}

Account.Search = async function (params) {
    let condition = params&&params.condition||''
    if(!_.isEmpty(params.fields)){
        _.assign(params,params.fields)
        for(let key in params.fields){
            condition = condition + ` AND n.${key}={${key}}`
        }
        if(!condition.includes('where')){
            condition = 'where' + condition.substr(4)
        }
    }
    let cypher = `
    MATCH (n:User) ${condition} WITH count(n) AS cnt
    MATCH (n:User) ${condition}
    WITH n as n, cnt
    SKIP {skip} LIMIT {limit}
    RETURN { count: cnt, results:collect(n) }`
    let account = await db.queryCql(cypher,params);
    return account&&account[0]
}

Account.findAll = async function () {
    let cypher = `
    MATCH (n:User) return collect(n)`
    let account = await db.queryCql(cypher);
    return account&&account[0]
}

Account.add = async function(params) {
    let cypher = `CREATE (n:User) SET n = {fields}`
    await db.queryCql(cypher,{fields:params});
    return {uuid:params.uuid}
}

Account.destory = async function(uuid) {
    let cypher = `MATCH (n:User) WHERE n.uuid = {uuid} DETACH DELETE n`
    db.queryCql(cypher,{uuid})
    let roles = await acl.userRoles(uuid)
    await acl.removeUserRoles(uuid,roles)
}

Account.destoryAll = async function() {
    let cypher = `MATCH (n) WHERE (n:User) OR n:LdapUser DETACH DELETE n`
    return db.queryCql(cypher);
}

Account.verify = async function(username, password) {
    return db.queryCql(`MATCH (u:User{name:{name}}) return u`,{name:username}).then((account)=>{
        if(account == null) {
            throw new ScirichonError(`user with name ${username} not exist!`)
        } else{
            if(password !== account[0].passwd){
                throw new ScirichonError("user password not match!");
            }else {
                return account[0];
            }
        }
    });
}

Account.updatePassword = async (params)=>{
    let cql = `MATCH (u:User{uuid:{uuid},passwd:{passwd}}) return u`
    let account = await db.queryCql(cql,{uuid:params.uuid,passwd:params.oldpwd})
    if(account == null || account.length != 1) {
        throw new ScirichonError(`user with id ${params.uuid} and password ${params.oldpwd} not exist!`)
    }
    return await db.queryCql(`MATCH (u:User{uuid:{uuid}}) SET u.passwd = {passwd}`,{uuid:params.uuid,passwd:params.newpwd})
}

const getUser = async(params)=>{
    let cql = `MATCH (u:User{uuid:{uuid}}) return u`
    let account = await db.queryCql(cql,{uuid:params.uuid})
    if(account == null || account.length != 1) {
        throw new ScirichonError(`user with id ${params.uuid} not exist!`)
    }
    return account[0]
}

Account.updateInfo = async (params)=>{
    let account = await getUser(params)
    account = _.merge(account,_.omit(params,['token','uuid']))
    await db.queryCql(`MATCH (u:User{uuid:{uuid}}) SET u={account}`,{uuid:params.uuid,account})
    return account
}

Account.syncAcl = async()=>{
    await acl.backend.cleanAsync()
    let roles = await db.queryCql(`MATCH (r:Role) return r`)
    for(let role of roles){
        role.allows = JSON.parse(role.allows)
        for(let allow of role.allows){
            acl.allow(role.name,allow.resources,allow.permissions)
        }
        if(role.inherits){
            acl.addRoleParents(role.name, role.inherits)
        }
    }
    let accounts = await db.queryCql(`MATCH (u:User) return u`);
    for(let account of accounts){
        if(account.roles){
            acl.addUserRoles(account.uuid,account.roles)
        }
    }
}

Account.updateRole = async (params)=>{
    let delRoleRelsExistInUser_cypher = `MATCH (u:User{uuid: {uuid}})-[r:AssocRole]-()
                                    DELETE r`
    await db.queryCql(delRoleRelsExistInUser_cypher,{uuid:params.uuid})
    let addUserRoleRel_cypher = `MATCH (u:User{uuid:{uuid}})
                                    UNWIND {roles} AS role_name
                                    MATCH (r:Role {name:role_name})
                                    CREATE (u)-[:AssocRole]->(r)`
    await db.queryCql(addUserRoleRel_cypher,params)
    let addUserRoleProperty_cypher = `MATCH (u:User{uuid:{uuid}})
                                    SET u.roles = {roles}`
    await db.queryCql(addUserRoleProperty_cypher,params)
    let promise = new Promise((resolve,reject)=>{
        acl.userRoles(params.uuid,(err,roles)=>{
            acl.removeUserRoles(params.uuid,roles,(err,res)=>{
                acl.addUserRoles(params.uuid,params.roles,(err,res)=>{
                    resolve(res)
                })
            })
        })
    })
    await Promise.resolve(promise)
}

module.exports = Account;