'use strict';

const passport = require('koa-passport')
const AccountModel = require('../models/account')
const _ = require('lodash');
const LdapStrategy = require('passport-ldapauth')
const config = require('./config')
const passport_local = require('passport-local')
const LocalStrategy = passport_local.Strategy

passport.serializeUser(function(user, done) {
    done(null, _.omit(user,['password','passwd','id']));
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

passport.use(new LdapStrategy(config.ldap));


