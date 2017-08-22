const ldap = require('ldapjs')
const config = require('config')
const ldap_config = config.get('ldap.server')
const client = ldap.createClient({
    url: ldap_config.url
})
const assert = require('assert')

client.bind(ldap_config.bindDn, ldap_config.bindCredentials, function(err) {
    assert.ifError(err)
    var entry,dn,i
    for (i=4000;i<6000;i++){
        entry = {
            objectclass: 'posixGroup',
            gidNumber:i
        };
        dn = 'cn=test'+i + ',' + ldap_config.searchBase
        client.add(dn, entry, function(err) {
            assert.ifError(err)
        });
    }

});