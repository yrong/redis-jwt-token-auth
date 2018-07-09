const passport = require('koa-passport')
const _ = require('lodash')
const LdapStrategy = require('passport-ldapauth-fork')
const config = require('config')
const passport_local = require('passport-local')
const LocalStrategy = passport_local.Strategy
const log4js = require('log4js')
const userHandler = require('../handlers/user')
const OmitUserFields = require('../lib/const').OmitUserFields
const ldapConfig = config.get('auth.ldap')

passport.serializeUser(function(user, done) {
    if(user[ldapConfig.bindType]) {
        user = _.pick(user, ldapConfig.userAttributes)
    }
    else{
        user = _.omit(user, OmitUserFields)
    }
    done(null, user)
})

passport.deserializeUser(function(user, done) {
    done(user)
})

passport.use(new LocalStrategy(function(username, password, done) {
    userHandler.verify(username, password)
    .then(function(user) {
        if(user != null) {
            done(null, user)
        }  else {
            done(null, false)
        }
    }).catch(done)
}))

let ldap_options = _.clone(config.get('auth.ldap'))
const logger = log4js.getLogger('ldapauth')
ldap_options.log = logger
ldap_options.searchBase = ldap_options.userSearchBase
ldap_options.searchAttributes = ldap_options.userAttributes
ldap_options.server = ldap_options
passport.use(new LdapStrategy(ldap_options));


