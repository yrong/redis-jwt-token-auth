const LdapAuth = require('ldapauth-fork-plus')
const config = require('config')
const ldap = new LdapAuth(config.get('ldap.server'))

const searchByUser = (username) => {
    return new Promise((resolve, reject)=>{
        ldap._findUser(username, function (err, user) {
            if (err)
                return reject(err)
            if (!user)
                return reject(new Error(`no such user:${username}`))
            return resolve(user)
        })
    })
}

const searchByFilter = (base, options)=>{
    return new Promise((resolve, reject)=>{
        ldap._search(base, options,function (err, items) {
            if (err)
                return reject(err)
            return resolve(items)
        })
    })
}


module.exports = {searchByUser,searchByFilter}

