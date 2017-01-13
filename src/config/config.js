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
        secret: "123456"
    },
};

let specific = {
    development: {
        app: {
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
        }
    }, 
    production: {
        app: {
            port: process.env.PORT || 5000
        },
        mysql: {
            host: 'localhost',
            port : 3306,
            user : 'test',
            password : 'test',
            database : 'test'
        }
    },
};

module.exports = _.merge(base, specific[env]);