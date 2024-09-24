/**
 * Node-RED Storage Backend
 *
 * - /storage
 *
 * @namespace storage
 * @memberof forge.storage
 */
module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, response) => {
        // The request has a valid token, but need to check the token is allowed
        // to access the project

        const id = request.params.projectId
        // Check if the project exists first
        const project = await app.db.models.Project.byId(id)
        if (project && request.session.ownerType === 'project' && request.session.ownerId === id) {
            request.project = project
            // Project exists and the auth token is for this project
            return
        }
        response.status(404).send({ code: 'not_found', error: 'Not Found' })
    })

    app.post('/:projectId/flows', async (request, response) => {
        const id = request.params.projectId
        let UserId = null
        if (request.headers['ff-user']) {
            UserId = app.db.models.User.decodeHashid(request.headers['ff-user'])[0]
        }
        // Check if the project exists first
        let flow = await app.db.models.StorageFlow.byProject(id)
        if (flow) {
            flow.flow = JSON.stringify(request.body)
            flow.UserId = UserId
            await flow.save()
        } else {
            flow = await app.db.models.StorageFlow.create({
                flow: JSON.stringify(request.body),
                UserId,
                ProjectId: id
            })

            await flow.save()
        }
        response.send(request.body)
    })

    app.get('/:projectId/flows', async (request, response) => {
        const id = request.params.projectId
        const flow = await app.db.models.StorageFlow.byProject(id)
        if (flow) {
            response.type('application/json').send(flow.flow)
        } else {
            response.send([])
        }
    })

    app.post('/:projectId/credentials', async (request, response) => {
        const id = request.params.projectId
        let creds = await app.db.models.StorageCredentials.byProject(id)
        if (creds) {
            creds.credentials = JSON.stringify(request.body)
            await creds.save()
        } else {
            creds = await app.db.models.StorageCredentials.create({
                credentials: JSON.stringify(request.body),
                ProjectId: id
            })
            await creds.save()
        }
        response.send(request.body)
    })

    app.get('/:projectId/credentials', async (request, response) => {
        const id = request.params.projectId
        const creds = await app.db.models.StorageCredentials.byProject(id)
        if (creds) {
            response.type('application/json').send(creds.credentials)
        } else {
            response.send({})
        }
    })

    app.post('/:projectId/settings', async (request, response) => {
        const id = request.params.projectId
        let settings = await app.db.models.StorageSettings.byProject(id)
        if (settings) {
            settings.settings = JSON.stringify(request.body)
            await settings.save()
        } else {
            settings = await app.db.models.StorageSettings.create({
                settings: JSON.stringify(request.body),
                ProjectId: id
            })
            await settings.save()
        }
        response.send(request.body)
    })

    app.get('/:projectId/settings', async (request, response) => {
        const id = request.params.projectId
        const settings = await app.db.models.StorageSettings.byProject(id)
        if (settings) {
            response.type('application/json').send(settings.settings)
        } else {
            response.send({})
        }
    })

    app.post('/:projectId/sessions', async (request, response) => {
        const id = request.params.projectId
        let sessions = await app.db.models.StorageSession.byProject(id)
        if (sessions) {
            sessions.sessions = JSON.stringify(request.body)
            await sessions.save()
        } else {
            sessions = await app.db.models.StorageSession.create({
                sessions: JSON.stringify(request.body),
                ProjectId: id
            })
            await sessions.save()
        }
        response.send(request.body)
    })

    app.get('/:projectId/sessions', async (request, response) => {
        const id = request.params.projectId
        const sessions = await app.db.models.StorageSession.byProject(id)
        if (sessions) {
            response.type('application/json').send(sessions.sessions)
        } else {
            response.send({})
        }
    })

    app.post('/:projectId/library/:type',
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['name', 'body'],
                    properties: {
                        name: { type: 'string' },
                        meta: { type: 'object' },
                        body: {
                            anyOf: [
                                { type: 'string' },
                                { type: 'object' }
                            ]
                        }
                    }
                },
                params: {
                    // type: { type: 'string', enum: [ 'flows', 'functions', 'templates' ] },
                    id: { type: 'string' }
                }
            }
        },
        async (request, response) => {
            const id = request.params.projectId
            const type = request.params.type
            let body = request.body.body
            const name = request.body.name
            const meta = request.body.meta

            if (typeof body === 'object') {
                body = JSON.stringify(body)
            }

            const direct = await app.db.models.StorageLibrary.byName(id, type, name)

            if (direct) {
                direct.body = body
                direct.meta = JSON.stringify(meta)
                await direct.save()
            } else {
                await app.db.models.StorageLibrary.create({
                    name: request.body.name,
                    type,
                    meta: JSON.stringify(meta),
                    body,
                    ProjectId: id
                })
            }

            response.status(201).send()
        }
    )

    app.get('/:projectId/library/:type',
        {
            schema: {
                query: {
                    name: { type: 'string' }
                },
                params: {
                    // type: { type: 'string', enum: [ 'flows', 'functions', 'templates' ]},
                    id: { type: 'string' }
                }
            }
        },
        async (request, response) => {
            const id = request.params.projectId
            const type = request.params.type
            let name = request.query.name
            let reply = []

            // Try to get the exact name
            const direct = await app.db.models.StorageLibrary.byName(id, type, name)
            if (direct) {
                if (type === 'flows') {
                    reply = JSON.parse(direct.body)
                } else {
                    reply = direct.body
                }
            } else {
                // No entry with that exact name. Check to see if its a partial
                // path name
                if (name.length > 0 && name[name.length - 1] !== '/') {
                    name += '/'
                }
                const subPaths = new Set()
                const entries = await app.db.models.StorageLibrary.byPath(id, type, name)
                entries.forEach(entry => {
                    const shortName = entry.name.substring(name.length)
                    const pathParts = shortName.split('/')
                    if (pathParts.length === 1) {
                        reply.push({ fn: shortName, ...JSON.parse(entry.meta) })
                    } else {
                        subPaths.add(pathParts[0])
                    }
                })
                reply.push(...subPaths)
            }
            response.send(reply)
        }
    )
}
