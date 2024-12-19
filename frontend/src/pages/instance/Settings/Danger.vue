<template>
    <ff-loading v-if="loading.deleting" message="Deleting Instance..." />
    <ff-loading v-if="loading.duplicating" message="Copying Instance..." />
    <ff-loading v-if="loading.changingStack" message="Changing Node-RED Version..." />
    <ff-loading v-if="loading.settingType" message="Setting Type..." />
    <ff-loading v-if="loading.suspend" message="Suspending Instance..." />
    <ff-loading v-if="loading.importing" message="Importing Instance..." />
    <form v-if="!isLoading" class="space-y-6">
        <template v-if="hasPermission('project:edit')">
            <FormHeading>Change Instance Node-RED Version</FormHeading>
            <div ref="updateStack" class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="flex-grow">
                    <p v-if="instance.stack && instance.stack.replacedBy" class="max-w-sm mb-5">
                        There is a new version of Node-RED available.
                    </p>
                    <p class="max-w-sm">
                        Changing the Instances Node-RED Version requires the instance to be restarted.
                        The flows will not be running while this happens.
                    </p>
                </div>
                <div class="min-w-fit flex-shrink-0 flex-col gap-5">
                    <ff-button
                        v-if="instance.stack && instance.stack.replacedBy"
                        ref="updateStackButton"
                        class="mb-5"
                        data-action="update-stack"
                        :disabled="!instance.projectType"
                        kind="primary"
                        @click="upgradeStack()"
                    >
                        Update Node-RED Version
                    </ff-button>
                    <ff-button
                        data-action="change-stack"
                        :disabled="!instance.projectType"
                        kind="secondary"
                        @click="showChangeStackDialog()"
                    >
                        Change Node-RED Version
                    </ff-button>
                    <ChangeStackDialog ref="changeStackDialog" @confirm="changeStack" />
                </div>
            </div>
        </template>

        <template v-if="hasPermission('project:create')">
            <FormHeading>Copy Instance</FormHeading>

            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="flex-grow">
                    <div class="max-w-sm">
                        Add a new instance to your application, that is a copy of this instance.
                    </div>
                </div>
                <div class="min-w-fit flex-shrink-0">
                    <ff-button kind="secondary" data-nav="copy-project" @click="showDuplicateInstanceDialog()">Duplicate Instance</ff-button>
                </div>
            </div>
        </template>

        <template v-if="hasPermission('project:edit')">
            <FormHeading>Import Instance</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="flex-grow">
                    <div class="max-w-sm">
                        Import an existing Node-RED instance.
                    </div>
                </div>
                <div class="min-w-fit flex-shrink-0">
                    <ff-button data-action="import-instance" kind="secondary" @click="showImportInstanceDialog()">Import Instance</ff-button>
                    <ImportInstanceDialog ref="importInstanceDialog" data-el="dialog-import-instance" @confirm="importInstance" />
                </div>
            </div>
        </template>

        <template v-if="hasPermission('project:edit')">
            <FormHeading>Change Instance Type</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="flex-grow">
                    <div class="max-w-sm">
                        Changing the Instance Type will restart the instance.
                        The flows will not be running while this happens.
                    </div>
                </div>
                <div class="min-w-fit flex-shrink-0">
                    <ff-button kind="secondary" data-nav="change-instance-settings" @click="showProjectChangeTypePage()">Change Instance Type</ff-button>
                </div>
            </div>
        </template>

        <template v-if="hasPermission('project:change-status')">
            <FormHeading class="text-red-700">Suspend Instance</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="flex-grow">
                    <div v-if="instance?.meta?.state === 'suspended'" class="max-w-sm">
                        Your instance is already suspended. To restart the instance, select "Start" from the Instance actions.
                    </div>
                    <div v-else class="max-w-sm">
                        Once suspended, your instance will not be available until restarted.
                        While suspended, the instance will consume no <span v-if="features.billing">billable</span> resources.
                    </div>
                </div>
                <div class="min-w-fit flex-shrink-0">
                    <ff-button data-action="suspend-instance" kind="danger" :disabled="instance?.meta?.state === 'suspended'" @click="$emit('instance-confirm-suspend')">Suspend Instance</ff-button>
                </div>
            </div>
        </template>

        <template v-if="hasPermission('project:delete')">
            <FormHeading class="text-red-700">Delete Instance</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="flex-grow">
                    <div class="max-w-sm">
                        Once deleted, your instance is gone. This cannot be undone.
                    </div>
                </div>
                <div class="min-w-fit flex-shrink-0">
                    <ff-button data-action="delete-instance" kind="danger" @click="$emit('instance-confirm-delete')">Delete Instance</ff-button>
                </div>
            </div>
        </template>
    </form>
