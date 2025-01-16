/**
 * The data views.
 *
 * These provide utility functions for rendering views of objects in the database.
 *
 * For example, the User.userProfile view takes a User model instance and returns
 * the object that is suitable for returning on the external API.
 *
 * @namespace models
 * @memberof forge.db
 */

const modelTypes = [
    'AccessToken',
    'Application',
    'AuditLog',
    'BOM',
    'Device',
    'DeviceGroup',
    'Invitation',
    'Notification',
    'Project',
    'ProjectSnapshot',
    'ProjectStack',
    'ProjectTemplate',
    'ProjectType',
    'Team',
    'TeamType',
    'User',
    'TeamBrokerClient',
    'BrokerCredentials'
]

async function register (app, viewType, viewModule) {
    module.exports[viewType] = {}
    if (typeof viewModule === 'object' && typeof viewModule.init === 'function') {
        // New style:
        //  - views export an object with an init function
        //  - allows the views to contain their own schema definitions
        //  - allows type inference to work via /** import('path_to_view') */ for
        //    static analysis, type checking and DX improvements
        viewModule.init(app)
        module.exports[viewType] = viewModule
    } else if (typeof viewModule === 'function') {
        // Current style:
        //  - views export a function that is called to get the view functions back
        //  - allows the views to contain their own schema definitions as well
        module.exports[viewType] = viewModule(app)
    } else {
        // Old style - this will be phased out
        //  - views export their view functions directly
        //  - re-export them with an implicit 'app' first argument
        for (const key in viewModule) {
            module.exports[viewType][key] = viewModule[key].bind(viewModule, app)
        }
    }
}

async function init (app) {
    modelTypes.forEach(type => {
        const m = require(`./${type}`)
        register(app, type, m)
    })
}
module.exports = {
    init,
    register
}
