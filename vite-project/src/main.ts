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

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)



const app = createApp(App)

app.use(createPinia())
app.use(Toast, {
    position: 'top-right',
    timeout: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true
})

app.use(router)
app.mount('#app')