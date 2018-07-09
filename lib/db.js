'use strict';

const mysql = require('mysql')
const config = require('config')
const {v1} = require('neo4j-driver')
const neo4j = v1
const {parse} = require('parse-neo4j-fork')
const mysqlConfig = config.get('mysql-auth')
const neo4jConfig = config.get('neo4j')
const _ = require('lodash')
const logger = require('log4js-wrapper-advanced').getLogger()
const db = {}
const mysqlPool = mysql.createPool(_.merge({connectionLimit:10},mysqlConfig))
const neo4jDriver = neo4j.driver("bolt://"+(process.env['NEO4J_HOST']||neo4jConfig.host)+":"+neo4jConfig.port, neo4j.auth.basic(neo4jConfig.user, neo4jConfig.password))

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
        logger.info(`cypher to executed:${JSON.stringify({cql,params},null,'\t')}`)
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


module.exports = db;
