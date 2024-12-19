<template>
    <div>
        <FeatureUnavailable v-if="!isTimelineFeatureEnabledForPlatform" />
        <FeatureUnavailableToTeam v-else-if="!isTimelineFeatureEnabledForTeam" />
        <section
            v-if="isTimelineFeatureEnabled" id="visual-timeline" class="relative"
            :style="{height: listHeightCss}"
        >
            <transition-group name="fade">
                <ff-loading v-if="loading" message="Loading Timeline..." class="absolute top-0" />
                <ul v-else ref="timeline" data-el="timeline-list" class="timeline" :style="{'max-height': listHeightCss}">
                    <li v-for="event in activeTimeline" :key="event.id">
                        <timeline-event
                            :event="event"
                            :timeline="activeTimeline"
                            @preview-snapshot="showViewSnapshotDialog"
                            @restore-snapshot="forceRefresh(showRollbackDialog, $event, true)"
                            @compare-snapshot="forceRefresh(showCompareSnapshotDialog, $event)"
                            @delete-snapshot="forceRefresh(showDeleteSnapshotDialog, $event)"
                            @edit-snapshot="showEditSnapshotDialog"
                            @download-snapshot="showDownloadSnapshotDialog"
                            @download-package-json="downloadSnapshotPackage"
                            @set-device-target="showDeviceTargetDialog"
                            @load-more="fetchData(true)"
                        />
                    </li>
                </ul>
            </transition-group>
        </section>
        <section v-else>
            <empty-state>
                <template #img>
                    <img src="../../../../images/empty-states/instance-timeline.png" alt="pipelines-logo">
                </template>
                <template #header>
                    <span>Timeline Not Available</span>
                </template>
                <template #message>
                    <p>The Timeline provides a concise, chronological view of key activities within your Node-RED instance.</p>
                    <p>It tracks various events such as pipeline stage deployments, snapshot restorations, flow deployments, snapshot creations, and updates to instance settings.</p>
                    <p>This compact view helps you quickly understand the history of your instance, offering clear insight into when and what changes have been made.</p>
                </template>
            </empty-state>
        </section>
        <AssetDetailDialog ref="snapshotViewerDialog" data-el="dialog-view-snapshot" />
        <SnapshotExportDialog ref="snapshotExportDialog" data-el="dialog-export-snapshot" :project="instance" />
        <SnapshotEditDialog ref="snapshotEditDialog" data-el="dialog-edit-snapshot" @snapshot-updated="fetchData(false)" />
    </div>
</template>

<script>
import { mapGetters } from 'vuex'

import projectHistoryAPI from '../../../../api/projectHistory.js'
import EmptyState from '../../../../components/EmptyState.vue'
import FeatureUnavailable from '../../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../../components/banners/FeatureUnavailableToTeam.vue'
import AssetDetailDialog from '../../../../components/dialogs/AssetDetailDialog.vue'
import SnapshotEditDialog from '../../../../components/dialogs/SnapshotEditDialog.vue'
import { scrollTo } from '../../../../composables/Ux.js'
import featuresMixin from '../../../../mixins/Features.js'
import snapshotsMixin from '../../../../mixins/Snapshots.js'
import SnapshotExportDialog from '../../../application/Snapshots/components/dialogs/SnapshotExportDialog.vue'

import TimelineEvent from './components/TimelineEvent.vue'
export default {
    name: 'HistoryTimeline',
    components: {
        EmptyState,
        FeatureUnavailableToTeam,
        FeatureUnavailable,
        SnapshotEditDialog,
        SnapshotExportDialog,
        AssetDetailDialog,
        TimelineEvent
    },
    mixins: [snapshotsMixin, featuresMixin],
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        },
        reloadHooks: {
            type: Array,
            required: false,
            default: () => []
        }
    },
    data () {
        return {
            timeline: [],
            loading: false,
            listHeight: 0,
            next_cursor: undefined
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck']),
        canLoadMore () {
            return this.next_cursor !== undefined
        },
        activeTimeline () {
            if (this.canLoadMore) {
                return [...this.timeline, {
                    event: 'load-more',
                    id: 'load-more'
                }]
            } else return this.timeline
        },
        listHeightCss () {
            return this.listHeight ? `${this.listHeight}px` : '800px'
        }
    },
    watch: {
        reloadHooks: {
            handler: function () {
                this.fetchData(false)
            },
            deep: true
        },
        'instance.id': 'fetchData'
    },
    mounted () {
        this.fetchData()
        this.computeTimelineListMaxHeight()
        window.addEventListener('resize', this.computeTimelineListMaxHeight)
    },
    beforeUnmount () {
        window.removeEventListener('resize', this.computeTimelineListMaxHeight)
    },
    methods: {
        async fetchData (loadMore = false) {
            if (this.isTimelineFeatureEnabled) {
                if (!loadMore) {
                    this.loading = true
                }

                // handling a specific scenario where users can navigate to the source snapshot instance, and when they click back,
                // we retrieve the timeline for that instance and display it for a short period of time
                if (this.instance.id && this.instance.id === this.$route.params.id) {
                    const nextCursor = loadMore ? this.next_cursor : undefined
                    projectHistoryAPI.getHistory(this.instance.id, nextCursor, 10)
                        .then((response) => {
                            this.loading = false
                            if (loadMore) {
                                response.timeline.forEach(ev => {
                                    this.timeline.push(ev)
                                    if (this.$refs.timeline) {
                                        this.$nextTick(() => scrollTo(this.$refs.timeline, {
                                            top: this.$refs.timeline.scrollHeight,
                                            behavior: 'smooth'
                                        }))
                                    }
                                })
                            } else this.timeline = response.timeline
                            this.next_cursor = response.meta.next_cursor
                        })
                        .catch(e => e)
                }
            }
        },
        async forceRefresh (callback, ...payload) {
            callback(...payload)
                .then(() => this.fetchData(false))
                .catch(e => console.warn(e))
        },
        computeTimelineListMaxHeight () {
            if (!this.$route.path.includes('editor')) {
                const sectionHeader = document.querySelector('.ff-section-header')

                if (sectionHeader) {
                    const rect = sectionHeader.getBoundingClientRect()
                    const heightToBottom = window.innerHeight - rect.bottom

                    // also deduct the <main> tag padding and .ff-section-header's margin-bottom
                    this.listHeight = heightToBottom - 24.5 - 7
                }
            }
        }
    }
}
</script>

<style scoped lang="scss">
#visual-timeline {
    .timeline {
        border: 1px solid $ff-grey-300;
        border-radius: 3px;
        overflow: auto;

        li {

        }
    }
}
</style>
