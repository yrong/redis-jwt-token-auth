'use strict';

import Koa from 'koa';
import baseconfig from './config/base';
import middleware from './middleware';
import routes from './routes';
import config from './config/config';
const app = new Koa();
import logger from './logger'


//configure basic app
baseconfig(app)

//configure custom middleware
app.use(middleware())

//configure custom routes
app.use(routes())

app.listen(config.app.port);
logger.info("Server started, listening on port: " + config.app.port);

export default app