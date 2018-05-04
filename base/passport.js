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
    if(user[config.get('ldap.bindType')]) {
        user = _.pick(user, ['cn', 'dn'])
    }
    else{
        user = _.omit(user, config.get('userFieldsIgnored4Token'))
    }
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

let ldap_options = _.clone(config.get('ldap'))
const logger = log4js.getLogger('ldapauth')
ldap_options.log = logger
ldap_options.searchBase = ldap_options.userSearchBase
ldap_options.searchAttributes = ldap_options.userAttributes
ldap_options.server = ldap_options
passport.use(new LdapStrategy(ldap_options));


