<template>
    <ff-dialog
        ref="dialog"
        :header="bulkOp ? 'Move Selected Devices to Application' : 'Add Device to Application'"
        class="ff-dialog-fixed-height"
        :confirm-label="bulkOp ? 'Move' : 'Add'"
        data-el="assign-device-to-application-dialog"
        @confirm="assignDeviceToApplication()"
    >
        <template #default>
            <form class="space-y-6 mt-2 mb-2">
                <p>The following device{{ devices.length > 1 ? 's' : '' }} will be affected by this operation:</p>
                <div class="max-h-48 overflow-y-auto">
                    <ul class="ff-devices-ul">
                        <li v-for="device in devices" :key="device.id">
                            <span class="font-bold">{{ device.name }}</span> <span class="text-gray-500 text-sm"> ({{ device.id }})</span>
                        </li>
                    </ul>
                </div>
                <hr>
                <p>Select the Node-RED application you want to {{ bulkOp ? 'move' : 'add' }} the device{{ selection.length > 1 ? 's' : '' }} to.</p>
                <FormRow
                    v-model="input.application"
                    :options="options.applications"
                    :disabled="noApplications || loading.applications"
                    placeholder="Select an application"
                    data-form="application"
                >
                    Application
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

import TeamAPI from '../../../../api/team.js'
import FormRow from '../../../../components/FormRow.vue'

export default {
    name: 'DeviceAssignApplicationDialog',
    components: {
        FormRow
    },
    emits: ['assignDevice', 'moveDevices'],
    setup () {
        return {
            async show (selection) {
                this.$refs.dialog.show()
                this.selection = selection
            }
        }
    },
    data () {
        return {
            selection: null,
            input: {
                application: null
            },
            options: {
                applications: null
            },
            loading: {
                applications: false
            }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        Application () {
            return this.input.application
        },
        noApplications () {
            return !this.options.applications || this.options.applications?.length === 0
        },
        bulkOp () {
            return Array.isArray(this.selection)
        },
        devices () {
            return this.bulkOp ? this.selection : [this.selection]
        }
    },
    mounted () {
        this.loadApplications()
    },
    methods: {
        loadApplications () {
            this.loading.applications = true
            TeamAPI.getTeamApplications(this.team.id).then((data) => {
                this.options.applications = data.applications.map(application => { return { value: application, label: application.name } })
                this.loading.applications = false
            }).catch((error) => {
                console.error(error)
            })
        },
        assignDeviceToApplication () {
            if (this.bulkOp) {
                this.$emit('moveDevices', this.selection, this.input.application.id)
            } else {
                this.$emit('assignDevice', this.selection, this.input.application.id)
            }
        }
    }
}
</script>
