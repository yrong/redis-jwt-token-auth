'use strict';

/*init logger */
const log4js_wrapper = require('log4js_wrapper')
const config = require('config')
log4js_wrapper.initialize(config.get('logger'))
const logger = log4js_wrapper.getLogger()

const Koa = require('koa')
const baseconfig = require('./base/index')
const middleware = require('./middleware')
const routes = require('./routes')
const app = new Koa()
const Account = require('./models/account')

//configure basic app
baseconfig(app)

//configure custom middleware
app.use(middleware())

//configure custom routes
app.use(routes())

Account.syncAcl().then(()=>{
    app.listen(config.get('auth.port'));
    logger.info("Server started, listening on port: " + config.get('auth.port'))
})

process.on('uncaughtException', (err) => {
    logger.error(`Caught exception: ${err}`)
})