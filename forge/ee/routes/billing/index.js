/**
 * Routes related to the EE forge billing api
 *
 * @namespace api
 * @memberof forge.ee.billing
 */

const { Readable } = require('stream')

const { registerPermissions } = require('../../../lib/permissions')
const { Roles } = require('../../../lib/roles.js')

/**
 * @typedef {import('stripe').Stripe.Event} StripeEvent
 */

module.exports = async function (app) {
    registerPermissions({
        'team:billing:manual': { description: 'Setups up manual billing on a team', role: Roles.Admin }
    })

    /** @type {import('stripe').Stripe} */
    const stripe = require('stripe')(app.config.billing.stripe.key)

    function logStripeEvent (/** @type {StripeEvent} */ event, team, subscription, teamId = null, stripeCustomerId = null, subscriptionUnknown = false) {
        const intro = `Stripe ${event.type} event ${event.data.object.id} from ${stripeCustomerId} received for`
        if (team) {
            if (subscriptionUnknown) {
                app.log.warn(`${intro} team '${team.hashid}' for unknown subscription`)
            } else {
                app.log.info(`${intro} team '${team.hashid}'`)
            }
        } else if (teamId) {
            app.log.error(`${intro} unknown team by team ID '${teamId}'`)
        } else if (subscription) {
            app.log.warn(`${intro} deleted team with orphaned subscription`)
        } else {
            app.log.error(`${intro} unknown team by Stripe Customer ID`)
        }
    }

    async function parseChargeEvent (/** @type {StripeEvent} */ event) {
        const stripeCustomerId = event.data.object.customer
        const subscription = await app.db.models.Subscription.byCustomerId(stripeCustomerId)
        const team = subscription?.Team

        logStripeEvent(event, team, subscription, null, stripeCustomerId)

        return {
            stripeCustomerId, subscription, team
        }
    }

    async function parseCheckoutEvent (/** @type {StripeEvent} */ event) {
        const stripeCustomerId = event.data.object.customer
        const stripeSubscriptionId = event.data.object.subscription
        const metadata = event.data.object.metadata || {}
        const teamId = event.data.object?.client_reference_id

        let team, subscription
        if (teamId) {
            team = await app.db.models.Team.byId(teamId)
        } else {
            const subscription = await app.db.models.Subscription.byCustomerId(stripeCustomerId)
            team = subscription?.Team
        }
        logStripeEvent(event, team, subscription, teamId, stripeCustomerId)

        return {
            stripeSubscriptionId, stripeCustomerId, team, metadata
        }
    }

    async function parseSubscriptionEvent (/** @type {StripeEvent} */ event) {
        const stripeSubscriptionId = event.data.object.id
        const stripeCustomerId = event.data.object.customer
        let subscription = await app.db.models.Subscription.byCustomerId(stripeCustomerId)
        const team = subscription?.Team

        // Check this event is for the known subscription for this customer.
        // A customer could have additional subscriptions created manually within
        // stripe - we must make sure we don't respond to events on those ones.
        let subscriptionUnknown = false
        if (subscription && subscription.subscription !== stripeSubscriptionId) {
            subscription = null
            subscriptionUnknown = true
        }
        logStripeEvent(event, team, subscription, null, stripeCustomerId, subscriptionUnknown)

        return {
            stripeSubscriptionId, stripeCustomerId, subscription, team
        }
    }

    /**
     * Need to work out what auth needs to have happend
     */
    app.addHook('preHandler', async (request, response) => {
        if (request.params.teamId) {
            request.teamMembership = await request.session.User.getTeamMembership(request.params.teamId)
            if (!request.teamMembership && !request.session.User.admin) {
                response.code(404).type('text/html').send('Not Found')
            }
            request.team = await app.db.models.Team.byId(request.params.teamId)
            if (!request.team) {
                response.code(404).type('text/html').send('Not Found')
            }
        }
    })

    /**
     * Callback for Stripe to report events
     * @name /ee/billing/callback
     * @static
     * @memberof forge.ee.billing
     */
    app.post('/callback',
        {
            config: {
                allowAnonymous: true
            },
            preParsing: function (request, reply, payload, done) {
                const chunks = []
                payload.on('data', chunk => {
                    chunks.push(chunk)
                })
                payload.on('end', () => {
                    const raw = Buffer.concat(chunks)
                    request.rawBody = raw
                    done(null, Readable.from(raw))
                })
            },
            schema: {
                body: {
                    type: 'object',
                    required: ['type', 'data'],
                    properties: {
                        type: { type: 'string' },
                        data: { type: 'object' }
                    }
                }
            }
        },
        async (request, response) => {
            const sig = request.headers['stripe-signature']
            /** @type {StripeEvent} */
            let event = request.body
            if (app.config.billing?.stripe?.wh_secret) {
                try {
                    event = stripe.webhooks.constructEvent(request.rawBody, sig, app.config.billing.stripe.wh_secret)
                } catch (err) {
                    app.log.error(`Stripe event failed signature: ${err.toString()}`)
                    response.code(400).type('text/hml').send('Failed Signature')
                    return
                }
            }

            switch (event.type) {
            case 'charge.failed': {
                await parseChargeEvent(event)

                // Do nothing - just log event (handled above)

                break
            }

            case 'checkout.session.completed': {
                const { team, stripeSubscriptionId, stripeCustomerId, metadata } = await parseCheckoutEvent(event)
                if (!team) {
                    response.status(200).send()
                    return
                }
                let currentTeamType = team.TeamType
                if (metadata.teamTypeId) {
                    const [teamTypeId] = app.db.models.TeamType.decodeHashid(metadata.teamTypeId)
                    if (teamTypeId !== team.TeamTypeId) {
                        const newTeamType = await app.db.models.TeamType.byId(teamTypeId)
                        const auditUpdates = {
                            old: { id: team.TeamType.hashid, name: team.TeamType.name },
                            new: { id: newTeamType.hashid, name: newTeamType.name }
                        }
                        team.TeamTypeId = teamTypeId
                        await team.save()
                        currentTeamType = newTeamType
                        await app.auditLog.Team.team.type.changed(request.session?.User || 'system', null, team, auditUpdates)
                    }
                }
                await app.db.controllers.Subscription.createSubscription(team, stripeSubscriptionId, stripeCustomerId)
                await app.auditLog.Team.billing.session.completed(request.session?.User || 'system', null, team, event.data.object)
                app.log.info(`Created Subscription for team '${team.hashid}' (${currentTeamType.name}) with Stripe Customer ID '${stripeCustomerId}'`)

                break
            }

            case 'checkout.session.expired': {
                await parseCheckoutEvent(event)

                // Do nothing - just log (handled above)

                break
            }

            case 'customer.subscription.created': {
                const { team, stripeCustomerId, subscription } = await parseSubscriptionEvent(event)
                if (!team) {
                    response.status(200).send()
                    return
                }
                if (!subscription) {
                    response.status(200).send()
                    return
                }

                if (!event.data.object.metadata?.free_trial) {
                    return
                }

                if (!app.db.controllers.Subscription.freeTrialCreditEnabled()) {
                    app.log.error(`Received a new subscription with the trial flag set for ${team.hashid}, but trials are not configured.`)
                    return
                }

                // Apply free trial in the form of credit to the Stripe customer that owns this team
                const creditAmount = app.config.billing.stripe.new_customer_free_credit
                await stripe.customers.createBalanceTransaction(
                    stripeCustomerId,
                    {
                        amount: -creditAmount,
                        currency: 'usd'
                    }
                )

                app.log.info(`Applied a credit of ${creditAmount} to ${stripeCustomerId} from team ${team.hashid}`)
                await app.auditLog.Team.billing.subscription.creditApplied(request.session.User, null, team, subscription, creditAmount)

                break
            }

            case 'customer.subscription.updated': {
                const { stripeSubscriptionId, team, subscription } = await parseSubscriptionEvent(event)
                if (!subscription) {
                    response.status(200).send()
                    return
                }

                const stripeSubscriptionStatus = event.data.object.status
                if (Object.values(app.db.models.Subscription.STATUS).includes(stripeSubscriptionStatus)) {
                    await app.billing.updateSubscriptionStatus(subscription, stripeSubscriptionStatus, team, request.session?.User || 'system')
                } else {
                    app.log.warn(`Stripe subscription ${stripeSubscriptionId} has transitioned in Stripe to a state not currently handled: '${stripeSubscriptionStatus}'`)
                }

                break
            }

            case 'customer.subscription.deleted': {
                const { team, subscription } = await parseSubscriptionEvent(event)
                if (!subscription) {
                    response.status(200).send()
                    return
                }

                // Cancel our copy of the subscription
                await app.billing.updateSubscriptionStatus(subscription, app.db.models.Subscription.STATUS.CANCELED, team, request.session?.User || 'system')

                if (!team) {
                    response.status(200).send()
                    return
                }

                await app.db.controllers.Team.suspendTeam(team, request.session?.User)
                break
            }
            }

            response.code(200).send()
        }
    )

    /**
     * Get Billing details for a team
     * @name /ee/billing/teams/:team
     * @static
     * @memberof forge.ee.billing
     */
    app.get('/teams/:teamId', {
        preHandler: app.needsPermission('team:edit')
    }, async (request, response) => {
        const team = request.team
        const sub = await team.getSubscription()
        if (!sub || (!sub.isActive() && !sub.isUnmanaged())) {
            return response.code(404).send({ code: 'not_found', error: 'Team does not have a subscription' })
        }
        if (sub.isUnmanaged()) {
            return response.code(403).send({ code: 'billing_unmanaged', error: 'Team does not have a managed subscription' })
        }
        try {
            const stripeSubscriptionPromise = stripe.subscriptions.retrieve(
                sub.subscription,
                {
                    expand: ['items.data.price.product']
                }
            )
            const stripeCustomerPromise = stripe.customers.retrieve(sub.customer)

            const stripeSubscription = await stripeSubscriptionPromise
            const stripeCustomer = await stripeCustomerPromise

            const information = {
                next_billing_date: stripeSubscription.current_period_end,
                items: [],
                customer: {
                    name: stripeCustomer.name,
                    balance: stripeCustomer.balance
                }
            }
            stripeSubscription.items.data.forEach(item => {
                information.items.push({
                    name: item.price.product.name,
                    price: item.price.unit_amount,
                    quantity: item.quantity
                })
            })
            response.status(200).send(information)
        } catch (err) {
            if (err.code === 'resource_missing') {
                return response.code(404).send({ code: 'not_found', error: 'Team does not have a subscription' })
            }
            throw err
        }
    })

    /**
     * Set up new billing subscription for a team
     * @name /ee/billing/teams/:team
     * @static
     * @memberof forge.ee.billing
     */
    app.post('/teams/:teamId', {
        preHandler: app.needsPermission('team:edit')
    }, async (request, response) => {
        const team = request.team
        try {
            const session = await app.billing.createSubscriptionSession(team, request.session.User, request.body?.teamTypeId)
            await app.auditLog.Team.billing.session.created(request.session.User, null, team, session)
            response.code(200).type('application/json').send({ billingURL: session.url })
        } catch (err) {
            // Standard errors
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }

            // Catch all
            response.code(500).type('application/json').send({ code: 'unexpected_error', error: responseMessage })
        }
    })

    /**
     * Set up manual billing for a team
     * Admin only
     * @name /ee/billing/teams/:team/manual
     * @static
     * @memberof forge.ee.billing
     */
    app.post('/teams/:teamId/manual', {
        preHandler: app.needsPermission('team:billing:manual')
    }, async (request, response) => {
        const team = request.team
        try {
            await app.billing.enableManualBilling(team)
            if (request.body?.teamTypeId) {
                const teamType = await app.db.models.TeamType.byId(request.body.teamTypeId)
                if (teamType) {
                    team.setTeamType(teamType)
                    await team.save()
                }
            }
            response.code(200).send({})
        } catch (err) {
            // Standard errors
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }

            // Catch all
            response.code(500).type('application/json').send({ code: err.code || 'unexpected_error', error: responseMessage })
        }
    })

    /**
     * Redirect to the Stripe Customer portal
     * @name /ee/billing/teams/:team/customer-portal
     * @static
     * @memberof forge.ee.billing
     */
    app.get('/teams/:teamId/customer-portal', {
        preHandler: app.needsPermission('team:edit')
    }, async (request, response) => {
        const team = request.team
        const sub = await team.getSubscription()
        const portal = await stripe.billingPortal.sessions.create({
            customer: sub.customer,
            return_url: `${app.config.base_url}/team/${team.slug}/overview`
        })

        response.redirect(303, portal.url)
    })
}
