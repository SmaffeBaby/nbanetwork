import { computed, h, onBeforeUnmount, ref, watch } from 'vue'
import { type RouteLocationRaw, useRoute } from 'vue-router'
import { getTodayDateKey } from '../NBA/games/useGamesByDate'
import { useAuthPanel } from '../Auth/useAuthPanel'
import {
  createRegistrationConsentModels,
  registrationConsentItems
} from '../Auth/useRegistrationConsents'
import { useAppFooter } from '../Layout/useAppFooter'

type NavLink = {
  label: string
  to: RouteLocationRaw
  icon: ReturnType<typeof makeIcon>
  isActive: boolean
}

export function useHeaderBurger() {
  const isOpen = ref(false)
  const route = useRoute()
  const gamesPath = computed(() => `/games/${getTodayDateKey()}`)
  const { githubUrl, telegramUrl } = useAppFooter()

  const {
    email,
    password,
    firstName,
    lastName,
    acceptedTerms,
    acceptedPrivacy,
    acceptedCookies,
    acceptedTrademark,
    acceptedCopyright,
    acceptedCommunityPolicy,
    user,
    showForm,
    handleLogin,
    handleRegister,
    handleLogout,
    sendPasswordReset,
    loadingUser
  } = useAuthPanel()

  const consentModels = createRegistrationConsentModels({
    acceptedTerms,
    acceptedPrivacy,
    acceptedCookies,
    acceptedTrademark,
    acceptedCopyright,
    acceptedCommunityPolicy
  })

  const userInitials = computed(() => {
    const first = user.value?.firstName?.trim().charAt(0) ?? ''
    const last = user.value?.lastName?.trim().charAt(0) ?? ''
    const initials = `${first}${last}`.trim()

    return initials || 'U'
  })

  const userName = computed(() => {
    const fullName = `${user.value?.firstName ?? ''} ${user.value?.lastName ?? ''}`.trim()

    return fullName || user.value?.email || 'Пользователь'
  })

  const primaryLinks = computed<NavLink[]>(() => [
    {
      label: 'Главная',
      to: '/',
      icon: DashboardIcon,
      isActive: route.path === '/'
    },
    {
      label: 'Турнирная таблица',
      to: '/standings',
      icon: TableIcon,
      isActive: route.path === '/standings'
    },
    {
      label: 'Плейофф',
      to: '/playoffs',
      icon: PlayoffsIcon,
      isActive: route.path.startsWith('/playoffs')
    },
    {
      label: 'Команды',
      to: '/teams',
      icon: TeamsIcon,
      isActive: route.path.startsWith('/teams') || route.path.startsWith('/team/')
    },
    {
      label: 'Статистика игроков',
      to: '/player-stats',
      icon: BagIcon,
      isActive: route.path.startsWith('/player-stats') || route.path.startsWith('/player/')
    },
    {
      label: 'Новости',
      to: '/news',
      icon: InboxIcon,
      isActive: route.path.startsWith('/news')
    }
  ])

  function openDrawer() {
    isOpen.value = true
  }

  function closeDrawer() {
    isOpen.value = false
  }

  async function loginFromDrawer() {
    await handleLogin()
    if (user.value) closeDrawer()
  }

  async function registerFromDrawer() {
    await handleRegister()
  }

  async function logoutFromDrawer() {
    await handleLogout()
    closeDrawer()
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') closeDrawer()
  }

  watch(isOpen, (open) => {
    document.body.classList.toggle('overflow-hidden', open)
    if (open) {
      window.addEventListener('keydown', handleKeydown)
    } else {
      window.removeEventListener('keydown', handleKeydown)
    }
  })

  onBeforeUnmount(() => {
    document.body.classList.remove('overflow-hidden')
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    acceptedCommunityPolicy,
    acceptedCookies,
    acceptedCopyright,
    acceptedPrivacy,
    acceptedTerms,
    acceptedTrademark,
    BagIcon,
    CalendarIcon,
    closeDrawer,
    consentItems: registrationConsentItems,
    consentModels,
    DashboardIcon,
    email,
    firstName,
    gamesPath,
    githubUrl,
    InboxIcon,
    isOpen,
    lastName,
    loadingUser,
    loginFromDrawer,
    logoutFromDrawer,
    password,
    primaryLinks,
    registerFromDrawer,
    route,
    sendPasswordReset,
    showForm,
    SparklesIcon,
    telegramUrl,
    user,
    userInitials,
    userName,
    openDrawer
  }
}

function makeIcon(path: string, viewBox = '0 0 24 24') {
  return {
    render() {
      return h(
        'svg',
        {
          fill: 'none',
          viewBox,
          xmlns: 'http://www.w3.org/2000/svg',
          'aria-hidden': 'true'
        },
        [
          h('path', {
            d: path,
            stroke: 'currentColor',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'stroke-width': '2'
          })
        ]
      )
    }
  }
}

const DashboardIcon = makeIcon('M10 6.025A7.5 7.5 0 1 0 17.975 14H10V6.025ZM13.5 3c-.169 0-.334.014-.5.025V11h7.975c.011-.166.025-.331.025-.5A7.5 7.5 0 0 0 13.5 3Z')
const TableIcon = makeIcon('M15 5v14M9 5v14M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z')
const InboxIcon = makeIcon('M4 13h3.439a.991.991 0 0 1 .908.6 3.978 3.978 0 0 0 7.306 0 .99.99 0 0 1 .908-.6H20M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6M4 13l2-9h12l2 9M9 7h6m-7 3h8')
const TeamsIcon = makeIcon('M16 19h4a1 1 0 0 0 1-1v-1a3 3 0 0 0-3-3h-2m-2.236-4a3 3 0 1 0 0-4M3 18v-1a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Zm8-10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z')
const BagIcon = makeIcon('M9 10V6a3 3 0 0 1 3-3v0a3 3 0 0 1 3 3v4m3-2 .917 11.923A1 1 0 0 1 17.92 21H6.08a1 1 0 0 1-.997-1.077L6 8h12Z')
const CalendarIcon = makeIcon('M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z')
const PlayoffsIcon = makeIcon('M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Zm0 2H4v3a3 3 0 0 0 3 3m10-6h3v3a3 3 0 0 1-3 3')
const SparklesIcon = makeIcon('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm6 12 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z')
