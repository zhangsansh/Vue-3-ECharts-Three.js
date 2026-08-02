<template>
  <div class="chart-panel panel-glass" :style="{ opacity: opacity }">
    <div class="panel-title" v-if="title">{{ title }}</div>
    <div class="chart-body" ref="chartRef"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as echarts from 'echarts'
import 'echarts-gl'
import { useThemeStore } from '../stores/theme'

const props = defineProps({
  title: String,
  option: { type: Object, default: () => ({}) },
  opacity: { type: [Number, String], default: undefined }
})

const theme = useThemeStore()
const chartRef = ref(null)
let chart = null

const opacity = computed(() => props.opacity ?? theme.settings.theme_chart_opacity ?? 0.85)

function applyOption(opt) {
  if (!chart || !opt || !Object.keys(opt).length) return
  try {
    chart.setOption(opt, true)
  } catch (e) {
    console.warn('图表渲染失败:', props.title, e)
  }
}

function init() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value, null, { renderer: 'canvas' })
  applyOption(props.option)
}

function resize() {
  chart?.resize()
}

watch(() => props.option, (opt) => {
  applyOption(opt)
}, { deep: true })

onMounted(() => {
  init()
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
})

defineExpose({ getInstance: () => chart })
</script>

<style scoped>
.chart-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.chart-body {
  flex: 1;
  min-height: 0;
  width: 100%;
}
</style>
