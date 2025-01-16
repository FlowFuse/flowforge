<template>
    <main v-if="device" class="ff-with-status-header">
        <Teleport v-if="mounted" to="#platform-banner">
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <div class="ff-instance-header">
            <SectionNavigationHeader :tabs="navigation">
                <template #breadcrumbs>
                    <ff-nav-breadcrumb :to="{name: 'TeamDevices', params: {team_slug: team.slug}}">Remote Instances</ff-nav-breadcrumb>
                    <ff-nav-breadcrumb>{{ device.name }}</ff-nav-breadcrumb>
                </template>
                <template #status>
                    <div class="flex flex-wrap gap-2">
                        <DeviceLastSeenBadge :last-seen-at="device.lastSeenAt" :last-seen-ms="device.lastSeenMs" :last-seen-since="device.lastSeenSince" />
                        <StatusBadge :status="device.status" />
                        <DeviceModeBadge v-if="isDevModeAvailable " :mode="device.mode" />
                    </div>
                </template>
                <template #context>
                    <div v-if="device?.ownerType === 'application' && device.application" data-el="device-assigned-application">
                        Application:
                        <ff-team-link :to="{name: 'Application', params: {id: device.application?.id}}" class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">{{ device.application?.name }}</ff-team-link>
                    </div>
                    <div v-else-if="device?.ownerType === 'instance' && device.instance" data-el="device-assigned-instance">
                        Instance:
                        <ff-team-link :to="{name: 'Instance', params: {id: device.instance.id}}" class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">{{ device.instance.name }}</ff-team-link>
                    </div>
                    <div v-else data-el="device-assigned-none">
                        <span class="italic">No Application or Instance Assigned</span> - <a class="ff-link" data-action="assign-device" @click="openAssignmentDialog">Assign</a>
                    </div>
                </template>
                <template v-if="isDevModeAvailable" #tools>
                    <!--
                        div style 34px is a workaround to prevent the Device Editor button growing taller than adjacent
                        button (size difference is caused by odd padding in the toggle button, which though not visible
                        is still there and affects the button height in this div group)
                    -->
                    <div class="space-x-2 flex align-center" style="height: 34px;">
                        <DeveloperModeToggle data-el="device-devmode-toggle" :device="device" :disabled="disableModeToggle" :disabledReason="disableModeToggleReason" @mode-change="setDeviceMode" />
                        <button v-if="!isVisitingAdmin" v-ff-tooltip:left="!editorAvailable ? 'You can edit flows directly when Developer Mode is enabled, and your Edge Instance is connected.' : 'Open Edge Instance Editor'" data-action="open-editor" class="ff-btn transition-fade--color ff-btn--secondary ff-btn-icon h-9" :disabled="!editorAvailable" @click="openTunnel(true)">
                            Open Editor
                            <span class="ff-btn--icon ff-btn--icon-right">
                                <ExternalLinkIcon />
                            </span>
                        </button>
                        <DropdownMenu v-if="hasPermission('device:change-status')" data-el="device-actions-dropdown" buttonClass="ff-btn ff-btn--primary" :options="actionsDropdownOptions">Actions</DropdownMenu>
                    </div>
                </template>
            </SectionNavigationHeader>
        </div>
        <div class="mt-4 sm:mt-8">
            <Teleport v-if="mounted && isVisitingAdmin" to="#platform-banner">
                <div class="ff-banner" data-el="banner-device-as-admin">You are viewing this device as an Administrator</div>
            </Teleport>
            <div class="px-3 pb-3 md:px-6 md:pb-6">
                <router-view :instance="device.instance" :closingTunnel="closingTunnel" :openingTunnel="openingTunnel" :device="device" @device-updated="loadDevice" @close-tunnel="closeTunnel" @open-tunnel="openTunnel" @device-refresh="deviceRefresh" @assign-device="openAssignmentDialog" />
            </div>
        </div>
        <!-- Dialogs -->
        <!-- device tunnel connecting -->
        <ff-dialog ref="dialog" data-el="establish-device-tunnel-dialog" header="Preparing the connection...">
            <template #default>
                <div class="flex flex-col ml-6 mr-6">
                    <div class="mb-4">
                        <p>Connecting to the device</p>
                    </div>
                    <div class="flex justify-between items-center">
                        <div class="flex text-center">
                            <img class="h-16 w-16" src="../../images/pictograms/cloud_teal.png">
                        </div>
                        <div class="flex-grow m-4">
                            <div class="w-full">
                                <div class="h-1 w-full bg-teal-200 overflow-hidden">
                                    <div kind="secondary" class="progress w-full h-full bg-teal-800 left-right" />
                                </div>
                            </div>
                        </div>
                        <div class="flex text-center">
                            <img class="h-16 w-16" src="../../images/pictograms/devices_red.png">
                        </div>
                    </div>
                </div>
            </template>
            <template #actions>
                <ff-button data-action="tunnel-connect-cancel" kind="secondary" class="ml-4" @click="closeTunnel()">Cancel</ff-button>
            </template>
        </ff-dialog>
        <AssignDeviceDialog
            v-if="notAssigned"
            ref="assignment-dialog"
            data-el="assignment-dialog"
            @assign-option-selected="assignOptionSelected"
        />
        <DeviceAssignInstanceDialog
            v-if="notAssigned"
            ref="deviceAssignInstanceDialog"
            data-el="assignment-dialog-instance"
            @assign-device="assignDeviceToInstance"
        />
        <DeviceAssignApplicationDialog
            v-if="notAssigned"
            ref="deviceAssignApplicationDialog"
            data-el="assignment-dialog-application"
            @assign-device="assignDeviceToApplication"
        />
    </main>
