import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import type { DraftData } from '../../../types/draft'

export function useDraft() {
  const route = useRoute(), router = useRouter()
  const currentYear = Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Moscow', year: 'numeric' }).format(new Date()))
  const years = Array.from({ length: currentYear - 2002 }, (_, i) => currentYear - i)
  const readYear = () => years.includes(Number(route.query.year)) ? Number(route.query.year) : currentYear
  const readRound = () => route.query.round === '2' ? 2 : 1
  const year = ref(readYear()), round = ref(readRound())
  const query = useQuery({
    queryKey: computed(() => ['nba-draft', year.value]),
    queryFn: async ({ signal, queryKey }) => {
      const response = await fetch(`/api/draft/${queryKey[1]}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось загрузить драфт')
      return data as DraftData
    },
    staleTime: 300000, retry: 1
  })
  watch([year, round], () => {
    if (route.query.year !== String(year.value) || route.query.round !== String(round.value)) void router.replace({ query: { ...route.query, year: String(year.value), round: String(round.value) } })
  })
  watch(() => [route.query.year, route.query.round], () => { year.value = readYear(); round.value = readRound() })
  return { year, years, round, query, picks: computed(() => query.data.value?.picks.filter(p => p.round === round.value) || []) }
}
