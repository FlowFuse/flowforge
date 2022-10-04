/**
 * A Device
 * @namespace forge.db.models.Device
 */
const { DataTypes, Op } = require('sequelize')
const crypto = require('crypto')
const Controllers = require('../controllers')

const ALLOWED_SETTINGS = {
    env: 1
}
const RESERVED_ENV = ['FF_PROJECT_ID', 'FF_PROJECT_NAME', 'FF_DEVICE_ID', 'FF_DEVICE_NAME', 'FF_DEVICE_TYPE', 'FF_SNAPSHOT_ID', 'FF_SNAPSHOT_NAME']

module.exports = {
    name: 'Device',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        credentialSecret: { type: DataTypes.STRING, allowNull: false },
        state: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
        lastSeenAt: { type: DataTypes.DATE, allowNull: true },
        settingsHash: { type: DataTypes.STRING, allowNull: true }
    },
    associations: function (M) {
        this.belongsTo(M.Team)
        this.belongsTo(M.Project)
        this.hasOne(M.AccessToken, {
            foreignKey: 'ownerId',
            constraints: false,
            scope: {
                ownerType: 'device'
            }
        })
        this.belongsTo(M.ProjectSnapshot, { as: 'targetSnapshot' })
        this.belongsTo(M.ProjectSnapshot, { as: 'activeSnapshot' })
        this.hasMany(M.DeviceSettings)
    },
    hooks: function (M, app) {
        return {
            beforeCreate: async (device, options) => {
                const deviceLimit = app.license.get('devices')
                const deviceCount = await M.Device.count()
                if (deviceCount >= deviceLimit) {
                    throw new Error('license limit reached')
                }
            },
            beforeSave: async (device, options) => {
                if (device.changed('name') || device.changed('type')) {
                    const settings = await device.getAllSettings()
                    device.settingsHash = hashSettings(settings)
                }
            },
            afterDestroy: async (device, opts) => {
                await M.AccessToken.destroy({
                    where: {
                        ownerType: 'device',
                        ownerId: '' + device.id
                    }
                })
                await M.DeviceSettings.destroy({
                    where: {
                        DeviceId: device.id
                    }
                })
                await M.BrokerClient.destroy({
                    where: {
                        ownerType: 'device',
                        ownerId: '' + device.id
                    }
                })
            }
        }
    },
    finders: function (M) {
        return {
            instance: {
                async refreshAuthTokens () {
                    const accessToken = await Controllers.AccessToken.createTokenForDevice(this)
                    const credentialSecret = crypto.randomBytes(32).toString('hex')
                    this.credentialSecret = credentialSecret
                    await this.save()
                    const result = {
                        token: accessToken.token,
                        credentialSecret
                    }
                    const broker = await Controllers.BrokerClient.createClientForDevice(this)
                    if (broker) {
                        result.broker = broker
                    }
                    return result
                },
                async getAccessToken () {
                    return M.AccessToken.findOne({
                        where: { ownerId: '' + this.id }
                    })
                },
                async getAllSettings () {
                    const result = {}
                    const settings = await this.getDeviceSettings()
                    settings.forEach(setting => {
                        result[setting.key] = setting.value
                    })
                    // add platform specific device env vars
                    result.env = insertPlatformSpecificEnvVars(this, result.env)
                    return result
                },
                async updateSettings (obj) {
                    const updates = []
                    for (let [key, value] of Object.entries(obj)) {
                        if (ALLOWED_SETTINGS[key]) {
                            if (key === 'env' && value && Array.isArray(value)) {
                                value = removePlatformSpecificEnvVars(value) // remove platform specific values
                            }
                            updates.push({ DeviceId: this.id, key, value })
                        }
                    }
                    await M.DeviceSettings.bulkCreate(updates, { updateOnDuplicate: ['value'] })
                    const settings = await this.getAllSettings()
                    this.settingsHash = hashSettings(settings)
                    await this.save()
                },
                async updateSetting (key, value) {
                    if (ALLOWED_SETTINGS[key]) {
                        if (key === 'env' && value && Array.isArray(value)) {
                            value = removePlatformSpecificEnvVars(value) // remove platform specific values
                        }
                        const result = await M.ProjectSettings.upsert({ DeviceId: this.id, key, value })
                        const settings = await this.getAllSettings()
                        this.settingsHash = hashSettings(settings)
                        await this.save()
                        return result
                    } else {
                        throw new Error(`Invalid device setting ${key}`)
                    }
                },
                async getSetting (key) {
                    const result = await M.DeviceSettings.findOne({ where: { DeviceId: this.id, key } })
                    if (result) {
                        if (key === 'env' && result.value && Array.isArray(result.value)) {
                            return insertPlatformSpecificEnvVars(this, result.value)
                        }
                        return result.value
                    }
                    return undefined
                }
            },
            static: {
                byId: async (id) => {
                    if (typeof id === 'string') {
                        id = M.Device.decodeHashid(id)
                    }
                    return this.findOne({
                        where: { id: id },
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            },
                            {
                                model: M.Project,
                                attributes: ['id', 'name', 'links']
                            },
                            { model: M.ProjectSnapshot, as: 'targetSnapshot', attributes: ['id', 'hashid', 'name'] },
                            { model: M.ProjectSnapshot, as: 'activeSnapshot', attributes: ['id', 'hashid', 'name'] }
                        ]
                    })
                },
                byTeam: async (teamHashId) => {
                    const teamId = M.Team.decodeHashid(teamHashId)
                    return this.findAll({
                        include: [
                            {
                                model: M.Team,
                                where: { id: teamId },
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            },
                            {
                                model: M.Project,
                                attributes: ['id', 'name', 'links']
                            },
                            { model: M.ProjectSnapshot, as: 'targetSnapshot', attributes: ['id', 'hashid', 'name'] },
                            { model: M.ProjectSnapshot, as: 'activeSnapshot', attributes: ['id', 'hashid', 'name'] }
                        ]
                    })
                },
                byProject: async (projectId) => {
                    return this.findAll({
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            },
                            {
                                model: M.Project,
                                where: {
                                    id: projectId
                                },
                                attributes: ['id', 'name', 'links']
                            },
                            { model: M.ProjectSnapshot, as: 'targetSnapshot', attributes: ['id', 'hashid', 'name'] },
                            { model: M.ProjectSnapshot, as: 'activeSnapshot', attributes: ['id', 'hashid', 'name'] }
                        ]
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    let limit = parseInt(pagination.limit)
                    if (isNaN(limit)) {
                        limit = 30
                    }
                    if (pagination.cursor) {
                        where.id = { [Op.gt]: M.Device.decodeHashid(pagination.cursor) }
                    }
                    const { count, rows } = await this.findAndCountAll({
                        where,
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            },
                            {
                                model: M.Project,
                                attributes: ['id', 'name', 'links']
                            },
                            { model: M.ProjectSnapshot, as: 'targetSnapshot', attributes: ['id', 'hashid', 'name'] },
                            { model: M.ProjectSnapshot, as: 'activeSnapshot', attributes: ['id', 'hashid', 'name'] }
                        ],
                        order: [['id', 'ASC']],
                        limit
                    })
                    return {
                        meta: {
                            next_cursor: (rows.length === limit && limit > 0) ? rows[rows.length - 1].hashid : undefined
                        },
                        count: count,
                        devices: rows
                    }
                },
                byTargetSnapshot: async (snapshotHashId) => {
                    const snapshotId = M.ProjectSnapshot.decodeHashid(snapshotHashId)
                    return this.findAll({
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            },
                            {
                                model: M.Project,
                                attributes: ['id', 'name', 'links']
                            },
                            {
                                model: M.ProjectSnapshot,
                                as: 'targetSnapshot',
                                attributes: ['id', 'hashid', 'name'],
                                where: {
                                    id: snapshotId
                                }
                            },
                            { model: M.ProjectSnapshot, as: 'activeSnapshot', attributes: ['id', 'hashid', 'name'] }
                        ]
                    })
                },
                getDeviceProjectId: async (id) => {
                    if (typeof id === 'string') {
                        id = M.Device.decodeHashid(id)
                    }
                    const device = await this.findOne({
                        where: { id: id },
                        attributes: [
                            'ProjectId'
                        ]
                    })
                    if (device) {
                        return device.ProjectId
                    }
                }
            }
        }
    }
}

