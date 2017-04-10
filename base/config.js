"use strict";
const path = require("path");
const _ = require("lodash");

let env = process.env.NODE_ENV = process.env.NODE_ENV || "development";

let base = {
    app: {
        root: path.normalize(path.join(__dirname, "/..")),
        env: env,
        excluded : "excluded_path",
        name: "CmdbAuth",
        secret: "123456",
        port: 3002
    },
    mysql: {
        host: 'localhost',
        port : 3306,
        user : 'root',
        password : 'root',
        database : 'test'
    },
    redis: {
        host: 'localhost',
        port: 6379
    },
    neo4j: {
        host: "localhost",
        port: 7687,
        user: "neo4j",
        password: "neo4j"
    },
    upload: {
        avatar: {
            url: "/upload/avatar",
            storeDir: "avatar",
            provider: "local",
            folder: "src/public/upload",
            mimetypes: ['image/png','image/bmp','image/gif','image/jpeg']
        }
    },
    ldap:{
        server: {
            url: 'ldap://localhost:389',
            searchBase: 'ou=users,dc=test,dc=com',
            searchFilter: "(sn={{username}})"
        }
    }
};

let specific = {
    development: {
        app: {
            port: 3002
        }
    }, 
    production: {
        mysql: {
            host: 'localhost',
            port : 3306,
            user : 'test',
            password : 'test',
            database : 'test'
        }
    }
};

module.exports = _.merge(base, specific[env]);