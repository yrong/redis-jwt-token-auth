const _ = require('lodash');
const jwt = require('jsonwebtoken');
const utils = require('../lib/sessionUtils');


module.exports = function jwt_token(options) {
    return async function (ctx, next) {
        if (!options.client || !options.secret)
            throw new Error("Redis client and secret required for JWT Redis Session!");
        options = {
            client: options.client,
            secret: options.secret,
            algorithm: options.algorithm || "HS256",
            keyspace: options.keyspace || "sess:",
            maxAge: options.maxAge || 86400,
            requestKey: options.requestKey || "session",
            requestArg: options.requestArg || "token"
        };
        var requestHeader = _.reduce(options.requestArg.split(""), function (memo, ch) {
            return memo + (ch.toUpperCase() === ch ? "-" + ch.toLowerCase() : ch);
        }, "x" + (options.requestArg.charAt(0) === options.requestArg.charAt(0).toUpperCase() ? "" : "-"));
        options.requestHeader = requestHeader;
		var SessionUtils = utils(options);
		var req = ctx.req;
		req[options.requestKey] = new SessionUtils();
		var token = ctx.req.headers[options.requestHeader]
			|| ctx.query[options.requestArg]
			|| (ctx.request.body && ctx.request.body[options.requestArg]);
		if(token){
			var decoded,session;
            try {
                decoded = jwt.verify(token, options.secret);
            } catch(err) {
                ctx.throw(err);
            }
            try{
                let promise = new Promise((resolve, reject) => {
                    options.client.get(options.keyspace + decoded.jti, function (error,session) {
                        if(error){
                            reject(error);
                        }else{
                            resolve(session);
                        }
                    });
                });
                session = await Promise.resolve(promise);
            } catch(err) {
                ctx.throw('redis read error:' + String(err));
            }
            try{
                session = JSON.parse(session);
                if(!session)
                    ctx.throw('token expired!',401);
            }catch(err){
                ctx.throw(err);
            }
            _.extend(req[options.requestKey], session);
            req[options.requestKey].claims = decoded;
            req[options.requestKey].id = decoded.jti;
            req[options.requestKey].jwt = token;
            // Update the TTL
            req[options.requestKey].touch(_.noop);
            req.jsonBody = true
            await next();
		}else {
            if (ctx.path.includes('/auth/login') || ctx.path.includes('/auth/register')
                || ctx.path.includes('/auth/hidden/clean') || ctx.path.includes('.html')||ctx.path.includes('.ico'))
                await next()
            else
                ctx.throw('token not found!',401);
		}
    };
};
