'use strict';

import passport from 'koa-passport';
import AccountModel from '../models/account';
import _ from 'lodash';
import LdapStrategy from 'passport-ldapauth';
import config from './config';

passport.serializeUser(function(user, done) {
    done(null, _.omit(user,['password','passwd','id']));
})

passport.deserializeUser(function(user, done) {
    done(user)
})

var LocalStrategy = require('passport-local').Strategy

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


