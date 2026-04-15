<template>
  <div>
    <h1 class="text-[10px] leading-15 font-bold break-words text-center pl-0 md:text-left md:pl-10 max-w-md">
      Карта конференций
    </h1>
  </div>
  <div class="w-full max-w-5xl mx-auto">
    <div
        class="relative overflow-hidden border rounded-xl cursor-grab select-none"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="endDrag"
        @mouseleave="endDrag"
        @wheel="onWheel"
        @contextmenu.prevent="handleContextMenu"
        @dblclick="handleDoubleClick"
    >
      <div
          class="relative"
          :style="transformStyle"
      >
        <img
            ref="mapRef"
            src="/CONF_MAP.svg"
            class="w-full pointer-events-none"
        />

        <div
            v-for="team in teams"
            :key="team.id"
            class="absolute transform transition-all duration-200 origin-center"
            :class="{
              'scale-110 z-20': hoveredTeamId === team.id
            }"
            :style="{ left: team.x + '%', top: team.y + '%' }"
            @mouseenter="hoveredTeamId = team.id"
            @mouseleave="hoveredTeamId = null"
        >

          <img
              :src="team.logo"
              class="w-8 h-8 cursor-pointer"
              @click="goTo(team.link)"
          />

          <div
              v-if="isAdmin && hoveredTeamId === team.id"
              class="flex gap-1 mt-1 justify-center bg-white/80 rounded shadow px-1 py-1"
          >
            <button @click.stop="editPoint(team)">
              <PencilIcon class="w-4 h-4 text-blue-500" />
            </button>

            <button @click.stop="removePoint(team.id)">
              <TrashIcon class="w-4 h-4 text-red-500" />
            </button>
          </div>

        </div>

      </div>
    </div>

    <div
        v-if="showModal"
        class="fixed top-1/2 left-1/2 bg-white p-4 rounded-xl shadow-xl z-50 -translate-x-1/2 -translate-y-1/2"
    >

      <div class="flex flex-col gap-3 min-w-[280px]">

        <input
            v-model="newLink"
            placeholder="Ссылка"
            class="border p-2 rounded"
        />

        <div class="grid grid-cols-5 gap-2">
          <img
              v-for="logo in nbaTeamLogos"
              :key="logo"
              :src="logo"
              class="w-10 h-10 cursor-pointer border rounded hover:scale-110"
              :class="{ 'ring-2 ring-blue-500': selectedLogo === logo }"
              @click="selectedLogo = logo"
          />
        </div>

        <button
            @click="savePoint"
            class="bg-blue-500 text-white p-2 rounded"
        >
          Сохранить
        </button>

        <button @click="reset" class="text-gray-500 text-sm">
          Закрыть (ESC)
        </button>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { useMap } from '../../../composables/NBA/Map/Map'
import { useMapInteractions } from '../../../composables/NBA/Map/useMapInteractions'
import { useMapModal } from '../../../composables/NBA/Map/useMapModal'
import { nbaTeamLogos } from '../../../constants/nbaTeamLogo'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/solid'

const { teams, isAdmin, addTeam, updateTeam, deleteTeam } = useMap()
const router = useRouter()

import { ref } from 'vue'

const hoveredTeamId = ref<string | null>(null)

const {
  mapRef,
  transformStyle,
  startDrag,
  onDrag,
  endDrag,
  onWheel,
  getClickCoords,
  moved,
  clickX,
  clickY
} = useMapInteractions()

const {
  showModal,
  selectedPoint,
  selectedLogo,
  newLink,
  openCreate,
  openEdit,
  reset
} = useMapModal()

const openModal = (e: MouseEvent) => {
  if (!isAdmin.value) return

  const coords = getClickCoords(e)
  if (!coords) return

  clickX.value = coords.x
  clickY.value = coords.y

  openCreate(coords)
}

const handleContextMenu = (e: MouseEvent) => {
  if (moved.value) return
  e.preventDefault()
  openModal(e)
}

const handleDoubleClick = (e: MouseEvent) => {
  openModal(e)
}

const editPoint = (team: any) => {
  openEdit(team)
}

const removePoint = async (id: string) => {
  await deleteTeam(id)
}

const savePoint = async () => {
  if (!selectedLogo.value || !newLink.value) return

  if (selectedPoint.value) {
    await updateTeam(selectedPoint.value.id, {
      logo: selectedLogo.value,
      link: newLink.value
    })
  } else {
    await addTeam({
      logo: selectedLogo.value,
      x: clickX.value,
      y: clickY.value,
      link: newLink.value
    })
  }

  reset()
}

const goTo = (link: string) => router.push(link)

const handleKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') reset()
}

onMounted(() => window.addEventListener('keydown', handleKey))
onUnmounted(() => window.removeEventListener('keydown', handleKey))
</script>