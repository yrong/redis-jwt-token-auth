const config = require('config')
const _ = require('lodash')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError
const db = require('../lib/db')
const ldap = require('../lib/ldap')
const Account = {}

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
        cql = `MATCH (u:User{uuid: {uuid}})-[r:Assoc]-()
               DELETE r`
        await db.queryCql(cql,{uuid:params.uuid})
        cql = `MATCH (u:User{uuid:{uuid}})
               MATCH (l:LdapUser {${config.get('ldap.bindType')}:{ldapId}})
               CREATE (u)-[:Assoc]->(l)`
        await db.queryCql(cql,{uuid:params.uuid,ldapId:params.ldapId})
    }else{
        throw new ScirichonError('ldap user not found')
    }
}

Account.unAssocLocal = async (params)=>{
    let delRelsExistInUser_cypher = `MATCH (u:User{uuid: {uuid}})-[r:Assoc]-()
                                    DELETE r`
    await db.queryCql(delRelsExistInUser_cypher,{uuid:params.uuid})
}


Account.getLocalByLdap = async (ldap_user)=>{
    if(!ldap_user[config.get('ldap.bindType')]){
        throw new ScirichonError(`no ${config.get('ldap.bindType')} found in ldap attributes`)
    }
    let cypher = `MATCH (u:User)-[r:Assoc]->(l:LdapUser {${config.get('ldap.bindType')}:{ldapId}})
                  RETURN u`
    let users = await db.queryCql(cypher,{ldapId:ldap_user[config.get('ldap.bindType')]})
    return users.length?_.pick(users[0],['category','uuid','name','avatar','roles','email']):undefined
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

module.exports = Account