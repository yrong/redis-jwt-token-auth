const sync = require("./sync/index.js")
console.time("migrationConsuming")
let sync_type = process.env['SYNC_TYPE'],promise
if(sync_type === 'mysql'){
    promise = sync.syncWithMysql()
}else if(sync_type === 'nextcloud'){
    promise = sync.sync2NextCloud()
}else if(sync_type === 'publicshare'){
    promise = sync.addPublicShare()
}
promise.then((result)=>{
    console.timeEnd("migrationConsuming")
    console.log(JSON.stringify(result,null,'\t'))
    process.exit()
})


