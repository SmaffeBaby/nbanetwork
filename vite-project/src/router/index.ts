import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Profile from '../views/Profile.vue'
import Standings from '../views/Standings.vue'
import Teams from '../views/Teams.vue'
import PlayerStats from '../views/PlayerStats.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/profile', component: Profile },
    { path: '/standings', component: Standings },
    { path: '/teams', component: Teams },
    { path: '/player-stats', component: PlayerStats},
    { path: '/player/:name',name: 'PlayerPage', component: () => import('../views/PlayerPage.vue')},
    {path: '/team/:abbr', name: 'TeamDetail', component: () => import('../views/TeamDetail.vue')}
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})