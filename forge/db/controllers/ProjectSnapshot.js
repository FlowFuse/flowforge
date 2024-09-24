const { Op } = require('sequelize')
const DEVICE_AUTO_SNAPSHOT_LIMIT = 10
const DEVICE_AUTO_SNAPSHOT_PREFIX = 'Auto Snapshot' // Any changes to the format should be reflected in frontend/src/pages/device/Snapshots/index.vue
const DEPLOY_TYPE_ENUM = {
    full: 'Full',
    flows: 'Modified Flows',
    nodes: 'Modified Nodes'
}

const autoSnapshotUtils = {
    getPrefix: (item) => {
        return item.constructor.name === 'Device' ? DEVICE_AUTO_SNAPSHOT_PREFIX : INSTANCE_AUTO_SNAPSHOT_PREFIX
    },
    getItemType: (item) => {
        if (item.constructor.name === 'Project') {
            return 'Instance'
        }
        return item.constructor.name
    },
    nameRegex: (prefix) => new RegExp(`^${prefix} - \\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$`), // e.g "Auto Snapshot - 2023-02-01 12:34:56"
    generateName: (prefix) => `${prefix} - ${new Date().toLocaleString('sv-SE')}`, // "base - YYYY-MM-DD HH:MM:SS"
    generateDescription: (prefix, itemType, deploymentType = '') => {
        const deployInfo = DEPLOY_TYPE_ENUM[deploymentType]
            ? `${DEPLOY_TYPE_ENUM[deploymentType]} deployment`
            : 'deployment'
        return `${itemType} ${prefix} taken following a ${deployInfo}`
    }
}

