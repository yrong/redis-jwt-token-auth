const _ = require('lodash')
const jwt = require('jsonwebtoken')
const utils = require('../lib/sessionUtils')
const scirichon_common = require('scirichon-common')
const TokenName = scirichon_common.TokenName
const TokenUserName = scirichon_common.TokenUserName
const internal_token_id = scirichon_common.InternalTokenId
const ScirichonError = scirichon_common.ScirichonError
const TokenExpiration = require('../lib/const').TokenExpiration

const needCheckToken = (ctx)=>{
    if(ctx.headers[TokenName]===internal_token_id){
        return false
    }
    else if(ctx.path.includes('/no_auth')||(ctx.path.includes('/hidden'))||(!ctx.path.match(/api\/.*\/members/)&&!ctx.path.match(/auth\/check/))){
        return false
    }
    return true
}

module.exports = function jwt_token(options) {
    return async function (ctx, next) {
        if (!options.client || !options.secret)
            throw new Error("Redis client and secret required for JWT Redis Session!");
        options = {
            client: options.client,
            secret: options.secret,
            algorithm: options.algorithm || "HS256",
            keyspace: options.keyspace || "sess:",
            maxAge: options.maxAge || TokenExpiration,
            requestKey: options.requestKey || "session",
            requestArg: options.requestArg || TokenName
        };
		let SessionUtils = utils(options);
		let req = ctx.req;
		req[options.requestKey] = new SessionUtils();
        if (needCheckToken(ctx)){
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
                    ctx.throw(new ScirichonError('token invalid!',401))
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
                    ctx.throw(new ScirichonError('token expired!',401))
                }
                _.extend(req[options.requestKey], session);
                req[options.requestKey].claims = decoded;
                req[options.requestKey].id = decoded.jti;
                req[options.requestKey].jwt = token;
                req[options.requestKey].touch(_.noop);
                ctx[TokenUserName] = req[options.requestKey].passport&&req[options.requestKey].passport.user
                await next();
            }else{
                ctx.throw(new ScirichonError('token not found in request!',401))
            }
        }
        else{
            await next()
        }
    };
};
