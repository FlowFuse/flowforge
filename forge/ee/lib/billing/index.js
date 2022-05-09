module.exports.init = function (app) {
    // Set the billing feature flag
    app.config.features.register('billing', true, true)

    const stripe = require('stripe')(app.config.billing.stripe.key)

    return {
        createSubscriptionSession: async (team) => {
            const sub = {
                mode: 'subscription',
                line_items: [{
                    price: app.config.billing.stripe.team_price,
                    quantity: 1
                }],
                subscription_data: {
                    metadata: {
                        team: team.hashid
                    }
                },
                client_reference_id: team.hashid,
                allow_promotion_codes: true,
                payment_method_types: ['card'],
                success_url: `${app.config.base_url}/team/${team.slug}/overview?billing_session={CHECKOUT_SESSION_ID}`,
                cancel_url: `${app.config.base_url}/team/${team.slug}/overview`
            }

            if (app.config.billing?.stripe?.activation_price) {
                sub.line_items.push({
                    price: app.config.billing.stripe.activation_price,
                    quantity: 1
                })
            }

            const session = await stripe.checkout.sessions.create(sub)
            app.log.info(`Creating Subscription for team ${team.hashid}`)
            return session
        },
        addProject: async (team, project) => {
            const subscription = await app.db.models.Subscription.byTeam(team.id)

            const existingSub = await stripe.subscriptions.retrieve(subscription.subscription)
            const subItems = existingSub.items

            let projectItem = false
            subItems.data.forEach(item => {
                if (item.plan.product === app.config.billing.stripe.project_product) {
                    projectItem = item
                }
            })

            app.log.info(`Adding Project ${project.id} to Subscription for team ${team.hashid}`)

            if (projectItem) {
                const metadata = existingSub.metadata ? existingSub.metadata : {}
                // console.log('updating metadata', metadata)
                metadata[project.id] = 'true'
                // console.log(metadata)
                const update = {
                    quantity: projectItem.quantity + 1,
                    proration_behavior: 'always_invoice'
                }
                // TODO update meta data?
                try {
                    await stripe.subscriptionItems.update(projectItem.id, update)
                    await stripe.subscriptions.update(subscription.subscription, {
                        metadata: metadata
                    })
                } catch (error) {
                    app.log.warn(`Problem adding project to subscription\n${error.message}`)
                }
            } else {
                const metadata = {}
                metadata[project.id] = 'true'
                // metadata[team] = team.hashid
                const update = {
                    items: [{
                        price: app.config.billing.stripe.project_price,
                        quantity: 1
                    }],
                    metadata: metadata
                }
                try {
                    await stripe.subscriptions.update(subscription.subscription, update)
                } catch (error) {
                    app.log.warn(`Problem adding first project to subscription\n${error.message}`)
                    throw error
                }
            }
        },
        removeProject: async (team, project) => {
            const subscription = await app.db.models.Subscription.byTeam(team.id)

            const existingSub = await stripe.subscriptions.retrieve(subscription.subscription)
            const subItems = existingSub.items

            let projectItem = false
            subItems.data.forEach(item => {
                if (item.plan.product === app.config.billing.stripe.project_product) {
                    projectItem = item
                }
            })

            app.log.info(`Removing Project ${project.id} to Subscription for team ${team.hashid}`)

            if (projectItem) {
                const metadata = existingSub.metadata ? existingSub.metadata : {}
                metadata[project.id] = ''
                const newQuantity = projectItem.quantity > 0 ? projectItem.quantity - 1 : 0
                const update = {
                    quantity: newQuantity
                }
                if (projectItem.quantity === 1) {
                    update.proration_behavior = 'always_invoice'
                }

                try {
                    await stripe.subscriptionItems.update(projectItem.id, update)
                    await stripe.subscriptions.update(subscription.subscription, {
                        metadata: metadata
                    })
                } catch (err) {
                    app.log.warn(`failed removing project from subscription\n${err.message}`)
                    throw err
                }
            } else {
                // not found?
                app.log.warn('Project not found in Subscription, possible Grandfathered in')
            }
        },
        closeSubscription: async (subscription) => {
            app.log.info(`Closing subscription for team ${subscription.Team.hashid}`)

            await stripe.subscriptions.del(subscription.subscription, {
                invoice_now: true,
                prorate: true
            })
            await subscription.destroy()
        }
    }
}
