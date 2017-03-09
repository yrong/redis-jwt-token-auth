'use strict';

import mysql from 'mysql';
import config from '../config/config';
import {v1 as neo4j} from 'neo4j-driver'
import {parse} from 'parse-neo4j'
const mysqlConfig = config.mysql
const neo4jConfig = config.neo4j
import _ from 'lodash'

const db = {}
const mysqlPool = mysql.createPool(_.merge({connectionLimit:10},mysqlConfig))
const neo4jDriver = neo4j.driver("bolt://"+neo4jConfig.host+":"+neo4jConfig.port, neo4j.auth.basic(neo4jConfig.user, neo4jConfig.password))

db.querySql = function(sql, params) {
    return new Promise((resolve, reject) => {
        mysqlPool.query(sql, params, function(err, results) {
            if(err) {
                reject(err)
            } else {
                resolve(results)
            }
        })
    })
}

db.queryCql = (cql,params)=>{
    return new Promise((resolve, reject) => {
        const session = neo4jDriver.session()
        session.run(cql, params)
            .then(result => {
                session.close()
                resolve(parse(result))
            })
            .catch(error => {
                session.close()
                error = error.fields ? JSON.stringify(error.fields[0]) : String(error)
                reject(`error while executing Cypher: ${error}`)
            });
    })
}


export default db;
