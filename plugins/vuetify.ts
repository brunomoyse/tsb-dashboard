// import this after install `@mdi/font` package
import '@mdi/font/css/materialdesignicons.css'

import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export default defineNuxtPlugin((app) => {
    const vuetify = createVuetify({
        defaults: {
            global: {
                font: {
                    size: '0.875rem',  // affects all text in v-app
                }
            }
        }
    })
    app.vueApp.use(vuetify)
})
