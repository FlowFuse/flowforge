<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="dashboardRoleOnly ? 'Dashboards' : 'Hosted Instances'">
                <template #context>
                    <span v-if="!dashboardRoleOnly">A list of all dashboards belonging to this Team.</span>
                    <span v-else>A list of Node-RED instances with Dashboards belonging to this Team.</span>
                </template>
                <template #help-header>
                    Instances
                </template>
                <template #pictogram>
                    <img src="../../images/pictograms/instance_red.png">
                </template>
                <template #helptext>
                    <p>
                        This is a list of <span v-if="!dashboardRoleOnly">all</span> Node-RED instances belonging to this team running
                        in this FlowFuse.
                    </p>
                    <p>
                        Each Instance is a customised version of Node-RED that includes various
                        FlowFuse plugins to integrate it with the platform.
                    </p>
                    <p v-if="!dashboardRoleOnly">
                        A number of the standard Node-RED settings are exposed for customisation,
                        and they can be preset by applying a Template upon creation of an Instance.
                    </p>
                </template>
            </ff-page-header>
        </template>
        <div class="space-y-6">
            <ff-loading v-if="loading" message="Loading Instances..." />
            <template v-else>
                <ff-data-table
                    v-if="instances.length > 0"
                    data-el="instances-table" :columns="columns" :rows="instances" :show-search="true" search-placeholder="Search Instances..."
                    :rows-selectable="!dashboardRoleOnly"
                    @row-selected="openInstance"
                >
                    <template #actions>
                        <ff-button
                            v-if="hasPermission('project:create')"
                            data-action="create-project"
                            kind="primary"
                            :to="{name: 'CreateInstance'}"
                        >
                            <template #icon-left>
                                <PlusSmIcon />
                            </template>
                            Create Instance
                        </ff-button>
                    </template>
                    <template #row-actions="{row}">
                        <dashboard-link v-if="!!row.settings?.dashboard2UI?.length" :disabled="row.status !== 'running'" :instance="row" />
                        <instance-editor-link
                            v-if="hasPermission('team:projects:list')"
                            :instance="row"
                            :disabled="row.status !== 'running'"
                            disabled-reason="The Instance is not running"
                        />
                    </template>
                </ff-data-table>
                <EmptyState v-else-if="!dashboardRoleOnly">
                    <template #img>
                        <img src="../../images/empty-states/team-instances.png">
                    </template>
                    <template #header>Get Started with your First Node-RED Instance</template>
                    <template #message>
                        <p>
                            Instances are managed in FlowFuse via <ff-team-link
                                class="ff-link"
                                :to="{name:'Applications', params: {team_slug: team.slug}}"
                            >
                                Applications
                            </ff-team-link>.
                        </p>
                        <p>
                            You can create your first Instance when creating your first Application, or add an Instance to an existing Application if you have one.
                        </p>
                    </template>
                    <template #actions>
                        <ff-button
                            v-if="hasPermission('project:create')"
                            kind="primary"
                            :to="{name: 'CreateInstance'}"
                        >
                            <template #icon-left>
                                <PlusSmIcon />
                            </template>
                            Create Instance
                        </ff-button>
                    </template>
                </EmptyState>
                <EmptyState v-else>
                    <template #img>
                        <img src="../../images/empty-states/team-instances.png">
                    </template>
                    <template #header>There are no dashboards in this team.</template>
                </EmptyState>
            </template>
        </div>
    </ff-page>
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import teamApi from '../../api/team.js'
import EmptyState from '../../components/EmptyState.vue'
import permissionsMixin from '../../mixins/Permissions.js'
import DeploymentName from '../application/components/cells/DeploymentName.vue'
import SimpleTextCell from '../application/components/cells/SimpleTextCell.vue'
import DashboardLink from '../instance/components/DashboardLink.vue'
import InstanceEditorLink from '../instance/components/EditorLink.vue'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'

export default {
    name: 'TeamInstances',
    components: {
        InstanceEditorLink,
        DashboardLink,
        PlusSmIcon,
        EmptyState
    },
    mixins: [permissionsMixin],
    props: {
        dashboardRoleOnly: {
            required: false,
            default: false,
            type: Boolean
        }
    },
    data () {
        return {
            loading: false,
            instances: [],
            columns: [
                { label: 'Name', class: ['flex-grow'], key: 'name', sortable: true, component: { is: markRaw(DeploymentName) } },
                { label: 'Status', class: ['w-44'], key: 'status', sortable: true, component: { is: markRaw(InstanceStatusBadge) } },
                { label: 'Application', class: ['flex-grow-[0.25]'], key: 'application.name', sortable: true },
                {
                    label: 'Last Updated',
                    class: ['w-60'],
                    key: 'flowLastUpdatedAt',
                    sortable: true,
                    component: {
                        is: markRaw(SimpleTextCell),
                        map: { text: 'flowLastUpdatedSince' }
                    }
                }
            ]
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    watch: {
        team: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function (newVal) {
            this.loading = true
            if (this.team.id) {
                if (this.hasPermission('team:projects:list')) {
                    this.instances = (await teamApi.getTeamInstances(this.team.id)).projects
                } else if (this.hasPermission('team:read')) {
                    this.instances = (await teamApi.getTeamDashboards(this.team.id)).projects
                }
            }
            this.loading = false
        },
        openInstance (instance) {
            this.$router.push({
                name: 'Instance',
                params: {
                    id: instance.id,
                    team_slug: this.team.slug
                }
            })
        }
    }
}
</script>
