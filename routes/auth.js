'use strict';

const Router = require('koa-router')
const router = new Router()
const token_routes = require('./token')
const ldap_routes = require('./ldap')
const role_routes = require('./role')
const user_routes = require('./user')
const department_routes = require('./department')
const sms_routes = require('./sms')

token_routes(router)
ldap_routes(router)
role_routes(router)
user_routes(router)
department_routes(router)
sms_routes(router)

module.exports = router
