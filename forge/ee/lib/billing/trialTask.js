const { Op } = require('sequelize')

const ONE_DAY = 86400000

module.exports.init = function (app) {
    async function trialTask (app) {
        app.log.info('Running trial task')
        // Find teams that have expired since we last ran (trialEndsAt != null && < now)
        const expiredSubscriptions = await app.db.models.Subscription.findAll({
            where: { trialEndsAt: { [Op.lt]: Date.now() } },
            include: [app.db.models.Team]
        })

        for (const subscription of expiredSubscriptions) {
            try {
                if (subscription.Team) {
                    if (subscription.isActive()) {
                        // This scenario can be removed in 1.14. Trials now end
                        // when billing is setup. However we need to handle any
                        // trials already in this state when the billing change
                        // was applied. Given trials last 14 days, this is a short-term
                        // condition to cater for.
                        app.log.info(`Team ${subscription.Team.hashid} ending trial - billing setup`)
                        // Ensure device count is updated (if device billing enabled)
                        await subscription.Team.reload({ include: [app.db.models.TeamType] })
                        // The subscription has been setup on Stripe.
                        await app.billing.endTeamTrial(subscription.Team)
                        await sendTrialEmail(subscription.Team, 'TrialTeamEnded')
                    } else {
                        app.log.info(`Team ${subscription.Team.hashid} ending trial - suspending instances`)
                        // Stripe not configured - suspend the lot
                        await app.db.controllers.Team.suspendTeam(subscription.Team)
                        await sendTrialEmail(subscription.Team, 'TrialTeamSuspended', {
                            teamSettingsURL: `${app.config.base_url}/team/${subscription.Team.slug}/billing`
                        })
                    }

                    // We have dealt with this team
                    await subscription.clearTrialState()
                } else {
                    // Team has been deleted
                    subscription.destroy()
                }
            } catch (err) {
                app.log.error(`Error handling expired trial subscription ${subscription.subscription}: ${err.toString()}`)
            }
        }

        // Email sending intervals
        // - 8 days => Subscription.status = TRIAL_STATUS.WEEK_EMAIL_SENT
        // - 2 days => Subscription.status = TRIAL_STATUS.DAY_EMAIL_SENT

        const pendingEmailSubscriptions = await app.db.models.Subscription.findAll({
            where: {
                [Op.or]: [
                    {
                        // Expires in 8 days, need to send Week Reminder email
                        trialStatus: app.db.models.Subscription.TRIAL_STATUS.CREATED,
                        trialEndsAt: { [Op.lt]: Date.now() + (8 * ONE_DAY) }
                    },
                    {
                        // Expires in 2 days, need to send Day Reminder email
                        trialStatus: app.db.models.Subscription.TRIAL_STATUS.WEEK_EMAIL_SENT,
                        trialEndsAt: { [Op.lt]: Date.now() + (2 * ONE_DAY) }
                    }
                ]
            },
            include: [app.db.models.Team]
        })

        for (const subscription of pendingEmailSubscriptions) {
            try {
                const endingInDurationDays = Math.ceil((subscription.trialEndsAt - Date.now()) / ONE_DAY)
                const endingInDuration = endingInDurationDays + ' day' + ((endingInDurationDays !== 1) ? 's' : '')
                if (subscription.Team) {
                    const billingUrl = `${app.config.base_url}/team/${subscription.Team.slug}/billing`
                    await sendTrialEmail(subscription.Team, 'TrialTeamReminder', {
                        endingInDuration,
                        billingSetup: subscription.isActive(),
                        billingUrl
                    })
                    if (subscription.trialStatus === app.db.models.Subscription.TRIAL_STATUS.CREATED) {
                        subscription.trialStatus = app.db.models.Subscription.TRIAL_STATUS.WEEK_EMAIL_SENT
                    } else {
                        subscription.trialStatus = app.db.models.Subscription.TRIAL_STATUS.DAY_EMAIL_SENT
                    }
                    await subscription.save()
                } else {
                    // This team has been deleted
                    subscription.destroy()
                }
            } catch (err) {
                app.log.error(`Error handling trial subscription ${subscription.subscription}: ${err.toString()}`)
            }
        }
    }

    async function sendTrialEmail (team, template, inserts) {
        const teamType = await team.getTeamType()
        if (await teamType.getProperty('trial.sendEmail', true)) {
            const owners = await team.getOwners()
            for (const user of owners) {
                await app.postoffice.send(
                    user,
                    template,
                    {
                        username: user.name,
                        teamName: team.name,
                        ...inserts
                    }
                )
            }
        }
    }
    return trialTask
}
