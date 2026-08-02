<template>
  <div class="charts-page">
    <Tomato3D :diseases="model3dData" class="bg-3d" />
    <div class="charts-grid">
      <ChartPanel title="凹凸图 · 各产区病害排名变化" :option="bumpOpt" class="cell" />
      <ChartPanel title="折线图区域高亮 · 检测趋势" :option="areaHighlightOpt" class="cell" />
      <ChartPanel title="折柱混合 · 日检测量与健康率" :option="mixOpt" class="cell" />
      <ChartPanel title="基础南丁格尔玫瑰图 · 病害类别" :option="roseOpt" class="cell" />
      <ChartPanel title="可滚动的图例 · 多模型训练曲线" :option="scrollLegendOpt" class="cell wide" />
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

const bumpOpt = computed(() => {
  const regions = (overview.value?.regionDist || []).slice(0, 6).map(d => d.name)
  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6']
  const series = regions.map((name, i) => {
    let rank = i + 1
    const data = weeks.map(() => {
      rank = Math.max(1, Math.min(regions.length, rank + Math.floor(Math.random() * 3) - 1))
      return rank
    })
    return {
      name, type: 'line', smooth: true, symbol: 'circle', symbolSize: 8,
      data, endLabel: { show: true, formatter: '{a}', color: colors[i % colors.length], fontSize: 10 },
      lineStyle: { width: 2 }
    }
  })
  return {
    color: colors,
    tooltip: { ...tooltipStyle(), trigger: 'axis' },
    grid: { top: 30, left: 40, right: 80, bottom: 24 },
    xAxis: { type: 'category', data: weeks, ...axisStyle(), boundaryGap: false },
    yAxis: { type: 'value', inverse: true, min: 1, max: regions.length || 6, ...axisStyle(), name: '排名' },
    series
  }
})

const areaHighlightOpt = computed(() => {
  const data = overview.value?.dailyTrend || []
  const dates = data.map(d => d.date.slice(5))
  const values = data.map(d => d.diseased_count)
  const markStart = Math.floor(dates.length * 0.6)
  return {
    color: [colors[2]],
    tooltip: { ...tooltipStyle(), trigger: 'axis' },
    grid: { top: 30, left: 40, right: 16, bottom: 24 },
    xAxis: { type: 'category', data: dates, ...axisStyle(), boundaryGap: false },
    yAxis: { type: 'value', ...axisStyle() },
    visualMap: {
      show: false, type: 'piecewise',
      pieces: [
        { gt: 0, lte: 40, color: colors[0] },
        { gt: 40, color: colors[2] }
      ]
    },
    series: [{
      type: 'line', smooth: true, data: values, showSymbol: false,
      areaStyle: { opacity: 0.25 },
      markArea: {
        itemStyle: { color: 'rgba(255,107,53,0.12)' },
        data: [[{ xAxis: dates[markStart] || '' }, { xAxis: dates[dates.length - 1] || '' }]]
      },
      markLine: {
        symbol: 'none',
        label: { color: colors[2], fontSize: 10 },
        data: [{ yAxis: 40, name: '预警线', lineStyle: { color: colors[2], type: 'dashed' } }]
      }
    }]
  }
})

const mixOpt = computed(() => {
  const data = (overview.value?.dailyTrend || []).slice(-30)
  const dates = data.map(d => d.date.slice(5))
  return {
    color: colors,
    tooltip: { ...tooltipStyle(), trigger: 'axis' },
    legend: { data: ['检测总量', '健康率'], textStyle: { color: 'rgba(232,244,248,0.6)', fontSize: 10 }, top: 0 },
    grid: { top: 30, left: 40, right: 40, bottom: 24 },
    xAxis: { type: 'category', data: dates, ...axisStyle() },
    yAxis: [
      { type: 'value', name: '数量', ...axisStyle() },
      { type: 'value', name: '健康率%', max: 100, ...axisStyle() }
    ],
    series: [
      {
        name: '检测总量', type: 'bar', data: data.map(d => d.total_count),
        itemStyle: { borderRadius: [3, 3, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#3b9eff' }, { offset: 1, color: 'rgba(59,158,255,0.2)' }] } }
      },
      {
        name: '健康率', type: 'line', yAxisIndex: 1, smooth: true,
        data: data.map(d => d.total_count ? Math.round(d.healthy_count / d.total_count * 100) : 0),
        lineStyle: { width: 2 }, symbol: 'none'
      }
    ]
  }
})

const roseOpt = computed(() => {
  const data = overview.value?.categoryDist || []
  return {
    color: colors,
    tooltip: { ...tooltipStyle(), trigger: 'item' },
    series: [{
      type: 'pie', roseType: 'radius', radius: ['15%', '70%'], center: ['50%', '55%'],
      itemStyle: { borderRadius: 5 },
      label: { color: 'rgba(232,244,248,0.75)', fontSize: 11 },
      data
    }]
  }
})

const scrollLegendOpt = computed(() => {
  const trend = overview.value?.modelTrend || []
  const models = [...new Set(trend.map(t => t.model_name))]
  const epochs = [...new Set(trend.filter(t => t.model_name === models[0]).map(t => t.epoch))]
  const series = models.flatMap((m, i) => {
    const rows = trend.filter(t => t.model_name === m)
    return [
      { name: m + '-acc', type: 'line', showSymbol: false, data: rows.map(r => r.val_accuracy), lineStyle: { width: 1.5 } },
      { name: m + '-loss', type: 'line', showSymbol: false, data: rows.map(r => r.val_loss), lineStyle: { width: 1, type: 'dashed' } }
    ]
  })
  return {
    color: colors,
    tooltip: { ...tooltipStyle(), trigger: 'axis' },
    legend: {
      type: 'scroll', orient: 'horizontal', top: 0,
      textStyle: { color: 'rgba(232,244,248,0.6)', fontSize: 10 },
      pageTextStyle: { color: '#00d4aa' },
      pageIconColor: '#00d4aa', pageIconInactiveColor: 'rgba(0,212,170,0.3)'
    },
    grid: { top: 40, left: 40, right: 20, bottom: 24 },
    xAxis: { type: 'category', data: epochs, name: 'Epoch', ...axisStyle() },
    yAxis: { type: 'value', ...axisStyle() },
    series
  }
})

onMounted(async () => {
  const [ov, m3d] = await Promise.all([dataApi.overview(), dataApi.model3d()])
  if (ov.code === 0) overview.value = ov.data
  if (m3d.code === 0) model3dData.value = m3d.data
})
</script>

<style scoped>
.charts-page { width: 100%; height: 100%; position: relative; overflow: hidden; }
.bg-3d { z-index: 1; opacity: 0.55; }
.charts-grid {
  position: absolute; inset: 0; z-index: 10;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 10px; padding: 12px 16px;
  pointer-events: none;
}
.cell { pointer-events: auto; min-height: 0; }
.cell.wide { grid-column: 1 / -1; }
</style>
