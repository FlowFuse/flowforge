import store from '../../store/index.js'

import ApplicationActivity from './Activity.vue'
import Dependencies from './Dependencies/Dependencies.vue'
import ApplicationDeviceGroupSettingsEnvironment from './DeviceGroup/Settings/Environment.vue'
import ApplicationDeviceGroupSettingsGeneral from './DeviceGroup/Settings/General.vue'
import ApplicationDeviceGroupSettings from './DeviceGroup/Settings/index.vue'
import ApplicationDeviceGroupDevices from './DeviceGroup/devices.vue'
import ApplicationDeviceGroupIndex from './DeviceGroup/index.vue'
import ApplicationDeviceGroups from './DeviceGroups.vue'
import ApplicationDevices from './Devices.vue'
import ApplicationLogs from './Logs.vue'
import ApplicationOverview from './Overview.vue'
import ApplicationPipelineCreate from './Pipeline/create.vue'
import ApplicationPipelineIndex from './Pipeline/index.vue'
import ApplicationPipelineStageCreate from './PipelineStage/create.vue'
import ApplicationPipelineStageEdit from './PipelineStage/edit.vue'
import ApplicationPipelines from './Pipelines.vue'
import ApplicationSettings from './Settings.vue'
import ApplicationSnapshots from './Snapshots.vue'
import ApplicationCreateInstance from './createInstance.vue'
import ApplicationIndex from './index.vue'

// import account vuex store

export default [
    {
        path: ':id',
        redirect: function () {
            const features = store.getters['account/featuresCheck']
            if (features.isHostedInstancesEnabledForTeam) {
                return { name: 'ApplicationInstances' }
            } else {
                return { name: 'ApplicationDevices' }
            }
        },
        name: 'Application',
        component: ApplicationIndex,
        meta: {
            title: 'Application - Overview'
        },
        children: [
            {
                path: 'instances',
                name: 'ApplicationInstances',
                component: ApplicationOverview,
                meta: {
                    title: 'Application - Instances'
                }
            },
            {
                path: 'devices',
                name: 'ApplicationDevices',
                component: ApplicationDevices,
                meta: {
                    title: 'Application - Devices'
                }
            },
            {
                path: 'device-groups',
                name: 'ApplicationDeviceGroups',
                component: ApplicationDeviceGroups,
                meta: {
                    title: 'Application - Devices Groups'
                }
            },
            {
                path: 'snapshots',
                name: 'ApplicationSnapshots',
                component: ApplicationSnapshots,
                meta: {
                    title: 'Application - Snapshots'
                }
            },
            {
                path: 'pipelines',
                name: 'ApplicationPipelines',
                component: ApplicationPipelines,
                meta: {
                    title: 'Application - Pipelines'
                }
            },
            {
                name: 'application-settings',
                path: 'settings',
                component: ApplicationSettings,
                meta: {
                    title: 'Application - Settings'
                }
            },
            {
                path: 'logs',
                component: ApplicationLogs,
                name: 'application-logs',
                meta: {
                    title: 'Application - Logs',
                    shouldPoll: true
                }
            },
            {
                path: 'activity',
                name: 'application-activity',
                component: ApplicationActivity,
                meta: {
                    title: 'Application - Activity'
                }
            },
            // { path: 'debug', component: ApplicationDebug }

            {
                path: 'pipelines/create',
                name: 'CreatePipeline',
                component: ApplicationPipelineCreate,
                meta: {
                    title: 'Pipeline - Create'
                }
            },

            {
                path: 'pipelines/:pipelineId',
                name: 'EditPipeline',
                component: ApplicationPipelineIndex,
                meta: {
                    title: 'Pipeline'
                },
                redirect: { name: 'CreatePipelineStage' },
                children: [
                    {
                        path: 'stages/create',
                        name: 'CreatePipelineStage',
                        component: ApplicationPipelineStageCreate,
                        meta: {
                            title: 'Pipeline Stage - Create'
                        }
                    },
                    {
                        path: 'stages/:stageId/edit',
                        name: 'EditPipelineStage',
                        component: ApplicationPipelineStageEdit,
                        meta: {
                            title: 'Pipeline Stage - Edit'
                        }
                    }
                ]
            },
            {
                path: 'dependencies',
                name: 'application-dependencies',
                component: Dependencies,
                meta: {
                    title: 'Dependencies'
                }
            }
        ]
    },
    {
        path: ':id/instances/create',
        name: 'ApplicationCreateInstance',
        component: ApplicationCreateInstance,
        props: route => ({
            sourceInstanceId: route.query.sourceInstanceId
        }),
        meta: {
            title: 'Application - Instances - Create',
            menu: {
                type: 'back',
                backTo: ({ query, params }) => {
                    return {
                        label: 'Back',
                        to: { name: 'ApplicationInstances', params, query }
                    }
                }
            }
        }
    },
    {
        path: ':applicationId/device-group/:deviceGroupId',
        name: 'ApplicationDeviceGroupIndex',
        component: ApplicationDeviceGroupIndex,
        meta: {
            title: 'Application - Device Group'
        },
        redirect: { name: 'ApplicationDeviceGroupDevices' },
        children: [
            {
                path: 'devices',
                name: 'ApplicationDeviceGroupDevices',
                component: ApplicationDeviceGroupDevices,
                meta: {
                    title: 'Application - Device Group - Members'
                }
            },
            {
                path: 'settings',
                name: 'ApplicationDeviceGroupSettings',
                component: ApplicationDeviceGroupSettings,
                meta: {
                    title: 'Application - Device Group - Settings'
                },
                redirect: {
                    name: 'ApplicationDeviceGroupSettingsGeneral'
                },
                children: [
                    {
                        path: 'general',
                        name: 'ApplicationDeviceGroupSettingsGeneral',
                        component: ApplicationDeviceGroupSettingsGeneral,
                        meta: {
                            title: 'Application - Device Group - Settings - General'
                        }
                    },
                    {
                        path: 'environment',
                        name: 'ApplicationDeviceGroupSettingsEnvironment',
                        component: ApplicationDeviceGroupSettingsEnvironment,
                        meta: {
                            title: 'Application - Device Group - Settings - Environment'
                        }
                    }
                ]
            }
        ]
    }
]
