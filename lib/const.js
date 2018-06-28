const config = require('config')

module.exports = {
    OmitUserFields:config.get('auth.userFieldsIgnored4Token'),
    TokenExpiration:config.get('auth.expiration')
}