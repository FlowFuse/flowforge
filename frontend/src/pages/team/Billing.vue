<template>
    <div
        v-if="subscription?.customer?.balance < 0"
        class="ff-banner ff-banner-info mb-3"
        data-el="credit-balance-banner"
    >
        You have a credit balance of {{ formatCurrency(Math.abs(subscription.customer.balance)) }} that will be applied to the next invoice.
    </div>
    <div
        v-else-if="subscription?.customer?.balance > 0"
        class="ff-banner ff-banner-info mb-3"
        data-el="credit-balance-banner"
    >
        You owe {{ formatCurrency(Math.abs(subscription.customer.balance)) }} that will be applied to the next invoice.
    </div>
    <ff-page>
        <template #header>
            <ff-page-header title="Team Billing">
                <template #context>
                    Manage your team's billing subscription
                </template>
                <template #tools>
                    <div class="flex flex-row gap-x-4">
                        <ff-button v-if="subscription" data-action="change-team-type" :to="{name: 'TeamChangeType'}">Upgrade Team</ff-button>
                        <ff-button v-if="subscription" @click="customerPortal()">
                            <template #icon-right><ExternalLinkIcon /></template>
                            Stripe Customer Portal
                        </ff-button>
                    </div>
                </template>
            </ff-page-header>
        </template>
        <Loading v-if="loading" size="small" />
        <div v-else-if="billingSetUp">
            <FormHeading v-if="trialMode" class="mb-6">Trial Ends:  <span class="font-normal">{{ formatDate(team.billing.trialEndsAt) }}</span></FormHeading>
            <FormHeading class="mb-6">Next Payment: <span v-if="subscription && !subscriptionExpired" class="font-normal">{{ formatDate(subscription.next_billing_date) }}</span></FormHeading>
            <div v-if="subscriptionExpired" class="ff-no-data ff-no-data-large">
                Your subscription has expired. Please renew it to continue using FlowFuse.

                <ff-button data-action="renew-subscription" class="mx-auto mt-3" @click="setupBilling()">
                    <template #icon-right><ExternalLinkIcon /></template>
                    Renew Subscription
                </ff-button>
            </div>
            <div v-else-if="subscription">
                <ff-data-table :columns="columns" :rows="subscription.items" />
                <div v-if="hasTrialProject" class="text-gray-400 mt-1 pl-2 text-sm">Your trial instance will be automatically added to your subscription when the trial ends</div>
            </div>
            <div v-else class="ff-no-data ff-no-data-large">
                Something went wrong loading your subscription information, please try again.
            </div>
        </div>
        <EmptyState v-else-if="subscriptionExpired">
            <template #img>
                <img src="../../images/empty-states/team-instances.png">
            </template>
            <template #header>Your Team Subscription Has Expired</template>
            <template #message>
                <p>
                    Your subscription has expired. To continue using this team, you will need to
                    setup billing again.
                </p>
            </template>
            <template #actions>
                <ff-button data-action="change-team-type" :to="{name: 'TeamChangeType'}">Setup Billing</ff-button>
            </template>
        </EmptyState>
        <EmptyState v-else-if="!isUnmanaged">
            <template #img>
                <img src="../../images/empty-states/team-instances.png">
            </template>
            <template #header>Setup Team Billing</template>
            <template #message>
                <template v-if="!trialHasEnded">
                    <p v-if="trialMode">
                        You have <span class="font-bold" v-text="trialEndsIn" /> left of your trial.
                    </p>
                    <p>
                        During the trial you can make full use of the features available to your team. To keep things running you will need to setup your billing details.
                    </p>
                </template>
                <template v-else>
                    <p>
                        You trial has ended. You will need to setup billing to continuing using this team.
                    </p>
                </template>
            </template>
            <template #actions>
                <ff-button data-action="change-team-type" :to="{name: 'TeamChangeType'}">Setup Billing</ff-button>
            </template>
        </EmptyState>
        <EmptyState v-else>
            <template #img>
                <img src="../../images/empty-states/team-instances.png">
            </template>
            <template #header>Team Billing</template>
            <template #message>
                <p>
                    Your team billing cannot currently be managed from the dashboard.
                </p>
                <p>
                    Please contact <a href="https://flowfuse.com/support/" class="underline" target="_blank">Support</a> for help.
                </p>
            </template>
        </EmptyState>
    </ff-page>
</template>

