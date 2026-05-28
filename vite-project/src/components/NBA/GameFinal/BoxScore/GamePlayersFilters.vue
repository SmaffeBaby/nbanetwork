<template>
  <div class="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">

    <input
        v-model="model.search"
        placeholder="Имя или позиция.."
        class="w-full rounded-lg border px-3 py-2 text-sm sm:w-52"
    />

    <select v-model="model.period" class="w-full rounded-lg border px-3 py-2 text-sm sm:w-auto">
      <option :value="null">Весь матч</option>
      <option value="firstHalf">1-я половина</option>
      <option value="secondHalf">2-я половина</option>
      <option v-if="hasOvertime" value="ot">Овертаймы</option>
      <option :value="1">Q1</option>
      <option :value="2">Q2</option>
      <option :value="3">Q3</option>
      <option :value="4">Q4</option>
    </select>

  </div>
</template>

<script setup lang="ts">
type Filters = {
  search: string
  period: string | number | null
}

defineProps<{
  hasOvertime?: boolean
}>()

const model = defineModel<Filters>({
  default: () => ({
    search: '',
    period: null
  })
})
</script>
