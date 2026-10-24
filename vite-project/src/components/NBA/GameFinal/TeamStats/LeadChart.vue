<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div class="flex items-center gap-2 font-semibold"><span class="h-2.5 w-2.5 rounded-full" :style="{ background: awayColor }"></span>{{ awayAbbr }} <span class="font-normal text-gray-500 dark:text-slate-400">выше нуля</span></div>
      <div class="flex items-center gap-2 font-semibold"><span class="h-2.5 w-2.5 rounded-full" :style="{ background: homeColor }"></span>{{ homeAbbr }} <span class="font-normal text-gray-500 dark:text-slate-400">ниже нуля</span></div>
    </div>
    <div class="relative h-72 w-full sm:h-96">
      <canvas ref="canvas" role="img" :aria-label="`Преимущество ${awayAbbr} и ${homeAbbr} по ходу матча. Наведите или нажмите на график, чтобы увидеть время и счёт.`"></canvas>
    </div>
    <p class="text-center text-xs text-gray-500 dark:text-slate-400">Наведите курсор или коснитесь графика: четверть, время до её конца, счёт и преимущество.</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'

type LeadPoint = { elapsed: number; diff: number; period: number; clock: string; awayScore: number; homeScore: number; description?: string }
type Datum = { x: number; y: number; point: LeadPoint }
const props = defineProps<{ points: LeadPoint[]; awayAbbr: string; homeAbbr: string; awayColor: string; homeColor: string; final?: boolean }>()
const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart<'line'> | null = null
let media: MediaQueryList | undefined
const periodName = (q: number) => q <= 4 ? `${q}-я четверть` : `Овертайм ${q - 4}`
const hexAlpha = (color: string, alpha: string) => /^#[a-f\d]{6}$/i.test(color) ? `${color}${alpha}` : color
function render() {
  if (!canvas.value) return
  chart?.destroy()
  const dark = media?.matches
  const text = dark ? '#94a3b8' : '#64748b'
  const points = [...props.points].sort((a,b) => a.elapsed - b.elapsed)
  const data: Datum[] = points.map(point => ({ x: point.elapsed, y: -point.diff, point }))
  const first: LeadPoint = { elapsed: 0, diff: 0, period: 1, clock: '12:00', homeScore: 0, awayScore: 0 }
  data.unshift({ x: 0, y: 0, point: first })
  const last = points.at(-1)
  const end = last ? Math.max(2880, last.period <= 4 ? 2880 : 2880 + (last.period - 4) * 300) : 2880
  if (last && props.final && last.elapsed < end) data.push({ x: end, y: -last.diff, point: { ...last, elapsed: end, clock: '0:00' } })
  const max = Math.ceil(Math.max(5, ...points.map(point => Math.abs(point.diff))) / 5) * 5
  chart = new Chart(canvas.value, {
    type: 'line',
    data: { datasets: [{ data, label: 'Преимущество', parsing: false, stepped: 'after', borderWidth: 2.5,
      borderColor: props.awayColor, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: '#fff', pointHoverBorderWidth: 3,
      segment: { borderColor: ctx => (ctx.p0.parsed.y ?? 0) >= 0 ? props.awayColor : props.homeColor },
      fill: { target: 'origin', above: hexAlpha(props.awayColor, '24'), below: hexAlpha(props.homeColor, '24') }
    }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      layout: { padding: { top: 12, right: 8 } },
      scales: {
        x: { type: 'linear', min: 0, max: end, border: { display: false },
          afterBuildTicks: scale => { scale.ticks = [0,720,1440,2160,2880, ...Array.from({ length: Math.max(0, (end - 2880) / 300) }, (_, i) => 3180 + i * 300)].filter(value => value <= end).map(value => ({ value })) },
          grid: { color: dark ? '#33415566' : '#e2e8f080', drawTicks: false },
          ticks: { color: text, padding: 12, font: { size: 11 }, callback: value => {
            const t = Number(value)
            return t === end ? 'Конец' : t < 2880 ? `Q${t / 720 + 1}` : `OT${(t - 2880) / 300 + 1}`
          } }
        },
        y: { min: -max, max, border: { display: false },
          grid: { color: ctx => ctx.tick.value === 0 ? (dark ? '#94a3b8' : '#94a3b8') : (dark ? '#33415566' : '#e2e8f080'), lineWidth: ctx => ctx.tick.value === 0 ? 1.5 : 1 },
          ticks: { color: text, stepSize: 5, padding: 10, font: { size: 11 }, callback: value => Number(value) === 0 ? 'Ровно' : `+${Math.abs(Number(value))}` }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { displayColors: false, backgroundColor: '#0f172af2', titleColor: '#94a3b8', bodyColor: '#f8fafc', padding: 14, cornerRadius: 12,
          titleFont: { size: 12, weight: 'normal' }, bodyFont: { size: 13 }, bodySpacing: 6,
          callbacks: {
            title: items => { const p = (items[0]?.raw as Datum)?.point; return p ? `${periodName(p.period)} · ${p.clock} до конца` : '' },
            label: context => { const p = (context.raw as Datum).point; return [`${props.awayAbbr} ${p.awayScore} : ${p.homeScore} ${props.homeAbbr}`, p.diff === 0 ? 'Счёт равный' : `${p.diff > 0 ? props.homeAbbr : props.awayAbbr} ведёт +${Math.abs(p.diff)}`] }
          }
        }
      }
    }
  })
}
onMounted(() => { media = window.matchMedia('(prefers-color-scheme: dark)'); media.addEventListener('change', render); render() })
watch(() => [props.points, props.awayColor, props.homeColor], render, { deep: true })
onUnmounted(() => { chart?.destroy(); media?.removeEventListener('change', render) })
</script>
