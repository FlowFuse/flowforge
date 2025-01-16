/**
 * The data models.
 *
 * These define the structure of everything in the database.
 *
 * We use Sequelize as our database ORM/layer/shim. The models are implemented
 * using their Model APIs.
 *
 * When adding a new model:
 *  1. create a file whose name is the singular noun of the object, using PascalCase.
 *  2. add that name to the `modelTypes` array below
 *
 * The model file should export a single object with the model properties. These
 * properties are as-per the sequelize Model docs. But note that the properties
 * are all at the top-level, unlike sequelize that pushes *some* into an options
 * object.
 *
 * ```javascript
 * module.exports = {
 *    name: "ModelName",  // must match the name in `modelTypes`
 *    schema: {},
 *    scopes: {},
 *    hooks: {},
 *    associations: function(Models) {},
 *    finders: function(Models) {}
 * }
 * ```
 * The `associations` and `finders` properties are functions that will get called
 * with an object containing all of the defined models.
 * The `associations` function should setup any associates on the Model.
 * The `finders` function should return an object defining static and instance
 * finders for the model.
 *
 * Have a look at `User.js` as a good example of all of those properties.
 *
 *
 * @namespace models
 * @memberof forge.db
 * // type helpers for design time help and error checking
 * @typedef {import('sequelize').Model} Model
 * @typedef {import('sequelize').ModelAttributes} ModelAttributes
 * @typedef {import('sequelize').SchemaOptions} SchemaOptions
 * @typedef {import('sequelize').ModelIndexesOptions} ModelIndexesOptions
 * @typedef {import('sequelize').InitOptions} InitOptions
 * @typedef {import('sequelize').ModelScopeOptions} ModelScopeOptions
 * @typedef {{name: string, schema: ModelAttributes, model: Model, indexes?: ModelIndexesOptions[], scopes?: ModelScopeOptions, options?: InitOptions}} FFModel
 */
const { Model, DataTypes } = require('sequelize')

const { getHashId } = require('../utils')

// The models that should be loaded
const modelTypes = [
    'Application',
    'PlatformSettings',
    'Organization',
    'User',
    'TeamType',
    'Team',
    'TeamMember',
    'Invitation',
    'Session',
    'Project',
    'ProjectSettings',
    'ProjectType',
    'ProjectStack',
    'ProjectTemplate',
    'ProjectSnapshot',
    'AccessToken',
    'AuthClient',
    'Device',
    'DeviceGroup',
    'DeviceSettings',
    'StorageFlow',
    'StorageCredentials',
    'StorageSettings',
    'StorageSession',
    'StorageLibrary',
    'AuditLog',
    'BrokerClient',
    'OAuthSession',
    'Notification',
    'TeamBrokerClient',
    'BrokerCredentials'
]

// A local map of the known models.
const M = {}

/**
 * Initialises all of the models listed in `modelTypes`.
 *
 * For each one it:
 *  1. requires the corresponding model
 *  2. builds the appropriate sequelize Model object for it
 *  3. exports it as `module.exports.<Type>`
 *
 * Once all of the models are created, it loops back over them to:
 *  1. setup inter-model associates
 *  2. attach the static and instance finders to the model object
 *
 *
 * Finally it synchronizes with the database to create the tables as needed.
 * @private
 */
async function init (app) {
    const sequelize = app.db.sequelize
    /** @type {FFModel[]} */
    const allModels = []

    modelTypes.forEach(type => {
        /** @type { FFModel } */
        const m = require(`./${type}`)
        if (m.name !== type) {
            throw new Error(`Model name mismatch: '${m.name}' !== '${type}'`)
        }

        /** @type {InitOptions} */
        const opts = {
            sequelize,
            modelName: m.name,
            ...(m.options || {})
        }

        if (m.scopes) {
            opts.scopes = m.scopes
        }
        if (m.hooks) {
            if (typeof m.hooks === 'function') {
                opts.hooks = m.hooks.call(null, M, app)
            } else {
                opts.hooks = m.hooks
            }
        }
        if (m.indexes) {
            opts.indexes = m.indexes
        }
        if (!m.model) {
            m.model = class model extends Model {}
        }
        if (!m.schema.slug && (!m.meta || m.meta.slug !== false)) {
            m.schema.slug = {
                type: DataTypes.VIRTUAL,
                get () {
                    return getHashId(m.name).encode(this.id)
                }
            }
        }
        if (!m.meta || m.meta.hashid !== false) {
            m.schema.hashid = {
                type: DataTypes.VIRTUAL,
                get () {
                    return getHashId(m.name).encode(this.id)
                },
                set (_) {
                    throw new Error('hashid is read-only')
                }
            }
            m.model.encodeHashid = function (id) {
                return getHashId(m.name).encode(id)
            }
            m.model.decodeHashid = function (hashid) {
                try {
                    return getHashId(m.name).decode(hashid)
                } catch (err) {
                    return null
                }
            }
        }

        if (!m.schema.links && (!m.meta || m.meta.links !== false)) {
            const pathComponent = (m.meta && typeof m.meta.links === 'string') ? m.meta.links : (m.name.toLowerCase() + 's')
            m.schema.links = {
                type: DataTypes.VIRTUAL,
                get () {
                    return {
                        self: `${app.config.base_url}/api/v1/${pathComponent}/${this.hashid}`
                    }
                }
            }
        }

        m.model.init(m.schema, opts)
        module.exports[m.name] = M[m.name] = m.model
        allModels.push(m)
    })
    // Do a second pass to setup associations/finders now all Models exist
    allModels.forEach(m => {
        if (m.associations) {
            m.associations.call(m.model, M, app)
        }
        if (m.finders) {
            const finders = m.finders.call(m.model, M, app)
            if (finders.static) {
                Object.assign(m.model, finders.static)
            }
            if (finders.instance) {
                Object.assign(m.model.prototype, finders.instance)
            }
        }
    })
}

module.exports.init = init
