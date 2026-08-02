<template>
  <div class="dashboard">
    <Tomato3D :diseases="model3dData" class="center-3d" @select="onDiseaseSelect" />

    <div class="overlay-layer">
      <div class="side left-side">
        <ChartPanel title="病害类型分布" :option="diseasePieOpt" class="panel" />
        <ChartPanel title="检测量日趋势" :option="dailyLineOpt" class="panel" />
        <ChartPanel title="模型准确率对比" :option="modelBarOpt" class="panel" />
      </div>

      <div class="center-stats">
        <div class="stat-card panel-glass" v-for="s in summaryCards" :key="s.label">
          <div class="stat-value stat-num">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>

      <div class="side right-side">
        <ChartPanel title="产区检测分布" :option="regionBarOpt" class="panel" />
        <ChartPanel title="病害严重度" :option="severityRoseOpt" class="panel" />
        <ChartPanel title="置信度分布" :option="confOpt" class="panel" />
      </div>
    </div>

    <div class="bottom-ticker panel-glass">
      <span class="ticker-label">最新检测</span>
      <div class="ticker-track">
        <div class="ticker-content">
          <span v-for="r in recentRecords" :key="r.id" class="ticker-item">
            {{ r.detected_at }} · {{ r.region }} · {{ r.disease_name }} · {{ (r.confidence * 100).toFixed(1) }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Tomato3D from '../../components/Tomato3D.vue'
import ChartPanel from '../../components/ChartPanel.vue'
import { dataApi } from '../../api'
import { colors, tooltipStyle, axisStyle } from '../../utils/chartTheme'

const overview = ref(null)
const model3dData = ref([])

const summary = computed(() => overview.value?.summary || {})
const recentRecords = computed(() => overview.value?.recentRecords || [])

const summaryCards = computed(() => [
  { label: '累计检测', value: summary.value.total ?? '-' },
  { label: '健康叶片', value: summary.value.healthy ?? '-' },
  { label: '病害检出', value: summary.value.diseased ?? '-' },
  { label: '健康率%', value: summary.value.healthyRate ?? '-' },
  { label: '今日检测', value: summary.value.today ?? '-' },
  { label: '平均置信度', value: summary.value.avgConfidence ? (summary.value.avgConfidence * 100).toFixed(1) + '%' : '-' }
])

const diseasePieOpt = computed(() => {
  const data = overview.value?.diseaseDist || []
  return {
    color: colors,
    tooltip: { ...tooltipStyle(), trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      center: ['50%', '55%'],
      itemStyle: { borderRadius: 4, borderColor: 'rgba(8,28,48,0.5)', borderWidth: 2 },
      label: { color: 'rgba(232,244,248,0.7)', fontSize: 10 },
      data
    }]
  }
})

const dailyLineOpt = computed(() => {
  const data = overview.value?.dailyTrend || []
  const dates = data.map(d => d.date.slice(5))
  return {
    color: colors,
    tooltip: { ...tooltipStyle(), trigger: 'axis' },
    grid: { top: 30, left: 40, right: 16, bottom: 24 },
    legend: { data: ['总量', '健康', '病害'], textStyle: { color: 'rgba(232,244,248,0.6)', fontSize: 10 }, top: 0 },
    xAxis: { type: 'category', data: dates, ...axisStyle() },
    yAxis: { type: 'value', ...axisStyle() },
    series: [
      { name: '总量', type: 'line', smooth: true, data: data.map(d => d.total_count), showSymbol: false, areaStyle: { opacity: 0.15 } },
      { name: '健康', type: 'line', smooth: true, data: data.map(d => d.healthy_count), showSymbol: false },
      { name: '病害', type: 'line', smooth: true, data: data.map(d => d.diseased_count), showSymbol: false }
    ]
  }
})

