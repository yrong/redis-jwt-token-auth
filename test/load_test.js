const _ = require('lodash')
const common = require('scirichon-common')
const runner = require('scirichon-test-runner')

const clean = async()=>{
    await common.apiInvoker('POST',common.getServiceApiUrl('auth'),'/auth/hidden/clean','',{})
    console.log("clean data success")
}

const loadCommonRoles = async()=>{
    const roles = [
        {
            "name":"viewer",
            "allows":[{"resources":"own","permissions":["READ"]}],
            "additional":["a"],
            "currentUserRole":[]
        },
        {
            "name":"contributor",
            "allows":[{"resources":"own","permissions":["CREATE","UPDATE","DELETE","READ"]}]
        },
        {
            "name":"superAdmin",
            "allows":[{"resources":"*","permissions":"*"}]
        },
        {
            "name":"external",
            "allows":[{"resources":"*","permissions":["READ"]}],
            "type":"external"
        }
    ]
    let body = {data:{category:'Role',fields:roles},additional:{ignoreUniqueCheck:true}}
    let result = await common.apiInvoker('POST',common.getServiceApiUrl('auth'),'/api/roles/batch','',body)
    console.log('load all roles success!')
    return result.data
}


const loadAdminUsers = async (departments)=>{
    let adminUsers = [{name:'demo',passwd:'demo',roles:['superAdmin'],department:departments[0]},{name:'superAdmin',passwd:'superAdmin',role:'superAdmin',department:departments[1]}]
    let result = await runner.batchAddItems('User',adminUsers)
    return result
}

const loadRootDepartments = async ()=>{
    let rootDepartments = [{name:'root-0',root:true},{name:'root-1',root:true}]
    let result = await runner.batchAddItems('Department',rootDepartments)
    return result
}


const reload = async()=>{
    await clean()
    let roles = await loadCommonRoles()
    let departments = await loadRootDepartments()
    await loadAdminUsers(departments)
    departments = await runner.loadItemsByBatchSize('Department',{departments})
    await runner.loadItemsByBatchSize('User',{roles,departments})
}

const generateItem = async (category,params)=>{
    let item,index=params.index
    if(category==='Department'){
        item = {name:`${category}-${index}`}
        let parentIds = params&&params.departments
        if(!_.isEmpty(parentIds)){
            item.parent = parentIds[Math.floor(Math.random()*parentIds.length)]
        }
    }else if(category==='User'){
        item = {name:`${category}-${index}`,passwd:`${category}-${index}`}
        let roles = params&&params.roles,departments=params&&params.departments
        if(!_.isEmpty(roles)){
            item.roles = [roles[Math.floor(Math.random()*roles.length)]]
        }
        if(!_.isEmpty(departments)){
            item.department = departments[Math.floor(Math.random()*departments.length)]
        }
    }
    return item
}

const getRunnerOption = async (scenario,params)=>{
    let options
    if(scenario==='searchUser'){
        options = {
            url: common.getServiceApiUrl('auth')+'/api/searchByEql',
            concurrency:parseInt(process.env['Concurrency'])||1,
            requestsPerSecond:parseInt(process.env['RequestsPerSecond'])||10,
            agentKeepAlive:true,
            headers:{
                "token": params.token
            },
            contentType:"application/json",
            method:'POST',
            body:{
                "category":"User",
                "body":
                    {
                        "query": {
                            "bool":{
                                "must":[
                                    {"term":{"type":"internal"}}
                                ]
                            }
                        },
                        "sort" : [
                            { "lastUpdated" : {"order" : "desc"}}]
                    },
                "page":1,
                "per_page":10
            }
        }
    }else{
        throw new Error('unknown scenario as:'+scenario)
    }
    return options
}


(async () => {
    try {
        runner.setLoader({reload,getRunnerOption,generateItem})
        await runner.initialize()
        const command = process.env['Command']
        await runner[command]()
        console.log('test finished!')
        process.exit(0)
    } catch (e) {
        console.error('Got an error during test: %s', e.stack);
    }
})();
