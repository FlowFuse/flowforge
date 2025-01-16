<template>
    <!-- set mb-14 (~56px) on the form to permit access to kebab actions where hubspot chat covers it -->
    <div
        class="space-y-2 mb-14"
        data-el="devices-section"
    >
        <ff-loading
            v-if="loadingStatuses || loadingDevices"
            message="Loading Remote Instances..."
        />
        <template v-else-if="team">
            <FeatureUnavailableToTeam v-if="teamDeviceLimitReached" fullMessage="You have reached the limit for Remote Instances in this team." :class="{'mt-0': displayingTeam }" />
            <FeatureUnavailableToTeam v-if="teamRuntimeLimitReached" fullMessage="You have reached the limit for Instances in this team." :class="{'mt-0': displayingTeam }" />
            <DevicesStatusBar v-if="allDeviceStatuses.size > 0" data-el="devicestatus-lastseen" label="Last Seen" :devices="Array.from(allDeviceStatuses.values())" property="lastseen" :filter="filter" @filter-selected="applyFilter" />
            <DevicesStatusBar v-if="allDeviceStatuses.size > 0" data-el="devicestatus-status" label="Last Known Status" :devices="Array.from(allDeviceStatuses.values())" property="status" :filter="filter" @filter-selected="applyFilter" />
            <ff-data-table
                v-if="allDeviceStatuses.size > 0"
                data-el="devices-browser"
                :columns="columns"
                :rows="devicesWithStatuses"
                :show-search="true"
                search-placeholder="Search Remote Instances"
                :show-load-more="moreThanOnePage"
                :check-key="row => row.id"
                :show-row-checkboxes="true"
                @rows-checked="checkedDevices = $event"
                @load-more="loadMoreDevices"
                @update:search="updateSearch"
                @update:sort="updateSort"
            >
                <template #actions>
                    <DropdownMenu v-if="hasPermission('team:device:bulk-delete') || hasPermission('team:device:bulk-edit')" :disabled="!checkedDevices?.length" data-el="bulk-actions-dropdown" buttonClass="ff-btn ff-btn--secondary" :options="bulkActionsDropdownOptions">Actions</DropdownMenu>
                    <ff-button
                        v-if="displayingInstance && hasPermission('project:snapshot:create')"
                        data-action="change-target-snapshot"
                        kind="secondary"
                        @click="showSelectTargetSnapshotDialog"
                    >
                        <template #icon-left>
                            <ClockIcon />
                        </template>
                        <span class="font-normal">
                            Target Snapshot: <b>{{ instance.targetSnapshot?.name || 'none' }}</b>
                        </span>
                    </ff-button>
                    <ff-button
                        v-if="hasPermission('device:create')"
                        class="font-normal"
                        data-action="register-device"
                        kind="primary"
                        :disabled="teamDeviceLimitReached || teamRuntimeLimitReached"
                        @click="showCreateDeviceDialog"
                    >
                        <template #icon-left>
                            <PlusSmIcon />
                        </template>
                        Add Remote Instance
                    </ff-button>
                </template>
                <template
                    v-if="hasPermission('device:edit')"
                    #context-menu="{row}"
                >
                    <ff-list-item
                        label="Edit Details"
                        @click="deviceAction('edit', row.id)"
                    />
                    <ff-list-item
                        v-if="!row.ownerType && displayingTeam"
                        label="Add to Application"
                        data-action="device-assign-to-application"
                        @click="deviceAction('assignToApplication', row.id)"
                    />
                    <ff-list-item
                        v-else-if="row.ownerType === 'application' && (displayingTeam || displayingApplication)"
                        label="Remove from Application"
                        data-action="device-remove-from-application"
                        @click="deviceAction('removeFromApplication', row.id)"
                    />
                    <ff-list-item
                        v-if="!row.ownerType && displayingTeam"
                        label="Add to Instance"
                        data-action="device-assign-to-instance"
                        @click="deviceAction('assignToProject', row.id)"
                    />
                    <ff-list-item
                        v-else-if="row.ownerType === 'instance' && (displayingTeam || displayingInstance)"
                        label="Remove from Instance"
                        data-action="device-remove-from-instance"
                        @click="deviceAction('removeFromProject', row.id)"
                    />
                    <ff-list-item
                        kind="danger"
                        label="Regenerate Configuration"
                        @click="deviceAction('updateCredentials', row.id)"
                    />
                    <ff-list-item
                        v-if="hasPermission('device:delete')"
                        kind="danger"
                        label="Delete Device"
                        @click="deviceAction('delete', row.id)"
                    />
                </template>
            </ff-data-table>
            <template v-else>
                <template v-if="displayingTeam">
                    <EmptyState data-el="team-no-devices">
                        <template #img>
                            <img src="../images/empty-states/team-devices.png">
                        </template>
                        <template #header>Connect your First Remote Instance</template>
                        <template #message>
                            <p>
                                FlowFuse allow you to manage Node-RED instances
                                running on remote hardware.
                            </p>
                            <p>
                                To manage your  <a
                                    class="ff-link" href="https://flowfuse.com/docs/user/devices"
                                    target="_blank"
                                >FlowFuse Device Agent</a>, and can be used to deploy and debug
                                instances anywhere, from here, in FlowFuse.
                            </p>
                        </template>
                        <template #actions>
                            <ff-button
                                v-if="hasPermission('device:create')"
                                class="font-normal"
                                kind="primary"
                                :disabled="teamDeviceLimitReached || teamRuntimeLimitReached"
                                data-action="register-device"
                                @click="showCreateDeviceDialog"
                            >
                                <template #icon-left>
                                    <PlusSmIcon />
                                </template>
                                Add Remote Instance
                            </ff-button>
                        </template>
                    </EmptyState>
                </template>
                <template v-else-if="displayingInstance">
                    <EmptyState data-el="instance-no-devices">
                        <template #img>
                            <img src="../images/empty-states/instance-devices.png">
                        </template>
                        <template #header>Connect your First Remote Instances</template>
                        <template #message>
                            <p>
                                Here, you will see a list of Remote Instances connected to this Hosted Instance.
                            </p>
                            <p>
                                You can deploy <router-link class="ff-link" :to="{name: 'instance-snapshots', params: {id: instance.id}}">Snapshots</router-link> of this Instance to your connected Devices.
                            </p>
                            <p>
                                A full list of your Team's Devices are available <ff-team-link
                                    class="ff-link"
                                    :to="{name: 'TeamDevices', params: {team_slug: team.slug}}"
                                >
                                    here
                                </ff-team-link>.
                            </p>
                        </template>
                        <template #actions>
                            <ff-button
                                v-if="hasPermission('device:create')"
                                class="font-normal"
                                kind="primary"
                                :disabled="teamDeviceLimitReached || teamRuntimeLimitReached"
                                data-action="register-device"
                                @click="showCreateDeviceDialog"
                            >
                                <template #icon-left>
                                    <PlusSmIcon />
                                </template>
                                Add Remote Instance
                            </ff-button>
                        </template>
                    </EmptyState>
                </template>
                <template v-else-if="displayingApplication">
                    <EmptyState data-el="application-no-devices">
                        <template #img>
                            <img src="../images/empty-states/instance-devices.png">
                        </template>
                        <template #header>Connect your First Remote Instance</template>
                        <template #message>
                            <p>
                                Here, you will see a list of Devices belonging to this Application.
                            </p>
                            <p>
                                You can deploy <router-link class="ff-link" :to="{name: 'ApplicationSnapshots'}">Snapshots</router-link> of this Application to your connected Devices.
                            </p>
                            <p>
                                A full list of your Team's Devices are available <ff-team-link
                                    class="ff-link"
                                    :to="{name: 'TeamDevices', params: {team_slug: team.slug}}"
                                >
                                    here
                                </ff-team-link>.
                            </p>
                        </template>
                        <template #actions>
                            <ff-button
                                v-if="hasPermission('device:create')"
                                class="font-normal"
                                kind="primary"
                                :disabled="teamDeviceLimitReached || teamRuntimeLimitReached"
                                data-action="register-device"
                                @click="showCreateDeviceDialog"
                            >
                                <template #icon-left>
                                    <PlusSmIcon />
                                </template>
                                Add Remote Instance
                            </ff-button>
                        </template>
                    </EmptyState>
                </template>
                <div v-else class="ff-no-data ff-no-data-large">
                    <span data-el="no-devices">
                        No Remote Instances found.
                    </span>
                </div>
            </template>
        </template>
    </div>

    <TeamDeviceCreateDialog
        v-if="team"
        ref="teamDeviceCreateDialog"
        :team="team"
        :teamDeviceCount="teamDeviceCount"
        @device-created="deviceCreated"
        @device-updated="deviceUpdated"
    >
        <template #description>
            <p>
                Remote Instances are managed using the <a href="https://flowfuse.com/docs/user/devices/" target="_blank">FlowFuse Device Agent</a>. The agent will need to be setup on the hardware where you want your Remote Instance to run.
            </p>
        </template>
    </TeamDeviceCreateDialog>

    <DeviceCredentialsDialog ref="deviceCredentialsDialog" />

    <SnapshotAssignDialog
        v-if="displayingInstance"
        ref="snapshotAssignDialog"
        :instance="instance"
        @snapshot-assigned="$emit('instance-updated')"
    />

    <DeviceAssignInstanceDialog
        ref="deviceAssignInstanceDialog"
        @assign-device="assignDevice"
        @move-devices="moveDevicesToInstance"
    />

    <DeviceAssignApplicationDialog
        ref="deviceAssignApplicationDialog"
        @assign-device="assignDeviceToApplication"
        @move-devices="moveDevicesToApplication"
    />

    <ff-dialog
        ref="teamBulkDeviceDeleteDialog"
        header="Confirm Device Delete"
        class="ff-dialog-fixed-height"
        confirm-label="Confirm"
        data-el="team-bulk-device-delete-dialog"
        kind="danger"
        @confirm="confirmBulkDelete()"
    >
        <template #default>
            <p>The following device{{ checkedDevices.length > 1 ? 's' : '' }} will be deleted:</p>
            <div class="max-h-96 overflow-y-auto">
                <ul class="ff-devices-ul">
                    <li v-for="device in checkedDevices" :key="device.id">
                        <span class="font-bold">{{ device.name }}</span> <span class="text-gray-500 text-sm"> ({{ device.id }})</span>
                    </li>
                </ul>
            </div>
            <p>This action cannot be undone.</p>
        </template>
    </ff-dialog>

    <ff-dialog
        ref="devicesMoveNoOwnerDialog"
        :header="displayingTeam ? `Unassign Device${checkedDevices.length > 1 ? 's' : ''}` : `Remove Device${checkedDevices.length > 1 ? 's' : ''} from ${displayingInstance ? 'Instance' : displayingApplication ? 'Application' : 'Assignment'}`"
        class="ff-dialog-fixed-height"
        :confirm-label="displayingTeam ?'Unassign' : 'Remove'"
        data-el="team-bulk-device-unassign-dialog"
        kind="danger"
        @confirm="moveDevicesToUnassigned(checkedDevices)"
    >
        <template #default>
            <p v-if="displayingInstance">The following devices will be removed from this Instance:</p>
            <p v-else-if="displayingApplication">The following devices will be removed from this Application:</p>
            <p v-else>The following devices will be removed from their current assignment:</p>
            <div class="max-h-96 overflow-y-auto">
                <ul class="ff-devices-ul">
                    <li v-for="device in checkedDevices" :key="device.id">
                        <span class="font-bold">{{ device.name }}</span> <span class="text-gray-500 text-sm"> ({{ device.id }})</span>
                    </li>
                </ul>
            </div>
            <p>This will stop the flows running on the device{{ checkedDevices.length > 1 ? 's' : '' }}.</p>
        </template>
    </ff-dialog>
