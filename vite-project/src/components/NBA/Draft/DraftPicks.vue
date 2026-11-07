<template>
  <div class="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
    <table class="w-full min-w-[620px] text-left text-sm">
      <caption class="sr-only">Выборы {{ round }}-го раунда драфта {{ year }} года</caption>
      <thead class="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th scope="col" class="px-5 py-4">Пик</th><th scope="col" class="px-4 py-4">Игрок</th><th scope="col" class="px-4 py-4">Команда / права</th><th scope="col" class="px-5 py-4">Университет / клуб</th></tr></thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="pick in picks" :key="pick.overall" class="transition hover:bg-blue-50/40">
          <th scope="row" class="px-5 py-5"><span class="text-lg font-black tabular-nums" :class="pick.overall <= 3 ? 'text-blue-600' : 'text-slate-800'">{{ String(pick.overall).padStart(2, '0') }}</span><span class="mt-1 block whitespace-nowrap text-[10px] font-medium text-slate-400">№ {{ pick.pick }} в раунде</span></th>
          <td class="px-4 py-5"><RouterLink v-if="pick.player" :to="{ name: 'PlayerPage', params: { name: pick.player.name } }" class="flex items-center gap-3 font-extrabold text-slate-900 hover:text-blue-600"><PlayerPhoto :player-id="pick.player.photoId" :name="pick.player.name" /><span><span class="hover:underline">{{ pick.player.name }}</span><span class="mt-1 block text-xs font-normal text-slate-400">{{ pick.player.position || '—' }}</span></span></RouterLink><span v-else class="text-slate-400">Ожидается выбор</span></td>
          <td class="px-4 py-5"><DraftTeam :team="pick.owner" /><div v-if="pick.traded" class="mt-2 text-xs leading-5 text-slate-500"><template v-if="pick.selectedBy && pick.owner?.abbr !== pick.selectedBy.abbr">Обмен · выбор {{ pick.selectedBy.abbr }}</template><template v-else>{{ pick.tradeNote || 'Пик обменян' }}</template></div></td>
          <td class="px-5 py-5 text-xs text-slate-500">{{ pick.player?.school || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<script setup lang="ts">
import DraftTeam from './DraftTeam.vue'
import PlayerPhoto from '../PlayerPhoto.vue'
import type { DraftPick } from '../../../types/draft'
defineProps<{ picks: DraftPick[]; year: number; round: number }>()
</script>
