

var _ = require("lodash"),
	jwt = require("jsonwebtoken"),
	uuid = require("uuid");


var extendSession = function(session, data){
	_.reduce(data, function(memo, val, key){
		if(typeof val !== "function" && key !== "id")
			memo[key] = val;
		return memo;
	}, session);
};

var serializeSession = function(session){
	return _.reduce(session, function(memo, val, key){
		if(typeof val !== "function" && key !== "id")
			memo[key] = val;
		return memo;
	}, {});
};

// these are bound to the session
 var session_util = function(options){

	var SessionUtils = function(){};

	_.extend(SessionUtils.prototype, {

		// create a new session and return the jwt
		create: function(claims){
            return new Promise((resolve, reject) => {
                var self = this,
                    sid = uuid.v4();
                var token = jwt.sign(_.extend({jti: sid}, claims || {}), options.secret, {algorithm: options.algorithm});
                options.client.setex(options.keyspace + sid, options.maxAge, JSON.stringify(serializeSession(self)), function (error) {
                    self.id = sid;
                    if(error){
                    	reject(error);
					}else{
                        resolve(token);
					}
                });
            });
		},
		// update the TTL on a session
		touch: function(){
            return new Promise((resolve, reject) => {
                if (!this.id) {
                    return process.nextTick(function () {
                        reject(new Error("Invalid Token"));
                    });
                }
                options.client.expire(options.keyspace + this.id, options.maxAge, resolve);
            })
		},

		// update a session's data, update the ttl
		update: function(){
            return new Promise((resolve, reject) => {
                if (!this.id) {
                    return process.nextTick(function () {
                        reject(new Error("Invalid Token"));
                    });
                }
                options.client.setex(options.keyspace + this.id, options.maxAge, JSON.stringify(serializeSession(this)), resolve);
            })
		},

		// reload a session data from redis
		reload: function(){
            return new Promise((resolve, reject) => {
                var self = this;
                if (!this.id) {
                    return process.nextTick(function () {
                        reject(new Error("Invalid Token"));
                    });
                }

                options.client.get(options.keyspace + self.id, function (error, resp) {
                    if (error)
                        reject(error);
                    try {
                        resp = JSON.parse(resp);
                    } catch (e) {
                        reject(e);
                    }
                    extendSession(self, resp);
                    resolve(resp);
                });
            })
		},

		// destroy a session
		destroy: function(){
            return new Promise((resolve, reject) => {
                if (!this.id) {
                    return process.nextTick(function () {
                        reject(new Error("Invalid Token"));
                    });
                }
                options.client.del(options.keyspace + this.id, function (error, resp) {
                    if (error){
                        reject(error);
                    }else{
                        resolve(resp);
                    }
                });
            })
		}
	});

	return SessionUtils;
};

export default session_util;