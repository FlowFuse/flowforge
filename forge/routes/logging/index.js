const { getLoggers: getDeviceLogger } = require('../../auditLog/device')
const { getLoggers: getProjectLogger } = require('../../auditLog/project')
const { Roles } = require('../../lib/roles')

/** Node-RED Audit Logging backend
 *
 * - /audit
 *
 * @namespace audit
 * @memberof forge.logging
 */

module.exports = async function (app) {
    const deviceAuditLogger = getDeviceLogger(app)
    const projectAuditLogger = getProjectLogger(app)
    /** @type {import('../../db/controllers/AuditLog')} */
    const auditLogController = app.db.controllers.AuditLog
    /** @type {import('../../db/controllers/ProjectSnapshot')} */
    const snapshotController = app.db.controllers.ProjectSnapshot

    app.addHook('preHandler', app.verifySession)

    /**
     * Post route for node-red _cloud_ instance audit log events
     * @method POST
     * @name /logging/:projectId/audit
     * @memberof forge.routes.logging
     */
    app.post('/:projectId/audit', {
        preHandler: async (request, response) => {
            // The request has a valid token, but need to check the token is allowed
            // to access the project

            const id = request.params.projectId
            // Check if the project exists first
            const project = await app.db.models.Project.byId(id)
            if (project && request.session.ownerType === 'project' && request.session.ownerId === id) {
                // Project exists and the auth token is for this project
                request.project = project
                return
            }
            response.status(404).send({ code: 'not_found', error: 'Not Found' })
        }
    },
    async (request, response) => {
        const projectId = request.params.projectId
        const auditEvent = request.body
        const event = auditEvent.event
        const error = auditEvent.error
        const __launcherLog = auditEvent.__launcherLog || []
        delete auditEvent.__launcherLog // dont add this to the audit log

        // Some node-red audit events are not useful to expose to the end user - filter them out here
        // api.error:version_mismatch - normal part of collision detection when trying to deploy flows
        if (event === 'api.error' && error === 'version_mismatch') {
            response.status(200).send()
        }

        let user = request.session?.User || null
        if (!user && auditEvent?.user && typeof auditEvent.user === 'string') {
            user = await app.db.models.User.byId(auditEvent.user) || null
        }
        const userId = user?.id || null

        // first check to see if the event is a known structured event
        if (event === 'start-failed') {
            await projectAuditLogger.project.startFailed(userId || 'system', error, { id: projectId })
        } else {
            // otherwise, just log it
            delete auditEvent.event
            delete auditEvent.user
            delete auditEvent.path
            delete auditEvent.timestamp

            await auditLogController.projectLog(
                projectId,
                userId,
                event,
                auditEvent
            )
        }
        if (event === 'nodes.install' && !error) {
            await app.db.controllers.Project.addProjectModule(request.project, auditEvent.module, auditEvent.version)
        } else if (event === 'nodes.remove' && !error) {
            await app.db.controllers.Project.removeProjectModule(request.project, auditEvent.module)
        } else if (event === 'modules.install' && !error) {
            await app.db.controllers.Project.addProjectModule(request.project, auditEvent.module, auditEvent.version || '*')
        } else if (event === 'crashed' || event === 'safe-mode') {
            if (app.config.features.enabled('emailAlerts')) {
                const data = event === 'crashed'
                    ? {
                        exitCode: auditEvent.info?.code,
                        exitSignal: auditEvent.info?.signal,
                        exitInfo: auditEvent.info?.info,
                        log: __launcherLog
                    }
                    : undefined
                await app.auditLog.alerts.generate(projectId, event, data)
            }
            // send notification to all members and owners in the team
            const teamMembersAndOwners = await request.project.Team.getTeamMembers([Roles.Member, Roles.Owner])
            if (teamMembersAndOwners && teamMembersAndOwners.length > 0) {
                const notificationType = event === 'crashed' ? 'instance-crashed' : 'instance-safe-mode'
                const reference = `${notificationType}:${projectId}`
                const data = {
                    instance: {
                        id: projectId,
                        name: request.project.name
                    },
                    meta: {
                        severity: event === 'crashed' ? 'error' : 'warning'
                    }
                }
                for (const user of teamMembersAndOwners) {
                    await app.notifications.send(user, notificationType, data, reference, { upsert: true })
                }
            }
        }

        response.status(200).send()

        // perform an auto snapshot
        if (event === 'flows.set' && ['full', 'flows', 'nodes'].includes(auditEvent.type)) {
            if (!app.config.features.enabled('instanceAutoSnapshot')) {
                return // device auto snapshot feature is not available
            }

            const teamType = await request.project.Team.getTeamType()
            const instanceAutoSnapshotEnabledForTeam = teamType.getFeatureProperty('instanceAutoSnapshot', false)
            if (!instanceAutoSnapshotEnabledForTeam) {
                return // not enabled for team
            }
            const instanceAutoSnapshotEnabledForProject = true // FUTURE: await request.project.getSetting('autoSnapshot')
            if (instanceAutoSnapshotEnabledForProject === true) {
                setImmediate(async () => {
                    // when after the response is sent & IO is done, perform the snapshot
                    try {
                        const meta = { user }
                        const options = { clean: true, setAsTarget: false }
                        const snapshot = await snapshotController.doInstanceAutoSnapshot(request.project, auditEvent.type, options, meta)
                        if (!snapshot) {
                            throw new Error('Auto snapshot was not successful')
                        }
                    } catch (error) {
                        app.log.error('Error occurred during auto snapshot', error)
                    }
                })
            }
        }
    })

    /**
     * Post route for node_red device audit log events
     * @method POST
     * @name /logging/device/:deviceId/audit
     * @memberof forge.routes.logging
     */
    app.post('/device/:deviceId/audit', {
        preHandler: async (request, response) => {
            // The request has a valid token, but need to check the token is allowed
            // to access the device
            const id = request.params.deviceId
            // Check if the device exists first
            const device = await app.db.models.Device.byId(id)
            if (device && request.session.ownerType === 'device' && +request.session.ownerId === device.id) {
                // device exists and the auth token is for this device
                request.device = device
                return
            }
            response.status(404).send({ code: 'not_found', error: 'Not Found' })
        }
    }, async (request, response) => {
        const deviceId = request.params.deviceId
        const auditEvent = request.body
        const event = auditEvent.event
        const error = auditEvent.error
        const userId = auditEvent.user ? app.db.models.User.decodeHashid(auditEvent.user) : undefined

        // first check to see if the event is a known structured event
        if (event === 'start-failed') {
            await deviceAuditLogger.device.startFailed(userId || 'system', error, { id: deviceId })
        } else {
            // otherwise, just log it
            delete auditEvent.event
            delete auditEvent.user
            delete auditEvent.path
            delete auditEvent.timestamp

            await auditLogController.deviceLog(
                request.device.id,
                userId,
                event,
                auditEvent
            )
        }

        if (event === 'crashed' || event === 'safe-mode') {
            // send notification to all members and owners in the team
            const teamMembersAndOwners = await request.device.Team.getTeamMembers([Roles.Member, Roles.Owner])
            if (teamMembersAndOwners && teamMembersAndOwners.length > 0) {
                const notificationType = event === 'crashed' ? 'device-crashed' : 'device-safe-mode'
                const reference = `${notificationType}:${deviceId}`
                const data = {
                    device: {
                        id: deviceId,
                        name: request.device.name
                    },
                    meta: {
                        severity: event === 'crashed' ? 'error' : 'warning'
                    }
                }
                for (const user of teamMembersAndOwners) {
                    await app.notifications.send(user, notificationType, data, reference, { upsert: true })
                }
            }
        }

        response.status(200).send()

        // For application owned devices, perform an auto snapshot
        if (request.device.isApplicationOwned) {
            if (event === 'flows.set' && ['full', 'flows', 'nodes'].includes(auditEvent.type)) {
                if (!app.config.features.enabled('deviceAutoSnapshot')) {
                    return // device auto snapshot feature is not available
                }

                const teamType = await request.device.Team.getTeamType()
                const deviceAutoSnapshotEnabledForTeam = teamType.getFeatureProperty('deviceAutoSnapshot', false)
                if (!deviceAutoSnapshotEnabledForTeam) {
                    return // not enabled for team
                }
                const deviceAutoSnapshotEnabledForDevice = await request.device.getSetting('autoSnapshot')
                if (deviceAutoSnapshotEnabledForDevice === true) {
                    setImmediate(async () => {
                        // when after the response is sent & IO is done, perform the snapshot
                        try {
                            const meta = { user: request.session.User }
                            const options = { clean: true, setAsTarget: false }
                            const snapshot = await snapshotController.doDeviceAutoSnapshot(request.device, auditEvent.type, options, meta)
                            if (!snapshot) {
                                throw new Error('Auto snapshot was not successful')
                            }
                        } catch (error) {
                            app.log.error('Error occurred during auto snapshot', error)
                        }
                    })
                }
            }
        }
    })
}
