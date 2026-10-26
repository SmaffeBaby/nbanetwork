<template>
  <button
      type="button"
      :title="title"
      :aria-label="title"
      class="inline-flex items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-lg ring-1 ring-black/5 backdrop-blur transition hover:bg-white hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      :class="sizeClasses"
      :disabled="pending"
      @click.stop.prevent="toggle"
  >
    <HeartSolidIcon v-if="isFavorite" class="h-[62%] w-[62%]" />
    <HeartOutlineIcon v-else class="h-[62%] w-[62%]" />
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { HeartIcon as HeartOutlineIcon } from '@heroicons/vue/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/vue/24/solid'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../../../stores/auth'

const props = withDefaults(defineProps<{
  teamAbbr: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md'
})

const auth = useAuthStore()
const { user } = storeToRefs(auth)
const toast = useToast()
const pending = ref(false)

const normalizedTeam = computed(() => props.teamAbbr.trim().toUpperCase())
const isFavorite = computed(() =>
    Boolean(user.value?.favoriteTeams.includes(normalizedTeam.value))
)
const title = computed(() =>
    isFavorite.value ? 'Убрать из любимых' : 'Добавить в любимые'
)
const sizeClasses = computed(() => ({
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12'
}[props.size]))

const toggle = async () => {
  if (!user.value) {
    toast.info('Войдите, чтобы выбирать любимые команды')
    return
  }

  pending.value = true
  await auth.toggleFavoriteTeam(normalizedTeam.value)
  pending.value = false
}
</script>
