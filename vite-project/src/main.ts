import { createApp } from 'vue'
import './style.css'
import './main.css'
import './assets/style.css'
import 'swiper/css'
import 'flowbite'
import App from './App.vue'
import { router } from './router'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 15,
            gcTime: 1000 * 60 * 10,
            refetchOnWindowFocus: true,
            retry: 1
        }
    }
})



const app = createApp(App)

app.use(pinia)
app.use(Toast, {
    position: 'top-right',
    timeout: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true
})

app.use(VueQueryPlugin, { queryClient })
app.use(router)
app.mount('#app')
