module.exports = {
    /**
     * Get a snapshot by ID
     * @param {*} app - app instance
     * @param {*} snapshotId
     */
    async getSnapshot (app, snapshotId) {
        return await app.db.models.Snapshot.byId(snapshotId)
    },

    /**
     * Export specific snapshot.
     * @param {*} app - app instance
     * @param {*} owner project/device-originator of this snapshot
     * @param {*} snapshot snapshot object to export
     * @param {Object} options
     * @param {String} [options.credentialSecret] secret to encrypt credentials with.
     * @param {Object} [options.credentials] (Optional) credentials to export. If omitted, credentials of the current owner will be re-encrypted with the provided `credentialSecret`.
     * @param {Object} [options.owner] (Optional) The owner project or device. If omitted, the snapshot's owner will be obtained from the database.
     */
    exportSnapshot: async function (app, snapshot, options) {
        if (!options.credentialSecret) {
            return null
        }

        let owner = options.owner
        if (!owner) {
            if (snapshot.ownerType === 'device') {
                owner = await snapshot.getDevice()
            } else if (snapshot.ownerType === 'instance') {
                owner = await snapshot.getProject()
            } else {
                return null
            }
        }

        // ensure the owner is of the correct model type
        if (snapshot.ownerType === 'device' && owner?.constructor.name !== 'Device') {
            return null
        }
        if (snapshot.ownerType === 'instance' && owner?.constructor.name !== 'Project') {
            return null
        }

        // ensure the snapshot has the User association loaded
        if (snapshot.UserId && !snapshot.User) {
            await snapshot.reload({ include: [app.db.models.User] })
        }

        const result = {
            ...snapshot.toJSON()
        }

        // loop keys of result.settings.env and remove any that match FF_*
        Object.keys(result.settings.env).forEach((key) => {
            if (key.startsWith('FF_')) {
                delete result.settings.env[key]
            }
        })

        // use the secret stored in the snapshot, if available...
        const currentSecret = result.credentialSecret || owner.credentialSecret || (owner.getCredentialSecret && await owner.getCredentialSecret())
        const credentials = options.credentials ? options.credentials : result.flows.credentials

        // if provided credentials already encrypted: "exportCredentials" will just return the same credentials
        // if provided credentials are raw: "exportCredentials" will encrypt them with the secret provided
        // if credentials are not provided: project's flows credentials will be used, they will be encrypted with the provided secret
        const keyToDecrypt = (options.credentials && options.credentials.$) ? options.credentialSecret : currentSecret
        result.flows.credentials = app.db.controllers.Project.exportCredentials(credentials || {}, keyToDecrypt, options.credentialSecret)

        return result
    },

    /**
     * Delete a snapshot
     * @param {*} app - app instance
     * @param {*} snapshot - snapshot object
     */
    async deleteSnapshot (app, snapshot) {
        let owner

        if (snapshot.ownerType === 'device') {
            owner = await snapshot.getDevice()
        } else if (snapshot.ownerType === 'instance') {
            owner = await snapshot.getProject()
        } else {
            return false
        }

        const deviceSettings = await owner.getSetting('deviceSettings') || {
            targetSnapshot: null
        }
        if (deviceSettings.targetSnapshot === snapshot.id) {
            // We're about to delete the active snapshot for this device
            await owner.updateSetting('deviceSettings', {
                targetSnapshot: null
            })
            // The cascade relationship will ensure owner.targetSnapshotId is cleared
            if (app.comms) {
                const team = await owner.getTeam()
                app.comms.devices.sendCommandToProjectDevices(team.hashid, owner.id, 'update', {
                    snapshot: null
                })
            }
        }

        await snapshot.destroy()
        return true
    },

    /**
     * Upload a snapshot.
     * @param {*} app - app instance
     * @param {*} owner - project/device-originator of this snapshot
     * @param {*} snapshot - snapshot data
     * @param {String} credentialSecret - secret to encrypt credentials with. Can be null if the snapshot does not contain credentials.
     * @param {*} user - user who uploaded the snapshot
     */
    async uploadSnapshot (app, owner, snapshot, credentialSecret, user) {
        // 1. If the snapshot includes credentials but no credentialSecret, we should reject it
        // 2. if the snapshot includes credentials and a credentialSecret, we should validate the secret
        if (snapshot.flows.credentials?.$) {
            if (!credentialSecret) {
                throw new Error('Missing credentialSecret')
            }
            // validate the secret by trying to decrypt and re-encrypt the credentials using the provided secret
            // if the secret is invalid, this will throw an error
            app.db.controllers.Project.exportCredentials(snapshot.flows.credentials, credentialSecret, credentialSecret)
        }

        // use the project/device's credentialSecret if none is provided
        if (!credentialSecret) {
            credentialSecret = owner.credentialSecret || (owner.getCredentialSecret && await owner.getCredentialSecret())
        }

        let ownerType
        if (owner.constructor.name === 'Project') {
            ownerType = 'instance'
        } else if (owner.constructor.name === 'Device') {
            ownerType = 'device'
        } else {
            throw new Error('Invalid owner type')
        }
        const ProjectId = ownerType === 'instance' ? owner.id : null
        const DeviceId = ownerType === 'device' ? owner.id : null

        const snapshotOptions = {
            name: snapshot.name,
            description: snapshot.description || '',
            credentialSecret,
            settings: {
                settings: snapshot.settings || {},
                env: snapshot.env || {},
                modules: snapshot.modules || {}
            },
            flows: {
                flows: snapshot.flows.flows || [],
                credentials: snapshot.flows.credentials || { }
            },
            ProjectId,
            DeviceId,
            UserId: user.id
        }
        // remove an env vars that start with FF_ from the snapshot
        Object.keys(snapshotOptions.settings.env).forEach((key) => {
            if (key.startsWith('FF_')) {
                delete snapshotOptions.settings.env[key]
            }
        })
        // store the snapshot
        const newSnapshot = await app.db.models.ProjectSnapshot.create(snapshotOptions)
        return newSnapshot
    }
}
