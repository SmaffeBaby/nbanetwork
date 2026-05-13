import { getTodayDateKey } from '../NBA/games/useGamesByDate'

export function useAppFooter() {
  const currentYear = new Date().getFullYear()
  const githubUrl = import.meta.env.VITE_GITHUB_URL ?? 'https://github.com/SmaffeBaby/nbanetwork'
  const telegramUrl = import.meta.env.VITE_TELEGRAM_URL ?? 'https://t.me/+ttWqWDPotOAyM2Ni'

  const pageLinks = [
    { label: 'Главная', to: '/' },
    { label: 'Матчи', to: `/games/${getTodayDateKey()}` },
    { label: 'Турнирная таблица', to: '/standings' },
    { label: 'Плей-офф', to: '/playoffs' },
    { label: 'Команды', to: '/teams' },
    { label: 'Статистика игроков', to: '/player-stats' },
    { label: 'Новости', to: '/news' }
  ]

  const accountLinks = [
    { label: 'Профиль', to: '/profile' }
  ]

  const legalLinks = [
    { label: 'Пользовательское соглашение', to: '/legal/terms-of-use' },
    { label: 'Политика конфиденциальности', to: '/legal/privacy-policy' },
    { label: 'Cookie Policy', to: '/legal/cookie-policy' },
    { label: 'Правовая оговорка об NBA', to: '/legal/trademark-disclaimer' },
    { label: 'Copyright Policy', to: '/legal/copyright-policy' },
    { label: 'Политика общения', to: '/legal/community-policy' }
  ]

  return {
    currentYear,
    githubUrl,
    telegramUrl,
    pageLinks,
    accountLinks,
    legalLinks
  }
}
