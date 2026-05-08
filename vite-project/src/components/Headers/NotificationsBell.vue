<template>
  <div v-if="user" class="relative">
    <button
        type="button"
        title="Уведомления"
        class="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
        @click="toggleOpen"
    >
      <BellIcon class="h-6 w-6" />
      <span
          v-if="unreadCount"
          class="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
      >
        {{ unreadCount }}
      </span>
    </button>

    <div
        v-if="open"
        class="absolute right-0 z-[100] mt-3 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white shadow-2xl"
    >
      <div class="border-b border-gray-100 p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-bold text-gray-900">Уведомления</h2>
            <p class="text-xs text-gray-500">Комментарии от пользователей, на которых вы подписаны</p>
          </div>

          <label class="inline-flex cursor-pointer items-center gap-2">
            <input
                type="checkbox"
                class="sr-only peer"
                :checked="user.notifyFollowedComments"
                @change="toggleNotify"
            />
            <span class="relative h-6 w-11 rounded-full bg-gray-200 transition after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:bg-blue-600 peer-checked:after:translate-x-5"></span>
          </label>
        </div>

        <div class="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
          Подписки: {{ followsCount }}. Уведомления создаются даже если сайт закрыт.
        </div>

        <button
            v-if="notifications.length"
            type="button"
            class="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 active:scale-95"
            @click="clearNotifications"
        >
          Очистить уведомления
        </button>
      </div>

      <div class="max-h-96 overflow-y-auto p-2">
        <RouterLink
            v-for="notification in notifications"
            :key="notification.id"
            :to="`/game/${notification.gameId}`"
            class="flex gap-3 rounded-xl p-3 transition hover:bg-gray-50"
            @click="open = false"
        >
          <img
              v-if="notification.avatarImg"
              :src="notification.avatarImg"
              alt="User avatar"
              class="h-10 w-10 rounded-full object-cover"
          />
          <div
              v-else
              class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600"
          >
            {{ notification.userName.charAt(0) || 'U' }}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm font-semibold text-gray-900">{{ notification.userName }}</span>
              <span
                  v-if="!notification.readAt"
                  class="h-2 w-2 rounded-full bg-blue-500"
              ></span>
            </div>
            <p class="mt-0.5 text-xs text-gray-600">
              оставил комментарий {{ formatTime(notification.createdAt) }}
            </p>
            <p class="mt-1 truncate text-xs font-medium text-gray-500">
              {{ notification.gameLabel }}
            </p>
          </div>
        </RouterLink>

        <div
            v-if="notifications.length === 0"
            class="p-6 text-center text-sm text-gray-500"
        >
          Пока нет уведомлений.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { BellIcon } from '@heroicons/vue/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '../../lib/supabase'
import { isRealtimeEnabled } from '../../lib/realtime'
import { authFetch } from '../../api/authFetch'
import { useAuthStore } from '../../stores/auth'

type NotificationRow = {
  id: string
  actor_id: string
  game_id: string
  comment_id: string
  created_at: string
  read_at: string | null
  profiles?: {
    first_name: string
    last_name: string
    avatar_img: string | null
  } | null
}

type NotificationItem = {
  id: string
  userName: string
  avatarImg: string | null
  gameId: string
  gameLabel: string
  createdAt: string
  readAt: string | null
}

const auth = useAuthStore()
const queryClient = useQueryClient()
const open = ref(false)
const gameLabels = ref<Record<string, string>>({})
let channel: ReturnType<typeof supabase.channel> | null = null

const user = computed(() => auth.user)
const userId = computed(() => user.value?.id ?? '')

const fetchGameLabel = async (gameId: string) => {
  if (gameLabels.value[gameId]) return gameLabels.value[gameId]

  try {
    const res = await fetch(`/api/game-recap/${gameId}`)
    if (!res.ok) throw new Error('No game')

    const data = await res.json()
    const meta = data?.meta
    const label = meta?.awayTeam && meta?.homeTeam
        ? `${meta.awayTeam} @ ${meta.homeTeam}`
        : `Матч ${gameId}`

    gameLabels.value = { ...gameLabels.value, [gameId]: label }
    return label
  } catch {
    const label = `Матч ${gameId}`
    gameLabels.value = { ...gameLabels.value, [gameId]: label }
    return label
  }
}

const normalizeRows = (value: unknown): NotificationRow[] => {
  return ((value ?? []) as NotificationRow[]).map(row => ({
    ...row,
    profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null
  }))
}

const notificationsQuery = useQuery({
  queryKey: computed(() => ['profile-comment-notifications', userId.value]),
  enabled: computed(() => Boolean(userId.value)),
  refetchInterval: 5000,
  queryFn: async () => {
    const data = await authFetch('/api/profile-notifications')
    const rows = normalizeRows(data.notifications)
    await Promise.all([...new Set(rows.map(row => row.game_id))].map(fetchGameLabel))
    return rows
  }
})

