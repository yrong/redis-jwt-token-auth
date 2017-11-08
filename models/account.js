'use strict';

const db = require('../lib/db')
const _ = require('lodash')
const ldap = require('../lib/ldap')
const config = require('config')
const acl = require('../lib/acl')
const Account = {}
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError

Account.findOne = async function (uuid) {
    let account = await db.queryCql(`MATCH (u:User{uuid:${uuid}}) return u`);
    if(account == null || account.length != 1) {
        throw new ScirichonError(`user with name ${uuid} not exist!`)
    }
    return account[0]
}

Account.findAll = async function () {
    let account = await db.queryCql(`MATCH (u:User) return u`);
    return account
}

Account.add = async function(params) {
    params.uuid = params.userid
    params.category = 'User'
    let cypher_params = {uuid:params.userid,fields:params}
    let cypher = `MERGE (n:User {uuid: {uuid}})
    ON CREATE SET n = {fields}
    ON MATCH SET n = {fields}`
    return await db.queryCql(cypher,cypher_params);
}

Account.destory = function(uuid) {
    let cypher = `MATCH (n:User) WHERE n.uuid = ${uuid} DETACH DELETE n`
    return db.queryCql(cypher);
}

Account.destoryAll = function() {
    let cypher = `MATCH (n) WHERE n:User OR n:LdapUser DETACH DELETE n`
    return db.queryCql(cypher);
}

Account.verify = function(username, password) {
    return db.queryCql(`MATCH (u:User{alias:'${username}'}) return u`).then((account)=>{
        if(account == null || account.length != 1) {
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
    let cql = `MATCH (u:User{uuid:${params.uuid},passwd:'${params.oldpwd}'}) return u`
    let account = await db.queryCql(cql)
    if(account == null || account.length != 1) {
        throw new ScirichonError(`user with id ${params.uuid} and password ${params.oldpwd} not exist!`)
    }
    return await db.queryCql(`MATCH (u:User{uuid:${params.uuid}}) SET u.passwd = '${params.newpwd}'`)
}

const getUser = async(params)=>{
    let cql = `MATCH (u:User{uuid:${params.uuid}}) return u`
    let account = await db.queryCql(cql)
    if(account == null || account.length != 1) {
        throw new ScirichonError(`user with id ${params.uuid} not exist!`)
    }
    return account[0]
}

Account.updateInfo = async (params)=>{
    let account = await getUser(params)
    account = _.merge(account,_.omit(params,['token','uuid']))
    return await db.queryCql(`MATCH (u:User{uuid:${params.uuid}}) SET u={account}`,{account})
}

Account.updateLocal2LdapAssoc = async (params)=>{
    if(!params.ldapId){
        throw new ScirichonError(`missing param ldapId!`)
    }
    let ldap_user = await ldap.searchByFilter(params.ldapId,{attributes:config.get('ldap.userAttributes')}),cql
    if(ldap_user&&ldap_user.length){
        ldap_user = ldap_user[0]
        cql = `MERGE (n:LdapUser {${config.get('ldap.bindType')}: "${params.ldapId}"})
               ON CREATE SET n = {ldap_user}
               ON MATCH SET n = {ldap_user}`
        await db.queryCql(cql,{ldap_user})
        cql = `MATCH (u:User{uuid: ${params.uuid}})-[r:Assoc]-()
               DELETE r`
        await db.queryCql(cql)
        cql = `MATCH (u:User{uuid:${params.uuid}})
               MATCH (l:LdapUser {${config.get('ldap.bindType')}:"${params.ldapId}"})
               CREATE (u)-[:Assoc]->(l)`
        await db.queryCql(cql)
    }else{
        throw new ScirichonError('ldap user not found')
    }
}

Account.unAssocLocal = async (params)=>{
    let delRelsExistInUser_cypher = `MATCH (u:User{uuid: ${params.uuid}})-[r:Assoc]-()
                                    DELETE r`
    await db.queryCql(delRelsExistInUser_cypher)
}


Account.getLocalByLdap = async (ldap_user)=>{
    if(!ldap_user[config.get('ldap.bindType')]){
        throw new ScirichonError(`no ${config.get('ldap.bindType')} found in ldap attributes`)
    }
    let cypher = `MATCH (u:User)-[r:Assoc]->(l:LdapUser {${config.get('ldap.bindType')}:"${ldap_user[config.get('ldap.bindType')]}"})
                  RETURN u`
    let users = await db.queryCql(cypher)
    return users.length?_.omit(users[0],['passwd','id']):undefined
}

Account.searchLdap = async(base,options)=>{
    options = options||{}
    options.scope = 'sub'
    let items = await ldap.searchByFilter(base,options)
    return items
}

Account.searchLdapPagination = async(base,objectclass,page_params,attributes)=>{
    let options = {filter:`(objectclass=${objectclass})`,paged:{pageSize:config.get('perPageSize'),page:1}}
    if(page_params.page)
        options.paged.page = parseInt(page_params.page)
    if(page_params.per_page)
        options.paged.pageSize = parseInt(page_params.per_page)
    if(attributes)
        options.attributes = attributes
    let items = await Account.searchLdap(base,options)
    return items
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
    let delRoleRelsExistInUser_cypher = `MATCH (u:User{uuid: ${params.uuid}})-[r:AssocRole]-()
                                    DELETE r`
    await db.queryCql(delRoleRelsExistInUser_cypher)
    let addUserRoleRel_cypher = `MATCH (u:User{uuid:${params.uuid}})
                                    UNWIND {roles} AS role_name
                                    MATCH (r:Role {name:role_name})
                                    CREATE (u)-[:AssocRole]->(r)`
    await db.queryCql(addUserRoleRel_cypher,params)
    let addUserRoleProperty_cypher = `MATCH (u:User{uuid:${params.uuid}})
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