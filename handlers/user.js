const config = require('config')
const _ = require('lodash')
const ScirichonError = require('scirichon-common').ScirichonError
const scirichonCache = require('scirichon-cache')
const acl = require('../lib/acl')
const db = require('../lib/db')
const LdapAccount = require('./ldap_account')

const preProcess = async (params, ctx)=>{
    if(ctx.method==='POST'||ctx.method==='PUT'||ctx.method==='PATCH') {
        params.type = params.fields.type = params.fields.type || 'internal'
        if (params.ldapId) {
            let result = await LdapAccount.searchLdap(params.ldapId, {attributes: config.get('ldap.userAttributes')})
            if (_.isEmpty(result)) {
                throw new ScirichonError('ldap user not found')
            }
        }
        if (params.department) {
            let department = await scirichonCache.getItemByCategoryAndID('Department',params.department)
            params.department_path = params.fields.department_path = department.path
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

const updatePassword = async (params)=>{
    let cql = `MATCH (u:User{uuid:{uuid},passwd:{passwd}}) return u`
    let account = await db.queryCql(cql,{uuid:params.uuid,passwd:params.oldpwd})
    if(account == null || account.length != 1) {
        throw new ScirichonError(`user with id ${params.uuid} and password ${params.oldpwd} not exist!`)
    }
    return await db.queryCql(`MATCH (u:User{uuid:{uuid}}) SET u.passwd = {passwd}`,{uuid:params.uuid,passwd:params.newpwd})
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
    await db.queryCql(`MATCH (n:User) WHERE n.name<>"superadmin" DETACH DELETE n`)
}

module.exports = {preProcess,postProcess,verify,updatePassword,syncAcl,clear}