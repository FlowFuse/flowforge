<template>
    <div>
        <template v-if="pendingTeamChange">
            <Loading />
        </template>
        <div v-else-if="canAccessTeam && team">
            <Teleport v-if="mounted && !isEmbeddedEditor" to="#platform-banner">
                <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-team-as-admin">You are viewing this team as an Administrator</div>
                <TeamSuspendedBanner v-if="team.suspended" :team="team" />
                <SubscriptionExpiredBanner v-else :team="team" />
                <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
            </Teleport>
            <router-view />
        </div>
        <div v-else-if="!canAccessTeam">
            <TeamInstances :dashboard-role-only="true" />
        </div>
    </div>
</template>

<script>
import { useRoute } from 'vue-router'
import { mapGetters, mapState } from 'vuex'

import Loading from '../../components/Loading.vue'
import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamSuspendedBanner from '../../components/banners/TeamSuspended.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'
import { Roles } from '../../utils/roles.js'

import TeamInstances from './Instances.vue'

export default {
    name: 'TeamPage',
    components: {
        TeamInstances,
        Loading,
        SubscriptionExpiredBanner,
        TeamSuspendedBanner,
        TeamTrialBanner
    },
    async beforeRouteUpdate (to, from, next) {
        await this.$store.dispatch('account/setTeam', to.params.team_slug)
        // even if billing is not yet enabled, users should be able to see these screens,
        // in order to delete the project, or setup billing
        await this.checkRoute(to)
        next()
    },
    data () {
        return {
            mounted: false
        }
    },
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership', 'pendingTeamChange', 'features']),
        ...mapGetters('account', ['noBilling', 'isAdminUser']),
        isVisitingAdmin: function () {
            return (this.teamMembership.role === Roles.Admin)
        },
        isTrialEnded: function () {
            if (this.team.billing?.trialEndsAt) {
                const trialEndDate = new Date(this.team.billing?.trialEndsAt)
                return trialEndDate < Date.now()
            }
            return true
        },
        canAccessTeam: function () {
            return this.isAdminUser || this.teamMembership?.role >= Roles.Viewer
        },
        isEmbeddedEditor () {
            return !!this.$route.matched.filter(m => m.name === 'instance-editor')
        }
    },
    mounted () {
        this.mounted = true
    },
    async beforeMount () {
        await this.$store.dispatch('account/setTeam', useRoute().params.team_slug)
        this.checkRoute(this.$route)
    },
    methods: {
        checkRoute: async function (route) {
            const allowedRoutes = [
                '/team/' + this.team.slug + '/billing',
                '/team/' + this.team.slug + '/settings',
                '/team/' + this.team.slug + '/settings/general',
                '/team/' + this.team.slug + '/settings/danger',
                '/team/' + this.team.slug + '/settings/change-type'
            ]
            if (allowedRoutes.indexOf(route.path) === -1) {
                // if we're on a path that requires billing
                await this.checkBilling()
            }
        },
        checkBilling: async function () {
            // Team Billing
            if (this.noBilling) {
                this.$router.push({
                    path: `/team/${this.team.slug}/billing`
                })
            }
        }
    }
}
</script>
