<template>
    <div v-if="hasNoInstances" class="ff-no-data">
        This Application currently has no
        <router-link :to="`/application/${application.id}/instances`" class="ff-link">
            attached Node-RED Instances
        </router-link>
        .
    </div>
    <section v-else class="ff-applications-list-instances" data-el="application-instances">
        <label>Instances</label>
        <div
            v-for="instance in instances"
            :key="instance.id"
            data-el="application-instance-item"
            class="item-wrapper"
            @click.stop="openInstance(instance)"
        >
            <InstanceRow :instance="instance" @instance-deleted="$emit('instance-deleted')" />
        </div>
    </section>
    <div v-if="hasMoreInstances" class="ff-applications-list--details">
        Only the {{ application.instances.size }}
        <router-link :to="`/application/${application.id}/instances`" class="ff-link">instances</router-link>
        with the most recent activity are being displayed.
    </div>
</template>

<script>
import { mapState } from 'vuex'

import InstanceRow from './InstanceRow.vue'

export default {
    name: 'InstancesWrapper',
    components: { InstanceRow },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        }
    },
    emits: ['instance-deleted'],
    computed: {
        ...mapState('account', ['team']),
        instances () {
            return Array.from(this.application.instances.values())
        },
        hasMoreInstances () {
            return this.application.instanceCount > this.application.instances.size
        },
        hasNoInstances () {
            return this.application.instances.size === 0
        }
    },
    methods: {
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

<style scoped lang="scss">

</style>
