<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard header="Connection:">
            <template #icon>
                <WifiIcon />
            </template>
            <template #content>
                <InfoCardRow property="Last Seen:">
                    <template #value>
                        <DeviceLastSeenBadge :last-seen-at="lastSeenAt" :last-seen-ms="lastSeenMs" :last-seen-since="lastSeenSince" />
                    </template>
                </InfoCardRow>
                <InfoCardRow property="Status:">
                    <template #value>
                        <StatusBadge :status="device.status" />
                    </template>
                </InfoCardRow>
                <InfoCardRow property="Agent Version:">
                    <template #value>
                        <StatusBadge
                            :status="agentVersionWarning ? 'error' : 'success'"
                            :text="device.agentVersion || 'unknown'" v-ff-tooltip="agentVersionWarning"
                        />
                    </template>
                </InfoCardRow>
            </template>
        </InfoCard>
        <InfoCard header="Deployment:">
            <template #icon>
                <TemplateIcon />
            </template>
            <template #content>
                <InfoCardRow property="Application:">
                    <template #value>
                        <ff-team-link v-if="device?.application" :to="{name: 'Application', params: { id: device.application.id }}">
                            {{ device.application?.name }}
                        </ff-team-link>
                        <span v-else>None</span>
                    </template>
                </InfoCardRow>
                <InfoCardRow v-if="device.ownerType!=='application'" property="Instance:">
                    <template #value>
                        <router-link v-if="device?.instance" :to="{name: 'Instance', params: { id: device.instance.id }}">
                            {{ device.instance?.name }}
                        </router-link>
                        <span v-else>None</span>
                    </template>
                </InfoCardRow>
                <InfoCardRow property="Active Snapshot:">
                    <template #value>
                        <span v-ff-tooltip:left="'Set Active Snapshots via Pipelines'" class="flex gap-2 pr-2">
                            <span class="flex items-center space-x-2 text-gray-500 italic">
                                <ExclamationIcon class="text-yellow-600 w-4" v-if="!device.activeSnapshot || !targetSnapshotDeployed" />
                                <CheckCircleIcon class="text-green-700 w-4" v-else />
                            </span>

                            <template v-if="device.activeSnapshot">
                                <div class="flex flex-col">
                                    <span>{{ device.activeSnapshot.name }}</span>
                                    <span class="text-xs text-gray-500">{{ device.activeSnapshot.id }}</span>
                                </div>
                            </template>
                            <template v-else>
                                No Snapshot Deployed
                            </template>
                        </span>
                    </template>
                </InfoCardRow>

                <InfoCardRow property="Target Snapshot:">
                    <template #value>
                        <span v-ff-tooltip:left="'Set Target Snapshots via Pipelines'" class="flex gap-2 pr-2">
                            <span class="flex items-center space-x-2 pt-1 text-gray-500 italic">
                                <ExclamationIcon class="text-yellow-600 w-4" v-if="!device.targetSnapshot" />
                                <CheckCircleIcon class="text-green-700 w-4" v-else />
                            </span>
                            <template v-if="device.targetSnapshot">
                                <div class="flex flex-col">
                                    <span>{{ device.targetSnapshot.name }}</span>
                                    <span class="text-xs text-gray-500">{{ device.targetSnapshot.id }}</span>
                                </div>
                            </template>
                            <template v-else>
                                No Target Snapshot Set
                            </template>
                        </span>
                    </template>
                </InfoCardRow>

                <InfoCardRow property="Device Mode">
                    <template #value>
                        <DeviceModeBadge :mode="device.mode" type="text" />
                    </template>
                </InfoCardRow>
            </template>
        </InfoCard>
    </div>
</template>

<script>

// utilities
import { CheckCircleIcon, ExclamationIcon, TemplateIcon, WifiIcon } from '@heroicons/vue/outline'

// api
import semver from 'semver'
import { mapState } from 'vuex'

// components
import InfoCard from '../../components/InfoCard.vue'
import InfoCardRow from '../../components/InfoCardRow.vue'
import StatusBadge from '../../components/StatusBadge.vue'

import DeviceLastSeenBadge from './components/DeviceLastSeenBadge.vue'
import DeviceModeBadge from './components/DeviceModeBadge.vue'

export default {
    name: 'DeviceOverview',
    emits: ['device-updated', 'device-refresh'],
    props: ['device'],
    components: {
        CheckCircleIcon,
        ExclamationIcon,
        WifiIcon,
        InfoCard,
        InfoCardRow,
        TemplateIcon,
        DeviceModeBadge,
        DeviceLastSeenBadge,
        StatusBadge
    },
    computed: {
        ...mapState('account', ['settings', 'features', 'team']),
        targetSnapshotDeployed: function () {
            return this.device.activeSnapshot?.id === this.device.targetSnapshot?.id
        },
        lastSeenAt: function () {
            return this.device?.lastSeenAt || ''
        },
        lastSeenMs: function () {
            return this.device?.lastSeenMs || 0
        },
        lastSeenSince: function () {
            return this.device?.lastSeenSince || ''
        },
        deviceOwnerType: function () {
            return this.device?.ownerType || ''
        },
        agentVersionWarning: function () {
            if (this.deviceOwnerType === 'application') {
                if (this.device?.agentVersion && semver.gte(this.device.agentVersion, '1.15.0')) {
                    return ''
                }
                return 'Devices assigned to an application must be version 1.15 or greater in order to receive snapshots and updates'
            }
            return ''
        }
    },
    mounted () {
        this.$emit('device-refresh') // cause parent to refresh device
    }
}
</script>
