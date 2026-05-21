import { computed } from 'vue'
import { type RouteLocationRaw, useRoute } from 'vue-router'
import {
  ArchiveBoxIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  FireIcon,
  NewspaperIcon,
  SparklesIcon
} from '@heroicons/vue/24/solid'
import { getTodayDateKey } from '../NBA/games/useGamesByDate'
import { teamsFullNames } from '../../constants/TeamFullName'

type HeaderLink = {
  label: string
  to: RouteLocationRaw
  isActive: boolean
}

type HeaderFeatureLink = HeaderLink & {
  description: string
  icon: typeof CalendarDaysIcon
}

const westernTeamAbbrs = ['DAL', 'DEN', 'GSW', 'HOU', 'LAC', 'LAL', 'MEM', 'MIN', 'NOP', 'OKC', 'PHX', 'POR', 'SAC', 'SAS', 'UTA']
const easternTeamAbbrs = ['ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DET', 'IND', 'MIA', 'MIL', 'NYK', 'ORL', 'PHI', 'TOR', 'WAS']

function mapTeam(abbr: string) {
  return {
    abbr,
    name: teamsFullNames[abbr] ?? abbr,
    logo: `/logos/${abbr}.svg`
  }
}

const conferenceTeams = [
  {
    title: 'Западная конференция',
    teams: westernTeamAbbrs.map(mapTeam)
  },
  {
    title: 'Восточная конференция',
    teams: easternTeamAbbrs.map(mapTeam)
  }
]

const categoryLinks = [
  { label: 'Восток', to: '/standings' },
  { label: 'Запад', to: '/standings' },
  { label: 'Все команды', to: '/teams' },
  { label: 'Статистика игроков', to: '/player-stats' },
  { label: 'Новости', to: '/news' }
]

export function useHeader() {
  const route = useRoute()
  const gamesPath = computed(() => `/games/${getTodayDateKey()}`)

  const newsLink = computed<HeaderLink>(() => ({
    label: 'Новости',
    to: '/news',
    isActive: route.path.startsWith('/news')
  }))

  const gamesLink = computed<HeaderLink>(() => ({
    label: 'Игры',
    to: gamesPath.value,
    isActive: route.path.startsWith('/games')
  }))

  const playersLink = computed<HeaderLink>(() => ({
    label: 'Игроки',
    to: '/player-stats',
    isActive: route.path.startsWith('/player-stats') || route.path.startsWith('/player/')
  }))

  const primaryLinks = computed<HeaderLink[]>(() => [
    gamesLink.value
  ])

  const secondaryLinks = computed<HeaderLink[]>(() => [
    playersLink.value,
    newsLink.value
  ])

  const seasonLinks = computed<HeaderFeatureLink[]>(() => [
    {
      label: 'Регулярный чемпионат',
      description: 'Таблица Востока и Запада',
      to: '/standings',
      icon: ArchiveBoxIcon,
      isActive: route.path === '/standings'
    },
    {
      label: 'Плей-офф',
      description: 'Сетка, серии и матчи навылет',
      to: '/playoffs',
      icon: FireIcon,
      isActive: route.path.startsWith('/playoffs')
    }
  ])

  const featuredLinks = computed<HeaderFeatureLink[]>(() => [
    {
      label: 'Матчи сегодня',
      description: 'Расписание, счет и карточки игр',
      to: gamesPath.value,
      icon: CalendarDaysIcon,
      isActive: route.path.startsWith('/games')
    },
    {
      label: 'Обновления',
      description: 'Последние изменения платформы',
      to: '/patch-note',
      icon: SparklesIcon,
      isActive: route.path === '/patch-note'
    },
    {
      label: 'Все материалы',
      description: 'Новости, разборы и обсуждения',
      to: '/news',
      icon: NewspaperIcon,
      isActive: route.path.startsWith('/news')
    },
    {
      label: 'Профиль',
      description: 'Избранное, подписки и прогресс',
      to: '/profile',
      icon: ArchiveBoxIcon,
      isActive: route.path === '/profile'
    }
  ])

  const teamsIsActive = computed(() => route.path.startsWith('/teams') || route.path.startsWith('/team/'))
  const seasonIsActive = computed(() => route.path === '/standings' || route.path.startsWith('/playoffs'))
  const moreIsActive = computed(() => route.path === '/patch-note' || route.path === '/profile')

  return {
    categoryLinks,
    conferenceTeams,
    ChevronDownIcon,
    featuredLinks,
    gamesLink,
    moreIsActive,
    newsLink,
    playersLink,
    primaryLinks,
    seasonIsActive,
    seasonLinks,
    secondaryLinks,
    teamsIsActive
  }
}
