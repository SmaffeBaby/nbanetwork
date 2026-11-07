import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '../../../stores/auth'
import type { PlayInData } from '../../../types/playIn'

export function usePlayIn() {
  const route = useRoute(), router = useRouter(), auth = useAuthStore()
  const currentYear = Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Moscow', year: 'numeric' }).format(new Date()))
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear + 1 - i)
  const readYear = () => years.includes(Number(route.query.year)) ? Number(route.query.year) : currentYear
  const readStage = () => route.query.stage === 'games' ? 'games' : 'bracket'
  const year = ref(readYear()), stage = ref(readStage())
  const query = useQuery({
    queryKey: computed(() => ['play-in', year.value]),
    queryFn: async ({ signal, queryKey }) => {
      const response = await fetch(`/api/play-in/${queryKey[1]}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(65000)]) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось загрузить плей-ин')
      return data as PlayInData
    },
    staleTime: 60000, retry: 1, refetchInterval: 60000
  })
  watch([year, stage], () => {
    if (route.query.year !== String(year.value) || route.query.stage !== stage.value) {
      void router.replace({ query: { ...route.query, year: String(year.value), stage: stage.value } })
    }
  })
  watch(() => [route.query.year, route.query.stage], () => { year.value = readYear(); stage.value = readStage() })
  return { year, years, stage, query, hideScores: computed(() => auth.loading || auth.user?.hideScores !== false) }
}
