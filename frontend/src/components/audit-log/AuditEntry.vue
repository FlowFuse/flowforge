<template>
    <div class="ff-audit-entry py-1 lg:py-3 border-b text-base gap-4">
        <!-- Time -->
        <div class="ff-audit-entry-time">{{ entry.time }}</div>

        <!-- Icon -->
        <div class="ff-audit-entry-info flex items-center gap-4 lg:ml-3">
            <div class="ff-audit-entry-icon text-center">
                <AuditEntryIcon v-if="entry.body?.error" event="error" />
                <AuditEntryIcon v-else :event="entry.event" />
            </div>
            <!-- Event -->
            <div class="ff-audit-entry-description flex-1">
                <AuditEntryVerbose :entry="entry" />
            </div>
            <div v-if="!disableAssociations" class="lg:w-36">
                <template v-if="association && entry.scope.type === 'device'">
                    <router-link class="flex content-center" :to="{ name: 'Device', params: { id: entry.scope.id } }"><ChipIcon class="ff-icon relative invisible lg:visible " /> <span class="truncate ml-2 !leading-normal">{{ association.name }}</span></router-link>
                </template>
                <template v-else-if="association && entry.scope.type === 'project'">
                    <router-link class="flex content-center" :to="{ name: 'Instance', params: { id: entry.scope.id, team_slug: team.slug } }"><ProjectsIcon class="ff-icon relative invisible lg:visible" /> <span class="truncate ml-2 !leading-normal">{{ association.name }}</span></router-link>
                </template>
                <template v-else-if="association && entry.scope.type === 'application'">
                    <router-link class="flex content-center" :to="{ name: 'Application', params: { id: entry.scope.id, team_slug: team.slug }}"><TemplateIcon class="ff-icon relative invisible lg:visible" /> <span class="truncate ml-2 !leading-normal">{{ association.name }}</span></router-link>
                </template>
                <template v-else-if="entry.scope.type === 'team'">
                    <router-link class="flex content-center" :to="'#'"><UserGroupIcon class="ff-icon relative invisible lg:visible" /> <span class="truncate ml-2 !leading-normal">This Team</span></router-link>
                </template>
            </div>
        </div>
        <!-- User/Trigger -->
        <div v-if="entry.trigger.name !== 'unknown'" class="ff-audit-entry-trigger lg:w-36">
            {{ entry.trigger.name }}
        </div>
        <div v-else class="ff-audit-entry-trigger lg:w-36">
            &nbsp;
        </div>
    </div>
</template>

<script>

import { ChipIcon, TemplateIcon, UserGroupIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import ProjectsIcon from '../../components/icons/Projects.js'

import AuditEntryIcon from './AuditEntryIcon.vue'
import AuditEntryVerbose from './AuditEntryVerbose.vue'

export default {
    name: 'AuditLogEntry',
    props: {
        entry: {
            required: true,
            type: Object
        },
        association: {
            type: Object,
            default: () => {}
        },
        disableAssociations: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    components: {
        AuditEntryIcon,
        AuditEntryVerbose,
        ProjectsIcon,
        ChipIcon,
        TemplateIcon,
        UserGroupIcon
    },
    methods: {
        getApplication (association) {
            return association.ownerType === 'application' ? association : null
        },
        getInstance (association) {
            return association.ownerType === 'instance' ? association : null
        }
    }
}
</script>
