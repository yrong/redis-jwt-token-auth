const config = require('config')
const _ = require('lodash')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError
const db = require('../lib/db')
const ldap = require('../lib/ldap')
const LdapAccount = {}
const OmitUserFields = require('../lib/const').OmitUserFields
const ldapConfig = config.get('auth.ldap')

LdapAccount.getLocalByLdap = async (ldap_user)=>{
    let bindType = ldapConfig.bindType,ldapId = ldap_user[bindType]
    if(!ldapId){
        throw new ScirichonError(`no ${bindType} found in ldap user ${JSON.stringify(ldap_user)}`,401)
    }
    let cypher = `MATCH (u:User) where u.ldapId={ldapId} return u`
    let users = await db.queryCql(cypher,{ldapId})
    return users.length?_.omit(users[0],OmitUserFields):undefined
}

LdapAccount.searchLdap = async(base,options)=>{
    options = options||{}
    options.scope = 'sub'
    let items = await ldap.searchByFilter(base,options)
    return items
}

LdapAccount.searchLdapPagination = async(base,objectclass,page_params,attributes)=>{
    let options = {filter:`(objectclass=${objectclass})`,paged:{pageSize:config.get('perPageSize'),page:1}}
    if(page_params.page)
        options.paged.page = parseInt(page_params.page)
    if(page_params.per_page)
        options.paged.pageSize = parseInt(page_params.per_page)
    if(attributes)
        options.attributes = attributes
    let items = await LdapAccount.searchLdap(base,options)
    return items
}


module.exports = LdapAccount