<script>

import { ExternalLinkIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import billingApi from '../../api/billing.js'

import EmptyState from '../../components/EmptyState.vue'
import FormHeading from '../../components/FormHeading.vue'
import Loading from '../../components/Loading.vue'
import formatCurrency from '../../mixins/Currency.js'
import formatDateMixin from '../../mixins/DateTime.js'
import permissionsMixin from '../../mixins/Permissions.js'

const priceCell = {
    name: 'PriceCell',
    props: ['price'],
    mixins: [formatCurrency],
    computed: {
        formattedPrice: function () {
            return this.formatCurrency(this.price)
        }
    },
    template: '<div>{{ formattedPrice }}</div>'
}

const totalPriceCell = {
    name: 'PriceCell',
    props: ['total_price'],
    mixins: [formatCurrency],
    computed: {
        formattedPrice: function () {
            return this.formatCurrency(this.total_price)
        }
    },
    template: '<div>{{ formattedPrice }}</div>'
}

export default {
    name: 'TeamBilling',
    components: {
        Loading,
        FormHeading,
        ExternalLinkIcon,
        EmptyState
    },
    mixins: [formatDateMixin, formatCurrency, permissionsMixin],
    props: {
        team: {
            type: Object,
            required: true
        },
        teamMembership: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            loading: false,
            subscription: null,
            missingSubscription: false,
            columns: [{
                name: 'label',
                key: 'name',
                sortable: true
            }, {
                label: 'Quantity',
                key: 'quantity',
                sortable: true
            }, {
                label: 'Unit Price (US$)',
                key: 'price',
                sortable: true,
                component: {
                    is: markRaw(priceCell)
                }
            }, {
                label: 'Total Price (US$)',
                key: 'total_price',
                sortable: true,
                component: {
                    is: markRaw(totalPriceCell)
                }
            }],
            errors: {}
        }
    },
    computed: {
        billingSetUp () {
            return !this.missingSubscription && this.team.billing?.active
        },
        subscriptionExpired () {
            return this.team.billing?.canceled
        },
        isUnmanaged () {
            return this.team.billing?.unmanaged
        },
        trialMode () {
            return this.team.billing?.trial
        },
        trialHasEnded () {
            return this.team.billing?.trialEnded
        },
        isRestrictedTrial () {
            return !!this.team.type?.properties?.trial?.instanceType
        },
        hasTrialProject () {
            // Infer that if they cannot create a trial project, they must already have one.
            return this.trialMode && // !this.team.billing.trialProjectAllowed
                this.isRestrictedTrial &&
                this.team.instanceCountByType[this.team.type?.properties?.trial?.instanceType] > 0
        },
        trialEndsIn () {
            if (this.team.billing?.trialEndsAt) {
                const trialEndDate = new Date(this.team.billing.trialEndsAt)
                const daysLeft = Math.ceil((trialEndDate.getTime() - Date.now()) / 86400000)
                return daysLeft + ' day' + (daysLeft !== 1 ? 's' : '')
            }
            return ''
        }
    },
    watch: { },
    async mounted () {
        if (!this.billingSetUp && !this.isUnmanaged) {
            return
        }
        if (!this.hasPermission('team:edit')) {
            return this.$router.push({ path: `/team/${this.team.slug}/overview` })
        }
        this.loading = true
        try {
            const billingSubscription = await billingApi.getSubscriptionInfo(this.team.id)
            billingSubscription.next_billing_date = billingSubscription.next_billing_date * 1000 // API returns Seconds, JS expects miliseconds
            this.subscription = billingSubscription
            this.subscription.items.map((item) => {
                item.total_price = item.price * item.quantity
                return item
            })
            if (this.trialMode) {
                if (this.hasTrialProject) {
                    this.subscription.items.push({
                        name: 'Trial Project',
                        quantity: 1,
                        price: 0,
                        total_price: 0
                    })
                }
            }
        } catch (err) {
            // Missing subscription
            this.missingSubscription = true
        }
        this.loading = false
    },
    methods: {
        customerPortal () {
            billingApi.toCustomerPortal(this.team.id)
        },
        async setupBilling () {
            let billingUrl = this.$route.query.billingUrl
            if (!billingUrl) {
                const response = await billingApi.createSubscription(this.team.id)
                billingUrl = response.billingURL
            }
            window.open(billingUrl, '_self')
        }
    }
}
</script>
