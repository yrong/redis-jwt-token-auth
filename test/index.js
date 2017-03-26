var newman = require('newman');

newman.run({
    collection: require('./cmdb-auth.postman_collection.json'),
    environment: require('./cmdb-auth.postman_environment.json'),
    reporters: 'cli'
}, function (err) {
    if (err) { throw err; }
    console.log('collection run complete!');
});