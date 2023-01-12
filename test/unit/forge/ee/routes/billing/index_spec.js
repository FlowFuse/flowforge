const should = require('should')
const sinon = require('sinon')
const setup = require('../../setup')

describe('Stripe Callbacks', function () {
    const sandbox = sinon.createSandbox()

    let app

    const callbackURL = '/ee/billing/callback'

    async function getLog () {
        const logs = await app.db.models.AuditLog.forEntity()
        logs.log.should.have.length(1)
        return (await app.db.views.AuditLog.auditLog({ log: logs.log })).log[0]
    }

    beforeEach(async function () {
        app = await setup()
        sandbox.spy(app.log)
        sandbox.stub(app.billing)
    })

    afterEach(async function () {
        await app.close()
        sandbox.restore()
    })

    describe('charge.failed', () => {
        it('Handles known customer', async function () {
            const response = await app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'ch_1234567890',
                            customer: 'cus_1234567890'
                        }
                    },
                    type: 'charge.failed'
                }
            })

            should(app.log.info.called).equal(true)
            app.log.info.lastCall.firstArg.should.equal(`Stripe charge.failed event ch_1234567890 from cus_1234567890 received for team '${app.team.hashid}'`)

            should(response).have.property('statusCode', 200)
        })

        it('Logs and does not throw an error for unknown customer', async function () {
            const response = await app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'ch_1234567890',
                            customer: 'cus_does_not_exist'
                        }
                    },
                    type: 'charge.failed'
                }
            })

            should(app.log.error.called).equal(true)
            app.log.error.lastCall.firstArg.should.equal('Stripe charge.failed event ch_1234567890 from cus_does_not_exist received for unknown team by Stripe Customer ID')

            should(response).have.property('statusCode', 200)
        })
    })

    describe('checkout.session.completed', () => {
        it('Creates a subscription locally', async function () {
            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'cs_1234567890',
                            object: 'checkout.session',
                            customer: 'cus_0987654321',
                            subscription: 'sub_0987654321',
                            client_reference_id: app.team.hashid
                        }
                    },
                    type: 'checkout.session.completed'
                }
            }))
            should(app.log.info.called).equal(true)
            app.log.info.firstCall.firstArg.should.equal(`Stripe checkout.session.completed event cs_1234567890 from cus_0987654321 received for team '${app.team.hashid}'`)

            should(response).have.property('statusCode', 200)
            const sub = await app.db.models.Subscription.byCustomerId('cus_0987654321')
            should(sub.customer).equal('cus_0987654321')
            should(sub.subscription).equal('sub_0987654321')
            const team = sub.Team
            should(team.name).equal('ATeam')
        })

        it('Warns but still returns 200 if the team can not be found', async function () {
            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'cs_1234567890',
                            object: 'checkout.session',
                            customer: 'cus_0987654321',
                            subscription: 'sub_0987654321',
                            client_reference_id: 'unknown_team_id'
                        }
                    },
                    type: 'checkout.session.completed'
                }
            }))

            should(app.log.error.called).equal(true)
            app.log.error.firstCall.firstArg.should.equal("Stripe checkout.session.completed event cs_1234567890 from cus_0987654321 received for unknown team by team ID 'unknown_team_id'")

            should(response).have.property('statusCode', 200)
        })
    })

    describe('checkout.session.expired', () => {
        it('Logs and does not throw an error', async () => {
            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'cs_1234567890',
                            object: 'checkout.session',
                            customer: 'cus_1234567890',
                            subscription: 'sub_0987654321',
                            status: 'expired'
                        }
                    },
                    type: 'checkout.session.expired'
                }
            }))

            should(app.log.info.called).equal(true)
            app.log.info.firstCall.firstArg.should.equal(`Stripe checkout.session.expired event cs_1234567890 from cus_1234567890 received for team '${app.team.hashid}'`)

            should(response).have.property('statusCode', 200)
        })
    })

    describe('customer.subscription.created', () => {
        let stripe
        function setupStripe (mock) {
            require.cache[require.resolve('stripe')] = {
                exports: function (apiKey) {
                    return mock
                }
            }
            stripe = mock
        }

        beforeEach(async function () {
            setupStripe({
                customers: {
                    createBalanceTransaction: sinon.stub().resolves({ status: 'ok' })
                }
            })
        })

        afterEach(async function () {
            delete require.cache[require.resolve('stripe')]
        })

        it('Logs known subscriptions', async () => {
            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'sub_1234567890',
                            object: 'subscription',
                            customer: 'cus_1234567890',
                            status: 'active'
                        }
                    },
                    type: 'customer.subscription.created'
                }
            }))

            should(app.log.info.called).equal(true)
            app.log.info.firstCall.firstArg.should.equal(`Stripe customer.subscription.created event sub_1234567890 from cus_1234567890 received for team '${app.team.hashid}'`)

            should(response).have.property('statusCode', 200)
        })

        it('Logs events for unknown customers', async () => {
            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'sub_unknown',
                            object: 'subscription',
                            customer: 'cus_unknown',
                            status: 'active'
                        }
                    },
                    type: 'customer.subscription.created'
                }
            }))

            should(app.log.error.called).equal(true)
            app.log.error.firstCall.firstArg.should.equal('Stripe customer.subscription.created event sub_unknown from cus_unknown received for unknown team by Stripe Customer ID')

            should(response).have.property('statusCode', 200)
        })

        it('Creates a stripe credit balance against the customer if the free_trial flag is set', async () => {
            const appWithTrialsEnabled = await setup({
                billing: {
                    stripe: {
                        new_customer_free_credit: 1000
                    }
                }
            })

            const response = await (appWithTrialsEnabled.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'sub_1234567890',
                            object: 'subscription',
                            customer: 'cus_1234567890',
                            status: 'active',
                            metadata: {
                                free_trial: true
                            }
                        }
                    },
                    type: 'customer.subscription.created'
                }
            }))

            should.equal(stripe.customers.createBalanceTransaction.calledOnce, true)

            stripe.customers.createBalanceTransaction.lastCall.args[0].should.equal('cus_1234567890')
            stripe.customers.createBalanceTransaction.lastCall.args[1].should.deepEqual({
                amount: -1000,
                currency: 'usd'
            })

            should(response).have.property('statusCode', 200)
        })

        it('Ignores the free_trial flag if trials are not enabled', async () => {
            const appWithoutTrialsEnabled = await setup()
            sandbox.stub(appWithoutTrialsEnabled.log, 'error')

            const response = await (appWithoutTrialsEnabled.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'sub_1234567890',
                            object: 'subscription',
                            customer: 'cus_1234567890',
                            status: 'active',
                            metadata: {
                                free_trial: true
                            }
                        }
                    },
                    type: 'customer.subscription.created'
                }
            }))

            should.equal(stripe.customers.createBalanceTransaction.calledOnce, false)

            should(appWithoutTrialsEnabled.log.error.called).equal(true)
            appWithoutTrialsEnabled.log.error.firstCall.firstArg.should.equal(`Received a new subscription with the trial flag set for ${app.team.hashid}, but trials are not configured.`)

            should(response).have.property('statusCode', 200)
        })
    })

    describe('customer.subscription.updated', () => {
        it('Updates existing subscription status if it changes', async () => {
            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_1MEUqIJ6VWAujNoLDtlTRH3f',
                    object: 'event',
                    data: {
                        object: {
                            id: 'sub_1234567890',
                            object: 'subscription',
                            customer: 'cus_1234567890',
                            status: 'canceled'
                        },
                        previous_attributes: {
                            status: 'active'
                        }
                    },
                    type: 'customer.subscription.updated'
                }
            }))

            should(app.log.info.called).equal(true)
            app.log.info.firstCall.firstArg.should.equal(`Stripe customer.subscription.updated event sub_1234567890 from cus_1234567890 received for team '${app.team.hashid}'`)

            should(response).have.property('statusCode', 200)

            const subscription = await app.db.models.Subscription.byCustomerId('cus_1234567890')
            should(subscription.status).equal(app.db.models.Subscription.STATUS.CANCELED)

            const log = await getLog()
            log.event.should.equal('billing.subscription.updated')
            log.body.updates.should.have.length(1)
            log.body.updates[0].key.should.equal('status')
            log.body.updates[0].old.should.equal('active')
            log.body.updates[0].new.should.equal('canceled')
        })

        it('Ignores changes to unhandled statuses', async () => {
            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_1MEUqIJ6VWAujNoLDtlTRH3f',
                    object: 'event',
                    data: {
                        object: {
                            id: 'sub_1234567890',
                            object: 'subscription',
                            customer: 'cus_1234567890',
                            status: 'past_due'
                        },
                        previous_attributes: {
                            status: 'active'
                        }
                    },
                    type: 'customer.subscription.updated'
                }
            }))

            should(app.log.warn.called).equal(true)
            app.log.warn.firstCall.firstArg.should.equal("Stripe subscription sub_1234567890 has transitioned in Stripe to a state not currently handled: 'past_due'")

            should(response).have.property('statusCode', 200)

            const subscription = await app.db.models.Subscription.byCustomerId('cus_1234567890')
            should(subscription.status).equal(app.db.models.Subscription.STATUS.ACTIVE)
        })

        it('Logs updates events to unknown subscriptions or customers without error', async () => {
            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_1MEUqIJ6VWAujNoLDtlTRH3f',
                    object: 'event',
                    data: {
                        object: {
                            id: 'sub_unknown',
                            object: 'subscription',
                            customer: 'cus_unknown',
                            status: 'canceled'
                        },
                        previous_attributes: {
                            status: 'active'
                        }
                    },
                    type: 'customer.subscription.updated'
                }
            }))

            should(app.log.error.called).equal(true)
            app.log.error.firstCall.firstArg.should.equal('Stripe customer.subscription.updated event sub_unknown from cus_unknown received for unknown team by Stripe Customer ID')

            should(response).have.property('statusCode', 200)

            const subscription = await app.db.models.Subscription.byCustomerId('cus_1234567890')
            should(subscription.status).equal(app.db.models.Subscription.STATUS.ACTIVE) // no change
        })
    })

    describe('customer.subscription.deleted', () => {
        it('Cancels the teams subscription and stops all running projects', async () => {
            const project1 = await app.db.models.Project.create({ name: 'project-1', type: '', url: '' })
            await project1.setProjectStack(app.stack)
            await app.team.addProject(project1)

            const project2 = await app.db.models.Project.create({ name: 'project-2', type: '', url: '' })
            await project2.setProjectStack(app.stack)
            await app.team.addProject(project2)

            const project3 = await app.db.models.Project.create({ name: 'project-3', type: '', url: '' })
            await project3.setProjectStack(app.stack)
            await app.team.addProject(project3)

            // Ensure the team prop is loaded properly - wrapper assumes project.Team is defined
            await project1.reload({
                include: [
                    { model: app.db.models.Team },
                    { model: app.db.models.ProjectStack }
                ]
            })
            await project2.reload({
                include: [
                    { model: app.db.models.Team },
                    { model: app.db.models.ProjectStack }
                ]
            })
            await project3.reload({
                include: [
                    { model: app.db.models.Team },
                    { model: app.db.models.ProjectStack }
                ]
            })

            // project 1 & 2 are running
            await app.containers.start(project1)
            await app.containers.start(project2)

            // project3 is suspended
            await app.containers.start(project3)
            await app.containers.stop(project3)

            // Assert state before
            const teamProjects = await app.db.models.Project.byTeam(app.team.hashid)
            should(teamProjects.length).equal(3)
            const projectsStatesBefore = await app.db.models.Project.byTeam(app.team.hashid)
            projectsStatesBefore.map((project) => project.state).should.match(['running', 'running', 'suspended'])

            app.log.info.resetHistory()

            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_1MEVSfJ6VWAujNoLCPdYq9kn',
                    object: 'event',
                    data: {
                        object: {
                            id: 'sub_1234567890',
                            object: 'subscription',
                            customer: 'cus_1234567890',
                            status: 'canceled'
                        }
                    },
                    type: 'customer.subscription.deleted'
                }
            }))

            should(app.log.info.called).equal(true)
            app.log.info.firstCall.firstArg.should.equal(`Stripe customer.subscription.deleted event sub_1234567890 from cus_1234567890 received for team '${app.team.hashid}'`)

            should(response).have.property('statusCode', 200)

            const subscription = await app.db.models.Subscription.byCustomerId('cus_1234567890')
            should(subscription.status).equal(app.db.models.Subscription.STATUS.CANCELED)

            const projectsStatesAfter = await app.db.models.Project.byTeam(app.team.hashid)
            projectsStatesAfter.map((project) => project.state).should.match(['suspended', 'suspended', 'suspended'])

            const log = await getLog()
            log.event.should.equal('billing.subscription.updated')
            log.body.updates.should.have.length(1)
            log.body.updates[0].key.should.equal('status')
            log.body.updates[0].old.should.equal('active')
            log.body.updates[0].new.should.equal('canceled')
        })

        it('Handles cancellation for unknown customers', async () => {
            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_1MEVSfJ6VWAujNoLCPdYq9kn',
                    object: 'event',
                    data: {
                        object: {
                            id: 'sub_1234567890',
                            object: 'subscription',
                            customer: 'cus_unknown',
                            status: 'canceled'
                        }
                    },
                    type: 'customer.subscription.deleted'
                }
            }))

            should(app.log.error.called).equal(true)
            app.log.error.firstCall.firstArg.should.equal('Stripe customer.subscription.deleted event sub_1234567890 from cus_unknown received for unknown team by Stripe Customer ID')

            should(response).have.property('statusCode', 200)
        })

        it('Handles cancellation for unknown subscriptions without error', async () => {
            await app.db.controllers.Subscription.deleteSubscription(app.team)

            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_1MEVSfJ6VWAujNoLCPdYq9kn',
                    object: 'event',
                    data: {
                        object: {
                            id: 'sub_1234567890',
                            object: 'subscription',
                            customer: 'cus_1234567890',
                            status: 'canceled'
                        }
                    },
                    type: 'customer.subscription.deleted'
                }
            }))

            should(app.log.error.called).equal(true)
            app.log.error.firstCall.firstArg.should.equal('Stripe customer.subscription.deleted event sub_1234567890 from cus_1234567890 received for unknown team by Stripe Customer ID')

            should(response).have.property('statusCode', 200)
        })

        it('Handles cancellation for unknown teams but with a subscription (team manually deleted)', async () => {
            await app.team.destroy()

            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_1MEVSfJ6VWAujNoLCPdYq9kn',
                    object: 'event',
                    data: {
                        object: {
                            id: 'sub_1234567890',
                            object: 'subscription',
                            customer: 'cus_1234567890',
                            status: 'canceled'
                        }
                    },
                    type: 'customer.subscription.deleted'
                }
            }))

            should(app.log.warn.called).equal(true)
            app.log.warn.firstCall.firstArg.should.equal('Stripe customer.subscription.deleted event sub_1234567890 from cus_1234567890 received for deleted team with orphaned subscription')

            should(response).have.property('statusCode', 200)
        })
    })
})