</template>

<script>
import { ClockIcon } from '@heroicons/vue/outline'
import { PlusSmIcon } from '@heroicons/vue/solid'

import { markRaw } from 'vue'
import { mapState } from 'vuex'

import deviceApi from '../api/devices.js'
import teamApi from '../api/team.js'
import DropdownMenu from '../components/DropdownMenu.vue'
import deviceActionsMixin from '../mixins/DeviceActions.js'
import permissionsMixin from '../mixins/Permissions.js'

import DeviceAssignedToLink from '../pages/application/components/cells/DeviceAssignedToLink.vue'
import DeviceLink from '../pages/application/components/cells/DeviceLink.vue'
import Snapshot from '../pages/application/components/cells/Snapshot.vue'

import DeviceLastSeenBadge from '../pages/device/components/DeviceLastSeenBadge.vue'
import SnapshotAssignDialog from '../pages/instance/VersionHistory/Snapshots/dialogs/SnapshotAssignDialog.vue'
import InstanceStatusBadge from '../pages/instance/components/InstanceStatusBadge.vue'
import DeviceAssignApplicationDialog from '../pages/team/Devices/dialogs/DeviceAssignApplicationDialog.vue'
import DeviceAssignInstanceDialog from '../pages/team/Devices/dialogs/DeviceAssignInstanceDialog.vue'
import DeviceCredentialsDialog from '../pages/team/Devices/dialogs/DeviceCredentialsDialog.vue'
import TeamDeviceCreateDialog from '../pages/team/Devices/dialogs/TeamDeviceCreateDialog.vue'

