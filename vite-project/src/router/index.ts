import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Profile from '../views/Profile.vue'
import Standings from '../views/Standings.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/profile', component: Profile },
    { path: '/standings', component: Standings },
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})