const deviceAutoSnapshotUtils = {
    nameRegex: autoSnapshotUtils.nameRegex(DEVICE_AUTO_SNAPSHOT_PREFIX),
    isAutoSnapshot: function (snapshot) {
        return deviceAutoSnapshotUtils.nameRegex.test(snapshot.name)
    },
    /**
     * Get all auto snapshots for a device
     *
     * NOTE: If a `limit` of 10 is provided and some of the snapshots are in use, the actual number of snapshots returned may be less than 10
     * @param {Object} app - the forge application object
     * @param {Object} device - a device (model) instance
     * @param {boolean} [excludeInUse=true] - whether to exclude snapshots that are currently in use by a device, device group or pipeline stage device group
     * @param {number} [limit=0] - the maximum number of snapshots to query in the database (0 means no limit)
     */
    getAutoSnapshots: async function (app, device, excludeInUse = true, limit = 0) {
        // TODO: the snapshots table should really have a an indexed `type` column to distinguish between auto and manual snapshots
        // for now, as per MVP, we'll use the name pattern to identify auto snapshots

        // Get snapshots
        const possibleAutoSnapshots = await app.db.models.ProjectSnapshot.findAll({
            where: {
                DeviceId: device.id,
                // name: { [Op.regexp]: deviceAutoSnapshotUtils.nameRegex } // regex is not supported by sqlite!
                name: { [Op.like]: `${DEVICE_AUTO_SNAPSHOT_PREFIX} - %-%-% %:%:%` }
            },
            order: [['id', 'ASC']]
        })

        // Filter out any snapshots that don't match the regex
        const autoSnapshots = possibleAutoSnapshots.filter(deviceAutoSnapshotUtils.isAutoSnapshot)

        // if caller _wants_ all, including those "in use", we can just return here
        if (!excludeInUse) {
            return autoSnapshots
        }
        // utility function to remove items from an array
        const removeFromArray = (baseList, removeList) => baseList.filter((item) => !removeList.includes(item))

        // candidates for are those that are not in use
        let candidateIds = autoSnapshots.map((snapshot) => snapshot.id)

        // since we're excluding "in use" snapshots, we need to check the following tables:
        // * device
        // * device groups
        // * pipeline stage device group
        // If any of these snapshots are set as active/target, remove them from the candidates list

        // Check `Devices` table
        const query = {
            where: {
                [Op.or]: [
                    { targetSnapshotId: { [Op.in]: candidateIds } },
                    { activeSnapshotId: { [Op.in]: candidateIds } }
                ]
            }
        }
        if (typeof limit === 'number' && limit > 0) {
            query.limit = limit
        }
        const snapshotsInUseInDevices = await app.db.models.Device.findAll(query)
        const inUseAsTarget = snapshotsInUseInDevices.map((device) => device.targetSnapshotId)
        const inUseAsActive = snapshotsInUseInDevices.map((device) => device.activeSnapshotId)
        candidateIds = removeFromArray(candidateIds, inUseAsTarget)
        candidateIds = removeFromArray(candidateIds, inUseAsActive)

        // Check `DeviceGroups` table
        if (app.db.models.DeviceGroup) {
            const snapshotsInUseInDeviceGroups = await app.db.models.DeviceGroup.findAll({
                where: {
                    targetSnapshotId: { [Op.in]: candidateIds }
                }
            })
            const inGroupAsTarget = snapshotsInUseInDeviceGroups.map((group) => group.targetSnapshotId)
            candidateIds = removeFromArray(candidateIds, inGroupAsTarget)
        }

        // Check `PipelineStageDeviceGroups` table
        const isLicensed = app.license.active()
        if (isLicensed && app.db.models.PipelineStageDeviceGroup) {
            const snapshotsInUseInPipelineStage = await app.db.models.PipelineStageDeviceGroup.findAll({
                where: {
                    targetSnapshotId: { [Op.in]: candidateIds }
                }
            })
            const inPipelineStageAsTarget = snapshotsInUseInPipelineStage.map((stage) => stage.targetSnapshotId)
            candidateIds = removeFromArray(candidateIds, inPipelineStageAsTarget)
        }

        return autoSnapshots.filter((snapshot) => candidateIds.includes(snapshot.id))
    },
    cleanupAutoSnapshots: async function (app, device, limit = DEVICE_AUTO_SNAPSHOT_LIMIT) {
        // get all auto snapshots for the device (where not in use)
        const snapshots = await app.db.controllers.ProjectSnapshot.getDeviceAutoSnapshots(device, true, 0)
        if (snapshots.length > limit) {
            const toDelete = snapshots.slice(0, snapshots.length - limit).map((snapshot) => snapshot.id)
            await app.db.models.ProjectSnapshot.destroy({ where: { id: { [Op.in]: toDelete } } })
        }
    },
    doAutoSnapshot: async function (app, device, deploymentType, { clean = true, setAsTarget = false } = {}, meta) {
        // eslint-disable-next-line no-useless-catch
        try {
            // if not permitted, throw an error
            if (!device) {
                throw new Error('Device is required')
            }
            if (!app.config.features.enabled('deviceAutoSnapshot')) {
                throw new Error('Device auto snapshot feature is not available')
            }
            if (!(await device.getSetting('autoSnapshot'))) {
                throw new Error('Device auto snapshot is not enabled')
            }
            const teamType = await device.Team.getTeamType()
            const deviceAutoSnapshotEnabledForTeam = teamType.getFeatureProperty('deviceAutoSnapshot', false)
            if (!deviceAutoSnapshotEnabledForTeam) {
                throw new Error('Device auto snapshot is not enabled for the team')
            }
            const prefix = autoSnapshotUtils.getPrefix(device)
            const itemType = autoSnapshotUtils.getItemType(device)
            const saneSnapshotOptions = {
                name: autoSnapshotUtils.generateName(prefix),
                description: autoSnapshotUtils.generateDescription(prefix, itemType, deploymentType),
                setAsTarget
            }

            // things to do & consider:
            // 1. create a snapshot from the device
            // 2. log the snapshot creation in audit log
            // 3. delete older auto snapshots if the limit is reached (10)
            //    do NOT delete any snapshots that are currently in use by an target (instance/device/device group)
            const user = meta?.user || { id: null } // if no user is available, use `null` (system user)

            // 1. create a snapshot from the device
            const snapShot = await app.db.controllers.ProjectSnapshot.createDeviceSnapshot(
                device.Application,
                device,
                user,
                saneSnapshotOptions
            )
            snapShot.User = user

            // 2. log the snapshot creation in audit log
            // TODO: device snapshot: implement audit log
            // await deviceAuditLogger.device.snapshot.created(request.session.User, null, request.device, snapShot)

            // 3. clean up older auto snapshots
            if (clean === true) {
                await app.db.controllers.ProjectSnapshot.cleanupDeviceAutoSnapshots(device)
            }

            return snapShot
        } catch (error) {
            // TODO: device snapshot:  implement audit log
            // await deviceAuditLogger.device.snapshot.created(request.session.User, error, request.device, null)
            throw error
        }
    }
}

const INSTANCE_AUTO_SNAPSHOT_LIMIT = 10
const INSTANCE_AUTO_SNAPSHOT_PREFIX = 'Auto Snapshot' // Any changes to the format should be reflected in frontend/src/pages/device/Snapshots/index.vue

