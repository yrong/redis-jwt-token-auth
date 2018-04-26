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
const responseHandler = require('../hook/responseWrapper')
const hidden_fields = ['fields', 'cyphers', 'cypher', 'data', 'token', 'fields_old', 'change', '_id', '_index', '_type','user','id','method']

const addOrUpdateItem = async function(index,params,update) {
    let index_obj,result
    index_obj = {
        index: index,
        type: 'doc',
        refresh:true
    }
    index_obj.id = params.uuid
    if(!update){
        index_obj.body = _.omit(params,hidden_fields)
        result = await es_client.index(index_obj)
    }else{
        index_obj.body = {doc: _.omit(params, hidden_fields)}
        result = await es_client.update(index_obj)
    }
    logger.debug(`add index in es:${JSON.stringify({body:index_obj,result},null,'\t')}`)
}

const deleteItem = async function(index,params) {
    let result,delObj = {
        index: index,
        body: {
            query: {term:{uuid:params.uuid}}
        },
        refresh:true
    }
    result  = await es_client.deleteByQuery(delObj)
    logger.debug(`delete index in es:${JSON.stringify({body:delObj,result},null,'\t')}`)
}

const deleteAll = async function() {
    let delObj = {
        index: '*',
        body: {
            query: {match_all:{}}
        },
        refresh:true
    }
    await es_client.deleteByQuery(delObj)
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
    let index,schema_obj = schema.getAncestorSchema(params.category)
    if(schema_obj&&schema_obj.search&&schema_obj.search.index){
        index = schema_obj.search.index
    }
    if(!index){
        throw new Error(`${params.category} not searchable`)
    }
    if(queryObj.body&&queryObj.body.aggs){
        params_pagination = {size:0}
        params.aggs = true
    }
    let searchObj = _.assign({
        index: index,
        _source:_source
    },queryObj,params_pagination)
    let result = await es_client.search(searchObj)
    logger.debug(`search in es:${JSON.stringify({body:searchObj,result},null,'\t')}`)
    result = await responseHandler.esResponseMapper(result,params,ctx)
    return result
}

const checkStatus = ()=> {
    return es_client.ping({
        requestTimeout: Infinity
    })
}

const batchUpdate = async (index,uuids,body)=>{
    let bulks = [],result
    for (let uuid of uuids) {
        bulks.push({update: {_index: index, _type: 'doc', _id: uuid}})
        bulks.push(body)
    }
    result = await es_client.bulk({body: bulks, refresh: true})
    logger.debug(`batch update index in es:${JSON.stringify({body:bulks,result},null,'\t')}`)
}

const batchCreate = async (index,items,withoutId)=>{
    let bulks = [],bulk_action,bulk_obj,result
    for (let item of items) {
        bulk_obj = _.omit(item,hidden_fields)
        bulk_action = {_index: index, _type: 'doc', _id: item.uuid}
        if(withoutId){
            bulk_action = _.omit(bulk_action,['_id'])
        }
        bulks.push({index:bulk_action})
        bulks.push(bulk_obj)
    }
    result = await es_client.bulk({body:bulks,refresh:true})
    logger.debug(`batch add index in es:${JSON.stringify({body:bulks,result},null,'\t')}`)
}

module.exports = {searchItem,deleteItem,addOrUpdateItem,checkStatus,batchUpdate,batchCreate,deleteAll}