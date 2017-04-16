'use strict';

const db = require('../lib/db')
const logger = require('../logger')
const _ = require('lodash')

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
    logger.info('update password find user:' + cql)
    let account = await db.queryCql(cql)
    if(account == null || account.length != 1) {
        throw new Error(`user with id ${params.uuid} and password ${params.oldpwd} not exist!`)
    }
    logger.info('update password find account:' + JSON.stringify(account[0]))
    return await db.queryCql(`MATCH (u:User{uuid:${params.uuid}}) SET u.passwd = '${params.newpwd}'`)
}

Account.updateInfo = async (params)=>{
    params.uuid = _.isString(params.uuid)?parseInt(params.uuid):params.uuid
    let cql = `MATCH (u:User{uuid:${params.uuid}}) return u`
    logger.info('update info find user:' + cql)
    let account = await db.queryCql(cql)
    if(account == null || account.length != 1) {
        throw new Error(`user with id ${params.uuid} not exist!`)
    }
    account = _.merge(account[0],params)
    logger.info('update userinfo find account:' + JSON.stringify(account[0]))
    return await db.queryCql(`MATCH (u:User{uuid:${params.uuid}}) SET u={account}`,{account})
}

module.exports = Account;