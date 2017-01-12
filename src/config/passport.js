'use strict';

import passport from 'koa-passport';
import AccountModel from '../models/account';
import _ from 'lodash';

passport.serializeUser(function(user, done) {
    done(null, _.pick(user, ['userid','alias','lang','name','surname']));
})

passport.deserializeUser(function(user, done) {
    AccountModel.findOne(user.userid, function(err, user) {
        done(err, user)
    })
})

var LocalStrategy = require('passport-local').Strategy

passport.use(new LocalStrategy(function(username, password, done) {
  
  AccountModel.verify(username, password)
    .then(function(result) {
        if(result != null) {
            done(null, result)
        }  else {
            done(null, false)
        }
    })
}))