const instanceAutoSnapshotUtils = {
    nameRegex: autoSnapshotUtils.nameRegex(INSTANCE_AUTO_SNAPSHOT_PREFIX),
    isAutoSnapshot: function (snapshot) {
        return instanceAutoSnapshotUtils.nameRegex.test(snapshot.name)
    },
    /**
     * Get all auto snapshots for a project instance
     *
     * NOTE: If a `limit` of 10 is provided and some of the snapshots are in use, the actual number of snapshots returned may be less than 10
     * @param {Object} app - the forge application object
     * @param {Object} project - a project (model) instance
     * @param {boolean} [excludeInUse=true] - whether to exclude snapshots that are currently in use by a device, device group or pipeline stage device group
     * @param {number} [limit=0] - the maximum number of snapshots to query in the database (0 means no limit)
     */
    getAutoSnapshots: async function (app, project, excludeInUse = true, limit = 0) {
        // TODO: the snapshots table should really have a an indexed `type` column to distinguish between auto and manual snapshots
        // for now, as per MVP, we'll use the name pattern to identify auto snapshots

        // Get snapshots
        const possibleAutoSnapshots = await app.db.models.ProjectSnapshot.findAll({
            where: {
                ProjectId: project.id,
                // name: { [Op.regexp]: instanceAutoSnapshotUtils.nameRegex } // regex is not supported by sqlite!
                name: { [Op.like]: `${INSTANCE_AUTO_SNAPSHOT_PREFIX} - %-%-% %:%:%` }
            },
            order: [['id', 'ASC']]
        })

        // Filter out any snapshots that don't match the regex
        const autoSnapshots = possibleAutoSnapshots.filter(instanceAutoSnapshotUtils.isAutoSnapshot)

        // if caller _wants_ all, including those "in use", we can just return here
        if (!excludeInUse) {
            return autoSnapshots
        }
        // utility function to remove items from an array
        const removeFromArray = (baseList, removeList) => baseList.filter((item) => !removeList.includes(item))

        // candidates for are those that are not in use
        let candidateIds = autoSnapshots.map((snapshot) => snapshot.id)

        // since we're excluding "in use" snapshots, we need to check the following tables:
        // * project>settings>deviceSettings
        // * device
        // * device groups
        // * pipeline stage device group
        // If any of these snapshots are set as active/target, remove them from the candidates list

        // Check `Devices` table
        const query = {
            where: {
                [Op.or]: [
                    { targetSnapshotId: { [Op.in]: candidateIds } }
                ]
            }
        }
        if (typeof limit === 'number' && limit > 0) {
            query.limit = limit
        }
        const snapshotsInUseInDevices = await app.db.models.Device.findAll(query)
        const inUseAsTarget = snapshotsInUseInDevices.map((device) => device.targetSnapshotId)
        const inUseAsActive = snapshotsInUseInDevices.map((device) => device.activeSnapshotId)
        candidateIds = removeFromArray(candidateIds, inUseAsTarget)
        candidateIds = removeFromArray(candidateIds, inUseAsActive)

        // Check `DeviceGroups` table
        if (app.db.models.DeviceGroup) {
            const snapshotsInUseInDeviceGroups = await app.db.models.DeviceGroup.findAll({
                where: {
                    targetSnapshotId: { [Op.in]: candidateIds }
                }
            })
            const inGroupAsTarget = snapshotsInUseInDeviceGroups.map((group) => group.targetSnapshotId)
            candidateIds = removeFromArray(candidateIds, inGroupAsTarget)
        }

        // Check `PipelineStageDeviceGroups` table
        const isLicensed = app.license.active()
        if (isLicensed && app.db.models.PipelineStageDeviceGroup) {
            const snapshotsInUseInPipelineStage = await app.db.models.PipelineStageDeviceGroup.findAll({
                where: {
                    targetSnapshotId: { [Op.in]: candidateIds }
                }
            })
            const inPipelineStageAsTarget = snapshotsInUseInPipelineStage.map((stage) => stage.targetSnapshotId)
            candidateIds = removeFromArray(candidateIds, inPipelineStageAsTarget)
        }

        // check instance settings key for device settings
        const instanceDeviceSettings = await project.getSetting('deviceSettings')
        if (instanceDeviceSettings?.targetSnapshot) {
            candidateIds = removeFromArray(candidateIds, [instanceDeviceSettings.targetSnapshot])
        }

        return autoSnapshots.filter((snapshot) => candidateIds.includes(snapshot.id))
    },
    cleanupAutoSnapshots: async function (app, project, limit = INSTANCE_AUTO_SNAPSHOT_LIMIT) {
        // get all auto snapshots for the instance (where not in use)
        const snapshots = await app.db.controllers.ProjectSnapshot.getInstanceAutoSnapshots(project, true, 0)
        if (snapshots.length > limit) {
            const toDelete = snapshots.slice(0, snapshots.length - limit).map((snapshot) => snapshot.id)
            await app.db.models.ProjectSnapshot.destroy({ where: { id: { [Op.in]: toDelete } } })
        }
    },
    doAutoSnapshot: async function (app, project, deploymentType, { clean = true, setAsTarget = false } = {}, meta) {
        // eslint-disable-next-line no-useless-catch
        try {
            // if not permitted, throw an error
            if (!project) {
                throw new Error('Instance is required')
            }
            if (!app.config.features.enabled('instanceAutoSnapshot')) {
                throw new Error('Instance auto snapshot feature is not available')
            }

            const teamType = await project.Team.getTeamType()
            const deviceAutoSnapshotEnabledForTeam = teamType.getFeatureProperty('instanceAutoSnapshot', false)
            if (!deviceAutoSnapshotEnabledForTeam) {
                throw new Error('Instance auto snapshot is not enabled for the team')
            }
            const prefix = autoSnapshotUtils.getPrefix(project)
            const itemType = autoSnapshotUtils.getItemType(project)
            const saneSnapshotOptions = {
                name: autoSnapshotUtils.generateName(prefix),
                description: autoSnapshotUtils.generateDescription(prefix, itemType, deploymentType),
                setAsTarget
            }

            // things to do & consider:
            // 1. create a snapshot from the instance
            // 2. log the snapshot creation in audit log
            // 3. delete older auto snapshots if the limit is reached (10)
            //    do NOT delete any snapshots that are currently in use by an target (instance/device/device group)
            const currentFlow = await app.db.models.StorageFlow.byProject(project.id)
            let flowUser = null
            if (currentFlow.UserId !== null) {
                flowUser = currentFlow.UserId
            }
            const user = meta?.user || { id: flowUser } // if no user is available, use `null` (system user)

            // 1. create a snapshot from the instance
            const snapShot = await app.db.controllers.ProjectSnapshot.createSnapshot(
                project,
                user,
                saneSnapshotOptions
            )
            snapShot.User = user

            // 2. log the snapshot creation in audit log
            // TODO: project snapshot: implement audit log
            // await projectAuditLogger.project.snapshot.created(request.session.User, null, request.project, snapShot)

            // 3. clean up older auto snapshots
            if (clean === true) {
                await app.db.controllers.ProjectSnapshot.cleanupInstanceAutoSnapshots(project)
            }

            return snapShot
        } catch (error) {
            // TODO: project snapshot:  implement audit log
            // await projectAuditLogger.project.snapshot.created(request.session.User, error, request.project, null)
            throw error
        }
    }
}

