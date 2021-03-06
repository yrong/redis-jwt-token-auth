const _ = require('lodash')
const config = require('config')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError
const Redis = require('redis')
const Model = require('redis-crud-fork')
Object.assign({db:4},config.get('redis'))
const SmsCache = Model(Redis.createClient(Object.assign({db:4},config.get('redis'))),'Sms')
const scirichonMapper = require('scirichon-response-mapper')
const db = require('../lib/db')
const qs = require("querystring")
const request = require('axios')
const OmitUserFields = require('../lib/const').OmitUserFields
const TokenExpiration = require('../lib/const').TokenExpiration

const sendSms = async (phone,code,maxAge)=>{
    const sms_uri = "http://cowsms.market.alicloudapi.com/intf/smsapi",tpid='009',sign='消息通',appcode=config.get('auth.sms.AppCode')
    let options = {
        method: 'GET',
        url: sms_uri + '?' + qs.stringify({mobile:phone,sign,tpid,paras:`${code},${maxAge}`}),
        headers: {Authorization:"APPCODE "+appcode}
    }
    let response = await request(options)
    return response&&response.data
}

module.exports = (router)=>{

    router.post('/smsLogin', async (ctx, next) => {
        let params = ctx.request.body,phone=params.phone,code=params.code,token
        let user = await SmsCache.get(phone+":"+code)
        if(_.isEmpty(user)) {
            throw new ScirichonError(`缓存中包含phone:${phone}和code:${code}的用户不存在`,401)
        }else{
            user = _.omit(user,['id','maxAge'])
            await ctx.login(user)
            console.log(`user before mapping:${JSON.stringify(user)}`)
            try{
                user = await scirichonMapper.responseMapper(user,_.assign({category:'User'}))
            }catch(err){
                console.log(err.stack||err)
            }
            token = await ctx.req.session.create({user})
        }
        ctx.body = {token: token,login_date:new Date().toISOString(),expiration_date:new Date(Date.now()+TokenExpiration*1000).toISOString(),local:user}
    });

    router.post('/smsGenerateCode/:phone',async(ctx)=>{
        let phone=ctx.params.phone,maxAge = parseInt(ctx.request.body.maxAge||config.get('auth.sms.expiration')),code,user,name,uuid,response
        let account = await db.queryCql(`MATCH (u:User{phone:{phone}}) return u`,{phone})
        if(_.isEmpty(account)) {
            throw new ScirichonError(`包含phone:${phone}的用户不存在`,401)
        } else{
            user = _.omit(account[0], OmitUserFields)
            name = user.name
            uuid = user.uuid
            code = Math.floor(Math.random()*9000) + 1000
            await SmsCache.insertEX(_.assign({id:phone+":"+code,maxAge},user))
            if(config.get('auth.sms.sendFlag')){
                try {
                    response = await sendSms(phone, code, maxAge / 60)
                }catch(error){
                    console.log("send sms failed," + error)
                }
                console.log("send sms success!")
            }
        }
        ctx.body = {uuid,name,phone,code,response}
    })

}

