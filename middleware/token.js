const _ = require('lodash');
const jwt = require('jsonwebtoken');
const utils = require('../lib/sessionUtils');
const config = require('config');
const scirichon_common = require('scirichon-common')
const TokenName = scirichon_common.TokenName
const internal_token_id = scirichon_common.internal_token_id
const ScirichonError = scirichon_common.ScirichonError

module.exports = function jwt_token(options) {
    return async function (ctx, next) {
        if (!options.client || !options.secret)
            throw new Error("Redis client and secret required for JWT Redis Session!");
        options = {
            client: options.client,
            secret: options.secret,
            algorithm: options.algorithm || "HS256",
            keyspace: options.keyspace || "sess:",
            maxAge: options.maxAge || config.get('expiration'),
            requestKey: options.requestKey || "session",
            requestArg: options.requestArg || TokenName
        };
		var SessionUtils = utils(options);
		var req = ctx.req;
		req[options.requestKey] = new SessionUtils();
		var token = (ctx.request.body && ctx.request.body[options.requestArg])
            || ctx.query[options.requestArg]
            || ctx.req.headers[options.requestArg]
		if(token){
		    if(token === internal_token_id){
                await next()
                return
            }
			var decoded,session;
            try {
                decoded = jwt.verify(token, options.secret)
            } catch(err) {
                ctx.throw(401,new ScirichonError('token invalid!'))
            }
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
            session = JSON.parse(session);
            if(!session){
                ctx.throw(401,new ScirichonError('token expired!'))
            }
            _.extend(req[options.requestKey], session);
            req[options.requestKey].claims = decoded;
            req[options.requestKey].id = decoded.jti;
            req[options.requestKey].jwt = token;
            req[options.requestKey].touch(_.noop);
            await next();
		}else {
            if (ctx.path.includes('/auth/login') || ctx.path.includes('/auth/register')
                || ctx.path.includes('/auth/hidden/clean') || ctx.path.includes('.html')||ctx.path.includes('.ico'))
                await next()
            else{
                ctx.throw(401,new ScirichonError('token not found in request!'))
            }
		}
    };
};
