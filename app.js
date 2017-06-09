'use strict';

const Koa = require('koa')
const baseconfig = require('./base/index')
const middleware = require('./middleware')
const routes = require('./routes')
const config = require('config')
const app = new Koa()

//configure basic app
baseconfig(app)
const logger = require('./logger')

//configure custom middleware
app.use(middleware())

//configure custom routes
app.use(routes())

app.listen(config.get('port'));
logger.info("Server started, listening on port: " + config.get('port'));

module.exports = app