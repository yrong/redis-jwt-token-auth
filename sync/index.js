const _ = require('lodash')
const db = require('../lib/db')
const config = require('config')
const rp = require('request-promise')
const webdav = require("webdav")
const Account = require('../models/account')

const syncWithMysql = async function() {
    let rows = await db.querySql("SELECT * FROM users"),cypher,result,errors = [],results = []
    for(let row of rows){
        try {
            cypher = `MATCH (u:User{alias:'${row.alias}'}) return u`
            result = await db.queryCql(cypher)
            if (result && result.length) {
                row = _.merge({}, result[0], row)
                row.userid = row.uuid = result[0].userid
            }else{
                row.uuid = row.userid
            }
            row.category = 'User'
            cypher = `MERGE (u:User{uuid:${row.userid}}) ON CREATE SET u = {row} ON MATCH SET u = {row}`
            result = await db.queryCql(cypher, {row: row})
            results.push(result)
            console.log(`sync user ${JSON.stringify(row)} from mysql to neo4j`)
        }catch(error){
            errors.push(String(error))
        }
    }
    return {results,errors}
}

const sync2NextCloud = async function() {
    let rows = await db.queryCql("MATCH (n:User) return n")
    let nextcloud = config.get('nextcloud'), user_provison_path = '/ocs/v1.php/cloud/users',
        auth = "Basic " + new Buffer(nextcloud.adminuser + ":" + nextcloud.password).toString("base64"),
        options = {
            method: 'POST',
            uri: nextcloud.host + user_provison_path,
            json: true,
            qs: {
                format: 'json'
            },
            headers: {Authorization: auth,"OCS-APIREQUEST":true}
        },
        result, results = [], errors = []
    for(let row of rows){
        options.form = {userid:row.alias,password:row.passwd}
        try {
            result = await rp(options)
            results.push(result)
            console.log(`sync user ${row.alias} from neo4j to nextcloud`)
        }catch(error){
            errors.push(String(error))
        }
    }
    let publicshare_results = await addPublicShare()
    results.push(publicshare_results.results)
    errors.push(publicshare_results.errors)
    return {results,errors};
}

const addPublicShare = async ()=>{
    let nextcloud = config.get('nextcloud'),
        auth = "Basic " + new Buffer(nextcloud.adminuser + ":" + nextcloud.password).toString("base64"),
        group_provision_path = '/ocs/v1.php/cloud/groups',
        user_provision_path = '/ocs/v1.php/cloud/users',
        webdav_admin_path = `/remote.php/dav/files/${nextcloud.adminuser}`,
        share_provision_path = '/ocs/v1.php/apps/files_sharing/api/v1/shares',
        options = {
            json: true,
            qs: {
                format: 'json'
            },
            headers: {Authorization: auth,"OCS-APIREQUEST":true}
        },
        result, results = [], errors = []
    /**
     * add group
     */
    options.method = "POST"
    options.uri = `${nextcloud.host}${group_provision_path}`
    options.form = {groupid:nextcloud.group}
    try{
        result = await rp(options)
        console.log(`add group ${nextcloud.group}`)
        results.push(result)
    }catch(error){
        errors.push(String(error))
    }
    /**
     * add users to group
     */
    options.method = "GET"
    options.uri = `${nextcloud.host}${user_provision_path}`
    let rows = await rp(options)
    //add user to public group
    if(rows&&rows.ocs.data.users){
        for(let user of rows.ocs.data.users){
            options.uri = `${nextcloud.host}${user_provision_path}/${user}/groups`
            options.form = {groupid:nextcloud.group}
            options.method = 'POST'
            try {
                result = await rp(options)
                results.push(result)
                console.log(`add user ${user} to group ${nextcloud.group}`)
            }catch(error){
                errors.push(String(error))
            }
        }
    }
    /**
     * add public folder
     */
    let client = webdav(
        `${nextcloud.host}${webdav_admin_path}`,
        nextcloud.adminuser,
        nextcloud.password
    );
    try{
        result = await client.createDirectory(`/${nextcloud.group}`)
        console.log('create public folder')
        results.push(result.url)
    }catch(error){
        errors.push(String(error))
    }
    /**
     * add link share for public folder
     */
    options.method = "POST"
    options.uri = `${nextcloud.host}${share_provision_path}`
    options.form = {path:`/${nextcloud.group}`,shareType:3,
        publicUpload:nextcloud.publicUpload,permissions:nextcloud.permissions}
    try{
        result = await rp(options)
        console.log(`add link share for public folder`)
        results.push(result)
    }catch(error){
        errors.push(String(error))
    }
    /**
     * add group share for public folder
     */
    try{
        options.form.shareType =1
        options.form.shareWith =nextcloud.group
        result = await rp(options)
        console.log(`add group share for public folder`)
        results.push(result)
    }catch(error){
        errors.push(String(error))
    }
    return {results,errors};
}

const syncWithLdap = async function() {
    let uuid_type = config.get('ldap.server.uuid_type')
    let cypher = `MATCH (u:LdapUser) return u`
    let result = await db.queryCql(cypher)
    let user,ldap_user,results = []
    for(user of result){
        ldap_user = await Account.searchLdap(user[uuid_type],{})
        if(ldap_user&&ldap_user.length){
            cypher = `MERGE (u:LdapUser{${uuid_type}:'${user[uuid_type]}'}) ON CREATE SET u = {row} ON MATCH SET u = {row}`
            result = await db.queryCql(cypher, {row: ldap_user[0]})
            results.push(ldap_user[0])
        }
    }
    return results
}

module.exports = {syncWithMysql,sync2NextCloud,syncWithLdap}


