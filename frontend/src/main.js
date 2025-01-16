import { LottieAnimation } from 'lottie-web-vue'

import { AxiosError } from 'axios'
import { createApp } from 'vue'

import './ui-components/index.scss'
// import '~shepherd.js/dist/css/shepherd.css'

// Product Tours
import VueShepherdPlugin from 'vue-shepherd'

import App from './App.vue'
import Loading from './components/Loading.vue'
import SectionNavigationHeader from './components/SectionNavigationHeader.vue'
import TeamLink from './components/router-links/TeamLink.vue'
import PageLayout from './layouts/Page.vue'
import router from './routes.js'
import Alerts from './services/alerts.js'
import { setupSentry } from './services/error-tracking.js'
import store from './store/index.js'

import './index.css'

import ForgeUIComponents from './ui-components/index.js'

store.commit('initializeStore')

const app = createApp(App)
    .use(ForgeUIComponents)
    .use(store)
    .use(router)
    .use(VueShepherdPlugin)

// Error tracking
setupSentry(app, router)

// Globally available FF Components
app.component('lottie-animation', LottieAnimation)
app.component('ff-page', PageLayout)
app.component('ff-page-header', SectionNavigationHeader)
app.component('ff-loading', Loading)
app.component('ff-team-link', TeamLink)

app.config.errorHandler = function (err, vm, info) {
    // Uncaught XHR errors bubble to here
    if (err instanceof AxiosError) {
        // API has returned error details
        const errorMessage =
            err.response?.data?.message ?? // deprecated format
            err.response?.data?.error // new format
        if (errorMessage) {
            return Alerts.emit(`Request Failed: ${errorMessage}`, 'warning')
        }

        // HTTP error only
        return Alerts.emit(`${err.message ?? 'Request Failed: Unknown error'}`, 'warning')
    }
}

app.config.globalProperties.$filters = {
    pluralize (amount, singular, plural = `${singular}s`) { return amount === 1 ? singular : plural }
}

app.mount('#app')
