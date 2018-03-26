const _ = require('lodash')
const scirichon_cache = require('scirichon-cache')
const schema = require('redis-json-schema')
const mapper = require('scirichon-response-mapper')

const removeAndRenameInternalProperties =  (val) => {
    if(_.isArray(val)) {
        val = _.map(val, function (val) {
            return removeAndRenameInternalProperties(val)
        });
    }else if(_.isObject(val)){
        for (let prop in val) {
            if(_.includes(['doc_count_error_upper_bound','sum_other_doc_count'],prop)){
                delete val[prop]
            }
            if(typeof val[prop] === 'object')
                removeAndRenameInternalProperties(val[prop])
        }
    }
    return val
}

const findRefCategory = (category,key)=>{
    let refs = schema.getSchemaRefProperties(category)
    for(let ref of refs){
        if(ref.attr===key){
            return ref.schema
        }
    }
}

const aggsMetaFields = ['key','key_as_string','buckets','doc_count','doc_count_error_upper_bound','sum_other_doc_count','ref_obj']

const aggsReferencedMapper =  async (val,category) => {
    let keys = _.keys(val)
    for(let key of keys){
        if(!_.includes(aggsMetaFields,key)){
            if(_.isArray(val[key]['buckets'])){
                for(let internal_val of val[key]['buckets']){
                    let ref_category = findRefCategory(category,key),cached_obj
                    if(ref_category){
                        cached_obj = await scirichon_cache.getItemByCategoryAndID(ref_category,internal_val.key)
                        if(!_.isEmpty(cached_obj)){
                            internal_val.ref_obj = cached_obj
                        }
                    }
                    await aggsReferencedMapper(internal_val,category)
                }
            }
        }
    }
    return val
}

const parse2JsonObject = async (val,params)=>{
    let properties = schema.getSchemaProperties(val.category||params.category)
    for (let key in val) {
        if (val[key] && properties[key]) {
            if (properties[key].type === 'object' || (properties[key].type === 'array' && properties[key].items.type === 'object')) {
                if (_.isString(val[key])) {
                    try{
                        val[key] = JSON.parse(val[key])
                    }catch(err){
                        //ignore
                    }
                }
            }
        }
    }
    return val
}


const resultMapper = async (val,params) => {
    val = await parse2JsonObject(val,params)
    if(!params.origional){
        val = await mapper.referencedObjectMapper(val,params)
    }
    return val
}

const responseMapper = async (val, params, ctx) => {
    let results = []
    if (_.isArray(val)) {
        for(let single of val){
            results.push(await resultMapper(single,params))
        }
        val = results
    }else{
        val = await resultMapper(val,params)
    }
    return val
}

const esResponseMapper = async function(result,params,ctx){
    if(params.aggs){
        result = result.aggregations
        result = await aggsReferencedMapper(result,params.category)
        result = removeAndRenameInternalProperties(result)
    }else{
        result =  {count:result.hits.total,results:_.map(result.hits.hits,(result)=>result._source)}
        if(result.count>0&&_.isArray(result.results)){
            result.results = await responseMapper(result.results, params)
        }
    }
    return result
}

module.exports = {
    responseMapper,esResponseMapper
}