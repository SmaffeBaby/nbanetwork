<template>
  <section class="space-y-3">
    <div>
      <h2 class="text-lg font-bold text-gray-900">Мои подписки</h2>
      <p class="text-sm text-gray-500">Профили, по комментариям которых можно получать уведомления.</p>
    </div>

    <div
        v-if="profiles.length"
        class="space-y-2"
    >
      <div
          v-for="profile in profiles"
          :key="profile.id"
          class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
      >
        <img
            v-if="profile.avatar_img"
            :src="profile.avatar_img"
            alt="User avatar"
            class="h-10 w-10 rounded-full object-cover"
        />
        <div
            v-else
            class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600"
        >
          {{ getInitials(profile) }}
        </div>

        <RouterLink
            :to="{ name: 'PublicProfile', params: { id: profile.id } }"
            class="min-w-0 flex-1"
        >
          <div class="truncate text-sm font-semibold text-gray-900 hover:text-blue-600">
            {{ getName(profile) }}
          </div>
          <div class="text-xs text-gray-500">Публичный профиль</div>
        </RouterLink>

        <button
            type="button"
            class="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 active:scale-95"
            @click="unfollow(profile.id)"
        >
          Отписаться
        </button>
      </div>
    </div>

    <div
        v-else
        class="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center text-sm text-gray-500"
    >
      Вы пока ни на кого не подписаны.
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '../../lib/supabase'
import { isRealtimeEnabled } from '../../lib/realtime'
import { authFetch } from '../../api/authFetch'
import { useAuthStore } from '../../stores/auth'

type SubscriptionProfile = {
  id: string
  first_name: string
  last_name: string
  avatar_img: string | null
}

const auth = useAuthStore()
const { user } = storeToRefs(auth)
const queryClient = useQueryClient()
const userId = computed(() => user.value?.id ?? '')
let channel: ReturnType<typeof supabase.channel> | null = null

const profilesQuery = useQuery({
  queryKey: computed(() => ['profile-subscriptions', userId.value]),
  enabled: computed(() => Boolean(userId.value)),
  refetchInterval: 5000,
  queryFn: async () => {
    const data = await authFetch('/api/profile-follows')

    return ((data.follows ?? []) as unknown as { profiles: SubscriptionProfile | SubscriptionProfile[] | null }[])
        .map(row => Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles)
        .filter((profile): profile is SubscriptionProfile => Boolean(profile))
  }
})

const profiles = computed(() => profilesQuery.data.value ?? [])

const subscribe = () => {
  if (!isRealtimeEnabled()) return
  if (!userId.value || channel) return

  channel = supabase
      .channel(`profile-follows-${userId.value}`)
      .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profile_follows',
            filter: `follower_id=eq.${userId.value}`
          },
          () => {
            void profilesQuery.refetch()
          }
      )
      .subscribe()
}

const unsubscribe = async () => {
  if (!channel) return

  await supabase.removeChannel(channel)
  channel = null
}

const getName = (profile: SubscriptionProfile) => {
  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
  return name || 'Пользователь'
}

const getInitials = (profile: SubscriptionProfile) => {
  const first = profile.first_name?.trim().charAt(0) ?? ''
  const last = profile.last_name?.trim().charAt(0) ?? ''
  return `${first}${last}`.trim() || 'U'
}

const unfollowMutation = useMutation({
  mutationFn: async (profileId: string) => {
    await auth.toggleFollowProfile(profileId)
  },
  onMutate: async (profileId) => {
    await queryClient.cancelQueries({ queryKey: ['profile-subscriptions', userId.value] })
    const previous = profiles.value

    queryClient.setQueryData(
        ['profile-subscriptions', userId.value],
        previous.filter(profile => profile.id !== profileId)
    )

    return { previous }
  },
  onError: (_error, _variables, context) => {
    if (context?.previous) {
      queryClient.setQueryData(['profile-subscriptions', userId.value], context.previous)
    }
  },
  onSettled: () => {
    void profilesQuery.refetch()
  }
})

const unfollow = (profileId: string) => {
  unfollowMutation.mutate(profileId)
}

watch(
    userId,
    async () => {
      await unsubscribe()
      await profilesQuery.refetch()
      subscribe()
    },
    { immediate: true }
)

watch(
    () => user.value?.followingProfiles.join('|'),
    () => {
      void profilesQuery.refetch()
    }
)

onMounted(() => {
  void profilesQuery.refetch()
  subscribe()
})

onUnmounted(() => {
  void unsubscribe()
})
</script>
