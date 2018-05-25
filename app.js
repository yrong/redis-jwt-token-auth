'use strict';

/*init logger */
const log4js_wrapper = require('log4js_wrapper')
const config = require('config')
log4js_wrapper.initialize(config.get('logger'))
const logger = log4js_wrapper.getLogger()
const scirichonSchema = require('scirichon-json-schema')
const scirichonCache = require('scirichon-cache')
const scirichonSearch = require('scirichon-search')
const scirichonCrudHandler = require('scirichon-crud-handler')
const responseWrapper = require('scirichon-response-wrapper')
const KoaNeo4jApp = require('koa-neo4j-monitor')
const neo4jConfig = config.get('neo4j')
const middlewares = require('./middleware')
const routes = require('./routes')

/**
 * int koa app and load scirichon-middlewares
 */
let koaNeo4jOptions = {
    neo4j: {
        boltUrl: `bolt://${process.env['NEO4J_HOST']||neo4jConfig.host}:${neo4jConfig.port}`,
        user: process.env['NEO4J_USER']||neo4jConfig.user,
        password: process.env['NEO4J_PASSWD']||neo4jConfig.password
    },
    middleware:middlewares()
}
if(config.get('wrapResponse'))
    koaNeo4jOptions.responseWrapper = responseWrapper
const app = new KoaNeo4jApp(koaNeo4jOptions)
app.keys = [config.get('secret')]
const session = require('koa-session')
app.use(session({},app))

const initializeComponents = async ()=>{
    await app.neo4jConnection.initialized
    let redisOption = {host:`${process.env['REDIS_HOST']||config.get('redis.host')}`,port:config.get('redis.port')}
    let schema_option = {redisOption,prefix:process.env['SCHEMA_TYPE']}
    await scirichonSchema.initialize(schema_option)
    await scirichonCache.initialize(schema_option)
    await scirichonSearch.initialize(schema_option)
    await scirichonCrudHandler.initialize(schema_option)
}

initializeComponents().then(()=>{
    routes.crudRoutes(app)
    app.use(routes.customizedRoutes)
    app.server.listen(config.get('auth.port'),()=>{
        logger.info("Server started, listening on port: " + config.get('auth.port'))
    })
})

process.on('uncaughtException', (err) => {
    logger.error(`Caught exception: ${err}`)
})