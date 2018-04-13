const config = require('config')
const _ = require('lodash')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError
const db = require('../lib/db')
const ldap = require('../lib/ldap')
const Account = {}

Account.updateLocal2LdapAssoc = async (params)=>{
    let ldapId = params.ldapId,cql, bindType = config.get('ldap.bindType'),result,ldap_user,local_user
    result = await ldap.searchByFilter(ldapId,{attributes:config.get('ldap.userAttributes')})
    if(_.isEmpty(result)){
        throw new ScirichonError('ldap user not found')
    }
    ldap_user = result[0]
    cql = `MATCH (n:User{uuid:{uuid}}) return n`
    result = await db.queryCql(cql,{uuid:params.uuid})
    if(_.isEmpty(result)){
        throw new ScirichonError('local user not found')
    }
    cql = `MATCH (u:User{uuid: {uuid}})-[r:Assoc]-() DELETE r`
    await db.queryCql(cql,{uuid:params.uuid})
    cql = `MATCH (n:LdapUser)
               where n.${bindType}={ldapId}
               DETACH
               DELETE n`
    await db.queryCql(cql,{ldapId})
    cql = `CREATE (n:LdapUser) SET n = {ldap_user}`
    await db.queryCql(cql,{ldap_user})
    cql = `MATCH (u:User{uuid:{uuid}})
               MATCH (l:LdapUser {${bindType}:{ldapId}})
               CREATE (u)-[:Assoc]->(l)`
    await db.queryCql(cql,{uuid:params.uuid,ldapId:params.ldapId})
}

Account.unAssocLocal = async (uuid)=>{
    let cql = `MATCH (u:User{uuid: {uuid}})-[r:Assoc]-()
                                    DELETE r`
    await db.queryCql(cql,{uuid})
}


Account.getLocalByLdap = async (ldap_user)=>{
    let bindType = config.get('ldap.bindType')
    if(!ldap_user[bindType]){
        throw new ScirichonError(`no ${config.get('ldap.bindType')} found in ldap attributes`)
    }
    let cypher = `MATCH (u:User)-[r:Assoc]->(l:LdapUser {${bindType}:{ldapId}})
                  RETURN u`
    let users = await db.queryCql(cypher,{ldapId:ldap_user[bindType]})
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