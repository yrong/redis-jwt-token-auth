const _ = require('lodash')
const config = require('config')
const esConfig = config.get('elasticsearch')
const elasticsearch = require('elasticsearch')
const es_client = new elasticsearch.Client({
    host: (process.env['ES_HOST']||esConfig.host) + ":" + esConfig.port,
    requestTimeout: esConfig.requestTimeout
})
const schema = require('redis-json-schema')
const logger = require('log4js_wrapper').getLogger()
const responseWrapper = require('../hook/responseWrapper')

const hidden_fields = ['fields', 'cyphers', 'cypher', 'data', 'token', 'fields_old', 'change', '_id', '_index', '_type','user','id']

const addOrUpdateItem = async function(params, ctx) {
    let schemas = schema.getSchemas(),category = schema.getAncestorCategory(params.category),index,index_obj
    if(schemas[category]&&schemas[category].search){
        index = schemas[category].search.index
        index_obj = {
            index: index,
            type: 'doc',
            refresh:true
        }
        if(!schemas[category].search.upsert){
            index_obj.id = params.uuid
        }
        if(!ctx||ctx.method === 'POST'||schemas[category].search.upsert){
            index_obj.body = _.omit(params,hidden_fields)
            await es_client.index(index_obj)
        }else if(ctx.method === 'PUT'||ctx.method === 'PATCH') {
            index_obj.body = {doc: _.omit(params, hidden_fields)}
            await es_client.update(index_obj)
        }
        logger.debug(`add index in es:${JSON.stringify(index_obj,null,'\t')}`)
    }
}

const deleteItem = async function(params, ctx) {
    let queryObj = params.uuid?{term:{uuid:params.uuid}}:{match_all:{}}
    let schemas = schema.getSchemas(),category = params.category,index
    if(ctx.deleteAll){
        index = '*'
    }else if((schemas[category]&&schemas[category].search)){
        index = schemas[category].search.index
    }
    if(index){
        let delObj = {
            index: index,
            body: {
                query: queryObj
            },
            refresh:true
        }
        await es_client.deleteByQuery(delObj)
        logger.debug(`delete index in es:${JSON.stringify(delObj,null,'\t')}`)
    }
}

const searchItem = async (params, ctx)=> {
    let query = params.uuid?`uuid:${params.uuid}`:(params.keyword?params.keyword:'*');
    let _source = params._source?params._source.split(','):true;
    let params_pagination = {"from":0,"size":config.get('perPageSize')},from;
    if(params.page&&params.per_page){
        from = (String)((parseInt(params.page)-1) * parseInt(params.per_page));
        params_pagination = {"from":from,"size":params.per_page}
    }
    let queryObj = params.body?{body:params.body}:{q:query}
    let schemas = schema.getSchemas()
    let category = params.category = params.category
    let index = schemas[category].search.index
    if(queryObj.body&&queryObj.body.aggs){
        params_pagination = {size:0}
        params.aggs = true
    }
    let searchObj = _.assign({
        index: index,
        _source:_source
    },queryObj,params_pagination)
    logger.debug(`search in es:${JSON.stringify(searchObj,null,'\t')}`)
    let response = await es_client.search(searchObj)
    response = await responseWrapper.esResponseMapper(response,params,ctx)
    return response
}

const checkStatus = ()=> {
    return es_client.ping({
        requestTimeout: Infinity
    })
}

const batchUpdate = async (category,uuids,body)=>{
    let bulks = [],schemas = schema.getSchemas()
    category = schema.getAncestorCategory(category)
    if(schemas[category]&&schemas[category].search) {
        for (let uuid of uuids) {
            bulks.push({update: {_index: schemas[category].search.index, _type: 'doc', _id: uuid}})
            bulks.push(body)
        }
        await es_client.bulk({body: bulks, refresh: true})
    }
}

const batchCreate = async (category,items)=>{
    let bulks = [],schemas = schema.getSchemas()
    category = schema.getAncestorCategory(category)
    if(schemas[category]&&schemas[category].search) {
        for (let item of items) {
            bulks.push({index: {_index: schemas[category].search.index, _type: 'doc', _id: item.uuid}})
            bulks.push(item)
        }
    }
    await es_client.bulk({body:bulks,refresh:true})
}

module.exports = {searchItem,deleteItem,addOrUpdateItem,checkStatus,batchUpdate,batchCreate}