</template>

<script>
import { useRouter } from 'vue-router'

import { mapState } from 'vuex'

import InstanceApi from '../../../api/instances.js'

import FormHeading from '../../../components/FormHeading.vue'
import { scrollToAndJiggleHighlight } from '../../../composables/Ux.js'
import permissionsMixin from '../../../mixins/Permissions.js'
import alerts from '../../../services/alerts.js'

import ChangeStackDialog from './dialogs/ChangeStackDialog.vue'
import ImportInstanceDialog from './dialogs/ImportInstanceDialog.vue'

export default {
    name: 'InstanceSettingsDanger',
    components: {
        FormHeading,
        ChangeStackDialog,
        ImportInstanceDialog
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'instance-confirm-delete', 'instance-confirm-suspend'],
    data () {
        return {
            loading: {
                settingType: false,
                deleting: false,
                changingStack: false,
                duplicating: false,
                suspend: false,
                importing: false
            }
        }
    },
    computed: {
        ...mapState('account', ['team', 'features', 'teamMembership']),
        isLoading () {
            return this.loading.deleting || this.loading.suspend || this.loading.changingStack || this.loading.duplicating || this.loading.settingType
        }
    },
    mounted () {
        this.checkAccess()
        this.highlightElements()
    },
    methods: {
        async checkAccess () {
            if (!this.hasPermission('project:edit')) {
                useRouter().push({ replace: true, path: 'general' })
            }
        },
        showProjectChangeTypePage () {
            this.$router.push({
                name: 'instance-settings-change-type'
            })
        },
        showChangeStackDialog () {
            this.$refs.changeStackDialog.show(this.instance)
        },
        showDuplicateInstanceDialog () {
            this.$router.push({
                name: 'ApplicationCreateInstance',
                params: { id: this.instance.application.id, team_slug: this.team.slug },
                query: { sourceInstanceId: this.instance.id }
            })
        },
        showImportInstanceDialog () {
            this.$refs.importInstanceDialog.show(this.instance)
        },
        upgradeStack () {
            this.changeStack(this.instance.stack.replacedBy)
        },
        duplicateProject (parts) {
            this.loading.duplicating = true
            InstanceApi.create(parts).then(result => {
                this.$router.push({ name: 'Instance', params: { id: result.id, team_slug: this.team.slug } })
                alerts.emit('Instance successfully duplicated.', 'confirmation')
            }).catch(err => {
                console.error(err)
                alerts.emit('Instance failed to duplicate.', 'warning')
            }).finally(() => {
                this.loading.duplicating = false
            })
        },
        importInstance (parts) {
            this.loading.importing = true
            InstanceApi.importInstance(this.instance.id, parts).then(result => {
                this.$router.push({ name: 'Instance', params: { id: this.instance.id, team_slug: this.team.slug } })
                alerts.emit('Instance flows imported.', 'confirmation')
            }).catch(err => {
                console.error(err)
                alerts.emit(`Failed to import flows - ${err.response?.data?.error}`, 'warning')
            }).finally(() => {
                this.loading.importing = false
            })
        },
        changeStack (selectedStack) {
            if (this.instance.stack?.id !== selectedStack) {
                this.loading.changingStack = true
                InstanceApi.changeStack(this.instance.id, selectedStack).then(() => {
                    this.$router.push({ name: 'Instance', params: { id: this.instance.id, team_slug: this.team.slug } })
                    this.$emit('instance-updated')
                    alerts.emit('Instance Node-RED Version successfully updated.', 'confirmation')
                }).catch(err => {
                    console.warn(err)
                    alerts.emit('Instance Node-RED Version was not updated due to an error.', 'warning')
                }).finally(() => {
                    this.loading.changingStack = false
                })
            }
        },
        highlightElements () {
            if (
                this.$route.query.highlight &&
                Object.keys(this.$refs).includes(this.$route.query.highlight) &&
                this.$route.query.highlight === 'updateStack'
            ) {
                scrollToAndJiggleHighlight(
                    this.$refs.updateStack,
                    this.$refs.updateStackButton.$el,
                    { count: 2 }
                )
            }
            this.$router.replace({ query: null })
        }
    }
}
</script>
