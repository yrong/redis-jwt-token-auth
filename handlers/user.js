const config = require('config')
const _ = require('lodash')
const ScirichonError = require('scirichon-common').ScirichonError
const scirichonCache = require('scirichon-cache')
const ldapConfig = config.get('auth.ldap')
const scirichonMapper = require('scirichon-response-mapper')
const acl = require('../lib/acl')
const db = require('../lib/db')
const LdapAccount = require('./ldap_account')
const handler = require('./index')

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
        if (params.departments) {
            params.department_path = []
            for(let department of params.departments){
                result = await scirichonCache.getItemByCategoryAndID('Department',department)
                params.department_path = _.concat(params.department_path,result.path)
            }
            params.department_path = params.fields.department_path = _.uniq(params.department_path)
        }
        if (params.change&&params.change.oldpwd&&params.change.newpwd) {
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

const incrStaffCount = async(category,uuid,delta)=>{
    await db.queryCql(`match (n:${category}) where n.uuid={uuid} set n.staff_cnt=n.staff_cnt+${delta}`, {uuid})
    let result = await scirichonCache.getItemByCategoryAndID(category,uuid)
    if(result){
        result.staff_cnt = (result.staff_cnt)||0 + delta
        await scirichonCache.addItem(result)
    }
}

const setUserRoles = async(uuid,roles)=>{
    await revokeUserRoles(uuid)
    await acl.addUserRoles(uuid, roles)
}

const postProcess = async (params, ctx)=>{
    if(ctx.method==='POST') {
        if (params.roles) {
            await setUserRoles(params.uuid, params.roles)
            for(let role of params.roles){
                await incrStaffCount('Role',role.uuid,1)
            }
        }
        if(params.departments){
            for(let department of params.department_path){
                await incrStaffCount('Department',department,1)
            }
        }
    }
    else if(ctx.method==='PUT'||ctx.method==='PATCH'){
        if (params.change.roles) {
            await setUserRoles(params.uuid, params.roles)
            if (params.fields_old.roles) {
                for (let role of params.fields_old.roles) {
                    await incrStaffCount('Role', role, -1)
                }
            }
            for (let role of params.roles) {
                await incrStaffCount('Role', role, 1)
            }
        }
        if(params.change.departments) {
            if (params.fields_old.department_path) {
                for (let department of params.fields_old.department_path) {
                    await incrStaffCount('Department', department, -1)
                }
            }
            for (let department of params.department_path) {
                await incrStaffCount('Department', department, 1)
            }
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

const isLdapUser = (user)=>{
    return user.cn&&user.dn
}

const getFullUser = async (ctx,user)=>{
    if(ctx.request.body.requestAll){
        user = await handler.handleQuery({category:'User',uuid:user.uuid},ctx)
    }
    return user
}

const checkUser = async(ctx,user)=>{
    let params = ctx.request.body
    try{
        user = await scirichonMapper.responseMapper(user,_.assign({category:'User'}))
    }catch(err){
        console.log(err.stack||err)
    }
    if(user.status==='deleted'||user.status==='disabled'){
        ctx.throw(new ScirichonError(`user deleted or disabled`,401))
    }
    if(!_.isEmpty(user.roles)){
        if(_.every(user.roles,(role)=>role.status==='disabled')){
            ctx.throw(new ScirichonError(`user with all roles disabled`,401))
        }
        if(params.illegalRoles){
            if(_.intersection(params.illegalRoles,user.roles).length){
                ctx.throw(new ScirichonError(`user with illegal roles as ${user.roles} can not login`,401))
            }
        }
    }
}

module.exports = {preProcess,postProcess,verify,syncAcl,clear,isLdapUser,getFullUser,checkUser}