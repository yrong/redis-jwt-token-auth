const LdapAuth = require('ldapauth-fork-plus')
const config = require('config')
const ldap = new LdapAuth(config.get('auth.ldap'))

const searchByFilter = (base, options)=>{
    return new Promise((resolve, reject)=>{
        ldap._search(base, options,function (err, items) {
            if (err)
                return reject(err)
            return resolve(items)
        })
    })
}


module.exports = {searchByFilter}

