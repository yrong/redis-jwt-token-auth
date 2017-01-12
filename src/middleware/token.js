import _ from 'lodash';
import jwt from 'jsonwebtoken';
import utils from '../lib/sessionUtils';


export default function jwt_token(options) {
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
			|| ctx.cookies.get(options.requestArg)
			|| (ctx.request.body && ctx.request.body[options.requestArg]);
		if(token){
			var decoded,session;
            try {
                decoded = jwt.verify(token, options.secret);
            } catch(err) {
                ctx.throw(err);
            }
            try{
                session = await options.client.get(options.keyspace + decoded.jti);
            } catch(err) {
                ctx.throw(err);
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
            await next();
		}else{
            await next();
		}
    };
};
