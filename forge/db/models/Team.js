/**
 * A Team
 * @namespace forge.db.models.Team
 */

const { DataTypes, literal } = require('sequelize')

const { Roles } = require('../../lib/roles')
const { slugify, generateTeamAvatar, buildPaginationSearchClause } = require('../utils')

module.exports = {
    name: 'Team',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false, validate: { not: /:\/\// } },
        slug: { type: DataTypes.STRING, unique: true, validate: { is: /^[a-z0-9-_]+$/i } },
        avatar: { type: DataTypes.STRING }
    },
    hooks: function (M, app) {
        return {
            beforeCreate: async (team, options) => {
                if (!team.TeamTypeId) {
                    throw new Error('Cannot create team without TeamTypeId')
                }
                // if the product is licensed, we permit overage
                const isLicensed = app.license.active()
                if (isLicensed !== true) {
                    const { teams } = await app.license.usage('teams')
                    if (teams.count >= teams.limit) {
                        throw new Error('license limit reached')
                    }
                }
            },
            afterCreate: async (team, options) => {
                const { teams } = await app.license.usage('teams')
                if (teams.count > teams.limit) {
                    await app.auditLog.Platform.platform.license.overage('system', null, teams)
                }
            },
            beforeSave: (team, options) => {
                if (!team.avatar) {
                    team.avatar = generateTeamAvatar(team.name)
                }
                if (!team.slug) {
                    team.slug = slugify(team.name)
                }
                team.slug = team.slug.toLowerCase()
            },
            beforeDestroy: async (team, opts) => {
                const instanceCount = await team.instanceCount()
                if (instanceCount > 0) {
                    throw new Error('Cannot delete team that owns instances')
                }
            },
            afterDestroy: async (team, opts) => {
                // TODO: what needs tidying up after a team is deleted?
                // Doing this here also clears historical invites.
                // TeamId is null because there is a cascade rule
                await M.Invitation.destroy({
                    where: {
                        teamId: null
                    }
                })
            }
        }
    },
    associations: function (M) {
        this.belongsToMany(M.User, { through: M.TeamMember })
        this.belongsTo(M.TeamType)
        this.hasMany(M.TeamMember)
        this.hasMany(M.Device)
        this.hasMany(M.Project)
        this.hasMany(M.Invitation, { foreignKey: 'teamId' })
        this.hasMany(M.Application)
    },
    finders: function (M) {
        const self = this
        return {
            static: {
                byId: async function (id) {
                    if (typeof id === 'string') {
                        id = M.Team.decodeHashid(id)
                    }
                    return self.findOne({
                        where: { id },
                        include: [{
                            model: M.TeamType
                        }],
                        attributes: {
                            include: [
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Projects" AS "project"
                                        WHERE
                                        "project"."TeamId" = "Team"."id"
                                    )`),
                                    'projectCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "TeamMembers" AS "members"
                                        WHERE
                                        "members"."TeamId" = "Team"."id"
                                    )`),
                                    'memberCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Devices" AS "devices"
                                        WHERE
                                        "devices"."TeamId" = "Team"."id"
                                    )`),
                                    'deviceCount'
                                ]
                            ]
                        }
                    })
                },
                bySlug: async function (slug) {
                    return self.findOne({
                        where: { slug },
                        include: [{
                            model: M.TeamType
                        }],
                        attributes: {
                            include: [
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Projects" AS "project"
                                        WHERE
                                        "project"."TeamId" = "Team"."id"
                                    )`),
                                    'projectCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "TeamMembers" AS "members"
                                        WHERE
                                        "members"."TeamId" = "Team"."id"
                                    )`),
                                    'memberCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Devices" AS "devices"
                                        WHERE
                                        "devices"."TeamId" = "Team"."id"
                                    )`),
                                    'deviceCount'
                                ]
                            ]
                        }
                    })
                },
                byName: async function (name) {
                    // This is primarily used by the unit tests.
                    return self.findOne({
                        where: { name },
                        include: [{
                            model: M.TeamType
                        }]
                    })
                },
                forUser: async function (User) {
                    return M.TeamMember.findAll({
                        where: {
                            UserId: User.id
                        },
                        include: {
                            model: M.Team,
                            attributes: ['hashid', 'links', 'id', 'name', 'avatar', 'slug'],
                            include: { model: M.TeamType, attributes: ['hashid', 'id', 'name'] }
                        },
                        attributes: {
                            include: [
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Projects" AS "project"
                                        WHERE
                                        "project"."TeamId" = "TeamMember"."TeamId"
                                    )`),
                                    'projectCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "TeamMembers" AS "members"
                                        WHERE
                                        "members"."TeamId" = "Team"."id"
                                    )`),
                                    'memberCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Devices" AS "devices"
                                        WHERE
                                        "devices"."TeamId" = "Team"."id"
                                    )`),
                                    'deviceCount'
                                ]
                            ]
                        }
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
                    if (pagination.cursor) {
                        pagination.cursor = M.Team.decodeHashid(pagination.cursor)
                    }
                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['Team.name']),
                            order: [['id', 'ASC']],
                            limit,
                            include: { model: M.TeamType, attributes: ['hashid', 'id', 'name'] },
                            attributes: {
                                include: [
                                    [
                                        literal(`(
                                            SELECT COUNT(*)
                                            FROM "Projects" AS "project"
                                            WHERE
                                            "project"."TeamId" = "Team"."id"
                                        )`),
                                        'projectCount'
                                    ],
                                    [
                                        literal(`(
                                            SELECT COUNT(*)
                                            FROM "TeamMembers" AS "members"
                                            WHERE
                                            "members"."TeamId" = "Team"."id"
                                        )`),
                                        'memberCount'
                                    ]
                                ]
                            }
                        }),
                        this.count({ where })
                    ])
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        teams: rows
                    }
                }
            },
            instance: {
                getOwners: async function () {
                    const where = {
                        TeamId: this.id,
                        role: Roles.Owner
                    }
                    const owners = (await M.TeamMember.findAll({ where, include: M.User })).map(tm => tm.User)

                    // There is a race condition (though it shouldn't happen) where a user, but not their membership, has been deleted
                    // In this case the findAll above will return an array that includes null, this needs to be guarded against
                    return owners.filter((owner) => owner !== null)
                },
                memberCount: async function (role) {
                    const where = {
                        TeamId: this.id
                    }
                    if (role !== undefined) {
                        where.role = role
                    }
                    return await M.TeamMember.count({ where })
                },
                ownerCount: async function () {
                    // All Team owners
                    return this.memberCount(Roles.Owner)
                },
                instanceCount: async function (projectTypeId) {
                    const where = { TeamId: this.id }
                    if (projectTypeId) {
                        if (typeof projectTypeId === 'string') {
                            projectTypeId = M.ProjectType.decodeHashid(projectTypeId)
                        } else if (projectTypeId.id) {
                            projectTypeId = projectTypeId.id
                        }
                        where.ProjectTypeId = projectTypeId
                    }
                    return await M.Project.count({ where })
                },
                instanceCountByType: async function (where = {}) {
                    where = { ...where, TeamId: this.id }
                    const counts = await M.Project.count({
                        where,
                        attributes: ['ProjectTypeId'],
                        group: 'ProjectTypeId'
                    })
                    const result = {}
                    for (const instanceType of Object.values(counts)) {
                        result[M.ProjectType.encodeHashid(instanceType.ProjectTypeId)] = instanceType.count
                    }
                    return result
                },
                pendingInviteCount: async function () {
                    return await M.Invitation.count({ where: { teamId: this.id } })
                },
                deviceCount: async function () {
                    return await M.Device.count({ where: { TeamId: this.id } })
                },
                /**
                 * Many functions require this.TeamType to exist and be fully populated.
                 * Depending on the route taken, it is possible this property has not
                 * been fully loaded. This does the work to ensure it is there if needed.
                 */
                ensureTeamTypeExists: async function () {
                    if (!this.TeamTypeId) {
                        await this.reload({ include: [{ model: M.TeamType }] })
                    } else if (!this.TeamType) {
                        // TeamTypeId is present, but no TeamType
                        this.TeamType = await this.getTeamType()
                    }
                },
                getUserLimit: async function () {
                    await this.ensureTeamTypeExists()
                    return this.TeamType.getProperty('users.limit', -1)
                },
                getDeviceLimit: async function () {
                    await this.ensureTeamTypeExists()
                    return this.TeamType.getProperty('devices.limit', -1)
                },
                isInstanceTypeAvailable: async function (instanceType) {
                    await this.ensureTeamTypeExists()
                    return this.TeamType.getInstanceTypeProperty(instanceType, 'active', false)
                },
                getInstanceTypeLimit: async function (instanceType) {
                    await this.ensureTeamTypeExists()
                    if (!await this.isInstanceTypeAvailable(instanceType)) {
                        return 0
                    }
                    return this.TeamType.getInstanceTypeProperty(instanceType, 'limit', -1)
                },
                /**
                 * Checks if this team is allowed to create a new instance of the
                 * given type.
                 * At this level, the check looks at any restrictions applied
                 * by the TeamType object.
                 * When running with EE, this function is overloaded via
                 * ee/lib/billing/Team.js to add EE-specific checks as well
                 * (such as billing and trials)
                 *
                 * If the create is not allowed, an error is thrown with code/error
                 * properties set
                 * @param {object} instanceType - a fully populated ProjectType object
                 */
                checkInstanceTypeCreateAllowed: async function (instanceType) {
                    await this.ensureTeamTypeExists()

                    const instanceTypeLimit = await this.getInstanceTypeLimit(instanceType)
                    // Note that if the instanceType is unavailable for this team type,
                    // its limit is implicitly set to 0
                    if (instanceTypeLimit > -1) {
                        // This team type has a limit on how many instances of this type
                        // can be created. Ensure we're within that limit
                        const currentInstanceCount = await this.instanceCount(instanceType.hashid)
                        if (currentInstanceCount >= instanceTypeLimit) {
                            const err = new Error()
                            err.code = 'instance_limit_reached'
                            err.error = `Team instance limit reached for type '${instanceType.name}'`
                            throw err
                        }
                    }
                },

                /**
                 * Checks whether an instance may be started in this team. For CE
                 * platforms, there are no restrictions on unsuspending an instance.
                 *
                 * When running with EE, this function is replaced via ee/lib/billing/Team.js
                 * to add additional checks
                 * @param {*} instance The instance to start
                 * Throws an error if it is not allowed
                 */
                checkInstanceStartAllowed: async function (instance) {
                    return true
                },

                /**
                 * Checks to see if a device can be created in this team.
                 * At this level, the check looks at any restrictions applied
                 * by the TeamType object.
                 * When running with EE, this function is overloaded via
                 * ee/lib/billing/Team.js to add EE-specific checks as well
                 * (such as billing and trials)
                 *
                 * If the create is not allowed, an error is thrown with code/error
                 * properties set
                 */
                checkDeviceCreateAllowed: async function () {
                    await this.ensureTeamTypeExists()
                    const teamDeviceLimit = await this.getDeviceLimit()
                    if (teamDeviceLimit > -1) {
                        const currentDeviceCount = await this.deviceCount()
                        if (currentDeviceCount >= teamDeviceLimit) {
                            const err = new Error()
                            err.code = 'device_limit_reached'
                            err.error = 'Team device limit reached'
                            throw err
                        }
                    }
                },

                /**
                 * Checks whether the team type can be modified to the requested type.
                 * The team must be within any limits of the target type.
                 */
                checkTeamTypeUpdateAllowed: async function (teamType) {
                    await this.ensureTeamTypeExists()

                    // Check the following limits:
                    // - User count
                    // - Device count
                    // - Instance Type counts
                    const errors = []

                    const currentMemberCount = await this.memberCount()
                    const targetMemberLimit = teamType.getProperty('users.limit', -1)
                    if (targetMemberLimit !== -1 && targetMemberLimit < currentMemberCount) {
                        errors.push({
                            code: 'member_limit_reached',
                            error: 'Member limit reached',
                            limit: targetMemberLimit,
                            count: currentMemberCount
                        })
                    }

                    const currentDeviceCount = await this.deviceCount()
                    const targetDeviceLimit = teamType.getProperty('devices.limit', -1)
                    if (targetDeviceLimit !== -1 && targetDeviceLimit < currentDeviceCount) {
                        errors.push({
                            code: 'device_limit_reached',
                            error: 'Device limit reached',
                            limit: targetDeviceLimit,
                            count: currentDeviceCount
                        })
                    }

                    const currentInstanceCountsByType = await this.instanceCountByType()
                    const targetInstanceLimits = {}
                    for (const instanceType of Object.keys(currentInstanceCountsByType)) {
                        if (!teamType.getInstanceTypeProperty(instanceType, 'active', false)) {
                            targetInstanceLimits[instanceType] = 0
                        } else {
                            targetInstanceLimits[instanceType] = teamType.getInstanceTypeProperty(instanceType, 'limit', -1)
                        }
                        if (targetInstanceLimits[instanceType] !== -1 && targetInstanceLimits[instanceType] < currentInstanceCountsByType[instanceType]) {
                            errors.push({
                                code: 'instance_limit_reached',
                                error: `Instance type ${instanceType} limit reached`,
                                type: instanceType,
                                limit: targetInstanceLimits[instanceType],
                                count: currentInstanceCountsByType[instanceType]
                            })
                        }
                    }
                    if (errors.length > 0) {
                        const message = errors.map(err => `${err.error} (current: ${err.count}, limit: ${err.limit})`).join(', ')
                        const err = new Error(`Unable to change team type: ${message}`)
                        err.code = 'invalid_request'
                        err.errors = errors
                        throw err
                    }
                },
                /**
                 * Update the team type.
                 *
                 * When running with EE, this function is replaced via ee/lib/billing/Team.js
                 * to add additional checks related to billing
                 */
                updateTeamType: async function (teamType) {
                    await this.setTeamType(teamType)
                    await this.save()
                    await this.reload({ include: [{ model: M.TeamType }] })
                }
            }
        }
    }
}
