<template>
    <SectionTopMenu hero="Device Provisioning" help-header="Device Provisioning Tokens" info="A list of device provisioning tokens that can be used to auto register devices to a team.">
        <template #helptext>
            <p>FlowFuse can be used to manage instances of Node-RED running on remote devices.</p>
            <p>Each device must run the <a href="https://flowfuse.com/docs/user/devices/" target="_blank">FlowFuse Device Agent</a>, which connects back to the platform to receive updates.</p>
            <p>Provisioning tokens can be created to allow devices to automatically connect to a team, application and instance without having to register them first.</p>
        </template>
    </SectionTopMenu>

    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Tokens..." />
        <ff-loading v-else-if="creatingDevice" message="Creating Token..." />
        <ff-loading v-else-if="deletingItem" message="Deleting Token..." />
        <template v-else>
            <ff-data-table
                data-el="provisioning-tokens"
                :columns="columns"
                :rows="Array.from(tokens?.values())"
                :show-search="true"
                search-placeholder="Search Tokens..."
                :show-load-more="!!nextCursor"
                @load-more="loadMore"
            >
                <template #actions>
                    <ff-button
                        v-if="addEnabled"
                        class="font-normal"
                        data-action="add-provisioning-token"
                        kind="primary"
                        @click="showCreateTokenDialog"
                    >
                        <template #icon-left>
                            <PlusSmIcon />
                        </template>
                        Add Token
                    </ff-button>
                </template>
                <template v-if="editEnabled || deleteEnabled" #context-menu="{row}">
                    <ff-list-item :disabled="!editEnabled" label="Edit Details" @click="menuAction('edit', row.id)" />
                    <ff-list-item :disabled="!deleteEnabled" kind="danger" label="Delete Token" @click="menuAction('delete', row.id)" />
                </template>
                <template v-if="tokens.size === 0" #table>
                    <div class="ff-no-data ff-no-data-large">
                        You don't have any tokens yet
                    </div>
                </template>
            </ff-data-table>
        </template>
    </div>
    <CreateProvisioningTokenDialog ref="CreateProvisioningTokenDialog" :team="team" @token-creating="tokenCreating" @token-created="tokenCreated" @token-updated="tokenUpdated" />
    <ProvisioningCredentialsDialog ref="provisioningCredentialsDialog" :team="team" />
</template>

<script>
import { KeyIcon, PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import teamApi from '../../../api/team.js'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

import CreateProvisioningTokenDialog from '../Devices/dialogs/CreateProvisioningTokenDialog.vue'
import ProvisioningCredentialsDialog from '../Devices/dialogs/ProvisioningCredentialsDialog.vue'

const TokenFieldFormatter = {
    template: '<span><span v-if="name">{{name}}</span><span v-else class="italic text-gray-500">unnamed</span></span>',
    props: ['name'],
    components: { KeyIcon }
}

const InstanceFieldFormatter = {
    template: `
        <template v-if="instance">
            <router-link :to="{ name: 'Instance', params: { id: instance, team_slug: team.slug }}">{{instanceName}}</router-link>
        </template>
        <template v-else><span class="italic text-gray-500">Don't assign</span></template>`,
    props: ['instance', 'instanceName', 'team']
}

export default {
    name: 'TeamDeviceProvisioningTokens',
    components: {
        CreateProvisioningTokenDialog,
        ProvisioningCredentialsDialog,
        SectionTopMenu,
        PlusSmIcon
    },
    mixins: [permissionsMixin],
    data () {
        return {
            loading: true,
            creatingDevice: false,
            deletingItem: false,
            tokens: new Map(),
            checkInterval: null,
            nextCursor: null,
            instanceNames: []
        }
    },
    computed: {
        addEnabled: function () {
            return this.hasPermission('team:device:provisioning-token:create')
        },
        editEnabled: function () {
            return this.hasPermission('team:device:provisioning-token:edit')
        },
        deleteEnabled: function () {
            return this.hasPermission('team:device:provisioning-token:delete')
        },
        columns: function () {
            return [
                { label: 'Token Name', class: ['w-64'], key: 'name', sortable: true, component: { is: markRaw(TokenFieldFormatter) } },
                { label: 'Auto Assign Instance', class: ['w-64'], key: 'instance', sortable: true, component: { is: markRaw(InstanceFieldFormatter) } },
                { label: 'Target Snapshot', class: ['w-64'], key: 'targetSnapshot', sortable: true }
            ]
        }
    },
    watch: {
        team: 'fetchData'
    },
    async mounted () {
        await this.fetchData()
        this.loading = false
        this.checkInterval = setTimeout(this.pollForData, 10000)
    },
    unmounted () {
        clearInterval(this.checkInterval)
    },
    methods: {
        async pollForData () {
            try {
                await this.fetchData(null, true) // TODO: Implement pagination
            } finally {
                this.checkInterval = setTimeout(this.pollForData, 10000)
            }
        },
        async fetchData (nextCursor = null, polled = false) {
            // load instance names into local cache (TODO: consider moving this to a vuex store for global access)
            this.instanceNames = await teamApi.getTeamInstancesList(this.team.id)
            // get the tokens
            const data = await teamApi.getTeamDeviceProvisioningTokens(this.team.id, nextCursor)

            // Polling never resets the devices list
            if (!nextCursor && !polled) {
                this.tokens = new Map()
            }
            data.tokens.forEach(token => {
                this.updateTokenCache(token)
            })

            // TODO: Implement pagination
            if (!polled) {
                this.nextCursor = data.meta.next_cursor
            }
        },
        getInstanceName (id) {
            const instance = this.instanceNames?.find(p => p.id === id)
            return instance ? instance.name : id
        },
        async loadMore () {
            await this.fetchData(this.nextCursor)
        },
        showCreateTokenDialog () {
            this.$refs.CreateProvisioningTokenDialog.show(null, this.instance)
        },
        showEditDialog (token) {
            this.$refs.CreateProvisioningTokenDialog.show(token)
        },
        tokenCreating () {
            this.creatingDevice = true
        },
        async tokenCreated (token) {
            this.creatingDevice = false
            if (token) {
                setTimeout(() => {
                    this.$refs.provisioningCredentialsDialog.show(token)
                }, 500)
                this.updateTokenCache(token)
            }
        },
        tokenUpdated (token) {
            this.updateTokenCache(token)
        },
        updateTokenCache (token) {
            token.instanceName = this.getInstanceName(token.instance)
            this.tokens.set(token.id, token)
        },
        menuAction (action, tokenId) {
            const token = this.tokens.get(tokenId)
            if (action === 'edit') {
                this.showEditDialog(token)
            } else if (action === 'delete') {
                Dialog.show({
                    header: 'Delete Provisioning Token',
                    kind: 'danger',
                    text: 'Are you sure you want to delete this provisioning token? Once deleted, it can no longer be used to provision new devices to the team.',
                    confirmLabel: 'Delete'
                }, async () => {
                    this.deletingItem = true
                    try {
                        await teamApi.deleteTeamDeviceProvisioningToken(this.team.id, token.id)
                        Alerts.emit('Successfully deleted the token', 'confirmation')
                        this.tokens.delete(token.id)
                    } catch (err) {
                        Alerts.emit('Failed to delete token: ' + err.toString(), 'warning', 7500)
                    } finally {
                        this.deletingItem = false
                    }
                })
            } else if (action === 'updateCredentials') {
                this.$refs.provisioningCredentialsDialog.show(token)
            }
        }
    }
}
</script>
