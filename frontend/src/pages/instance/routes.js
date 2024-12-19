/**
 * INFO: Instances were previously called projects, lots of the code still refers to an instance as a project
 * For all code under src/pages/instance project and instance are synonymous, but instance should be used going forward.
 */
import { useStore } from 'vuex'

import InstanceAssets from './Assets.vue'
import InstanceAuditLog from './AuditLog.vue'
import InstanceRemoteInstances from './Devices.vue'
import InstanceLogs from './Logs.vue'
import InstanceOverview from './Overview.vue'
import InstanceSettings from './Settings/index.vue'
import InstanceSettingsRoutes from './Settings/routes.js'
import VersionHistory from './VersionHistory/index.vue'
import VersionHistoryRoutes from './VersionHistory/routes.js'
import Instance from './index.vue'

const children = [
    {
        path: 'overview',
        name: 'instance-overview',
        component: InstanceOverview
    },
    {
        path: 'audit-log',
        name: 'instance-audit-log',
        component: InstanceAuditLog,
        meta: {
            title: 'Instance - Activity'
        }
    },
    {
        path: 'logs',
        name: 'instance-logs',
        component: InstanceLogs,
        meta: {
            title: 'Instance - Logs',
            shouldPoll: true
        }
    },
    {
        path: 'devices',
        name: 'instance-devices',
        component: InstanceRemoteInstances,
        meta: {
            title: 'Instance - Remote Instances'
        }
    },
    {
        path: 'assets',
        name: 'instance-assets',
        component: InstanceAssets,
        meta: {
            title: 'Instance - Assets'
        }
    },
    {
        path: 'settings',
        component: InstanceSettings,
        name: 'instance-settings',
        meta: {
            title: 'Instance - Settings'
        },
        redirect: { name: 'instance-settings-general' },
        children: [...InstanceSettingsRoutes]
    },
    {
        path: 'version-history',
        name: 'instance-version-history',
        component: VersionHistory,
        meta: {
            title: 'Instance - Version History'
        },
        redirect: to => {
            const store = useStore()
            let route = 'instance-version-history-timeline'
            if (store && store?.state?.account?.teamMembership) {
                route = 'instance-snapshots'
            }
            return { name: route, params: { id: to.params.id } }
        },
        children: [...VersionHistoryRoutes]
    }
]

export { children }

export default [
    {
        path: 'project/:id/:remaining*',
        redirect: { name: 'Instance' }
    },
    {
        path: ':id/:remaining*',
        redirect: { name: 'instance-overview' },
        name: 'Instance',
        component: Instance,
        meta: {
            title: 'Instance - Overview'
        },
        children
    }
]
