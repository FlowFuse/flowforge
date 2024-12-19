<template>
    <Teleport v-if="mounted" to="#platform-banner">
        <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
    </Teleport>
    <ff-page>
        <div class="max-w-2xl m-auto">
            <ff-loading
                v-if="loading"
                message="Creating Application..."
            />
            <InstanceForm
                v-else
                :instance="projectDetails"
                :applications="applications"
                :applicationSelection="applicationCreated"
                :team="team"
                :applicationFieldsLocked="applicationCreated"
                :applicationFieldsVisible="true"
                :billing-enabled="!!features.billing"
                :flow-blueprints-enabled="!!features.flowBlueprints"
                :submit-errors="errors"
                @on-submit="handleFormSubmit"
            />
        </div>
    </ff-page>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import ApplicationApi from '../../api/application.js'
import InstanceApi from '../../api/instances.js'

import TeamTrialBanner from '../../components/banners/TeamTrial.vue'
import Alerts from '../../services/alerts.js'
import InstanceForm from '../instance/components/InstanceForm.vue'

export default {
    name: 'CreateApplication',
    components: {
        InstanceForm,
        TeamTrialBanner
    },
    data () {
        return {
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            loading: false,
            mounted: false,
            errors: {
                name: ''
            },
            projectDetails: null,
            application: {}
        }
    },
    computed: {
        ...mapState('account', ['features', 'team']),

        applicationCreated () {
            return !!this.application?.id
        },

        // Used when application has already been created to select it from dropdown
        applications () {
            if (!this.applicationCreated) {
                return []
            }

            return [{
                label: this.application.name,
                value: this.application.id
            }]
        }
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        async handleFormSubmit (formData, copyParts) {
            this.loading = true

            const { applicationName, applicationDescription, ...projectFields } = formData
            const applicationFields = { name: applicationName, description: applicationDescription }

            try {
                if (!this.applicationCreated) {
                    this.application = await this.createApplication(applicationFields)
                }
                if (!formData.createInstance) {
                    this.$router.push({ name: 'Application', params: { id: this.application.id } })
                }
            } catch (err) {
                if (err.response.data?.error) {
                    Alerts.emit('Failed to create application: ' + err.response.data.error, 'warning', 7500)
                } else {
                    Alerts.emit('Failed to create application', 'warning', 7500)
                    console.error(err)
                }

                this.loading = false
                return
            }
            if (formData.createInstance) {
                try {
                    const instance = await this.createProject(projectFields, copyParts)

                    await this.$store.dispatch('account/refreshTeam')

                    this.$router.push({ name: 'Instance', params: { id: instance.id, team_slug: this.team.slug } })
                } catch (err) {
                    this.projectDetails = projectFields
                    if (err.response?.status === 409) {
                        this.errors.name = err.response.data.error
                    } else if (err.response?.status === 400) {
                        Alerts.emit('Failed to create instance: ' + err.response.data.error, 'warning', 7500)
                    } else {
                        Alerts.emit('Failed to create instance')
                        console.error(err)
                    }

                    this.loading = false
                }
            }
        },
        createApplication (applicationDetails) {
            const createPayload = { ...applicationDetails, teamId: this.team.id }
            return ApplicationApi.createApplication(createPayload)
        },
        createProject (projectDetails, copyParts) {
            const createPayload = { ...projectDetails, applicationId: this.application.id }
            return InstanceApi.create(createPayload)
        }
    }
}
</script>