</template>

<script>

import { ExternalLinkIcon } from '@heroicons/vue/outline'
import { TerminalIcon } from '@heroicons/vue/solid'
import semver from 'semver'
import { mapState } from 'vuex'

import deviceApi from '../../api/devices.js'
import DropdownMenu from '../../components/DropdownMenu.vue'
import SectionNavigationHeader from '../../components/SectionNavigationHeader.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'
import permissionsMixin from '../../mixins/Permissions.js'
import Alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
import { DeviceStateMutator } from '../../utils/DeviceStateMutator.js'
import { Roles } from '../../utils/roles.js'

import { createPollTimer } from '../../utils/timers.js'
import DeviceAssignApplicationDialog from '../team/Devices/dialogs/DeviceAssignApplicationDialog.vue'
import DeviceAssignInstanceDialog from '../team/Devices/dialogs/DeviceAssignInstanceDialog.vue'

import AssignDeviceDialog from './components/AssignDeviceDialog.vue'

import DeveloperModeToggle from './components/DeveloperModeToggle.vue'
import DeviceLastSeenBadge from './components/DeviceLastSeenBadge.vue'
import DeviceModeBadge from './components/DeviceModeBadge.vue'

// constants
const POLL_TIME = 5000

const deviceTransitionStates = [
    'loading',
    'installing',
    'starting',
    'stopping',
    'restarting',
    'suspending',
    'importing'
]

