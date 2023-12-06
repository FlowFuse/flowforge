const { Op } = require('sequelize')

/**
 * Augments the Team model will billing-specific instance functions
 * @param {*} app
 */
module.exports = function (app) {
    /**
     * Get the subscription object for this team
     * @returns A Subscription
     */
    app.db.models.Team.prototype.getSubscription = async function () {
        return app.db.models.Subscription.byTeamId(this.id)
    }

    /**
     * Get the Stripe product/price ids for the team.
     *
     * These are either:
     *  - Provided via flowforge.yml.
     *    - billing.stripe.team_* provide the default values.
     *    - billing.stripe.teams.<type-name>.* provide type-specific values
     *  - Provided by team.TeamType.properties.billing.*
     *
     * Each of these potential sources is checked, the latter taking precedence
     * over the former.
     *
     * Example flowforge.yml config:
     *   billing:
     *     stripe:
     *       ...
     *       team_price: <default team price>
     *       team_product: <default team product>
     *       device_price: <default device price>
     *       device_product: <default device product>
     *       ...
     *       teams:
     *         starter:
     *           price: <starter team price>
     *           product: <starter team product>
     * @returns object
     */
    app.db.models.Team.prototype.getTeamBillingIds = async function () {
        await this.ensureTeamTypeExists()
        return this.TeamType.getTeamBillingIds()
    }

    /**
     * Get billing details for devices in the team
     * @returns object
     */
    app.db.models.Team.prototype.getDeviceBillingIds = async function () {
        await this.ensureTeamTypeExists()
        return this.TeamType.getDeviceBillingIds()
    }

    /**
     * Get billing details for a particular instanceType in this team
     * @param {ProjectType} instanceType
     * @returns object
     */
    app.db.models.Team.prototype.getInstanceBillingIds = async function (instanceType) {
        await this.ensureTeamTypeExists()
        return this.TeamType.getInstanceBillingIds(instanceType)
    }

    /**
     * Get the number of free devices this team is allowed before billing kicks in
     * @returns number
     */
    app.db.models.Team.prototype.getDeviceFreeAllowance = async function () {
        await this.ensureTeamTypeExists()
        return this.TeamType.getProperty('devices.free', 0)
    }

    /**
     * Get the number of free instances of a particular type this team can have before
     * billing kicks in
     * @param {ProjectType} instanceType
     * @returns number
     */
    app.db.models.Team.prototype.getInstanceFreeAllowance = async function (instanceType) {
        await this.ensureTeamTypeExists()
        return this.TeamType.getInstanceTypeProperty(instanceType, 'free', 0)
    }

    // Overload the default checkInstanceTypeCreateAllowed to add EE/billing checks
    // Move the base function sideways
    app.db.models.Team.prototype._checkInstanceTypeCreateAllowed = app.db.models.Team.prototype.checkInstanceTypeCreateAllowed
    /**
     * Overloads the default checkInstanceTypeCreateAllowed to include billing
     * and trial checks
     * @param {object} instanceType
     */
    app.db.models.Team.prototype.checkInstanceTypeCreateAllowed = async function (instanceType) {
        // First do base checks. This will throw an error if instanceType limit
        // has been reached
        await this._checkInstanceTypeCreateAllowed(instanceType)

        // Next, check if we're within the free allowance - as that won't require
        // billing to exist
        const currentInstanceCount = await this.instanceCount(instanceType)

        const instanceTypeFreeAllowance = await this.getInstanceFreeAllowance(instanceType)
        if (currentInstanceCount < instanceTypeFreeAllowance > 0) {
            // Within free allowance - no further checks needed
            return true
        }

        // Next, check if we're in trial mode and this instanceType is valid
        // for trial mode.
        const subscription = await this.getSubscription()
        if (subscription) {
            await app.billing.resyncTeamSubscription(this, subscription)
            if (subscription.isActive() || subscription.isUnmanaged()) {
                // Billing setup - allowed to create projects
                return
            }
            if (subscription.isTrial() && !subscription.isTrialEnded()) {
                // Trial mode - no billing setup yet
                const trialInstanceType = await this.TeamType.getProperty('trial.instanceType', null)
                if (!trialInstanceType) {
                    // This team trial doesn't restrict to a particular instance type
                    return
                } else if (trialInstanceType === instanceType.hashid) {
                    // Request is for the right type. For this trial mode
                    // only allow 1 to exist, so reject if the current count isn't 0
                    if (currentInstanceCount === 0) {
                        return
                    }
                }
            }
        }
        // Every valid check will have returned before now.
        const err = new Error()
        err.code = 'billing_required'
        err.error = 'Team billing not configured'
        throw err
    }

    app.db.models.Team.prototype._checkInstanceStartAllowed = app.db.models.Team.prototype.checkInstanceStartAllowed
    /**
     * Checks whether an instance may be started in this team. For EE/billing
     * platforms, this checks the billing/subscription state
     *
     * When running with EE, this function is replaced via ee/lib/billing/Team.js
     * to add additional checks
     * @param {*} instance The instance to start
     * Throws an error if it is not allowed
     */
    app.db.models.Team.prototype.checkInstanceStartAllowed = async function (instance) {
        // First do base checks
        await this._checkInstanceStartAllowed()

        const subscription = await this.getSubscription()
        if (subscription) {
            await app.billing.resyncTeamSubscription(this, subscription)
            if (subscription.isActive() || subscription.isUnmanaged()) {
                return
            }
            if (subscription.isTrial() && !subscription.isTrialEnded()) {
                // In trial without billing setup
                return
            }
        }
        // Cannot resume if trial mode has ended
        const err = new Error()
        err.statusCode = 402
        err.code = 'billing_required'
        err.error = 'Team billing not configured'
        throw err
    }

    app.db.models.Team.prototype._checkDeviceCreateAllowed = app.db.models.Team.prototype.checkDeviceCreateAllowed
    /**
     * Checks whether this team can create a device. For EE/billing platforms,
     * this checks the billing/subscription state
     */
    app.db.models.Team.prototype.checkDeviceCreateAllowed = async function () {
        // First do base checks
        await this._checkDeviceCreateAllowed()

        const subscription = await this.getSubscription()
        if (subscription) {
            await app.billing.resyncTeamSubscription(this, subscription)

            if (subscription.isActive() || subscription.isUnmanaged()) {
                return
            }
            if (subscription.isTrial() && !subscription.isTrialEnded()) {
                // In trial without billing setup
                return
            }
        }
        // Cannot resume if trial mode has ended
        const err = new Error()
        err.statusCode = 402
        err.code = 'billing_required'
        err.error = 'Team billing not configured'
        throw err
    }

    app.db.models.Team.prototype._updateTeamType = app.db.models.Team.prototype.updateTeamType
    /**
     * Updates the team type, taking billing into account.
     */
    app.db.models.Team.prototype.updateTeamType = async function (teamType) {
        // Update the subscription on stripe
        await app.billing.updateTeamType(this, teamType)
        // Update the team type on the model using the CE version of this function
        await this._updateTeamType(teamType)
        // Update the device/instance count items on stripe with the new billing
        // details
        await app.billing.updateTeamDeviceCount(this)
        await app.billing.updateTeamInstanceCount(this)
    }

    /**
     * Get the desired proration behaviour when a subscription is modified.
     * @returns 'always_invoice' | 'create_prorations'
     */
    app.db.models.Team.prototype.getBillingProrationBehavior = async function () {
        await this.ensureTeamTypeExists()
        return this.TeamType.getProperty('billing.proration', 'always_invoice')
    }

    /**
     * Gets counts of instance types in this team that are billable
     * @returns object
     */

    app.db.models.Team.prototype.getBillableInstanceCountByType = async function () {
        return await this.instanceCountByType({ state: { [Op.notIn]: ['suspended', 'deleting'] } })
    }
}
