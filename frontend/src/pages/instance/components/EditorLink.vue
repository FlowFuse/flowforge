<template>
    <div :data-type="`${isImmersiveEditor ? 'immersive' : 'standard'}-editor`" @mouseup.stop.prevent="openEditor">
        <slot name="default">
            <ff-button
                v-ff-tooltip:left="(editorDisabled || disabled) ? disabledReason : undefined"
                kind="secondary"
                data-action="open-editor"
                :disabled="buttonDisabled"
                class="whitespace-nowrap"
                :emit-instead-of-navigate="true"
            >
                <template v-if="showText" #icon-left>
                    <ProjectIcon />
                </template>
                <template v-else #icon>
                    <ProjectIcon />
                </template>
                <template v-if="showText">
                    {{ editorDisabled ? 'Editor Disabled' : 'Open Editor' }}
                </template>
            </ff-button>
        </slot>
    </div>
</template>

<script>

import SemVer from 'semver'

import { mapState } from 'vuex'

import ProjectIcon from '../../../components/icons/Projects.js'
import { useNavigationHelper } from '../../../composables/NavigationHelper.js'

export default {
    name: 'InstanceEditorLink',
    components: { ProjectIcon },
    inheritAttrs: false,
    props: {
        editorDisabled: {
            default: false,
            type: Boolean
        },
        disabled: {
            default: false,
            type: Boolean
        },
        disabledReason: {
            default: null,
            type: String
        },
        instance: {
            type: Object,
            required: true
        },
        showText: {
            default: true,
            type: Boolean
        }
    },
    setup () {
        const { openInANewTab } = useNavigationHelper()

        return {
            openInANewTab
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        isImmersiveEditor () {
            // Immersive Editor only available for:
            // - Node-RED 4.0.2+
            // - Launcher 2.6.0+
            const validNR = SemVer.satisfies(this.instance?.meta?.versions?.['node-red'], '>=4.0.2', { includePrerelease: true })
            const validLauncher = SemVer.satisfies(SemVer.coerce(this.instance?.meta?.versions?.launcher), '>=2.6.0')
            return validNR && validLauncher
        },
        url () {
            if (this.isImmersiveEditor) {
                return this.$router.resolve({ name: 'instance-editor', params: { id: this.instance.id, team_slug: this.team.slug } }).fullPath
            }

            return this.editorURL
        },
        editorURL () {
            return this.instance.url || this.instance.editor?.url
        },
        buttonDisabled: function () {
            return this.editorDisabled || this.disabled || !this.url
        }
    },
    methods: {
        openEditor (evt) {
            if (this.disabled) {
                return false
            }

            const target = `_${this.instance.id}`
            if (!this.isImmersiveEditor) {
                return this.openInANewTab(this.editorURL, target)
            } else {
                return this.openInANewTab(this.url, target)
            }
        }
    }
}
</script>
