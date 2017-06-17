'use strict';

/*init logger */
const log4js_wrapper = require('log4js_wrapper')
const config = require('config')
log4js_wrapper.initialize(config.get('logger'))

const Koa = require('koa')
const baseconfig = require('./base/index')
const middleware = require('./middleware')
const routes = require('./routes')
const app = new Koa()

//configure basic app
baseconfig(app)

//configure custom middleware
app.use(middleware())

//configure custom routes
app.use(routes())

app.listen(config.get('port'));
logger.info("Server started, listening on port: " + config.get('port'));

module.exports = app