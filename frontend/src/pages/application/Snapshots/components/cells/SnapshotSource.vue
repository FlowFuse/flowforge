<template>
    <div>
        <template v-if="ownerType==='instance'">
            <router-link class="flex items-center" :to="{ name: 'Instance', params: { id: project.id, team_slug: team.slug }}">
                <IconNodeRedSolid class="ff-icon ff-icon-lg text-red-800 relative" />
                <div class="flex flex-col ml-2">
                    <div class="text-xs text-gray-400">instance</div>
                    <div class="text-base">{{ project.name }}</div>
                </div>
            </router-link>
        </template>
        <template v-else-if="ownerType==='device'">
            <router-link class="flex items-center" :to="{ name: 'Device', params: { id: device.id }}">
                <IconDeviceSolid class="ff-icon ff-icon-lg text-teal-700 relative" />
                <div class="flex flex-col ml-2">
                    <div class="text-base">{{ device.name }}</div>
                    <div class="text-xs text-gray-400">{{ device.type }}</div>
                </div>
            </router-link>
        </template>
        <template v-else>
            <div class="flex flex-col space-y-1 ml-4">
                <div class="text-gray-400 ml-4 italic">unassigned</div>
            </div>
        </template>
    </div>
</template>

<script>

import { mapState } from 'vuex'

import IconDeviceSolid from '../../../../../components/icons/DeviceSolid.js'
import IconNodeRedSolid from '../../../../../components/icons/NodeRedSolid.js'

export default {
    name: 'SnapshotSource',
    components: { IconNodeRedSolid, IconDeviceSolid },
    inheritAttrs: false,
    props: {
        id: {
            required: true,
            type: String
        },
        ownerType: {
            type: String,
            default: null
        },
        device: {
            type: Object,
            default: null
        },
        project: {
            type: Object,
            default: null
        }
    },
    computed: {
        ...mapState('account', ['team'])
    }
}
</script>
