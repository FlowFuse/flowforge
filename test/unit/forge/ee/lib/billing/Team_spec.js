const should = require('should') // eslint-disable-line
const setup = require('../../setup')

describe('Team model - EE features', function () {
    // Use standard test data.
    let app
    let stripe

    before(async function () {
        stripe = setup.setupStripe()
        stripe.subscriptions.create('sub_1234567890') // add existing subscription to mock stripe
        stripe.subscriptions._createTestSubscription('sub_canceled', { status: 'canceled', metadata: {}, items: { data: [] } })
        app = await setup({})
    })
    after(async function () {
        await app.close()
        setup.resetStripe()
        delete require.cache[require.resolve('stripe')]
    })

    describe('checkDeviceCreateAllowed', function () {
        it('allows device create if subscription active', async function () {
            // Ensure team has active subscription
            const sub = await app.db.controllers.Subscription.createSubscription(app.team, 'sub_1234567890', 'cust_123')
            sub.status = app.db.models.Subscription.STATUS.ACTIVE
            await sub.save()
            await app.team.checkDeviceCreateAllowed().should.be.resolved()
        })
        it('rejects device create if subscription does not exist', async function () {
            // Remove any existing subscription
            const sub = await app.team.getSubscription()
            if (sub) {
                sub.destroy()
            }
            await app.team.checkDeviceCreateAllowed().should.be.rejected()
        })
        it('rejects device create if subscription is canceled', async function () {
            // Ensure team has canceled subscription
            const sub = await app.db.controllers.Subscription.createSubscription(app.team, 'sub_canceled', 'cust_123')
            sub.status = app.db.models.Subscription.STATUS.CANCELED
            await sub.save()
            await app.team.checkDeviceCreateAllowed().should.be.rejected()
        })
    })
})
