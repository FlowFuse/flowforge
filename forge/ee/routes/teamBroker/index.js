const schemaApi = require('./schema')

module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)

    app.addHook('preHandler', async (request, reply) => {
        if (request.params.teamId !== undefined || request.params.teamSlug !== undefined) {
            // let teamId = request.params.teamId
            if (request.params.teamSlug) {
                // If :teamSlug is provided, need to lookup the team to get
                // its id for subsequent checks
                request.team = await app.db.models.Team.bySlug(request.params.teamSlug)
                if (!request.team) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return
                }
                // teamId = request.team.hashid
            }

            if (!request.team) {
                // For a :teamId route, we can now lookup the full team object
                request.team = await app.db.models.Team.byId(request.params.teamId)
                if (!request.team) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return
                }

                const teamType = await request.team.getTeamType()
                if (!teamType.getFeatureProperty('teamBroker', false)) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return // eslint-disable-line no-useless-return
                }
            }
        }
        if (!request.teamMembership) {
            request.teamMembership = await request.session.User.getTeamMembership(request.team.id)
        }
    })

    await schemaApi(app)

    /**
     * Get the Teams MQTT Clients
     * @name /api/v1/teams/:teamId/broker/clients
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.get('/clients', {
        preHandler: app.needsPermission('broker:clients:list'),
        schema: {
            summary: 'List MQTT clients for the team',
            tags: ['MQTT Broker'],
            query: { $ref: 'PaginationParams' },
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        clients: { type: 'array' },
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'integer' }
                    },
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const users = await app.db.models.TeamBrokerClient.byTeam(request.team.hashid, paginationOptions)
        reply.send(app.db.views.TeamBrokerClient.users(users))
    })

    /**
     * Creates a new MQTT Client
     * @name /api/v1/teams/:teamId/broker/client
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.post('/client', {
        preHandler: app.needsPermission('broker:clients:create'),
        schema: {
            summary: 'Create new MQTT client for the team',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    acls: { type: 'array' },
                    username: { type: 'string' },
                    password: { type: 'string' }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        acls: { type: 'array' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        if (await app.db.models.TeamBrokerClient.byUsername(request.body.username, request.team.hashid)) {
            return reply
                .code(409)
                .send({
                    code: 'client_already_exists',
                    error: 'Client Already exists with username'
                })
        }
        try {
            const newUser = request.body
            newUser.acls = JSON.stringify(newUser.acls)
            await request.team.checkTeamBrokerClientCreateAllowed()
            const user = await app.db.models.TeamBrokerClient.create({ ...request.body, TeamId: request.team.id })
            reply.status(201).send(app.db.views.TeamBrokerClient.user(user))
        } catch (err) {
            return reply
                .code(err.statusCode || 400)
                .send({
                    code: err.code || 'unknown_error',
                    error: err.error || err.message
                })
        }
    })

    /**
     * Get a specific MQTT Client
     * @name /api/v1/teams/:teamId/broker/client/:username
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.get('/client/:username', {
        preHandler: app.needsPermission('broker:clients:list'),
        schema: {
            summary: 'Get details about a specific MQTT client',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    username: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        acls: { type: 'array' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const user = await app.db.models.TeamBrokerClient.byUsername(request.params.username, request.team.hashid)
        if (user) {
            reply.send(app.db.views.TeamBrokerClient.user(user))
        } else {
            reply.status(404).send({})
        }
    })

    /**
     * Update a specific MQTT Client
     * @name /api/v1/teams/:teamId/broker/client/:username
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.put('/client/:username', {
        preHandler: app.needsPermission('broker:clients:edit'),
        schema: {
            summary: 'Modify a MQTT Client',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    username: { type: 'string' }
                }
            },
            body: {
                anyOf: [
                    {
                        type: 'object',
                        properties: {
                            password: { type: 'string' },
                            acls: { type: 'array' }
                        }
                    },
                    {
                        type: 'object',
                        properties: {
                            password: { type: 'string' }
                        }
                    },
                    {
                        type: 'object',
                        properties: {
                            acls: { type: 'array' }
                        }
                    }
                ]
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        acls: { type: 'array' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            const user = await app.db.models.TeamBrokerClient.byUsername(request.params.username, request.team.hashid)
            if (!user) {
                return reply.status(404).send({})
            }
            if (request.body.password) {
                user.password = request.body.password
            }
            if (request.body.acls) {
                user.acls = JSON.stringify(request.body.acls)
            }
            await user.save()
            reply.status(201).send(app.db.views.TeamBrokerClient.user(user))
        } catch (err) {
            return reply
                .code(err.statusCode || 400)
                .send({
                    code: err.code || 'unknown_error',
                    error: err.error || err.message
                })
        }
    })

    /**
     * Delete a MQTT Clients
     * @name /api/v1/teams/:teamId/broker/client/:username
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.delete('/client/:username', {
        preHandler: app.needsPermission('broker:clients:delete'),
        schema: {
            summary: 'Delete a MQTT client',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    username: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const user = await app.db.models.TeamBrokerClient.byUsername(request.params.username, request.team.hashid)
        if (user) {
            await user.destroy()
            reply.send({ status: 'okay' })
        } else {
            reply.status(404).send({})
        }
    })

    /**
     * List all topics used by the Team
     * @name /api/v1/teams/:teamId/broker/topics
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.get('/topics', {
        preHandler: app.needsPermission('broker:topics:list'),
        schema: {
            summary: 'Gets list of topics used by a team',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const list = await app.teamBroker.getUsedTopics(request.team.hashid)
        reply.send(list)
    })

    /**
     * Get All Credentials for 3rd Party Brokers linked to a team
     * @name /api/v1/teams:/teamId/broker/credentials
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.get('/credentials', {
        preHandler: app.needsPermission('broker:credentials:list'),
        schema: {
            summary: 'Get credentials for 3rd party MQTT brokers',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {

                    },
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const creds = app.db.model.BrokerCredentials.byTeam(request.params.teamId)
        // TODO need a view to strip out the actual credentials
        reply.send(creds)
    })

    /**
     * Add new Credentials for a 3rd Party Broker
     */
    app.post('/credentials', {
        preHandler: app.needsPermission('broker:credentials:create'),
        schema: {
            summary: 'Create credentials for a 3rd party MQTT broker',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    protocol: { type: 'string' },
                    protocolVersion: { type: 'number' },
                    ssl: { type: 'boolean' },
                    verifySSL: { type: 'boolean' },
                    clientId: { type: 'string' },
                    credentials: {
                        type: 'object'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {

                    },
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const input = request.body
        input.credentials = JSON.stringify(request.body.credentials)
        input.TeamId = app.db.models.Team.decodeHashid(request.params.teamId)
        const creds = await app.db.models.BrokerCredentials.create(input)
        const clean = app.db.views.BrokerCredentials.clean(creds)
        reply.send(clean)
    })

    /**
     * Get Credentials for a 3rd Party Broker
     * @name /api/v1/teams/:teamId/broker/:brokerId/creds
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.get('/:brokerId/credentials', {
        preHandler: [
            async (request, reply) => {
                // TODO Needs custom preHandler to work with token for mqtt agent only
            }
        ],
        schema: {
            summary: 'Gets credentials for a 3rd party MQTT broker',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    brokerId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {

                    },
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        console.log(request.params)
        const creds = await app.db.models.BrokerCredentials.byId(request.params.brokerId)
        if (creds) {
            const resp = creds.toJSON()
            resp.id = resp.hashid
            delete resp.hashid
            delete resp.slug
            delete resp.links
            resp.credentials = JSON.parse(resp.credentials)
            reply.send(resp)
        } else {
            reply.status(404).send({})
        }
    })

    /**
     * Edit 3rd Party Broker credentials
     */
    app.put('/:brokerId/credentials', {
        preHandler: app.needsPermission('broker:credentials:edit'),
        schema: {
            summary: 'Delete credentials for a 3rd party MQTT broker',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    brokerId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {

                    },
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {

    })

    /**
     * Remove 3rd Party Broker credentials
     */
    app.delete('/:brokerId/credentials', {
        preHandler: app.needsPermission('broker:credentials:delete'),
        schema: {
            summary: 'Delete credentials for a 3rd party MQTT broker',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    brokerId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {

                    },
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const creds = await app.db.models.BrokerCredentials.byId(request.params.brokerId)
        if (creds) {
            try {
                await creds.destroy()
                reply.send({})
            } catch (err) {
                reply.status(500).send({ error: '', message: '' })
            }
        } else {
            reply.status(404).send({})
        }
    })

    /**
     * Store Topics from a 3rd Party Broker
     * @name /api/v1/teams/:teamId/broker/:brokerId/topics
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.post('/:brokerId/topics', {
        preHandler: app.needsPermission('broker:topics:list'),
        schema: {
            summary: 'Store Topics from a 3rd party MQTT broker',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    brokerId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {

                },
                additionalProperties: true
            },
            response: {
                200: {
                    type: 'object',
                    properties: {

                    },
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        console.log(request.body)
        reply.send({})
    })
}
