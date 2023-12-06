module.exports.init = async function (app) {
    // Set the billing feature flag
    app.config.features.register('billing', true, true)

    const ONE_DAY = 86400000

    const stripe = require('stripe')(app.config.billing.stripe.key)

    app.housekeeper.registerTask({
        name: 'teamTrialManager',
        startup: false,
        schedule: '0,30  *  *  *  *',
        run: require('./trialTask').init(app)
    })

    app.postoffice.registerTemplate('TrialTeamCreated', require('./emailTemplates/TrialTeamCreated'))
    app.postoffice.registerTemplate('TrialTeamSuspended', require('./emailTemplates/TrialTeamSuspended'))
    app.postoffice.registerTemplate('TrialTeamEnded', require('./emailTemplates/TrialTeamEnded'))
    app.postoffice.registerTemplate('TrialTeamReminder', require('./emailTemplates/TrialTeamReminder'))

    // Augment the Team model with billing functions
    require('./Team')(app)
    require('./TeamType')(app)

    /**
     * Convert a user-friendly promo code to its api id, if valid.
     * @param {string} code The user-friendly promo code 'FREEDONUTS'
     * @returns the promoCode id (`promo_xyz`) if valid, null otherwise
     */
    async function getPromotionCode (code) {
        const promoCodes = await stripe.promotionCodes.list({ code, active: true })
        if (promoCodes.data?.length === 1) {
            return promoCodes.data[0]
        }
        return null
    }

    return {
        createSubscriptionSession: async (team, user = null, teamTypeId = null) => {
            // When setting up the initial subscription we'll default to the billing
            // ids of current team type. However, the subscription setup could be done
            // in conjunction with changing the team type. We do *not* modify
            // the team type here - because the user could abandon the stripe checkout
            // and they will expect to remain in their current trial/type

            // Get the specified TeamType, or default to the team's existing type
            const teamType = await (teamTypeId ? app.db.models.TeamType.byId(teamTypeId) : team.getTeamType())

            const billingIds = await teamType.getTeamBillingIds()
            const teamPrice = billingIds.price

            // Use existing Stripe customer
            const existingLocalSubscription = await team.getSubscription()

            const sub = {
                mode: 'subscription',
                metadata: {
                    teamTypeId: teamType.hashid
                },
                line_items: [{
                    price: teamPrice,
                    quantity: 1
                }],
                subscription_data: {
                    metadata: {
                        team: team.hashid
                    }
                },
                tax_id_collection: {
                    enabled: true
                },
                custom_text: {
                    submit: {
                        message: 'This sets up your team for billing.'
                    }
                },
                client_reference_id: team.hashid,
                payment_method_types: ['card'],
                success_url: `${app.config.base_url}/team/${team.slug}/applications?billing_session={CHECKOUT_SESSION_ID}`,
                cancel_url: `${app.config.base_url}/team/${team.slug}/applications`
            }

            // Need to ensure the subscription contains all of the expected items
            // to correlate with the teamType. This includes:
            // - Team Plan item - already added above
            // - Device item
            // - An item for each instance type

            // Check if a device item is required
            const deviceBillingIds = await teamType.getDeviceBillingIds()
            if (deviceBillingIds.product) {
                const deviceCount = await team.deviceCount()
                if (deviceCount > 0) {
                    const deviceFreeAllocation = teamType.getProperty('devices.free', 0)
                    const billableCount = Math.max(0, deviceCount - deviceFreeAllocation)
                    if (billableCount > 0) {
                        // We have devices to include in the subscription
                        sub.line_items.push({
                            price: deviceBillingIds.price,
                            quantity: billableCount
                        })
                    }
                }
            }
            const instanceCounts = await team.getBillableInstanceCountByType()
            const instanceTypes = await app.db.models.ProjectType.findAll()
            for (const instanceType of instanceTypes) {
                // Get the stripe ids to use for this instance type in this team type
                const instanceBillingIds = await teamType.getInstanceBillingIds(instanceType)
                const count = instanceCounts[instanceType.hashid]
                if (count) {
                    // The team has one or more instances of this type.
                    // Calculate the billableCount based on how many free
                    // instances of this type are allowed for this teamType
                    const freeAllowance = teamType.getInstanceTypeProperty(instanceType, 'free', 0)
                    const billableCount = Math.max(0, count - freeAllowance)
                    if (billableCount > 0) {
                        // Need to add an item for this instance type
                        sub.line_items.push({
                            price: instanceBillingIds.price,
                            quantity: billableCount
                        })
                    }
                }
            }

            let userBillingCode
            let promoCode
            if (user) {
                // Check to see if this user has a billingCode associated
                userBillingCode = await app.billing.getUserBillingCode(user)
                if (userBillingCode) {
                    // Check to see if that is a valid stripe promotionCode
                    promoCode = await getPromotionCode(userBillingCode.code)
                }
            }

            if (existingLocalSubscription?.customer) {
                sub.customer = existingLocalSubscription.customer

                // Required for tax_id_collection
                sub.customer_update = {
                    name: 'auto'
                }

                if (promoCode?.restrictions?.first_time_transaction) {
                    // This promoCode has been configured for one use per customer
                    // As this is an existing customer (ie Team Subscription)
                    // we cannot proceed with this coupon. The only option is
                    // to continue without the coupon.
                    promoCode = null
                }
            }
            if (promoCode?.id) {
                sub.discounts = [
                    {
                        promotion_code: promoCode.id
                    }
                ]
                sub.custom_text.submit.message += ` We will apply the code ${userBillingCode.code} to your subscription.`
            } else {
                sub.allow_promotion_codes = true
            }

            // Set the flag to enable a free trial
            if (app.db.controllers.Subscription.freeTrialCreditEnabled() && user) {
                const newTeamAlreadyCreated = true // team is created before this step
                const eligibleForTrial = await app.db.controllers.Subscription.userEligibleForFreeTrialCredit(user, newTeamAlreadyCreated)

                if (eligibleForTrial) {
                    app.log.info(`User ${user.name} (${user.username}) is eligible for a free trial, set the flag in the subscription metadata.`)
                }

                sub.subscription_data.metadata.free_trial = eligibleForTrial
            }
            const session = await stripe.checkout.sessions.create(sub)
            app.log.info(`Creating Subscription for team ${team.hashid}` + (sub.discounts ? ` code='${userBillingCode.code}'` : ''))
            return session
        },

        addProject: async (team, project) => {
            return app.billing.updateTeamInstanceCount(team)
        },

        removeProject: async (team, project) => {
            return app.billing.updateTeamInstanceCount(team)
        },
        /**
         *
         * @param {*} team
         */
        endTeamTrial: async (team) => {
            // If a trial price is set, move it over to the proper team price
            const billingIds = await team.getTeamBillingIds()
            const subscription = await team.getSubscription()
            const prorationBehavior = await team.getBillingProrationBehavior()
            if (billingIds.trialPrice && billingIds.trialProduct) {
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscription)
                // The subscription should have an item for the trial product. It needs to
                // be removed and replaced with the billable team product
                const existingTrialItem = stripeSubscription.items.data.find(item => item.plan.product === billingIds.trialProduct)
                if (existingTrialItem) {
                    app.log.info(`Updating team ${team.hashid} subscription: adding team item`)
                    await stripe.subscriptions.update(subscription.subscription, {
                        proration_behavior: prorationBehavior,
                        items: [{
                            price: billingIds.price,
                            quantity: 1
                        }]
                    })
                    app.log.info(`Updating team ${team.hashid} subscription: removing trial item`)
                    await stripe.subscriptionItems.del(existingTrialItem.id, { proration_behavior: prorationBehavior })
                }
            }
            await app.billing.updateTeamInstanceCount(team)
            await app.billing.updateTeamDeviceCount(team)
        },
        /**
         * Called whenever the number of active instances in a team changes - ensures
         * the subscription has the right number of instances listed against
         * all billable types
         * @param {Team} team
         */
        updateTeamInstanceCount: async (team) => {
            const counts = await team.getBillableInstanceCountByType()
            const subscription = await team.getSubscription()
            if (subscription && subscription.isUnmanaged()) {
                // Unmanaged subscription means the platform is not responsible
                // for managing the stripe configuration
                return
            }
            if (subscription && subscription.isActive()) {
                const prorationBehavior = await team.getBillingProrationBehavior()
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscription)
                const newItems = []
                // Get a list of the active instanceTypes
                const instanceTypes = await app.db.models.ProjectType.findAll()
                for (const instanceType of instanceTypes) {
                    // Get the stripe ids to use for this instance type in this team type
                    const instanceBillingIds = await team.getInstanceBillingIds(instanceType)
                    const count = counts[instanceType.hashid]
                    if (count) {
                        // The team has one or more instances of this type.
                        // Calculate the billableCount based on how many free
                        // instances of this type are allowed for this teamType
                        const freeAllowance = await team.getInstanceFreeAllowance(instanceType)
                        let billableCount = Math.max(0, count - freeAllowance)

                        if (!subscription.isTrialEnded()) {
                            // In trial mode, but with billing setup. Check if the trial allows
                            // for a single instance of this type - if so, reduce billableCount by one
                            const teamTrialInstanceTypeId = await team.TeamType.getProperty('trial.instanceType', null)
                            if (teamTrialInstanceTypeId === instanceType.hashid) {
                                billableCount = Math.max(0, billableCount - 1)
                            }
                        }
                        // Check the subscription for an existing item for this instance type
                        const instanceItem = stripeSubscription.items.data.find(item => item.plan.product === instanceBillingIds.product)

                        if (!instanceItem && billableCount > 0) {
                            // No existing subscription item, so add one
                            app.log.info(`Updating team ${team.hashid} subscription: set instance type ${instanceType.hashid} count to ${billableCount}`)
                            newItems.push({
                                price: instanceBillingIds.price,
                                quantity: billableCount
                            })
                        } else if (instanceItem && instanceItem.quantity !== billableCount) {
                            // Subscription quantity doesn't match what we think
                            if (billableCount === 0) {
                                // Remove from the subscription
                                app.log.info(`Updating team ${team.hashid} subscription: set instance type ${instanceType.hashid} count to ${billableCount} - removing item`)
                                try {
                                    await stripe.subscriptionItems.del(instanceItem.id, {
                                        proration_behavior: prorationBehavior
                                    })
                                } catch (error) {
                                    app.log.warn(`Problem updating team ${team.hashid} subscription: ${error.message}`)
                                }
                            } else {
                                // Update the existing item
                                app.log.info(`Updating team ${team.hashid} subscription: set instance type ${instanceType.hashid} count to ${billableCount}`)
                                try {
                                    await stripe.subscriptionItems.update(instanceItem.id, {
                                        quantity: billableCount,
                                        proration_behavior: prorationBehavior
                                    })
                                } catch (error) {
                                    app.log.warn(`Problem updating team ${team.hashid} subscription: ${error.message}`)
                                }
                            }
                        }
                    } else {
                        // This team has no instances of this instance type.
                        // Need to make sure the subscription doesn't have any matching items
                        const instanceItem = stripeSubscription.items.data.find(item => item.plan.product === instanceBillingIds.product)
                        if (instanceItem) {
                            // This item is no longer needed on the subscription so can be removed
                            try {
                                app.log.info(`Updating team ${team.hashid} subscription: set instance type ${instanceType.hashid} count to 0 - removing item`)
                                await stripe.subscriptionItems.del(instanceItem.id, {
                                    proration_behavior: prorationBehavior
                                })
                            } catch (error) {
                                app.log.warn(`Problem updating team ${team.hashid} subscription: ${error.message}`)
                            }
                        }
                    }
                }

                if (newItems.length > 0) {
                    // Add new items to the subscription
                    try {
                        await stripe.subscriptions.update(subscription.subscription, {
                            proration_behavior: prorationBehavior,
                            items: newItems
                        })
                    } catch (error) {
                        app.log.warn(`Problem updating team ${team.hashid} subscription: ${error.message}`)
                    }
                }
            }
        },
        /**
         * Called whenever the number of devices in a team changes - ensures
         * the subscription has the right number of devices listed.
         * @param {Team} team
         */
        updateTeamDeviceCount: async (team) => {
            const deviceBillingIds = await team.getDeviceBillingIds()
            if (!deviceBillingIds.product) {
                return
            }
            const subscription = await team.getSubscription()
            if (subscription && subscription.isUnmanaged()) {
                // Unmanaged subscription means the platform is not responsible
                // for managing the stripe configuration
                return
            }
            if (subscription && subscription.isActive()) {
                const deviceCount = await team.deviceCount()
                const deviceFreeAllocation = await team.getDeviceFreeAllowance()
                const prorationBehavior = await team.getBillingProrationBehavior()
                const billableCount = Math.max(0, deviceCount - deviceFreeAllocation)
                const existingSub = await stripe.subscriptions.retrieve(subscription.subscription)
                const subItems = existingSub.items
                const deviceItem = subItems.data.find(item => item.plan.product === deviceBillingIds.product)
                if (deviceItem) {
                    if (deviceItem.quantity !== billableCount) {
                        app.log.info(`Updating team ${team.hashid} subscription device count to ${billableCount}`)
                        const update = {
                            quantity: billableCount,
                            proration_behavior: prorationBehavior
                        }
                        try {
                            await stripe.subscriptionItems.update(deviceItem.id, update)
                        } catch (error) {
                            app.log.warn(`Problem updating team ${team.hashid} subscription: ${error.message}`)
                        }
                    }
                } else if (billableCount > 0) {
                    // Need to add the device item to the subscription
                    const update = {
                        items: [{
                            price: deviceBillingIds.price,
                            quantity: billableCount
                        }]
                    }
                    try {
                        app.log.info(update)
                        await stripe.subscriptions.update(subscription.subscription, update)
                    } catch (error) {
                        console.error(error)
                        app.log.warn(`Problem adding first device to subscription\n${error.message}`)
                        throw error
                    }
                }
            }
        },

        closeSubscription: async (subscription) => {
            app.log.info(`Closing subscription for team ${subscription.Team.hashid}`)

            await stripe.subscriptions.del(subscription.subscription, {
                invoice_now: true,
                prorate: true
            })
            subscription.status = app.db.models.Subscription.STATUS.CANCELED
            await subscription.save()
        },

        setupTrialTeamSubscription: async (team, user) => {
            const trialModelEnabled = team.TeamType.getProperty('trial.active', false)
            if (trialModelEnabled) {
                // teamTrialDuration: number of days the trial should run for
                const teamTrialDuration = await team.TeamType.getProperty('trial.duration', 0)
                const teamTrialInstanceTypeId = await team.TeamType.getProperty('trial.instanceType', null)
                if (teamTrialDuration) {
                    await app.db.controllers.Subscription.createTrialSubscription(
                        team,
                        Date.now() + teamTrialDuration * ONE_DAY
                    )
                    if (await team.TeamType.getProperty('trial.sendEmail', true)) {
                        const emailInserts = {
                            username: user.name,
                            teamName: team.name,
                            trialDuration: teamTrialDuration
                        }
                        if (teamTrialInstanceTypeId) {
                            const trialProjectType = await app.db.models.ProjectType.byId(teamTrialInstanceTypeId)
                            emailInserts.trialProjectTypeName = trialProjectType.name
                        }
                        await app.postoffice.send(
                            user,
                            'TrialTeamCreated',
                            emailInserts
                        )
                    }
                }
            }
        },
        getUserBillingCode: async (user) => {
            return app.db.controllers.UserBillingCode.getUserCode(user)
        },
        setUserBillingCode: async (user, code) => {
            // Validate this is an active code
            const promoCode = await getPromotionCode(code)
            if (promoCode?.id) {
                // This is a valid code - store the original user-facing code rather
                // than the underlying id. This will allow us to change the associated
                // promo for this code rather than tying to exactly one.
                return app.db.controllers.UserBillingCode.setUserCode(user, code)
            }
        },

        /**
         * This updates the team subscription on stripe as part of updating the
         * team type.
         *
         * It requires the team to have an active subscription - ie billing must
         * have been configured before a team can change its type.
         *
         * If the team has setup its subscription but is still in trial mode,
         * the trial is ended first.
         *
         * This code will remove all existing items from the stripe subscription,
         * then add back the new team plan item.
         *
         * It does *not* restore the device/instance billing items. They are added
         * back by a later stage of the process in ee/lib/billing/Team.js#updateTeamType
         */
        updateTeamType: async (team, targetTeamType) => {
            const subscription = await team.getSubscription()
            // The team must have billing setup with an active or unmanaged subscription before
            // it can change its type
            if (subscription && subscription.isUnmanaged()) {
                // Unmanaged subscription means the platform is not responsible
                // for managing the stripe configuration
                return
            }
            if (subscription && subscription.isActive()) {
                if (subscription.isTrial()) {
                    // This block can be removed in 1.14 as it is a condition
                    // we no longer support - but may have some lingering teams
                    // in this mode for the next 2 weeks from the point this
                    // is deployed to production.

                    // If in trial mode, the trial is first ended - you cannot
                    // carry a trial over to a new team type

                    app.log.info(`Team ${subscription.Team.hashid} ending trial - changing team type`)
                    // The following logic around ending a trial also sits in trialTask.js.
                    // There may be a cleaner refactoring to avoid the duplication, but
                    // that is for another day
                    await app.billing.endTeamTrial(team)
                    await subscription.clearTrialState()
                }

                // Get the stripe view of the subscription
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscription)

                // Get the team billing ids for the new team type
                const targetTeamBillingIds = await targetTeamType.getTeamBillingIds()
                const prorationBehavior = await team.getBillingProrationBehavior()

                try {
                    // Add the new team plan item
                    app.log.info(`Updating team ${team.hashid} subscription: adding team plan ${targetTeamBillingIds.price}`)
                    await stripe.subscriptions.update(subscription.subscription, {
                        proration_behavior: prorationBehavior,
                        items: [{
                            price: targetTeamBillingIds.price,
                            quantity: 1
                        }]
                    })

                    // Remove all pre-existing items. They will get added back
                    // later with the new billing ids
                    for (const item of stripeSubscription.items.data) {
                        app.log.info(`Updating team ${team.hashid} subscription: removing item ${item.price.id}`)
                        await stripe.subscriptionItems.del(item.id, { proration_behavior: prorationBehavior })
                    }
                } catch (err) {
                    app.log.warn(`Problem updating team ${team.hashid} subscription: ${err.message}`)
                    throw err
                }
            } else {
                const err = new Error('Team subscription not active')
                err.code = 'billing_required'
                throw err
            }
        },
        /**
         * Flags the subscription as being unmanaged. This disables all interaction
         * with Stripe for this team.
         *
         * This can only be done with teams that are currently in trial mode
         *
         * @param {*} team
         * @param {*} targetTeamType
         */
        enableManualBilling: async (team) => {
            const subscription = await team.getSubscription()
            if (!subscription.isTrial()) {
                // For first iteration, only teams in trial mode can be put into
                // manual billing mode
                const err = new Error('Team not in trial mode')
                err.code = 'invalid_request'
                throw err
            }
            subscription.status = app.db.models.Subscription.STATUS.UNMANAGED
            subscription.trialEndsAt = null
            subscription.trialStatus = app.db.models.Subscription.TRIAL_STATUS.ENDED
            await subscription.save()
        },

        /**
         * Resynchronises a subscription with stripe. This ensures are local view
         * of the subscription status matches stripe's view.
         */
        resyncTeamSubscription: async (team, subscription) => {
            if (subscription.subscription) {
                try {
                    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscription)
                    if (stripeSubscription?.status !== subscription.status) {
                        // We have got out of sync. We primarily care about being
                        // in the canceled state.
                        // Note: a canceled subscription cannot become uncanceled
                        if (stripeSubscription.status === 'canceled') {
                            await app.billing.updateSubscriptionStatus(subscription, stripeSubscription.status, team)
                            await app.db.controllers.Team.suspendTeam(team)
                        } else {
                            app.log.warn(`Subscription status for team ${team.hashid} does not match stripe "${subscription.status}" vs "${stripeSubscription?.status}". Subscription ${subscription.subscription}.`)
                        }
                    }
                } catch (err) {
                    // For now, we'll log this error, but not rethrow it.
                    app.log.warn(`Error syncing team ${team.hashid} subscription ${subscription.subscription}: ${err.message}`)
                }
            }
        },

        /**
         * Update a subscription's local status. This is typically going to be done
         * when we are detect a change from stripe.
         *
         * In addition to updating the field, it adds an audit log entry of the change.
         *
         * @param {*} subscription
         * @param {*} newStatus
         * @param {*} team
         * @param {*} user
         */
        updateSubscriptionStatus: async function (subscription, newStatus, team, user) {
            if (subscription.status === newStatus) {
                return
            }
            const oldStatus = subscription.status

            subscription.status = newStatus
            await subscription.save()

            if (team) {
                const changes = new app.auditLog.formatters.UpdatesCollection()
                changes.push('status', oldStatus, newStatus)
                await app.auditLog.Team.billing.subscription.updated(user, null, team, subscription, changes)
            }
        }
    }
}
