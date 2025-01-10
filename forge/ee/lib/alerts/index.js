const { Op } = require('sequelize')

const { Roles } = require('../../../lib/roles')

module.exports = {
    init: function (app) {
        if (app.postoffice.enabled) {
            app.config.features.register('emailAlerts', true, true)
            app.auditLog.alerts = {}
            app.auditLog.alerts.generate = async function (projectId, event, data) {
                if (app.postoffice.enabled) {
                    const project = await app.db.models.Project.byId(projectId)
                    const settings = await app.db.controllers.Project.getRuntimeSettings(project)
                    const teamType = await app.db.models.TeamType.byId(project.Team.TeamTypeId)
                    const emailAlerts = settings.emailAlerts
                    let template
                    if (emailAlerts?.crash && event === 'crashed') {
                        const templateName = ['Crashed']
                        const hasLogs = data?.log?.length > 0
                        let uncaughtException = false
                        let outOfMemory = false
                        if (hasLogs) {
                            uncaughtException = data.exitCode > 0 && data.log.some(log => {
                                const lcMsg = log.msg?.toLowerCase() || ''
                                return lcMsg.includes('uncaughtexception') || log.msg.includes('uncaught exception')
                            })
                            outOfMemory = data.exitCode > 127 && data.log.some(log => {
                                const lcMsg = log.msg?.toLowerCase() || ''
                                return lcMsg.includes('heap out of memory') || lcMsg.includes('v8::internal::heap::')
                            })
                        }
                        if (outOfMemory) {
                            templateName.push('out-of-memory')
                        } else if (uncaughtException) {
                            templateName.push('uncaught-exception')
                        }
                        template = templateName.join('-')
                    } else if (emailAlerts?.safe && event === 'safe-mode') {
                        template = 'SafeMode'
                    }
                    if (!template || !teamType.getFeatureProperty('emailAlerts', false)) {
                        return
                    }
                    const where = {
                        TeamId: project.Team.id
                    }
                    switch (emailAlerts.recipients) {
                    case 'both':
                        where.role = {
                            [Op.or]: [
                                Roles.Member,
                                Roles.Owner
                            ]
                        }
                        break
                    case 'members':
                        where.role = Roles.Member
                        break
                    case 'owners':
                        where.role = Roles.Owner
                        break
                    }
                    const users = (await app.db.models.TeamMember.findAll({ where, include: app.db.models.User })).map(tm => tm.User)
                    const teamName = project.Team?.name || ''
                    if (users.length > 0) {
                        users.forEach(user => {
                            app.postoffice.send(user, template, { ...data, name: project.name, teamName, url: `${app.config.base_url}/instance/${project.id}` })
                        })
                    }
                }
            }
        }
    }
}
