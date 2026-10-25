import { computed, ref, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { authFetch } from '../../api/authFetch'
import { useAuthStore } from '../../stores/auth'

export type SubscriptionProfile = {
  id: string
  first_name: string
  last_name: string
  avatar_img: string | null
}
type FollowRow = { following_id: string; profiles: SubscriptionProfile | SubscriptionProfile[] | null }

export function useProfileFollows() {
  const auth = useAuthStore()
  const client = useQueryClient()
  const ownerId = computed(() => auth.user?.id ?? '')
  const queryKey = computed(() => ['profile-subscriptions', ownerId.value])
  const mutationError = ref('')
  const query = useQuery({
    queryKey,
    enabled: computed(() => Boolean(ownerId.value && !auth.loading)),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: 60_000,
    queryFn: async ({ queryKey: [, id], signal }) => {
      const revision = auth.followingRevision
      const data = await authFetch('/api/profile-follows', { signal, cache: 'no-store' })
      if (!Array.isArray(data.follows)) throw new Error('Не удалось прочитать список подписок.')
      const rows = data.follows as FollowRow[]
      auth.syncFollowingProfiles(rows.map(row => row.following_id), String(id), revision)
      return rows.map(row => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        return profile ?? { id: row.following_id, first_name: 'Пользователь', last_name: '', avatar_img: null }
      })
    }
  })
  const profiles = computed(() => query.data.value ?? [])
  const error = computed(() => mutationError.value || (query.isError.value ? 'Не удалось обновить подписки. Попробуйте ещё раз.' : ''))

  const setFollowing = async (profileId: string, following: boolean) => {
    if (!ownerId.value || auth.followingPending.includes(profileId)) return
    const key = [...queryKey.value]
    mutationError.value = ''
    await client.cancelQueries({ queryKey: key })
    try {
      await auth.setProfileFollowing(profileId, following)
    } catch (cause: any) {
      if (ownerId.value === key[1]) mutationError.value = cause?.message || 'Не удалось изменить подписку.'
    } finally {
      await client.invalidateQueries({ queryKey: key }, { cancelRefetch: false })
    }
  }

  // Other parts of the app use the same store actions. Refresh only after writes
  // finish, so a read cannot race with an optimistic subscription change.
  watch(() => auth.followingRevision, () => {
    if (!ownerId.value) return
    if (auth.followingPending.length) {
      void client.cancelQueries({ queryKey: queryKey.value })
    } else {
      void client.invalidateQueries({ queryKey: queryKey.value }, { cancelRefetch: false })
    }
  })

  return {
    profiles,
    loading: computed(() => query.isPending.value && Boolean(ownerId.value)),
    error,
    retry: () => { mutationError.value = ''; return query.refetch() },
    pending: computed(() => auth.followingPending),
    setFollowing
  }
}
