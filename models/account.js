'use strict';

const db = require('../lib/db')
const logger = require('../logger')
const _ = require('lodash')
const ldap = require('../lib/ldap')

const Account = {}

Account.findOne = async function (uuid) {
    let account = await db.queryCql(`MATCH (u:User{uuid:${uuid}}) return u`);
    if(account == null || account.length != 1) {
        throw new Error(`user with name ${uuid} not exist!`)
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
    let cypher = `MATCH (n:User) DETACH DELETE n`
    return db.queryCql(cypher);
}

Account.verify = function(username, password) {
    return db.queryCql(`MATCH (u:User{alias:'${username}'}) return u`).then((account)=>{
        if(account == null || account.length != 1) {
            throw new Error(`user with name ${username} not exist!`)
        } else{
            if(password !== account[0].passwd){
                throw new Error("user password not match!");
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
        throw new Error(`user with id ${params.uuid} and password ${params.oldpwd} not exist!`)
    }
    return await db.queryCql(`MATCH (u:User{uuid:${params.uuid}}) SET u.passwd = '${params.newpwd}'`)
}

const getUser = async(params)=>{
    let cql = `MATCH (u:User{uuid:${params.uuid}}) return u`
    let account = await db.queryCql(cql)
    if(account == null || account.length != 1) {
        throw new Error(`user with id ${params.uuid} not exist!`)
    }
    return account[0]
}

Account.updateInfo = async (params)=>{
    let account = await getUser(params)
    account = _.merge(account,_.omit(params,['token','uuid']))
    return await db.queryCql(`MATCH (u:User{uuid:${params.uuid}}) SET u={account}`,{account})
}

Account.updateAssoc = async (params)=>{
    let account = await getUser(params)
    if(!params.ldap_user){
        throw new Error(`missing param ldap_user!`)
    }
    let ldap_user = await ldap.searchUser(params.ldap_user)
    let cql = `MERGE (n:LdapUser {cn: "${ldap_user.cn}"})
                                    ON CREATE SET n = {ldap_user}
                                    ON MATCH SET n = {ldap_user}`
    await db.queryCql(cql,{ldap_user})
    let delRelsExistInUser_cypher = `MATCH (u:User{uuid: ${params.uuid}})-[r:Assoc]-()
                                    DELETE r`
    await db.queryCql(delRelsExistInUser_cypher)
    let addUser2LdapUserRel_cypher = `MATCH (u:User{uuid:${params.uuid}})
                                    MATCH (l:LdapUser {cn:"${ldap_user.cn}"})
                                    CREATE (u)-[r:Assoc]->(l)`
    await db.queryCql(addUser2LdapUserRel_cypher)
}

module.exports = Account;