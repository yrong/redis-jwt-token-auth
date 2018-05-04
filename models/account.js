'use strict';

const db = require('../lib/db')
const _ = require('lodash')
const acl = require('../lib/acl')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError

let Account = {}


Account.findOne = async function (uuid) {
    let accounts = await db.queryCql(`MATCH (u:User{uuid:{uuid}}) return u`,{uuid});
    if(accounts == null || accounts.length != 1) {
        throw new ScirichonError(`user with id ${uuid} not exist!`)
    }
    return accounts[0]
}

Account.findAll = async function () {
    let cypher = `MATCH (n:User) return n`
    let accounts = await db.queryCql(cypher);
    return accounts
}

Account.add = async function(params) {
    let cypher = `CREATE (n:User) SET n = {fields}`
    await db.queryCql(cypher,{fields: params})
    if(params.roles)
        await acl.addUserRoles(params.uuid,params.roles)
    return {uuid:params.uuid}
}

Account.destroy = async function(uuid) {
    let cypher = `MATCH (n:User) WHERE n.uuid = {uuid} DETACH DELETE n`
    db.queryCql(cypher,{uuid})
    let roles = await acl.userRoles(uuid)
    await acl.removeUserRoles(uuid,roles)
}

Account.destoryAll = async function() {
    let cypher = `MATCH (n:User) WHERE n.name<>"superadmin" DETACH DELETE n`
    await db.queryCql(cypher)
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

Account.update = async (params, ctx)=>{
    let account = await Account.findOne(params.uuid),roles
    account = _.merge(account,_.omit(params,['token','uuid']))
    await db.queryCql(`MATCH (u:User{uuid:{uuid}}) SET u={account}`,{uuid:params.uuid,account})
    if(params.roles){
        roles = await acl.userRoles(params.uuid)
        await acl.removeUserRoles(params.uuid,roles)
        await acl.addUserRoles(params.uuid,params.roles)
        await ctx.req.session.deleteByUserId(params.uuid)
    }
    return account
}

Account.syncAcl = async()=>{
    await acl.backend.cleanAsync()
    let roles = await db.queryCql(`MATCH (r:Role) return r`)
    for(let role of roles){
        role.allows = JSON.parse(role.allows)
        for(let allow of role.allows){
            await acl.allow(role.name,allow.resources,allow.permissions)
        }
        if(role.inherits){
            await acl.addRoleParents(role.name, role.inherits)
        }
    }
    let accounts = await db.queryCql(`MATCH (u:User) return u`);
    for(let account of accounts){
        if(account.roles){
            await acl.addUserRoles(account.uuid,account.roles)
        }
    }
}

module.exports = Account;