import Alerts from '../services/alerts.js'

import { debounce } from '../utils/eventHandling.js'
import { createPollTimer } from '../utils/timers.js'

import EmptyState from './EmptyState.vue'
import FeatureUnavailableToTeam from './banners/FeatureUnavailableToTeam.vue'
import DevicesStatusBar from './charts/DeviceStatusBar.vue'

const POLL_TIME = 10000

export default {
    name: 'DevicesBrowser',
    components: {
        ClockIcon,
        DeviceAssignApplicationDialog,
        DeviceAssignInstanceDialog,
        DeviceCredentialsDialog,
        DropdownMenu,
        FeatureUnavailableToTeam,
        PlusSmIcon,
        SnapshotAssignDialog,
        TeamDeviceCreateDialog,
        EmptyState,
        DevicesStatusBar
    },
    mixins: [permissionsMixin, deviceActionsMixin],
    inheritAttrs: false,
    props: {
        // One of the two must be provided
        instance: {
            type: Object,
            required: false,
            default: null
        },
        application: {
            type: Object,
            required: false,
            default: null
        }
    },
    emits: ['instance-updated'],
    data () {
        return {
            // Page state
            loadingStatuses: true,
            loadingDevices: true,
            creatingDevice: false,
            deletingDevice: false,

            // Devices lists
            devices: new Map(), // devices currently available to be displayed

            checkedDevices: [], // devices currently selected in the table

            unsearchedHasMoreThanOnePage: true,
            unfilteredHasMoreThanOnePage: true,

            sort: {
                key: null,
                direction: 'desc'
            },
            /** @type { import('../utils/timers.js').PollTimer } */
            pollTimer: null
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        columns () {
            const columns = [
                { label: 'Remote Instance', key: 'name', sortable: !this.moreThanOnePage, component: { is: markRaw(DeviceLink) } },
                { label: 'Type', key: 'type', class: ['w-48'], sortable: !this.moreThanOnePage },
                { label: 'Last Seen', key: 'lastSeenAt', class: ['w-32'], sortable: !this.moreThanOnePage, component: { is: markRaw(DeviceLastSeenBadge) } },
                { label: 'Last Known Status', class: ['w-32'], component: { is: markRaw(InstanceStatusBadge) } }
            ]

            if (this.displayingTeam) {
                // Show which application/instance the device is assigned to when looking at devices owned by a team
                columns.push({
                    label: 'Assigned To',
                    class: ['w-48'],
                    key: '_ownerSortKey',
                    sortable: !this.moreThanOnePage,
                    component: {
                        is: markRaw(DeviceAssignedToLink)
                    }
                })
            } else if (this.displayingInstance) {
                // Show snapshot info when looking at devices owned by an instance
                columns.push(
                    { label: 'Deployed Snapshot', class: ['w-48'], component: { is: markRaw(Snapshot) } }
                )
            }

            return columns
        },
        filteredDevices () {
            const devicesToDisplay = new Set(this.filter?.devices)

            return Array.from(this.devices.values()).filter((device) => {
                if (!this.filter || this.unfilteredHasMoreThanOnePage) {
                    return true
                }

                return devicesToDisplay.has(device.id)
            })
        },
        devicesWithStatuses () {
            const output = this.filteredDevices.map(device => {
                const statusObject = this.allDeviceStatuses.get(device.id)
                const ownerKey = this.getOwnerSortKeyForDevice(device)

                return {
                    ...device,
                    ...statusObject,
                    ...(ownerKey ? { _ownerSortKey: ownerKey } : { _ownerSortKey: undefined })
                }
            })

            return output
        },
        hasLoadedModel () {
            return (
                (this.displayingInstance && !!this.instance?.id) ||
                (this.displayingApplication && !!this.application?.id) ||
                (this.displayingTeam && !!this.team?.id)
            )
        },
        moreThanOnePage () {
            return !!this.nextCursor
        },
        teamRuntimeLimitReached () {
            let teamTypeRuntimeLimit = this.team.type.properties?.runtimes?.limit
            // Uses this.teamDeviceCount as that tracks live updates made in the page
            // that may not have made it to this.team.deviceCount yet
            const currentRuntimeCount = this.teamDeviceCount + this.team.instanceCount
            if (this.team.billing?.trial && !this.team.billing?.active && this.team.type.properties?.trial?.runtimesLimit) {
                teamTypeRuntimeLimit = this.team.type.properties?.trial?.runtimesLimit
            }
            return (teamTypeRuntimeLimit > 0 && currentRuntimeCount >= teamTypeRuntimeLimit)
        },
        teamDeviceLimitReached () {
            const teamTypeDeviceLimit = this.team.type.properties?.devices?.limit
            if (teamTypeDeviceLimit > 0 && this.teamDeviceCount >= teamTypeDeviceLimit) {
                // Device specific limit has been reached
                return true
            }
            return false
        },
        bulkActionsDropdownOptions () {
            const actionsEnabled = this.checkedDevices?.length > 0
            const enableDelete = actionsEnabled && this.hasPermission('team:device:bulk-delete')
            const enableMove = actionsEnabled && this.hasPermission('team:device:bulk-edit')
            const showRemoveFromInstance = this.displayingInstance || this.displayingTeam
            const showRemoveFromApplication = this.displayingApplication || this.displayingTeam
            const menu = []
            menu.push({ name: 'Move to Instance', action: this.showTeamBulkDeviceMoveToInstanceDialog, disabled: !enableMove })
            menu.push({ name: 'Move to Application', action: this.showTeamBulkDeviceMoveToApplicationDialog, disabled: !enableMove })
            if (this.displayingInstance && showRemoveFromInstance) {
                menu.push({ name: 'Remove from Instance', action: this.showTeamBulkDeviceUnassignDialog, disabled: !enableMove })
            } else if (this.displayingApplication && showRemoveFromApplication) {
                menu.push({ name: 'Remove from Application', action: this.showTeamBulkDeviceUnassignDialog, disabled: !enableMove })
            } else if (this.displayingTeam && (showRemoveFromInstance || showRemoveFromApplication)) {
                menu.push({ name: 'Unassign', action: this.showTeamBulkDeviceUnassignDialog, disabled: !enableMove })
            }
            menu.push({ name: 'Delete', class: ['!text-red-600'], action: this.showTeamBulkDeviceDeleteDialog, disabled: !enableDelete })
            return menu
        }
    },
    watch: {
        instance: 'fullReloadOfData',
        application: 'fullReloadOfData',
        team: 'fullReloadOfData'
    },
    mounted () {
        this.fullReloadOfData()
        this.pollTimer = createPollTimer(this.pollTimerElapsed, POLL_TIME) // auto starts
    },
    async unmounted () {
        this.pollTimer.stop()
        if (this.deviceCountDeltaSincePageLoad !== 0) {
            // Trigger a refresh of team info to resync following device
            // changes
            await this.$store.dispatch('account/refreshTeam')
        }
    },
    methods: {
        pollTimerElapsed: async function () {
            this.pollTimer.pause()
            try {
                await this.pollForDeviceStatuses()
            } finally {
                this.pollTimer.resume()
            }
        },

        /**
         * filter: Object containing keys:
         *  - devices: an array of device ids
         *  - property: which filter row is being applied, e.g. status or lastseen
         *  - bucket: which value of this property are we filtering on from the buckets in the status bar
         */
        applyFilter (filter) {
            this.filter = filter

            if (this.unfilteredHasMoreThanOnePage) {
                this.doFilterServerSide()
            }
        },

        updateSearch (searchTerm) {
            this.searchTerm = searchTerm

            if (this.unsearchedHasMoreThanOnePage) {
                this.doSearchServerSide()
            }
        },

        updateSort (key, direction) {
            this.sort.key = key
            this.sort.direction = direction

            if (this.moreThanOnePage) {
                this.doSortServerSide()
            }
        },

        doFilterServerSide: debounce(function () {
            this.loadDevices(true)
        }, 50),

        doSearchServerSide: debounce(function () {
            this.loadDevices(true)
        }, 150),

        doSortServerSide: debounce(function () {
            this.loadDevices(true)
        }, 50),

        showCreateDeviceDialog () {
            const showApplicationsList = this.displayingTeam
            this.$refs.teamDeviceCreateDialog.show(null, this.instance, this.application, showApplicationsList)
        },

        confirmBulkDelete () {
            // do the delete
            teamApi.bulkDeviceDelete(this.team?.id, this.checkedDevices.map(device => device.id))
                .then(() => {
                    Alerts.emit('Devices successfully deleted.', 'confirmation')
                    this.fullReloadOfData()
                })
                .catch((error) => {
                    Alerts.emit('Error deleting devices: ' + error.message, 'error')
                })
        },

        showTeamBulkDeviceDeleteDialog () {
            this.$refs.teamBulkDeviceDeleteDialog.show()
        },

        showTeamBulkDeviceUnassignDialog () {
            this.$refs.devicesMoveNoOwnerDialog.show()
        },

        showTeamBulkDeviceMoveToInstanceDialog () {
            this.$refs.deviceAssignInstanceDialog.show(this.checkedDevices)
        },

        showTeamBulkDeviceMoveToApplicationDialog () {
            this.$refs.deviceAssignApplicationDialog.show(this.checkedDevices)
        },

        showSelectTargetSnapshotDialog () {
            this.$refs.snapshotAssignDialog.show()
        },

        async assignDevice (device, instanceId) {
            const updatedDevice = await deviceApi.updateDevice(device.id, { instance: instanceId })

            Alerts.emit('Device successfully assigned to instance.', 'confirmation')

            this.updateLocalCopyOfDevice({ ...device, ...updatedDevice })
        },

        async assignDeviceToApplication (device, applicationId) {
            const updatedDevice = await deviceApi.updateDevice(device.id, { application: applicationId, instance: null })

            Alerts.emit('Device successfully assigned to application.', 'confirmation')

            this.updateLocalCopyOfDevice({ ...device, ...updatedDevice })
        },

        /**
         * @param {Array<object>} devices - Array of devices to move
         * @param {string} instance - ID of the instance to move the devices to
         */
        async moveDevicesToInstance (devices, instance) {
            const deviceIds = devices.map(device => device.id)
            const data = await teamApi.bulkDeviceMove(this.team.id, deviceIds, 'instance', instance)
            if (data?.devices.length) {
                Alerts.emit('Devices successfully moved.', 'confirmation')
                data.devices.forEach(updatedDevice => {
                    const device = this.devices.get(updatedDevice.id)
                    // ensure the updated device has `instance` and `application` set so that the local copy is updated correctly
                    const ensureProps = { instance: updatedDevice.instance || null, application: updatedDevice.application || null }
                    this.updateLocalCopyOfDevice({ ...device, ...updatedDevice, ...ensureProps })
                })
            }
        },

        /**
         * @param {Array<object>} devices - Array of devices to move
         * @param {string} application - ID of the application to move the devices to
         */
        async moveDevicesToApplication (devices, application) {
            const deviceIds = devices.map(device => device.id)
            const data = await teamApi.bulkDeviceMove(this.team.id, deviceIds, 'application', application)
            if (data?.devices.length) {
                Alerts.emit('Devices successfully moved.', 'confirmation')
                data.devices.forEach(updatedDevice => {
                    const device = this.devices.get(updatedDevice.id)
                    // ensure the updated device has `instance` and `application` set so that the local copy is updated correctly
                    const ensureProps = { instance: updatedDevice.instance || null, application: updatedDevice.application || null }
                    this.updateLocalCopyOfDevice({ ...device, ...updatedDevice, ...ensureProps })
                })
            }
        },

        /**
         * @param {Array<object>} devices - Array of devices to move
         */
        async moveDevicesToUnassigned (devices) {
            const deviceIds = devices.map(device => device.id)
            const data = await teamApi.bulkDeviceMove(this.team.id, deviceIds, 'unassigned')
            if (data?.devices.length) {
                Alerts.emit('Devices successfully unassigned.', 'confirmation')
                data.devices.forEach(updatedDevice => {
                    const device = this.devices.get(updatedDevice.id)
                    // ensure the updated device has `instance` and `application` set so that the local copy is updated correctly
                    const ensureProps = { instance: updatedDevice.instance || null, application: updatedDevice.application || null }
                    this.updateLocalCopyOfDevice({ ...device, ...updatedDevice, ...ensureProps })
                })
            }
        },

        // Device loading
        fullReloadOfData () {
            this.checkedDevices = []
            this.loadDevices(true)
            this.pollForDeviceStatuses(true)
        },

        async loadDevices (reset) {
            if (this.hasLoadedModel) {
                await this.fetchDevices(reset)
            }
        },

        async loadMoreDevices () {
            await this.fetchDevices()
        },

        async pollForDeviceStatuses (reset) {
            if (this.hasLoadedModel) {
                await this.fetchAllDeviceStatuses(reset)
            }
        },

        async fetchDevices (resetPage = false) {
            if (resetPage) {
                this.nextCursor = null
            }

            /// Params to send to the server
            const nextCursor = this.nextCursor
            const extraParams = {}

            // Specific filtering
            if (this.filter?.property && this.filter?.bucket) {
                extraParams.filters = `${this.filter.property}:${this.filter.bucket}`
            }

            // Search and sort
            if (this.searchTerm) {
                extraParams.query = this.searchTerm
            }
            if (this.sort.key) {
                extraParams.sort = this.sort.key
                if (this.sort.direction) {
                    extraParams.dir = this.sort.direction
                }
            }

            // Actually fetch the data
            const data = await this.fetchData(nextCursor, null, extraParams)

            if (resetPage) {
                this.devices = new Map()
            }

            data.devices.forEach(device => {
                this.devices.set(device.id, device)
            })

            // Pagination
            this.nextCursor = data.meta?.next_cursor || null

            if (!extraParams.query) {
                this.unsearchedHasMoreThanOnePage = this.moreThanOnePage
            }

            if (!extraParams.filters) {
                this.unfilteredHasMoreThanOnePage = this.moreThanOnePage
            }

            this.loadingDevices = false
        },

        getOwnerSortKeyForDevice (device) {
            if (!this.displayingTeam) {
                return null
            }

            if (device.ownerType === 'application') {
                return 'Application:' + device.application?.name || 'No Name'
            }

            if (device.ownerType === 'instance') {
                return 'Instance:' + device.instance?.name || 'No Name'
            }

            return 'Unassigned'
        }
    }
}
</script>

<style>
.ff-dialog-content .ff-devices-ul {
    list-style-type: disc;
    list-style-position: inside;
    columns: 2;
}
.ff-dialog-content .ff-devices-ul li {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
