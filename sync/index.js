const _ = require('lodash')
const db = require('../lib/db')
const config = require('config')
const rp = require('request-promise')

const syncWithMysql = async function() {
    let rows = await db.querySql("SELECT * FROM users"),cypher,result
    for(let row of rows){
        cypher = `MATCH (u:User{uuid:${row.userid}}) return u`
        result = await db.queryCql(cypher)
        if(result&&result.length){
            row = _.merge({},result[0],row)
        }
        row.uuid = row.userid
        row.category = 'User'
        cypher = `MERGE (u:User{uuid:${row.userid}}) ON CREATE SET u = {row} ON MATCH SET u = {row}`
        result = await db.queryCql(cypher,{row:row})
    }
    return rows
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
                XDEBUG_SESSION_START: 'PHPSTORM',
                format: 'json'
            },
            headers: {Authorization: auth}
        },
        result, results = [], errors = []
    for(let row of rows){
        options.form = {userid:row.alias,password:row.passwd}
        try {
            result = await rp(options)
            results.push(result)
        }catch(error){
            errors.push(String(error))
        }
    }
    return {results,errors};
}

module.exports = {syncWithMysql,sync2NextCloud}


