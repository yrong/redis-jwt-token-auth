const LdapAuth = require('ldapauth-fork')
const config = require('config')
const ldap = new LdapAuth(config.get('ldap.server'))

const searchUser = (username) => {
    return new Promise((resolve, reject)=>{
        ldap._findUser(username, function (err, user) {
            if (err)
                return reject(err)
            if (!user)
                return reject(`no such user:${username}`)
            return resolve(user)
        })
    })
}

module.exports = {searchUser}

