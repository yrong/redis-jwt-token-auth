import log4js from 'log4js';
import config from '../config/config';
const logger = log4js.getLogger(config.app.name);
export default logger