const modelBarOpt = computed(() => {
  const data = overview.value?.modelAcc || []
  return {
    color: colors,
    tooltip: { ...tooltipStyle(), trigger: 'axis' },
    grid: { top: 20, left: 80, right: 30, bottom: 20 },
    xAxis: { type: 'value', max: 1, ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, formatter: v => (v * 100).toFixed(0) + '%' } },
    yAxis: { type: 'category', data: data.map(d => d.model_name), ...axisStyle() },
    series: [{
      type: 'bar',
      data: data.map(d => d.accuracy),
      barWidth: 12,
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [{ offset: 0, color: '#00d4aa' }, { offset: 1, color: '#3b9eff' }]
        }
      },
      label: { show: true, position: 'right', color: '#00d4aa', fontSize: 10, formatter: p => (p.value * 100).toFixed(1) + '%' }
    }]
  }
})

const regionBarOpt = computed(() => {
  const data = overview.value?.regionDist || []
  return {
    color: [colors[1]],
    tooltip: { ...tooltipStyle(), trigger: 'axis' },
    grid: { top: 16, left: 70, right: 16, bottom: 24 },
    xAxis: { type: 'category', data: data.map(d => d.name), ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, rotate: 30 } },
    yAxis: { type: 'value', ...axisStyle() },
    series: [{
      type: 'bar',
      data: data.map(d => d.value),
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: '#3b9eff' }, { offset: 1, color: 'rgba(59,158,255,0.2)' }]
        }
      }
    }]
  }
})

const severityRoseOpt = computed(() => {
  const data = overview.value?.severityDist || []
  return {
    color: ['#ff4455', '#ff9933', '#ffcc33', '#44cc66'],
    tooltip: { ...tooltipStyle(), trigger: 'item' },
    series: [{
      type: 'pie',
      roseType: 'area',
      radius: ['20%', '65%'],
      center: ['50%', '55%'],
      itemStyle: { borderRadius: 4 },
      label: { color: 'rgba(232,244,248,0.7)', fontSize: 10 },
      data
    }]
  }
})

const confOpt = computed(() => {
  const data = overview.value?.confHist || []
  return {
    color: [colors[0]],
    tooltip: { ...tooltipStyle(), trigger: 'axis' },
    grid: { top: 16, left: 40, right: 16, bottom: 28 },
    xAxis: { type: 'category', data: data.map(d => d.range), ...axisStyle() },
    yAxis: { type: 'value', ...axisStyle() },
    series: [{
      type: 'bar',
      data: data.map(d => d.count),
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: '#00d4aa' }, { offset: 1, color: 'rgba(0,212,170,0.15)' }]
        }
      }
    }]
  }
})

function onDiseaseSelect(d) {
  console.log('selected disease', d.name)
}

onMounted(async () => {
  const [ov, m3d] = await Promise.all([dataApi.overview(), dataApi.model3d()])
  if (ov.code === 0) overview.value = ov.data
  if (m3d.code === 0) model3dData.value = m3d.data
})
</script>

<style scoped>
.dashboard {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.center-3d {
  z-index: 1;
}

.overlay-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 320px 1fr 320px;
  gap: 12px;
  padding: 12px 16px 56px;
  pointer-events: none;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: auto;
}

.panel {
  flex: 1;
  min-height: 0;
}

.center-stats {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 12px;
  padding-top: 8px;
  pointer-events: none;
  height: fit-content;
}

.stat-card {
  padding: 10px 18px;
  text-align: center;
  min-width: 100px;
  pointer-events: auto;
}

.stat-value {
  font-size: 22px;
  line-height: 1.2;
}

.stat-label {
  font-size: 11px;
  color: rgba(232, 244, 248, 0.5);
  margin-top: 2px;
}

.bottom-ticker {
  position: absolute;
  bottom: 8px;
  left: 16px;
  right: 16px;
  height: 36px;
  z-index: 15;
  display: flex;
  align-items: center;
  padding: 0 12px;
  overflow: hidden;
  pointer-events: auto;
}

.ticker-label {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--theme-primary);
  margin-right: 16px;
  padding-right: 12px;
  border-right: 1px solid var(--panel-border);
}

.ticker-track {
  flex: 1;
  overflow: hidden;
}

.ticker-content {
  display: flex;
  gap: 40px;
  white-space: nowrap;
  animation: scroll 40s linear infinite;
}

.ticker-item {
  font-size: 12px;
  color: rgba(232, 244, 248, 0.65);
}

@keyframes scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
</style>
