module.exports = async function (app) {
    app.log.debug('registering custom hostname routes')
    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        if (!app.config.features.enabled('customHostnames')) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.projectId !== undefined) {
            if (request.params.projectId) {
                try {
                    request.project = await app.db.models.Project.byId(request.params.projectId)
                    if (!request.project) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    const teamType = await request.project.Team.getTeamType()
                    if (!teamType.getFeatureProperty('customHostnames', true)) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return // eslint-disable-line no-useless-return
                    }
                    if (request.session.User) {
                        request.teamMembership = await request.session.User.getTeamMembership(request.project.Team.id)
                        if (!request.teamMembership && !request.session.User.admin) {
                            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                            return // eslint-disable-line no-useless-return
                        }
                    } else if (request.session.ownerId !== request.params.projectId) {
                        // AccessToken being used - but not owned by this project
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return // eslint-disable-line no-useless-return
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })

    app.get('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        reply.send(await request.project.getCustomHostname() || {})
    })

    app.put('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        app.log.debug(`custom hostname put ${JSON.stringify(request.body)}`)
        if (request.body.hostname) {
            try {
                await request.project.setCustomHostname(request.body.hostname)
                const suspendOptions = {
                    skipBilling: true
                }
                restartInstance(request.project, request.session.User)
                reply.send({ hostname: request.body.hostname })
            } catch (err) {
                reply.code(409).send({ code: 'hostname_node_available', error: 'Hostname not available' })
            }
        } else {
            reply.code(400).send({})
        }
    })

    app.delete('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        await request.project.clearCustomHostname()
        await restartInstance(request.project, request.session.User)
        reply.status(204).send({})
    })

    async function restartInstance(project, user) {
        if (project.state === 'running') {
            app.log.info(`Restarting project ${project.id}`)
            await app.containers.stop(project, suspendOptions)
            await app.auditLog.Project.project.suspended(user, null, project)
            await project.reload()
            await project.save()
            const startResult = await app.containers.start(project)
            startResult.started.then(async () => {
                await app.auditLog.Project.project.started(user, null, project)
                app.db.controllers.Project.clearInflightState(project)
                return true
            }).catch(err => {
                app.log.info(`Failed to restart project ${project.id}`)
                throw err
            })
        }
    }
}
