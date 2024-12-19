<template>
    <div class="mb-3">
        <SectionTopMenu hero="Settings" info="" />
    </div>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view
                :project="instance"
                :instance="instance"
                @instance-updated="$emit('instance-updated')"
                @instance-confirm-suspend="$emit('instance-confirm-suspend')"
                @instance-confirm-delete="$emit('instance-confirm-delete')"
            />
        </div>
    </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import SectionSideMenu from '../../../components/SectionSideMenu.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import permissionsMixin from '../../../mixins/Permissions.js'

export default {
    name: 'InstanceSettings',
    components: {
        SectionTopMenu,
        SectionSideMenu
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
    computed: {
        ...mapState('account', ['team', 'teamMembership', 'features', 'settings']),
        ...mapGetters('account', ['featuresCheck']),
        sideNavigation () {
            const hasPermissionToEditProject = this.hasPermission('project:edit')
            return [
                { name: 'General', path: { name: 'instance-settings-general' } },
                { name: 'Environment', path: { name: 'instance-settings-environment' } },
                {
                    name: 'High Availability',
                    path: { name: 'instance-settings-ha' },
                    hidden: !hasPermissionToEditProject && !this.features.ha
                },
                {
                    name: 'Protect Instance',
                    path: { name: 'instance-settings-protect' },
                    hidden: !hasPermissionToEditProject && !this.featuresCheck.isProtectedInstanceFeatureEnabled
                },
                {
                    name: 'Editor',
                    path: { name: 'instance-settings-editor' },
                    hidden: !hasPermissionToEditProject
                },
                {
                    name: 'Security',
                    path: { name: 'instance-settings-security' },
                    hidden: !hasPermissionToEditProject
                },
                {
                    name: 'Palette',
                    path: { name: 'instance-settings-palette' },
                    hidden: !hasPermissionToEditProject
                },
                {
                    name: 'Launcher',
                    path: { name: 'instance-settings-launcher' },
                    hidden: !hasPermissionToEditProject
                },
                {
                    name: 'Alerts',
                    path: { name: 'instance-settings-alerts' },
                    hidden: !hasPermissionToEditProject && !this.featuresCheck.isEmailAlertsFeatureEnabled
                }
            ]
        }
    }
}
</script>
