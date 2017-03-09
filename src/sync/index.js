import _ from 'lodash'
import db from '../lib/db'

export async function sync(){
    let rows = await db.querySql("SELECT * FROM users"),cypher,result
    for(let row of rows){
        cypher = `MATCH (u:User{uuid:${row.userid}}) return u`
        result = await db.queryCql(cypher)
        if(result&&result.length){
            row = _.merge({},result[0],row)
        }
        row.uuid = row.userid
        cypher = `MERGE (u:User{uuid:${row.userid}}) ON CREATE SET u = {row} ON MATCH SET u = {row}`
        result = await db.queryCql(cypher,{row:row})
    }
    return rows
}



