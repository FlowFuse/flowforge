<template>
    <router-link
        v-slot="{ href, navigate }"
        v-bind="extendedProps"
        custom
    >
        <a
            v-bind="$attrs"
            :href="href"
            @click="navigate"
        >
            <slot />
        </a>
    </router-link>
</template>

<script>
import { RouterLink as DefaultRouterLink } from 'vue-router'
import { mapState } from 'vuex'

export default {
    name: 'TeamLink',
    inheritAttrs: false,
    props: {
        ...DefaultRouterLink.props
    },
    computed: {
        ...mapState('account', ['team']),
        extendedProps () {
            const props = { ...this.$props }
            if (!props.to.params.team_slug) {
                props.to.params.team_slug = this.team.slug
            }
            return props
        }
    }
}
</script>
