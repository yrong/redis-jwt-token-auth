'use strict';

const Koa = require('koa')
const baseconfig = require('./base/index')
const middleware = require('./middleware')
const routes = require('./routes')
const config = require('./base/config')
const app = new Koa()
const logger = require('./logger')


//configure basic app
baseconfig(app)

//configure custom middleware
app.use(middleware())

//configure custom routes
app.use(routes())

app.listen(config.app.port);
logger.info("Server started, listening on port: " + config.app.port);

module.exports = app