export default {
    name: 'DevicePage',
    components: {
        ExternalLinkIcon,
        DeveloperModeToggle,
        DeviceModeBadge,
        DeviceLastSeenBadge,
        DropdownMenu,
        SectionNavigationHeader,
        StatusBadge,
        SubscriptionExpiredBanner,
        TeamTrialBanner,
        AssignDeviceDialog,
        DeviceAssignApplicationDialog,
        DeviceAssignInstanceDialog
    },
    mixins: [permissionsMixin],
    data: function () {
        return {
            mounted: false,
            device: null,
            agentSupportsDeviceAccess: false,
            agentSupportsActions: false,
            openingTunnel: false,
            closingTunnel: false,
            /** @type {import('../../utils/timers.js').PollTimer} */
            pollTimer: null,
            /** @type {DeviceStateMutator} */
            deviceStateMutator: null
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team', 'features', 'settings']),
        isVisitingAdmin: function () {
            return this.teamMembership.role === Roles.Admin
        },
        isMember: function () {
            return this.teamMembership.role === Roles.Member || this.teamMembership.role === Roles.Owner
        },
        isDevModeAvailable: function () {
            return !!this.features.deviceEditor
        },
        developerMode: function () {
            return this.device && this.agentSupportsDeviceAccess && this.device.mode === 'developer'
        },
        deviceRunning () {
            return this.device?.status === 'running'
        },
        disableModeToggle: function () {
            return !this.isDevModeAvailable ||
                !this.device ||
                !this.agentSupportsDeviceAccess ||
                !this.isMember
        },
        disableModeToggleReason: function () {
            if (!this.device) {
                return 'No Device selected'
            }
            if (!this.agentSupportsDeviceAccess) {
                return 'Device Agent V0.8 or greater is required'
            }
            if (!this.isMember) {
                return 'Only an Owner or Member can change the Device Mode'
            }
            return undefined
        },
        editorAvailable: function () {
            return this.isDevModeAvailable &&
                this.device &&
                this.agentSupportsDeviceAccess &&
                this.developerMode &&
                this.device.status === 'running'
        },
        deviceEditorURL: function () {
            return this.device.editor?.url || ''
        },
        notAssigned () {
            const device = this.device
            const hasApplication = device?.ownerType === 'application' && device.application
            const hasInstance = device?.ownerType === 'instance' && device.instance
            return !hasApplication && !hasInstance
        },
        navigation () {
            const navigation = [
                { label: 'Overview', to: `/device/${this.$route.params.id}/overview`, tag: 'device-overview' }
            ]

            // snapshots - if device is owned by an application,
            if (this.device?.ownerType !== 'instance') {
                navigation.push({
                    label: 'Snapshots',
                    to: `/device/${this.$route.params.id}/snapshots`,
                    tag: 'device-snapshots'
                })
            }

            navigation.push(
                { label: 'Audit Log', to: `/device/${this.$route.params.id}/audit-log`, tag: 'device-audit-log' }
            )

            // device logs - if project comms is enabled,
            if (this.features.projectComms) {
                navigation.push({
                    label: 'Node-RED Logs',
                    to: `/device/${this.$route.params.id}/logs`,
                    tag: 'device-logs',
                    icon: TerminalIcon
                })
            }

            // settings - always
            navigation.push({ label: 'Settings', to: `/device/${this.$route.params.id}/settings`, tag: 'device-settings' })

            // developer mode - if available and device is in developer mode
            if (this.isDevModeAvailable && this.device.mode === 'developer') {
                navigation.push({
                    label: 'Developer Mode',
                    to: `/device/${this.$route.params.id}/developer-mode`,
                    tag: 'device-devmode'
                })
            }

            return navigation
        },
        actionsDropdownOptions () {
            const flowActionsDisabled = !(this.device.status !== 'suspended')

            const deviceStateChanging = this.device.pendingStateChange || this.device.optimisticStateChange

            const result = [
                // Start and Suspend are disabled until resolution of the feature is complete
                // See comments in #3292
                // {
                //     name: 'Start',
                //     action: this.startDevice,
                //     disabled: deviceStateChanging || this.deviceRunning
                // },
                { name: 'Restart', action: this.restartDevice, disabled: deviceStateChanging || flowActionsDisabled }
                // { name: 'Suspend', class: ['text-red-700'], action: this.showConfirmSuspendDialog, disabled: deviceStateChanging || flowActionsDisabled }
            ]

            if (this.hasPermission('device:delete')) {
                result.push(null)
                result.push({ name: 'Delete', class: ['text-red-700'], action: this.showConfirmDeleteDialog })
            }

            return result
        }
    },
    watch: {
        device: 'deviceChanged'
    },
    async mounted () {
        this.mounted = true
        await this.loadDevice()
        this.pollTimer = createPollTimer(this.pollTimerElapsed, POLL_TIME)
    },
    unmounted () {
        this.pollTimer?.stop()
        clearTimeout(this.openTunnelTimeout)
    },
    methods: {
        pollTimerElapsed: async function () {
            // Only refresh device via the timer if we are on the overview page, developer mode page
            // the device status is empty or the device is in a transition state
            // This is to prevent settings pages from refreshing the device state while modifying settings
            // See `watch: { device: { handler () ...  in pages/device/Settings/General.vue for why that happens
            const settingsPages = ['DeviceOverview', 'DeviceDeveloperMode']
            try {
                if (settingsPages.includes(this.$route.name)) {
                    await this.loadDevice()
                } else if (typeof this.device?.status === 'undefined') {
                    await this.loadDevice()
                } else if (deviceTransitionStates.includes(this.device?.status)) {
                    await this.loadDevice()
                }
            } catch (err) {
                if (err.response.status === 404) {
                    this.pollTimer?.stop()
                }
            }
        },
        loadDevice: async function () {
            this.device = await deviceApi.getDevice(this.$route.params.id)
            if (this.deviceStateMutator) {
                this.deviceStateMutator.clearState()
            }
            this.agentSupportsDeviceAccess = this.device.agentVersion && semver.gte(this.device.agentVersion, '0.8.0')
            this.agentSupportsActions = this.device.agentVersion && semver.gte(this.device.agentVersion, '2.3.0')
            this.$store.dispatch('account/setTeam', this.device.team.slug)
        },
        deviceRefresh: async function () {
            if (this.pollTimer.running) {
                // If the poll timer is running, we don't need to manually refresh the device
                return
            }
            this.loadDevice()
        },
        showOpenEditorDialog: async function () {
            this.$refs['open-editor-dialog'].show()
        },
        setDeviceMode: async function (newMode, callback) {
            try {
                if (newMode !== 'autonomous' && newMode !== 'developer') {
                    throw new Error('Unsupported mode')
                }
                // call to close tunnel regardless of selected mode being set
                const disableResult = await deviceApi.disableEditorTunnel(this.device.id)
                // set the selected mode
                const setModeResult = await deviceApi.setMode(this.device.id, newMode)
                // update the device properties to reflect immediate status
                this.device.editor = {
                    enabled: !!disableResult?.editor?.enabled,
                    connected: !!disableResult?.editor?.connected,
                    url: disableResult?.editor?.url
                }
                this.device.mode = setModeResult?.mode
                callback(null, setModeResult)
            } catch (error) {
                if (callback) {
                    callback(error)
                } else {
                    throw new Error('Unknown mode')
                }
            }
        },
        openAssignmentDialog () {
            this.$refs['assignment-dialog'].show()
        },
        assignOptionSelected (option) {
            if (option === 'instance') {
                this.$refs.deviceAssignInstanceDialog.show(this.device)
            } else if (option === 'application') {
                this.$refs.deviceAssignApplicationDialog.show(this.device)
            }
        },
        async assignDeviceToInstance (device, instanceId) {
            this.device = await deviceApi.updateDevice(device.id, { instance: instanceId })

            Alerts.emit('Device successfully assigned to instance.', 'confirmation')
        },

        async assignDeviceToApplication (device, applicationId) {
            this.device = await deviceApi.updateDevice(device.id, { application: applicationId, instance: null })

            Alerts.emit('Device successfully assigned to application.', 'confirmation')
        },
        openEditor () {
            window.open(this.deviceEditorURL, `device-editor-${this.device.id}`)
        },
        async openTunnel (launchEditor = false) {
            try {
                if (this.deviceRunning) {
                    if (this.device.editor?.enabled && this.device.editor?.connected && this.device.editor?.local) {
                        this.openEditor()
                    } else {
                        this.openingTunnel = true
                        this.$refs.dialog.show()

                        // Polls the tunnel status until we see it connected to the
                        // 'local' platform instance - will give up after 10 attempts
                        const pollTunnelStatus = (done, attempt = 0, timeout = 500) => {
                            if (attempt < 10) {
                                this.openTunnelTimeout = setTimeout(async () => {
                                    await this.loadDevice()
                                    if (this.device.editor?.enabled && this.device.editor?.connected) {
                                        if (this.device.editor?.local) {
                                            if (launchEditor) {
                                                this.openEditor()
                                            }
                                        } else {
                                            pollTunnelStatus(done, attempt + 1, 200)
                                            return
                                        }
                                    }
                                    done()
                                }, timeout)
                            }
                        }

                        try {
                            if (!this.device.editor?.enabled || !this.device.editor?.connected) {
                                // * Enable Device Editor (Step 1) - (browser->frontendApi) User clicks button to "Enable Editor"
                                const result = await deviceApi.enableEditorTunnel(this.device.id)
                                this.updateTunnelStatus(result)
                            }
                            pollTunnelStatus(() => {
                                this.$refs.dialog.close()
                                this.openingTunnel = false
                            })
                        } catch (err) {
                            this.$refs.dialog.close()
                            this.openingTunnel = false
                        }
                    }
                } else {
                    Alerts.emit('Unable to establish a connection to the device. Please check it is connected and running then try again', 'warning', 7500)
                }
            } catch (err) {
                console.warn('Error in openTunnel', err)
            }
        },
        async closeTunnel () {
            this.closingTunnel = true
            this.$refs.dialog.close()
            clearTimeout(this.openTunnelTimeout)
            try {
                const result = await deviceApi.disableEditorTunnel(this.device.id)
                this.updateTunnelStatus(result)
                this.loadDevice(this.loadDevice())
            } finally {
                this.closingTunnel = false
            }
        },
        updateTunnelStatus (status) {
            this.device.editor = this.device.editor || {}
            this.device.editor.url = status.url
            this.device.editor.enabled = !!status.enabled
            this.device.editor.connected = !!status.connected
        },
        deviceChanged () {
            this.deviceStateMutator = new DeviceStateMutator(this.device)
        },
        showConfirmDeleteDialog () {
            Dialog.show({
                header: 'Delete Device',
                kind: 'danger',
                text: 'Are you sure you want to delete this device? Once deleted, there is no going back.',
                confirmLabel: 'Delete'
            }, async () => {
                try {
                    await deviceApi.deleteDevice(this.device.id)
                    Alerts.emit('Successfully deleted the device', 'confirmation')
                    // Trigger a refresh of team info to resync following device changes
                    await this.$store.dispatch('account/refreshTeam')
                    this.$router.push({ name: 'TeamDevices', params: { team_slug: this.team.slug } })
                } catch (err) {
                    Alerts.emit('Failed to delete device: ' + err.toString(), 'warning', 7500)
                }
            })
        },
        /**
         * Checks agent version and shows warning if known old version is present. Returns true if the action can proceed
         * @param {string} [message] - optional message to show in confirmation dialog. If omitted, no confirmation is shown
         */
        preActionChecks (message) {
            if (this.device.agentVersion && !this.agentSupportsActions) {
                // if agent version is present but is less than required version, show warning and halt
                Alerts.emit('Device Agent V2.3 or greater is required to perform this action.', 'warning')
                return false
            }
            if (!message) {
                // no message means silent operation, no need to show confirmation
                return true
            }
            if (!this.device.agentVersion) {
                // if agent version is missing, be optimistic and give it a go, but show warning
                Alerts.emit(`${message}.  NOTE: The device agent version is not known, the action may timeout`, 'warning')
            } else {
                Alerts.emit(message, 'confirmation')
            }
            return true
        },
        async startDevice () {
            const preCheckOk = this.preActionChecks('Starting device...')
            if (!preCheckOk) {
                return
            }
            this.deviceStateMutator.setStateOptimistically('starting')
            try {
                await deviceApi.startDevice(this.device)
                this.deviceStateMutator.setStateAsPendingFromServer()
            } catch (err) {
                let message = 'Device start request failed.'
                if (err.response?.data?.error) {
                    message = err.response.data.error
                }
                console.warn(message, err)
                Alerts.emit(message, 'warning')
                this.deviceStateMutator.restoreState()
            }
        },
        async restartDevice () {
            const preCheckOk = this.preActionChecks('Restarting device...')
            if (!preCheckOk) {
                return
            }
            this.deviceStateMutator.setStateOptimistically('restarting')
            try {
                await deviceApi.restartDevice(this.device)
                this.deviceStateMutator.setStateAsPendingFromServer()
            } catch (err) {
                let message = 'Device restart request failed.'
                if (err.response?.data?.error) {
                    message = err.response.data.error
                }
                console.warn(message, err)
                Alerts.emit(message, 'warning')
            }
        },
        showConfirmSuspendDialog () {
            const preCheckOk = this.preActionChecks() // silent check
            if (!preCheckOk) {
                return
            }
            Dialog.show({
                header: 'Suspend Device',
                text: 'Are you sure you want to suspend this device?',
                confirmLabel: 'Suspend',
                kind: 'danger'
            }, () => {
                this.deviceStateMutator.setStateOptimistically('suspending')
                deviceApi.suspendDevice(this.device).then(() => {
                    this.deviceStateMutator.setStateAsPendingFromServer()
                    Alerts.emit('Device suspend request succeeded.', 'confirmation')
                }).catch(err => {
                    let message = 'Device suspend request failed.'
                    if (err.response?.data?.error) {
                        message = err.response.data.error
                    }
                    console.warn(message, err)
                    Alerts.emit(message, 'warning')
                })
            })
        }
    }
}
</script>

<style scoped>
.progress {
    animation: progress 1s infinite linear;
}

.left-right {
    transform-origin: 0% 50%;
}
    @keyframes progress {
    0% {
        transform:  translateX(0) scaleX(0);
    }
    40% {
        transform:  translateX(0) scaleX(0.4);
    }
    100% {
        transform:  translateX(100%) scaleX(0.5);
    }
}
</style>