// freeze the object to prevent accidental changes
Object.freeze(deviceAutoSnapshotUtils)
Object.freeze(instanceAutoSnapshotUtils)

module.exports = {
    /**
     * Creates a snapshot of the current state of a project.
     * Patches with flows, credentials, settings modules and env from request, if provided
     *
     * @param {*} app
     * @param {*} project
     */
    createSnapshot: async function (app, project, user, options) {
        const projectExport = await app.db.controllers.Project.exportProject(project)

        const credentialSecret = await project.getCredentialSecret()

        const snapshotOptions = {
            name: options.name || '',
            description: options.description || '',
            credentialSecret,
            settings: {
                settings: projectExport.settings || {},
                env: projectExport.env || {},
                modules: projectExport.modules || {}
            },
            flows: {
                flows: projectExport.flows,
                credentials: projectExport.credentials
            },
            ProjectId: project.id,
            UserId: user.id
        }
        if (options.flows) {
            snapshotOptions.flows.flows = options.flows
            snapshotOptions.flows.credentials = app.db.controllers.Project.exportCredentials(options.credentials || {}, options.credentialSecret, credentialSecret)
        }
        if (options.settings?.modules) {
            snapshotOptions.settings.modules = options.settings.modules
        }
        if (options.settings?.env) {
            // derive the project's service env but not the rest
            const serviceEnv = ['FF_INSTANCE_ID', 'FF_INSTANCE_NAME', 'FF_PROJECT_ID', 'FF_PROJECT_NAME']
            snapshotOptions.settings.env = {
                ...options.settings.env,
                ...serviceEnv.reduce((obj, key) => {
                    if (key in snapshotOptions.settings.env) {
                        obj[key] = snapshotOptions.settings.env[key]
                    }
                    return obj
                }, { })
            }
        }
        const snapshot = await app.db.models.ProjectSnapshot.create(snapshotOptions)
        await snapshot.save()
        return snapshot
    },

    /**
     * Create a snapshot of an instance owned device
     * @param {*} app
     * @param {*} project
     * @param {*} device
     * @param {*} user
     * @param {*} options
     */
    createSnapshotFromDevice: async function (app, project, device, user, options) {
        const projectExport = await app.db.controllers.Project.exportProject(project)
        const deviceConfig = await app.db.controllers.Device.exportConfig(device)
        const credentialSecret = await project.getCredentialSecret()

        const snapshotOptions = {
            name: options.name || '',
            description: options.description || '',
            credentialSecret,
            settings: {
                settings: projectExport.settings || {},
                env: projectExport.env || {},
                modules: projectExport.modules || {}
            },
            flows: {
                flows: projectExport.flows,
                credentials: projectExport.credentials
            },
            ProjectId: project.id,
            UserId: user.id
        }
        if (deviceConfig?.flows) {
            snapshotOptions.flows.flows = deviceConfig.flows
            snapshotOptions.flows.credentials = app.db.controllers.Project.exportCredentials(deviceConfig.credentials || {}, device.credentialSecret, credentialSecret)
        }
        if (deviceConfig?.package?.modules) {
            snapshotOptions.settings.modules = deviceConfig.package.modules
        }
        const snapshot = await app.db.models.ProjectSnapshot.create(snapshotOptions)
        await snapshot.save()
        return snapshot
    },

    /**
     * Create a snapshot of an application owned device
     * @param {*} app
     * @param {*} application
     * @param {*} device
     * @param {*} user
     * @param {*} options
     */
    createDeviceSnapshot: async function (app, application, device, user, options) {
        const deviceConfig = await app.db.controllers.Device.exportConfig(device)

        const snapshotOptions = {
            name: options.name || '',
            description: options.description || '',
            credentialSecret: device.credentialSecret,
            settings: {
                settings: {}, // TODO: when device settings at application level are implemented
                env: {}, // TODO: when device settings at application level are implemented
                modules: {} // TODO: when device settings at application level are implemented
            },
            flows: {},
            ApplicationId: application.id,
            DeviceId: device.id,
            UserId: user.id
        }
        if (deviceConfig.flows) {
            snapshotOptions.flows.flows = deviceConfig.flows
            // TODO: device snapshot:  Project.exportCredentials? does this need to refactored to a lib/util function?
            // TODO: device snapshot:  is this step necessary?
            if (deviceConfig.credentials) {
                // TODO: device snapshot:  reconsider when device settings at application level are implemented
                snapshotOptions.flows.credentials = app.db.controllers.Project.exportCredentials(deviceConfig.credentials || {}, device.credentialSecret, device.credentialSecret)
            }
        }
        if (deviceConfig.package?.modules) {
            snapshotOptions.settings.modules = deviceConfig.package.modules
        }
        // calling ProjectSnapshot.create because it's the same model as DeviceSnapshot (the one and only model for snapshots in the db)
        const snapshot = await app.db.models.ProjectSnapshot.create(snapshotOptions)
        await snapshot.save()
        return snapshot
    },
    /**
     * Export specific snapshot.
     * @param {*} app
     * @param {*} project project-originator of this snapshot
     * @param {*} snapshot snapshot object to export
     * @param {Object} options
     * @param {String} options.credentialSecret secret to encrypt credentials with
     * @param {Object} [options.credentials] (Optional) credentials to export. If omitted, credentials of the current project will be re-encrypted, with credentialSecret.
     */
    exportSnapshot: async function (app, project, snapshot, options) {
        options.owner = project
        return app.db.controllers.Snapshot.exportSnapshot(snapshot, options)
    },

    getDeviceAutoSnapshots: deviceAutoSnapshotUtils.getAutoSnapshots,
    isDeviceAutoSnapshot: deviceAutoSnapshotUtils.isAutoSnapshot,
    cleanupDeviceAutoSnapshots: deviceAutoSnapshotUtils.cleanupAutoSnapshots,
    doDeviceAutoSnapshot: deviceAutoSnapshotUtils.doAutoSnapshot,

    getInstanceAutoSnapshots: instanceAutoSnapshotUtils.getAutoSnapshots,
    isInstanceAutoSnapshot: instanceAutoSnapshotUtils.isAutoSnapshot,
    cleanupInstanceAutoSnapshots: instanceAutoSnapshotUtils.cleanupAutoSnapshots,
    doInstanceAutoSnapshot: instanceAutoSnapshotUtils.doAutoSnapshot
}
