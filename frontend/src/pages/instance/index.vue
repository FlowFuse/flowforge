<template>
    <ff-loading v-if="loading.deleting" message="Deleting Instance..." />
    <main v-else-if="!instance?.id">
        <ff-loading message="Loading Instance..." />
    </main>
    <ff-page v-else>
        <template #header>
            <ff-page-header :title="instance.name" :tabs="navigation">
                <template #breadcrumbs>
                    <ff-nav-breadcrumb :to="{name: 'Instances', params: {team_slug: team.slug}}">Instances</ff-nav-breadcrumb>
                </template>
                <template #status>
                    <InstanceStatusBadge :status="instance.meta?.state" :optimisticStateChange="instance.optimisticStateChange" :pendingStateChange="instance.pendingStateChange" />
                    <router-link v-if="instance.ha?.replicas !== undefined" :to="{name: 'instance-settings-ha', params: { id: instance.id }}" @click.stop>
                        <StatusBadge class="ml-2 text-gray-400 hover:text-blue-600" status="high-availability" />
                    </router-link>
                    <router-link v-if="instance.protected?.enabled" :to="{ name: 'instance-settings-protect'}" @click.stop>
                        <StatusBadge class="ml-2 text-gray-400 hover:text-blue-600" data-el="protected-pill" status="protected" text="Protected" />
                    </router-link>
                </template>
                <template #context>
                    Application:
                    <ff-team-link :to="{name: 'Application', params: {id: instance.application.id}}" class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">
                        {{ instance.application.name }}
                    </ff-team-link>
                </template>
                <template #tools>
                    <div class="space-x-2 flex align-center">
                        <DashboardLink
                            v-if="hasDashboard2"
                            :instance="instance"
                            :disabled="!editorAvailable"
                        />
                        <InstanceEditorLink
                            :editorDisabled="instance.settings.disableEditor || isHA"
                            :disabled="!editorAvailable"
                            :disabled-reason="disabledReason"
                            :instance="instance"
                        />
                        <InstanceActionsButton :instance="instance" @instance-deleted="onInstanceDelete" />
                    </div>
                </template>
            </ff-page-header>
        </template>
        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" :instance="instance" @confirm="onInstanceDelete" />
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-project-as-admin">You are viewing this instance as an Administrator</div>
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <div>
            <router-view
                :instance="instance"
                :is-visiting-admin="isVisitingAdmin"
                @instance-updated="loadInstance"
                @instance-confirm-delete="showConfirmDeleteDialog"
                @instance-confirm-suspend="showConfirmSuspendDialog"
            />
        </div>

        <InstanceStatusPolling :instance="instance" @instance-updated="instanceUpdated" />
    </ff-page>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import InstanceStatusPolling from '../../components/InstanceStatusPolling.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'
import InstanceActionsButton from '../../components/instance/ActionButton.vue'

import featuresMixin from '../../mixins/Features.js'
import instanceMixin from '../../mixins/Instance.js'
import permissionsMixin from '../../mixins/Permissions.js'
import { Roles } from '../../utils/roles.js'

import ConfirmInstanceDeleteDialog from './Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import DashboardLink from './components/DashboardLink.vue'
import InstanceEditorLink from './components/EditorLink.vue'
import InstanceStatusBadge from './components/InstanceStatusBadge.vue'
export default {
    name: 'InstancePage',
    components: {
        ConfirmInstanceDeleteDialog,
        InstanceActionsButton,
        DashboardLink,
        InstanceStatusPolling,
        InstanceStatusBadge,
        StatusBadge,
        SubscriptionExpiredBanner,
        TeamTrialBanner,
        InstanceEditorLink
    },
    mixins: [permissionsMixin, instanceMixin, featuresMixin],
    data: function () {
        return {
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            }
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team']),
        navigation () {
            if (!this.instance.id) return []

            return [
                { label: 'Overview', to: { name: 'instance-overview', params: { id: this.instance.id, team_slug: this.team.slug } }, tag: 'instance-overview' },
                { label: 'Devices', to: { name: 'instance-devices', params: { id: this.instance.id, team_slug: this.team.slug } }, tag: 'instance-remote' },
                { label: 'Version History', to: { name: 'instance-version-history', params: { id: this.instance.id, team_slug: this.team.slug } }, tag: 'instance-version-history' },
                { label: 'Assets', to: { name: 'instance-assets', params: { id: this.instance.id, team_slug: this.team.slug } }, tag: 'instance-assets', hidden: !this.hasAMinimumTeamRoleOf(Roles.Member) },
                { label: 'Audit Log', to: { name: 'instance-audit-log', params: { id: this.instance.id, team_slug: this.team.slug } }, tag: 'instance-activity' },
                { label: 'Node-RED Logs', to: { name: 'instance-logs', params: { id: this.instance.id, team_slug: this.team.slug } }, tag: 'instance-logs' },
                { label: 'Settings', to: { name: 'instance-settings', params: { id: this.instance.id, team_slug: this.team.slug } }, tag: 'instance-settings' }
            ]
        },
        isLoading: function () {
            return this.loading.deleting || this.loading.suspend
        },
        editorAvailable () {
            return !this.isHA && this.instanceRunning
        },
        hasDashboard2 () {
            return !!this.instance?.settings?.dashboard2UI
        },
        disabledReason () {
            if (this.isHA) {
                return 'Cannot access the editor on a HA Instance'
            } else if (this.instance.settings.disableEditor) {
                return 'Access to the editor has been disabled in Settings > Editor'
            } else if (!this.instanceRunning) {
                return 'Instance is not running'
            }
            return null
        }
    },
    mounted () {
        this.mounted = true
    }
}
</script>
