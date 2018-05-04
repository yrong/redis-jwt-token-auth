const uuid = require('uuid')
const _ = require('lodash')
const db = require('../lib/db')
const scirichon_cache = require('scirichon-cache')
const common = require('scirichon-common')
const ScirichonError = common.ScirichonError
const search = require('scirichon-search')

const addDepartment = async (department)=>{
    let parent_department,cypher
    if(!department.name){
        throw new ScirichonError('department missing name field')
    }
    department.category = 'Department'
    department.unique_name = department.name
    department.uuid = department.uuid||uuid.v1()
    if(!department.parent){
        department.path =  [department.uuid]
    }else{
        parent_department = await scirichon_cache.getItemByCategoryAndID('Department',department.parent)
        if(_.isEmpty(parent_department)){
            throw new ScirichonError('parent department not exist')
        }
        department.path =  parent_department.path.concat(department.uuid)
    }
    cypher = `MERGE (n:Department {uuid: {uuid}})
    ON CREATE SET n = {fields}
    ON MATCH SET n = {fields}`
    await db.queryCql(cypher,{uuid:department.uuid,fields:department})
    if(department.parent){
        cypher = `MATCH (n:Department {uuid: {uuid}})
        MATCH (pn:Department {uuid: {parent}})
        MERGE (n)-[:MemberOf]->(pn)`
        await db.queryCql(cypher,{uuid:department.uuid,parent:department.parent})
    }
    await scirichon_cache.addItem(department)
    await search.addOrUpdateItem(department)
    return department
}

const destroyAll = async ()=>{
    let cypher = `match (n:Department) detach delete n`
    await db.queryCql(cypher)
}

const getDepartment = async (uuid)=>{
    let department,cypher=`match (n:Department) where n.uuid={uuid} return n`
    department = await db.queryCql(cypher,{uuid})
    if(!department.length){
        throw new ScirichonError('department not found')
    }
    return department[0]
}

const getDepartments = async (uuid)=>{
    let cypher = `match (n:Department) where {uuid} in n.path return n`
    let result = await db.queryCql(cypher,{uuid})
    return result
}

const deleteDepartment = async (uuid)=>{
    let department = await scirichon_cache.getItemByCategoryAndID('Department',uuid)
    if(_.isEmpty(department)){
        throw new ScirichonError('department not found')
    }
    let cypher = `match (n:Department) where n.uuid={uuid} detach delete n`
    await db.queryCql(cypher,{uuid})
    await scirichon_cache.delItem(department)
    await search.deleteItem(department)
}

const getDepartmentTree = async (uuid)=>{
    let getMemberCypher = (category)=>`MATCH (n:${category} {uuid:{uuid}})
                    OPTIONAL MATCH
                        (n)<-[:MemberOf]-(m)      
                    WITH { self: n, members:collect(distinct m) } as item
                    RETURN item`,
    getItemCypher = `match (n) where n.uuid={uuid} and n.category={category} return n`,
    result, addItemMembers = async(item)=>{
        let result = await db.queryCql(getMemberCypher(item.category),{uuid:item.uuid})
        if(result&&result.length) {
            result = result[0]
            if (result.members&&result.members.length) {
                let members = []
                for (let member of result.members) {
                    member = await addItemMembers(member)
                    members.push(member)
                }
                item = _.merge(result.self, {members})
            }
        }
        return item
    }
    result = await db.queryCql(getItemCypher,{uuid,category:'Department'})
    if(result&&result.length){
        result = result[0]
        result = await addItemMembers(result)
    }
    return result
}

module.exports = {addDepartment,destroyAll,getDepartment,getDepartments,deleteDepartment,getDepartmentTree}