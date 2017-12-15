

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
                    	reject('redis setex error:' + String(error));
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

        findAll: function(){
            return new Promise((resolve, reject) => {
                let promises = []
                options.client.keys(options.keyspace + '*',(err,keys)=>{
                    if(err)
                        reject(err)
                    let findByKey = (key)=> {
                        return new Promise((resolve, reject) => {
                            options.client.get(key, (err, val) => {
                                if (err)
                                    reject(err)
                                resolve(JSON.parse(val))
                            })
                        })
                    }
                    for(let key of keys){
                        promises.push(findByKey(key))
                    }
                    Promise.all(promises).then(resolve).catch(reject)
                });
            })
        },

        deleteByUserId: function(userid){
            return new Promise((resolve, reject) => {
                let promises = []
                options.client.keys(options.keyspace + '*',(err,keys)=>{
                    if(err)
                        reject(err)
                    let delByUserId = (key,userid)=> {
                        return new Promise((resolve, reject) => {
                            options.client.get(key, (err, val) => {
                                if (err)
                                    reject(err)
                                let result = JSON.parse(val)
                                if(result&&result.passport&&result.passport.user&&result.passport.user.uuid==userid){
                                    options.client.del(key,(err,val)=>{
                                        if (err)
                                            reject(err)
                                        resolve()
                                    })
                                }else{
                                    resolve()
                                }
                            })
                        })
                    }
                    for(let key of keys){
                        promises.push(delByUserId(key,userid))
                    }
                    Promise.all(promises).then(resolve).catch(reject)
                });
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
                        reject('redis get error' + String(error));
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
                        reject('redis delete error:' +String(error));
                    }else{
                        resolve(resp);
                    }
                });
            })
		}
	});

	return SessionUtils;
};

module.exports = session_util;