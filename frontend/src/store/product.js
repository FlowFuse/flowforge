// initial state
const state = () => ({
    flags: null,
    interview: null
})

// getters
const getters = {
    settings (state) {
        return state.settings
    }
}

const mutations = {
    setFlags (state, flags) {
        state.flags = flags
    },
    setInterview (state, payload) {
        state.interview = payload
    }
}

// actions
const actions = {
    async checkFlags (state) {
        try {
            window.posthog?.onFeatureFlags((flags, values) => {
                const storeFlags = {}
                for (const flagName of flags) {
                    const payload = window.posthog?.getFeatureFlagPayload(flagName)
                    storeFlags[flagName] = {
                        value: values[flagName],
                        payload
                    }

                    /*
                        Check if an interview flag
                    */

                    const flagStartsWithKeyword = flagName.startsWith('interview-')
                    const flagEnabled = window.posthog?.isFeatureEnabled(flagName, { send_event: false })
                    const flagNotShownBefore = !localStorage.getItem('ph-$interview-popup-seen')

                    if (flagStartsWithKeyword && flagEnabled && flagNotShownBefore) {
                        const interview = {
                            flag: flagName,
                            enabled: flagEnabled,
                            payload
                        }
                        state.commit('setInterview', interview)
                    }
                }
                state.commit('setFlags', storeFlags)
            })
        } catch (err) {
            console.error('posthog error logging feature flags')
        }
    }
}

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
