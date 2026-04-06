import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Profile from '../views/Profile.vue'
import Standings from '../views/Standings.vue'
import Teams from '../views/Teams.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/profile', component: Profile },
    { path: '/standings', component: Standings },
    { path: '/teams', component: Teams },
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})