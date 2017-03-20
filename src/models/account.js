'use strict';

import db from '../lib/db'
import logger from '../logger'
import _ from 'lodash'

const Account = {}

Account.findOne = function (id, cb) {
    const account = {"id": 1, "username" : "test", "password" : "test"}
    cb(null, account)
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

export default Account;