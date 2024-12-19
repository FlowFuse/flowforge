<template>
    <form class="space-y-6">
        <FormHeading>
            <template #default>
                General
            </template>
            <template #tools>
                <div v-if="hasPermission('device:edit')" class="mb-2">
                    <ff-button v-if="!editing.deviceName" size="small" kind="primary" @click="editDevice">Edit Device</ff-button>
                    <ff-button v-else kind="primary" size="small" @click="updateDevice">Save Changes</ff-button>
                </div>
            </template>
        </FormHeading>
        <FormRow v-model="input.deviceId" type="uneditable" id="deviceId" inputClass="font-mono">
            Device ID
        </FormRow>

        <FormRow v-model="input.deviceName" :type="editing.deviceName ? 'text' : 'uneditable'" ref="deviceName">
            Name
        </FormRow>
    </form>
    <form class="mt-12 space-y-6">
        <FormHeading>
            <template #default>
                Assignment
            </template>
            <template #tools>
                <div v-if="hasPermission('device:edit')" class="mb-2">
                    <ff-button v-if="!notAssigned" size="small" kind="primary" data-action="unassign-device" @click="unassign">Unassign</ff-button>
                </div>
                <div v-if="hasPermission('device:edit')" class="mb-2">
                    <ff-button v-if="notAssigned" size="small" kind="primary" data-action="assign-device" @click="assign">Assign</ff-button>
                </div>
            </template>
        </FormHeading>
        <template v-if="notAssigned">
            <p>To use Devices they must be assigned to an Application or Instance.</p>
            <ul class="list-disc ml-6 space-y-2 max-w-xl">
                <li><label class="font-medium mr-2">Application:</label>Flows on this Device can only be edited and deployed via the 'Remote Editor' feature, available in 'Developer Mode'. You can create Snapshots for version control of the flows on your Device</li>
                <li><label class="font-medium mr-2">Instance:</label>Auto-deploy flows from the bound Instance directly to this Device. You can still remotely edit and create Snapshots on the Device when the Device is in 'Developer Mode'.</li>
            </ul>
        </template>
        <template v-else-if="hasApplication">
            <div>
                <label class="font-medium mr-2">Application:</label>
                <router-link :to="{name: 'Application', params: {id: device.application.id}}" class="ff-link">{{ device.application.name }}</router-link>
            </div>
            <h3>Features:</h3>
            <ul class="list-disc ml-6 space-y-2 max-w-xl">
                <li><label class="font-medium mr-2">Editing Remotely:</label>You can read our documentation <a class="ff-link" href="https://flowfuse.com/docs/device-agent/deploy/#editing-the-node-red-flows-on-a-device-that-is-assigned-to-an-application">here</a> on how to remotely edit the flows on your Device. Make sure you create a Snapshot of your changes when in Developer Mode if you wish to keep them, any changes made inside "Developer Mode" will be undone when leaving "Developer Mode".</li>
            </ul>
        </template>
        <template v-else-if="hasInstance">
            <div>
                <label class="font-medium mr-2">Instance:</label>
                <router-link :to="{name: 'Instance', params: {id: device.instance.id, team_slug: team.slug}}" class="ff-link">{{ device.instance.name }}</router-link>
            </div>
            <h3>Features:</h3>
            <ul class="list-disc ml-6 space-y-2 max-w-xl">
                <li><label class="font-medium mr-2">Deploying Remotely:</label>You can read our documentation <a class="ff-link" target="_blank" rel="noreferrer" href="https://flowfuse.com/docs/device-agent/deploy/#deploying-a-node-red-instance-to-the-device">here</a> on how to remotely deploy flows to your Device.</li>
                <li><label class="font-medium mr-2">Editing Remotely:</label>You can read our documentation <a class="ff-link" target="_blank" rel="noreferrer" href="https://flowfuse.com/docs/device-agent/deploy/#editing-the-node-red-flows-on-a-device-that-is-assigned-to-an-instance">here</a> on how to remotely edit the flows on your Device. Make sure you create a Snapshot of your changes when in Developer Mode if you wish to keep them, any changes made inside "Developer Mode" will be undone when leaving "Developer Mode".</li>
            </ul>
        </template>
    </form>
</template>

<script>
import { mapState } from 'vuex'

import deviceApi from '../../../api/devices.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'

import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

export default {
    name: 'DeviceSettings',
    props: ['device'],
    emits: ['device-updated', 'assign-device'],
    mixins: [permissionsMixin],
    data () {
        return {
            editing: {
                deviceName: false
            },
            input: {
                deviceId: '',
                deviceName: ''
            },
            original: {
                deviceName: ''
            }
        }
    },
    watch: {
        device: {
            handler () {
                this.fetchData()
            },
            deep: true
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team']),
        hasApplication () {
            return this.device?.ownerType === 'application' && this.device.application
        },
        hasInstance () {
            return this.device?.ownerType === 'instance' && this.device.instance
        },
        notAssigned () {
            return !this.hasApplication && !this.hasInstance
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        editDevice () {
            this.original.deviceName = this.input.deviceName
            this.editing.deviceName = true
        },
        async updateDevice () {
            await deviceApi.updateDevice(this.device.id, { name: this.input.deviceName })
            this.editing.deviceName = false
            this.$emit('device-updated')
        },
        cancelEditName () {
            this.editing.deviceName = false
            this.input.deviceName = this.original.deviceName
        },
        fetchData () {
            if (this.device) {
                this.input.deviceId = this.device.id
                this.input.deviceName = this.device.name
            }
        },
        unassign () {
            const device = this.device
            if (this.hasInstance) {
                Dialog.show({
                    header: 'Remove Device from Instance',
                    kind: 'danger',
                    text: 'Are you sure you want to remove this device from the instance? This will stop the flows running on the device.',
                    confirmLabel: 'Remove'
                }, async () => {
                    await deviceApi.updateDevice(device.id, { instance: null })
                    this.$emit('device-updated')
                    Alerts.emit('Successfully removed the device from the instance.', 'confirmation')
                })
            } else if (this.hasApplication) {
                Dialog.show({
                    header: 'Remove Device from Application',
                    kind: 'danger',
                    text: 'Are you sure you want to remove this device from the application? This will stop the flows running on the device.',
                    confirmLabel: 'Remove'
                }, async () => {
                    await deviceApi.updateDevice(device.id, { application: null })
                    this.$emit('device-updated')
                    Alerts.emit('Successfully removed the device from the application.', 'confirmation')
                })
            }
        },
        assign () {
            this.$emit('assign-device')
        }
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