function hashSettings (settings) {
    const hash = crypto.createHash('sha256')
    hash.update(JSON.stringify(settings))
    return hash.digest('hex')
}

/**
 * Remove platform specific environment variables
 * @param {[{name:string, value:string}]} envVars Environment variables array
 */
function removePlatformSpecificEnvVars (envVars) {
    if (!envVars || !Array.isArray(envVars)) {
        return []
    }
    return [...envVars.filter(e => RESERVED_ENV.indexOf(e.name) < 0)]
}
/**
 * Insert platform specific environment variables
 * @param {Device} device The device
 * @param {[{name:string, value:string}]} envVars Environment variables array
 */
function insertPlatformSpecificEnvVars (device, envVars) {
    if (!envVars || !Array.isArray(envVars)) {
        envVars = []
    }
    const makeVar = (name, value) => {
        return { name, value: value || '', platform: true } // add `platform` flag for UI
    }
    const result = []
    result.push(makeVar('FF_PROJECT_ID', device.ProjectId))
    result.push(makeVar('FF_PROJECT_NAME', device.Project?.name || ''))
    result.push(makeVar('FF_DEVICE_ID', device.hashid || ''))
    result.push(makeVar('FF_DEVICE_NAME', device.name || ''))
    result.push(makeVar('FF_DEVICE_TYPE', device.type || ''))
    result.push(makeVar('FF_SNAPSHOT_ID', device.activeSnapshot?.hashid || ''))
    result.push(makeVar('FF_SNAPSHOT_NAME', device.activeSnapshot?.name))
    result.push(...removePlatformSpecificEnvVars(envVars))
    return result
}
