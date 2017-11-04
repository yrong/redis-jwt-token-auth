'use strict';

const passport = require('koa-passport')
const AccountModel = require('../models/account')
const _ = require('lodash');
const LdapStrategy = require('passport-ldapauth-fork')
const config = require('config')
const passport_local = require('passport-local')
const LocalStrategy = passport_local.Strategy
const log4js = require('log4js');

passport.serializeUser(function(user, done) {
    if(user.cn) {
        user = _.pick(user, ['cn', 'dn'])
    }
    else{
        user = _.pick(user, ['alias','category','name','userid','uuid','avatar','roles'])
    }
    user.login_date = new Date().toISOString()
    user.expiration_date = new Date(Date.now()+config.get('expiration')*1000).toISOString()
    done(null, user)
})

passport.deserializeUser(function(user, done) {
    done(user)
})

passport.use(new LocalStrategy(function(username, password, done) {
  AccountModel.verify(username, password)
    .then(function(user) {
        if(user != null) {
            done(null, user)
        }  else {
            done(null, false)
        }
    }).catch(done)
}))

let ldap_options = config.get('ldap')
const logger = log4js.getLogger('ldapauth')
ldap_options.server.log = logger
passport.use(new LdapStrategy(ldap_options));


