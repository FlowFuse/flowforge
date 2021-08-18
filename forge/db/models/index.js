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
 */
const { Model, DataTypes } = require('sequelize');
const Hashids = require('hashids/cjs')
const hashids = {};


// The models that should be loaded
const modelTypes = ['Organization', 'User', 'Team', 'TeamMember','Session', 'Project'];

// A local map of the known models.
const M = {};

/**
 * Initialises all of the models listed in `modelTypes`.
 *
 * For each one it:
 *  1. requires the corresponding model
 *  2. builds the approprate sequelize Model object for it
 *  3. exports it as `module.exports.<Type>`
 *
 * Once all of the models are created, it loops back over them to:
 *  1. setup inter-model associates
 *  2. attach the static and instance finers to the model object
 *
 *
 * Finally it synchronizes with the database to create the tables as needed.
 * @private
 */
async function init(db) {
    const sequelize = db.sequelize;
    const allModels = [];
    modelTypes.forEach(type => {
        const m = require(`./${type}`);
        if (m.name !== type) {
            throw new Error(`Model name mismatch: '${m.name}' !== '${type}'`)
        }
        hashids[type] = new Hashids(type,10);

        const opts = {
            sequelize,
            modelName: m.name,
            ...(m.options || {})
        }

        if (m.scopes) {
            opts.scopes = m.scopes;
        }
        if (m.hooks) {
            opts.hooks = m.hooks;
        }
        if (!m.model) {
            m.model = class model extends Model {}
        }
        if (!m.schema.slug) {
            m.schema.slug = {
                type: DataTypes.VIRTUAL,
                get() {
                    return hashids[m.name].encode(this.id);
                }
            }
        }
        m.schema.hashid = {
            type: DataTypes.VIRTUAL,
            get() {
                return hashids[m.name].encode(this.id);
            },
            set(_) {
                throw new Error('hashid is read-only');
            }
        }
        m.schema.links = {
            type: DataTypes.VIRTUAL,
            get() {
                return {
                    self: process.env.BASE_URL+"/api/v1/"+m.name.toLowerCase()+"/"+this.slug
                }
            }
        }
        m.model.init(m.schema, opts);
        module.exports[m.name] = M[m.name] = m.model;
        allModels.push(m);
    })
    // Do a second pass to setup associations/finders now all Models exist
    allModels.forEach(m => {
        if (m.associations) {
            m.associations.call(m.model, M)
        }
        if (m.finders) {
            const finders = m.finders.call(m.model, M);
            if (finders.static) {
                Object.assign(m.model,finders.static);
            }
            if (finders.instance) {
                Object.assign(m.model.prototype, finders.instance)
            }
        }
    });

    await sequelize.sync();
}

module.exports.init = init;
