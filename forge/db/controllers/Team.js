const { Roles, RoleNames } = require('../../lib/roles')

module.exports = {

    createTeamForUser: async function (app, teamDetails, user) {
        const newTeam = await app.db.models.Team.create(teamDetails)
        await newTeam.reload({
            include: [{ model: app.db.models.TeamType }]
        })
        await app.db.controllers.Team.addUser(newTeam, user, Roles.Owner)

        // Reinflate the object now the user has been added
        const team = await app.db.models.Team.bySlug(newTeam.slug)

        return team
    },

    changeUserRole: async function (app, teamHashId, userHashId, role) {
        const user = await app.db.models.User.byId(userHashId)
        const team = await app.db.models.Team.byId(teamHashId)
        if (!user) {
            throw new Error('User not found')
        }
        if (!team) {
            throw new Error('Team not found')
        }
        if (!RoleNames[role] || role === Roles.Admin || role === Roles.None) {
            throw new Error('Invalid role')
        }

        const existingRole = await user.getTeamMembership(team.id)
        if (!existingRole) {
            throw new Error('User not in team')
        }
        const oldRole = existingRole.role
        if (oldRole === role) {
            return { user, team, oldRole, role }
        }
        if (oldRole === Roles.Owner && role === Roles.Member) {
            const ownerCount = await team.ownerCount()
            if (ownerCount === 1) {
                throw new Error('Cannot remove last owner')
            }
        }
        existingRole.role = role
        await existingRole.save()
        return { user, team, oldRole, role }
    },

    addUser: async function (app, team, user, userRole) {
        const existingMembership = await user.getTeamMembership(team.id)
        if (existingMembership !== null) {
            throw new Error('User already in this team')
        }

        const currentTeamMemberCount = await team.memberCount()
        if (!team.TeamType) {
            await team.reload({
                include: [{ model: app.db.models.TeamType }]
            })
        }
        const userLimit = await team.getUserLimit()
        if (userLimit > 0 && currentTeamMemberCount >= userLimit) {
            throw new Error('Team user limit reached')
        }

        await team.addUser(user, { through: { role: userRole } })
    },
    /**
     * Remove a user from a team
     * @params team
     * @params userOrHashId
     * @params userRole
     * @return boolean - if the user was removed.
     *
     */
    removeUser: async function (app, team, user, userRole) {
        if (!userRole) {
            userRole = await user.getTeamMembership(team.id)
        }
        if (userRole) {
            if (userRole.role === Roles.Owner) {
                const ownerCount = await team.ownerCount()
                if (ownerCount === 1) {
                    throw new Error('Cannot remove last owner')
                }
            }
            if (user.defaultTeamId === team.id) {
                await user.setDefaultTeam(null)
            }
            await userRole.destroy()

            return true
            // console.warn('TODO: forge.db.controllers.Team.removeUser - expire oauth sessions')
        }

        return false
    },

    suspendTeam: async function (app, team, user = null) {
        app.log.info(`Suspending all instances for team ${team.hashid}`)
        // Suspend all projects of that team
        const projects = await app.db.models.Project.byTeam(team.hashid)
        await Promise.all(projects.map(async (project) => {
            if (project.state !== 'suspended') {
                app.log.info(`Suspending instance ${project.id} from team ${team.hashid}`)
                try {
                    app.db.controllers.Project.setInflightState(project, 'suspending')
                    await app.containers.stop(project)
                    app.db.controllers.Project.clearInflightState(project)
                    await app.auditLog.Project.project.suspended(user || 'system', null, project)
                } catch (err) {
                    app.log.warn(`Failed to suspend instance ${project.id} from team ${team.hashid}: ${err.toString()}`)
                    app.db.controllers.Project.clearInflightState(project)
                    const resp = { code: 'unexpected_error', error: err.toString() }
                    await app.auditLog.Project.project.suspended(null, resp, project)
                }
            }
        }))
        app.log.info(`Suspended all instances for team ${team.hashid}`)
    }
}
