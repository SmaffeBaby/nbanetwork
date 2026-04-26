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
    { path: '/player-stats', name: 'PlayerStatsAll', component: PlayerStats },
    { path: '/player-stats/all', name: 'PlayerStatsAllType', component: PlayerStats },
    { path: '/player-stats/playoffs', name: 'PlayerStatsPlayoffs', component: PlayerStats },
    { path: '/player/:name',name: 'PlayerPage', component: () => import('../views/PlayerPage.vue')},
    { path: '/team/:abbr', name: 'TeamDetail', component: () => import('../views/TeamDetail.vue')},
    { path: '/game/:gameId', name: 'GameDetail', component: () => import('../views/GameDetail.vue')}
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})