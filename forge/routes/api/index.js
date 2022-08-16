/**
 * Routes related to the forge api
 *
 * The forge api is served from `/api/v1/`.
 * @namespace api
 * @memberof forge.routes
 */
const User = require('./user.js')
const Users = require('./users.js')
const Team = require('./team.js')
const TeamType = require('./teamType.js')
const Project = require('./project.js')
const Admin = require('./admin.js')
const Settings = require('./settings.js')
const Stack = require('./stack.js')
const Template = require('./template.js')
const Device = require('./device.js')
const ProjectType = require('./projectType.js')

module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    app.decorate('getPaginationOptions', (request, defaults) => {
        const result = { ...defaults }
        if (request.query.limit !== undefined) {
            result.limit = request.query.limit
        }
        if (request.query.cursor !== undefined) {
            result.cursor = request.query.cursor
        }
        return result
    })

    app.register(Settings, { prefix: '/settings' })
    app.register(Admin, { prefix: '/admin' })
    app.register(User, { prefix: '/user' })
    app.register(Users, { prefix: '/users' })
    app.register(Team, { prefix: '/teams' })
    app.register(TeamType, { prefix: '/team-types' })
    app.register(Project, { prefix: '/projects' })
    app.register(Stack, { prefix: '/stacks' })
    app.register(Template, { prefix: '/templates' })
    if (app.config.features.enabled('devices')) {
        app.register(Device, { prefix: '/devices' })
    }
    app.register(ProjectType, { prefix: '/project-types' })
    app.get('*', function (request, reply) {
        reply.code(404).type('text/html').send('Not Found')
    })
}
