<template>
  <div class="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/50 to-white p-3">
    <Chart :definition="definition" :height="300" aria-label="Показатели игрока за сезон" aria-description="Средние за матч. Каждая ось нормирована отдельно; точные значения приведены в карточках статистики." />
    <p class="px-2 pb-2 text-center text-[11px] leading-5 text-slate-500">Шкалы: 40 очков · 20 подборов · 15 передач · 4 перехвата · 4 блока · 40 минут. Средние за матч; вершина оси — 100% указанной шкалы.</p>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { Chart } from '@tanstack/charts/vue'
import { defineChart } from '@tanstack/charts'
import { polar, radialGrid, angleGrid, radialArea, radialLine } from '@tanstack/charts/polar'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { curveLinearClosed } from 'd3-shape'
const props = defineProps<{ stats: Record<string, number> }>()
const metrics = [['PTS', 'avgPoints', 40], ['REB', 'avgRebounds', 20], ['AST', 'avgAssists', 15], ['STL', 'avgSteals', 4], ['BLK', 'avgBlocks', 4], ['MIN', 'avgMinutes', 40]] as const
const definition = computed(() => {
  const data = metrics.map(([label,key,max]) => ({ label, value: Math.min(1, Math.max(0, (props.stats[key] || 0) / max)) }))
  return defineChart({
    marks: [polar({ radiusRatio: .70, scales: { angle: { scale: scalePoint<string>().domain(data.map(d => d.label)), wrap: true }, radius: { scale: scaleLinear().domain([0,1]) } },
      guides: [radialGrid({ values:[.25,.5,.75,1],shape:'polygon',stroke:'#dbe3f0' }),angleGrid({labels:true,labelFill:'#64748b',labelFontSize:12})],
      marks: [radialArea(data,{angle:'label',radius:'value',curve:curveLinearClosed,fill:'#2563eb',fillOpacity:.15}),radialLine(data,{angle:'label',radius:'value',curve:curveLinearClosed,stroke:'#2563eb',strokeWidth:3})] })],
    scales:{x:null,y:null}, margin:12
  })
})
</script>
