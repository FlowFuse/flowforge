<template>
    <SectionTopMenu hero="Node-RED Logs" help-header="FlowFuse - Node-RED Logs" info="Live logs from your FlowFuse instances of Node-RED">
        <template #helptext>
            <p>This is a raw feed from the running instance of Node-RED on this domain.</p>
            <p>Use this to debug issues if your application will not start correctly.</p>
        </template>
        <template #tools>
            <div style="display: flex;align-items: center;">
                <div class="mr-2"><strong>Instance:</strong></div>
                <ff-listbox
                    ref="dropdown"
                    v-model="input.instanceId"
                    :options="instances"
                    label-key="name"
                    value-key="id"
                    class="w-full"
                />
                <router-link v-if="instance?.meta" :to="{ name: 'Instance', params: { id: instance.id, team_slug: team.slug }}">
                    <InstanceStatusBadge :status="instance.meta?.state" :pendingStateChange="instance?.pendingStateChange" :optimisticStateChange="instance.optimisticStateChange" class="ml-2" />
                </router-link>
            </div>
        </template>
    </SectionTopMenu>

    <LogsShared v-if="instance?.id" :instance="instance" />
    <div v-else class="ff-no-data ff-no-data-large">
        Select an instance to view live logs.
    </div>
</template>

<script>
import { mapState } from 'vuex'

import SectionTopMenu from '../../components/SectionTopMenu.vue'
import LogsShared from '../instance/components/InstanceLogs.vue'

import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'

export default {
    name: 'ProjectLogs',
    components: {
        LogsShared,
        SectionTopMenu,
        InstanceStatusBadge
    },
    inheritAttrs: false,
    props: {
        instances: {
            type: Array,
            required: true
        }
    },
    data () {
        return {
            input: {
                instanceId: this.instances[0]?.id
            }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        instance () {
            return this.instances.find((instance) => instance.id === this.input.instanceId)
        }
    },
    watch: {
        instances: 'selectFirstInstance'
    },
    mounted () {
        this.selectFirstInstance()
    },
    methods: {
        selectFirstInstance () {
            this.input.instanceId = this.instances[0]?.id
        }
    }
}
</script>
