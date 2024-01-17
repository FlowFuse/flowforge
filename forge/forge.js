const crypto = require('crypto')

const cookie = require('@fastify/cookie')
const csrf = require('@fastify/csrf-protection')
const helmet = require('@fastify/helmet')
const { ProfilingIntegration } = require('@sentry/profiling-node')
const fastify = require('fastify')

const auditLog = require('./auditLog')
const comms = require('./comms')
const config = require('./config') // eslint-disable-line n/no-unpublished-require
const containers = require('./containers')
const db = require('./db')
const ee = require('./ee')
const housekeeper = require('./housekeeper')
const license = require('./licensing')
const monitor = require('./monitor')
const postoffice = require('./postoffice')
const routes = require('./routes')
const settings = require('./settings')

require('dotenv').config()

const generatePassword = () => {
    const charList =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
    return Array.from(crypto.randomFillSync(new Uint32Array(8)))
        .map((x) => charList[x % charList.length])
        .join('')
}

async function createAdminAccessToken (server, userId) {
    const { token } =
    await server.db.controllers.AccessToken.createPersonalAccessToken(
        userId,
        '',
        null,
        'Admin Access Token'
    )
    server.log.info(`[SETUP] token: ${token}`)
}

async function createAdminUser (server) {
    if ((await server.db.models.User.count()) !== 0) return

    const password = process.env.FF_ADMIN_PASSWORD || generatePassword()
    const { id: userId } = await server.db.models.User.create({
        username: 'ff-admin',
        name: 'Default Admin',
        email: 'admin@example.com',
        email_verified: true,
        password,
        admin: true,
        password_expired: true
    })
    server.log.info('[SETUP] Created default Admin User')
    server.log.info('[SETUP] username: ff-admin')
    server.log.info(`[SETUP] password: ${password}`)

    if (server.config.create_admin_access_token) { await createAdminAccessToken(server, userId) }
}

// type defs for JSDoc and VSCode Intellisense

/**
 * @typedef {fastify.FastifyInstance} FastifyInstance
 * @typedef {fastify.FastifyRequest} FastifyRequest
 * @typedef {fastify.FastifyReply} FastifyReply
 */

/**
 * The Forge/fastify app instance.
 * @typedef {FastifyInstance} ForgeApplication
 * @alias app - The Fastify app instance
 */

/** @type {ForgeApplication} */
module.exports = async (options = {}) => {
    const runtimeConfig = config.init(options)
    const loggerConfig = {
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() }
            },
            bindings: (bindings) => {
                return {}
            }
        },
        timestamp: require('pino').stdTimeFunctions.isoTime,
        level: runtimeConfig.logging.level,
        serializers: {
            res (reply) {
                return {
                    statusCode: reply.statusCode,
                    request: {
                        url: reply.request?.raw?.url,
                        method: reply.request?.method,
                        remoteAddress: reply.request?.ip,
                        remotePort: reply.request?.socket.remotePort
                    }
                }
            }
        }
    }
    if (runtimeConfig.logging.pretty !== false) {
        loggerConfig.transport = {
            target: 'pino-pretty',
            options: {
                translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'",
                ignore: 'pid,hostname',
                singleLine: true
            }
        }
    }
    const server = fastify({
        forceCloseConnections: true,
        bodyLimit: 5242880,
        maxParamLength: 500,
        trustProxy: true,
        logger: loggerConfig
    })

    if (runtimeConfig.telemetry.backend?.prometheus?.enabled) {
        const metricsPlugin = require('fastify-metrics')
        await server.register(metricsPlugin, { endpoint: '/metrics' })
    }

    if (runtimeConfig.telemetry.backend?.sentry?.dsn) {
        server.register(require('@immobiliarelabs/fastify-sentry'), {
            dsn: runtimeConfig.telemetry.backend.sentry.dsn,
            environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'unknown',
            release: `flowfuse@${runtimeConfig.version}`,
            tracesSampleRate: 0.1,
            profilesSampleRate: 0.1,
            integrations: [new ProfilingIntegration()],
            extractUserData (request) {
                const user = request.session?.User || request.user
                if (!user) {
                    return {}
                }
                const extractedUser = {
                    id: user.hashid,
                    username: user.username,
                    email: user.email,
                    name: user.name
                }

                return extractedUser
            }
        })
    }

    server.addHook('onError', async (request, reply, error) => {
    // Useful for debugging when a route goes wrong
    // console.error(error.stack)
    })

    try {
    // Config : loads environment configuration
        await server.register(config.attach, options)

        // Test Only. Permit access to app.routes - for evaluating routes in tests
        if (options.config?.test?.fastifyRoutes) {
            // since @fastify/routes is a dev dependency, we only load it when requested in test
            server.register(require('@fastify/routes')) // eslint-disable-line n/no-unpublished-require
        }

        // Rate Limits: rate limiting for the server end points
        if (server.config.rate_limits?.enabled) {
            // for rate_limits, see [routes/rateLimits.js].getLimits()
            await server.register(
                require('@fastify/rate-limit'),
                server.config.rate_limits
            )
        }

        // DB : the database connection/models/views/controllers
        await server.register(db)
        // Settings
        await server.register(settings)
        // License
        await server.register(license)
        // Audit Logging
        await server.register(auditLog)

        // Housekeeper
        await server.register(housekeeper)

        // HTTP Server configuration
        if (!server.settings.get('cookieSecret')) {
            await server.settings.set(
                'cookieSecret',
                server.db.utils.generateToken(12)
            )
        }
        await server.register(cookie, {
            secret: server.settings.get('cookieSecret')
        })
        await server.register(csrf, {
            cookieOpts: { _signed: true, _httpOnly: true }
        })
        await server.register(helmet, {
            global: true,
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
            crossOriginOpenerPolicy: false,
            crossOriginResourcePolicy: false,
            hidePoweredBy: true,
            hsts: false,
            frameguard: {
                action: 'deny'
            }
        })

        // Routes : the HTTP routes
        await server.register(routes, { logLevel: server.config.logging.http })
        // Post Office : handles email
        await server.register(postoffice)
        // Comms : real-time communication broker
        await server.register(comms)
        // Containers:
        await server.register(containers)

        await server.register(ee)

        // Monitor
        await server.register(monitor)

        await server.ready()

        // NOTE: This is only likely to do anything after a db upgrade where the settingsHashes are cleared.
        server.db.models.Device.recalculateSettingsHashes(false) // update device.settingsHash if null

        // Ensure The defaultTeamType is in place
        await server.db.controllers.TeamType.ensureDefaultTypeExists()

        // Create ff-admin
        if (server.config.create_admin) await createAdminUser(server)

        return server
    } catch (err) {
        console.error(err)
        server.log.error(`Failed to start: ${err.toString()}`)
        throw err
    }
}
