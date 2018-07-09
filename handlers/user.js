const config = require('config')
const _ = require('lodash')
const ScirichonError = require('scirichon-common').ScirichonError
const scirichonCache = require('scirichon-cache')
const acl = require('../lib/acl')
const db = require('../lib/db')
const LdapAccount = require('./ldap_account')
const ldapConfig = config.get('auth.ldap')

const sanitizeInput = function(input) {
    return input
        .replace(/\*/g, '\\2a')
        .replace(/\(/g, '\\28')
        .replace(/\)/g, '\\29')
        .replace(/\\/g, '\\5c')
        .replace(/\0/g, '\\00')
        .replace(/\//g, '\\2f');
};

const preProcess = async (params, ctx)=>{
    let result
    if(ctx.method==='POST'||ctx.method==='PUT'||ctx.method==='PATCH') {
        params.type = params.fields.type = params.fields.type || 'internal'
        if (params.ldapId) {
            let filter = ldapConfig.bindType==='dn'?params.ldapId:(ldapConfig.searchFilter.replace(/{{username}}/g, sanitizeInput(params.ldapId)))
            result = await LdapAccount.searchLdap(ldapConfig.userSearchBase, {filter,attributes: ldapConfig.userAttributes})
            if (_.isEmpty(result)) {
                throw new ScirichonError('ldap user not found')
            }
        }
        if (params.department) {
            result = await scirichonCache.getItemByCategoryAndID('Department',params.department)
            params.department_path = params.fields.department_path = result.path
        }
        if (params.uuid&&params.oldpwd&&params.newpwd) {
            result = await db.queryCql(`MATCH (u:User{uuid:{uuid},passwd:{passwd}}) return u`,{uuid:params.uuid,passwd:params.oldpwd})
            if(result == null || result.length != 1) {
                throw new ScirichonError(`user with id ${params.uuid} and password ${params.oldpwd} not exist!`)
            }
            params.passwd = params.fields.passwd = params.newpwd
        }
    }
    return params
}

const revokeUserRoles = async (uuid)=>{
    let roles = await acl.userRoles(uuid)
    await acl.removeUserRoles(uuid, roles)
}

const postProcess = async (params, ctx)=>{
    if(ctx.method==='POST'||ctx.method==='PUT'||ctx.method==='PATCH') {
        if (params.roles) {
            await revokeUserRoles(params.uuid)
            await acl.addUserRoles(params.uuid, params.roles)
        }
    }
    else if(ctx.method==='DELETE'){
        if (params.roles) {
            await revokeUserRoles(params.uuid)
        }
    }
    return params
}

const verify = async function(username, password) {
    return db.queryCql(`MATCH (u:User{name:{name}}) return u`,{name:username}).then((account)=>{
        if(_.isEmpty(account)) {
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

const syncAcl = async()=>{
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

const clear = async()=>{
    await db.queryCql(`MATCH (n:User) DETACH DELETE n`)
}

module.exports = {preProcess,postProcess,verify,syncAcl,clear}