const followsCountQuery = useQuery({
  queryKey: computed(() => ['profile-follows-count', userId.value]),
  enabled: computed(() => Boolean(userId.value)),
  refetchInterval: 10000,
  queryFn: async () => {
    const data = await authFetch('/api/profile-follows/count')
    return data.count ?? 0
  }
})

const rows = computed(() => notificationsQuery.data.value ?? [])
const followsCount = computed(() => followsCountQuery.data.value ?? 0)
const notifications = computed<NotificationItem[]>(() =>
    rows.value.map(row => {
      const first = row.profiles?.first_name ?? ''
      const last = row.profiles?.last_name ?? ''
      const userName = `${first} ${last}`.trim() || 'Пользователь'

      return {
        id: row.id,
        userName,
        avatarImg: row.profiles?.avatar_img ?? null,
        gameId: row.game_id,
        gameLabel: gameLabels.value[row.game_id] ?? `Матч ${row.game_id}`,
        createdAt: row.created_at,
        readAt: row.read_at
      }
    })
)
const unreadCount = computed(() =>
    rows.value.filter(notification => !notification.read_at).length
)

const toggleOpen = async () => {
  open.value = !open.value
  if (open.value) {
    await followsCountQuery.refetch()
    await markReadMutation.mutateAsync()
  }
}

const toggleNotify = async (event: Event) => {
  const input = event.target as HTMLInputElement
  await auth.updateNotifyFollowedComments(input.checked)
}

const formatTime = (date: string) => {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date))
}

const markReadMutation = useMutation({
  mutationFn: async () => {
    if (!userId.value || unreadCount.value === 0) return

    const unreadIds = rows.value
        .filter(notification => !notification.read_at)
        .map(notification => notification.id)
    const readAt = new Date().toISOString()

    await authFetch('/api/profile-notifications/read', {
      method: 'POST',
      body: JSON.stringify({ ids: unreadIds })
    })
  },
  onMutate: async () => {
    await queryClient.cancelQueries({ queryKey: ['profile-comment-notifications', userId.value] })
    const previous = rows.value
    const readAt = new Date().toISOString()

    queryClient.setQueryData(
        ['profile-comment-notifications', userId.value],
        previous.map(row => ({ ...row, read_at: row.read_at ?? readAt }))
    )

    return { previous }
  },
  onError: (_error, _variables, context) => {
    if (context?.previous) {
      queryClient.setQueryData(['profile-comment-notifications', userId.value], context.previous)
    }
  },
  onSettled: () => {
    void notificationsQuery.refetch()
  }
})

const clearMutation = useMutation({
  mutationFn: async (ids: string[]) => {
    if (!userId.value || ids.length === 0) return

    await authFetch('/api/profile-notifications', {
      method: 'DELETE',
      body: JSON.stringify({ ids })
    })
  },
  onMutate: async (ids) => {
    await queryClient.cancelQueries({ queryKey: ['profile-comment-notifications', userId.value] })
    const previous = rows.value
    queryClient.setQueryData(
        ['profile-comment-notifications', userId.value],
        previous.filter(notification => !ids.includes(notification.id))
    )
    return { previous }
  },
  onError: (_error, _variables, context) => {
    if (context?.previous) {
      queryClient.setQueryData(['profile-comment-notifications', userId.value], context.previous)
    }
  },
  onSettled: () => {
    void notificationsQuery.refetch()
  }
})

const clearNotifications = () => {
  clearMutation.mutate(rows.value.map(notification => notification.id))
}

const subscribe = () => {
  if (!isRealtimeEnabled()) return
  if (channel || !user.value) return

  channel = supabase
      .channel(`profile-comment-notifications-${user.value.id}`)
      .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'profile_comment_notifications',
            filter: `recipient_id=eq.${user.value.id}`
          },
          () => {
            void notificationsQuery.refetch()
          }
      )
      .subscribe()
}

const unsubscribe = async () => {
  if (!channel) return

  await supabase.removeChannel(channel)
  channel = null
}

watch(
    () => user.value?.id,
    async () => {
      await unsubscribe()
      await followsCountQuery.refetch()
      await notificationsQuery.refetch()
      subscribe()
    },
    { immediate: true }
)

onMounted(async () => {
  if (!auth.user) {
    await auth.init()
    auth.subscribeAuthState()
  }

  await notificationsQuery.refetch()
  await followsCountQuery.refetch()
  subscribe()
})

onUnmounted(() => {
  void unsubscribe()
})
</script>
