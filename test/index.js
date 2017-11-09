const newman = require('newman');
const fs = require('fs');

describe("Auth Integration test suite", function() {
    this.timeout(15000)

    it('auth api', function(done) {
        newman.run({
            collection: JSON.parse(fs.readFileSync('./test/auth.postman_collection.json','utf8')),
            environment: JSON.parse(fs.readFileSync('./config/postman_globals.json', 'utf8')),
            reporters: 'cli'
        }, function (err) {
            if (err) { done(err)}
            console.log('new api run complete!');
            done();
        });
    });
})