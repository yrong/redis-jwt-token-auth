const scirichonCrudHandler = require('scirichon-crud-handler')

module.exports = {
    load: (app) => {

        require('./auth')(app.router)
        app.router.use('/auth', app.router.routes(), app.router.allowedMethods())

        scirichonCrudHandler.hooks.setHandlers({
            'User': require('../handlers/user'),
            'Department': require('../handlers/department'),
            'Role': require('../handlers/role')
        })
        scirichonCrudHandler.route(app)


    }
}

