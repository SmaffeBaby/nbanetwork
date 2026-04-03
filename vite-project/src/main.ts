import { createApp } from 'vue'
import './style.css'
import './main.css'
import './assets/style.css'
import 'swiper/css'
import App from './App.vue'
import { router } from './router'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'


const app = createApp(App)

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