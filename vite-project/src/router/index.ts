import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Profile from '../views/Profile.vue'
import Standings from '../views/Standings.vue'
import Teams from '../views/Teams.vue'
import PlayerStats from '../views/PlayerStats.vue'
import { getTodayDateKey } from '../composables/NBA/games/useGamesByDate'

const routes = [
    { path: '/', component: Home },
    { path: '/profile', component: Profile },
    { path: '/profile/:id', name: 'PublicProfile', component: () => import('../views/PublicProfile.vue') },
    { path: '/standings', component: Standings },
    { path: '/playoffs', name: 'Playoffs', component: () => import('../views/Playoffs.vue')},
    { path: '/teams', component: Teams },
    { path: '/games', redirect: () => `/games/${getTodayDateKey()}` },
    { path: '/games/:date', name: 'GamesByDate', component: () => import('../views/GamesByDate.vue') },
    { path: '/news', name: 'News', component: () => import('../views/News.vue') },
    { path: '/news/:slug', name: 'NewsArticle', component: () => import('../views/NewsArticle.vue') },
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
