let {sync} = require("./src/sync/index.js")

console.time("migrationConsuming")
sync().then((result)=>{
    console.timeEnd("migrationConsuming")
    console.log(JSON.stringify(result,null,'\t'))
    process.exit()
})

