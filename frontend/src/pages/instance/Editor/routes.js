import InstanceSettings from '../Settings/index.vue'
import InstanceSettingsRoutes from '../Settings/routes.js'
import VersionHistory from '../VersionHistory/index.vue'
import VersionHistoryRoutes from '../VersionHistory/routes.js'
import { children } from '../routes.js'

import InstanceEditor from './index.vue'

export default [
    {
        path: ':id/editor',
        name: 'instance-editor',
        component: InstanceEditor,
        meta: {
            title: 'Instance - Editor',
            layout: 'plain'
        },
        redirect: { name: 'instance-editor-overview' },
        children: [
            ...children.filter(child => !['settings', 'version-history'].includes(child.path)).map(child => {
                return {
                    ...child,
                    name: child.name.replace('instance-', 'instance-editor-')
                }
            }),
            {
                path: 'settings',
                name: 'instance-editor-settings',
                component: InstanceSettings,
                meta: {
                    title: 'Instance - Settings'
                },
                redirect: to => {
                    return { name: 'instance-editor-settings-general', params: { id: to.params.id } }
                },
                children: [
                    ...InstanceSettingsRoutes.map(child => {
                        return {
                            ...child,
                            name: child.name.replace('instance-settings', 'instance-editor-settings')
                        }
                    })
                ]
            },
            {
                path: 'version-history',
                name: 'instance-editor-version-history',
                component: VersionHistory,
                meta: {
                    title: 'Instance - Version History'
                },
                redirect: to => {
                    return { name: 'instance-editor-version-history-timeline', params: { id: to.params.id } }
                },
                children: [
                    ...VersionHistoryRoutes.map(child => {
                        return {
                            ...child,
                            name: child.name.replace('instance-', 'instance-editor-')
                        }
                    })
                ]
            }
        ]
    }
]
