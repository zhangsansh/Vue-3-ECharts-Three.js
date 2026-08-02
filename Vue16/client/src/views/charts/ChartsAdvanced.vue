<template>
  <div class="charts-page">
    <Tomato3D :diseases="model3dData" class="bg-3d" />
    <div class="charts-grid">
      <ChartPanel title="折线图鱼眼放大 · 训练精度局部放大" :option="fisheyeOpt" class="cell" />
      <ChartPanel title="断轴柱状图 · 产区检测量" :option="brokenAxisOpt" class="cell" />
      <ChartPanel title="指数回归 · 检测量增长拟合" :option="regressionOpt" class="cell" />
      <ChartPanel title="基础盒须图 · 各病害置信度分布" :option="boxplotOpt" class="cell" />
      <ChartPanel title="热力图 · 温湿度与病害关系(模拟2w级采样)" :option="heatmapOpt" class="cell wide" />
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
const boxplotSeed = ref([])

function quantile(sorted, q) {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base]
}

function buildBoxplot(rawLists) {
  const boxData = []
  const outliers = []
  rawLists.forEach((list, i) => {
    const sorted = [...list].sort((a, b) => a - b)
    const q1 = quantile(sorted, 0.25)
    const median = quantile(sorted, 0.5)
    const q3 = quantile(sorted, 0.75)
    const iqr = q3 - q1
    const low = Math.max(sorted[0], q1 - 1.5 * iqr)
    const high = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr)
    boxData.push([low, q1, median, q3, high])
    sorted.forEach(v => {
      if (v < low || v > high) outliers.push([i, v])
    })
  })
  return { boxData, outliers }
}

function exponentialFit(points) {
  // y = a * e^(b*x)  via ln(y) = ln(a) + b*x
  const valid = points.filter(p => p[1] > 0)
  if (valid.length < 2) return { line: [], expr: '' }
  const n = valid.length
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  valid.forEach(([x, y]) => {
    const ly = Math.log(y)
    sumX += x
    sumY += ly
    sumXY += x * ly
    sumXX += x * x
  })
  const b = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1)
  const lnA = (sumY - b * sumX) / n
  const a = Math.exp(lnA)
  const xs = valid.map(p => p[0])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const line = []
  for (let i = 0; i <= 40; i++) {
    const x = minX + (maxX - minX) * (i / 40)
    line.push([x, a * Math.exp(b * x)])
  }
  return { line, expr: `y = ${a.toFixed(2)}e^(${b.toFixed(3)}x)` }
}

const fisheyeOpt = computed(() => {
  const trend = (overview.value?.modelTrend || []).filter(t => t.model_name === 'ResNet50-v2')
  const epochs = trend.length ? trend.map(t => t.epoch) : Array.from({ length: 50 }, (_, i) => i + 1)
  const data = trend.length
    ? trend.map(t => t.val_accuracy)
    : epochs.map((_, i) => Math.min(0.96, 0.55 + i * 0.008))
  return {
    color: [colors[0]],
    tooltip: { ...tooltipStyle(), trigger: 'axis' },
    grid: { top: 30, left: 45, right: 20, bottom: 50 },
    xAxis: { type: 'category', data: epochs, ...axisStyle(), boundaryGap: false },
    yAxis: { type: 'value', min: 0.5, max: 1, ...axisStyle() },
    dataZoom: [
      { type: 'inside', start: 60, end: 100 },
      {
        type: 'slider', start: 60, end: 100, height: 18, bottom: 8,
        borderColor: 'rgba(0,212,170,0.3)',
        fillerColor: 'rgba(0,212,170,0.15)',
        handleStyle: { color: '#00d4aa' },
        textStyle: { color: 'rgba(232,244,248,0.5)', fontSize: 10 }
      }
    ],
    series: [{
      type: 'line', smooth: true, data, showSymbol: false,
      areaStyle: { opacity: 0.2 },
      markPoint: {
        data: [{ type: 'max', name: '最高' }],
        itemStyle: { color: colors[2] },
        label: { color: '#fff', fontSize: 10 }
      }
    }]
  }
})

const brokenAxisOpt = computed(() => {
  const data = overview.value?.regionDist?.length
    ? overview.value.regionDist
    : [
      { name: '山东寿光', value: 120 }, { name: '河南周口', value: 95 },
      { name: '云南元谋', value: 150 }, { name: '江苏徐州', value: 70 },
      { name: '浙江嘉兴', value: 55 }, { name: '甘肃武威', value: 35 }
    ]
  const names = data.map(d => d.name)
  const values = data.map(d => d.value)
  const maxVal = Math.max(...values, 1)
  const split = Math.max(Math.floor(maxVal * 0.45), 30)
  return {
    color: [colors[1]],
    tooltip: { ...tooltipStyle(), trigger: 'axis' },
    grid: [
      { top: 28, left: 50, right: 20, height: '38%' },
      { top: '58%', left: 50, right: 20, height: '28%' }
    ],
    xAxis: [
      { type: 'category', data: names, gridIndex: 0, axisLabel: { show: false }, axisLine: { lineStyle: { color: 'rgba(0,212,170,0.3)' } }, axisTick: { show: false } },
      { type: 'category', data: names, gridIndex: 1, axisLabel: { color: 'rgba(232,244,248,0.55)', fontSize: 10, rotate: 30 }, axisLine: { lineStyle: { color: 'rgba(0,212,170,0.3)' } } }
    ],
    yAxis: [
      { type: 'value', gridIndex: 0, min: split, axisLabel: { color: 'rgba(232,244,248,0.55)', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(0,212,170,0.08)' } }, axisLine: { lineStyle: { color: 'rgba(0,212,170,0.3)' } } },
      { type: 'value', gridIndex: 1, max: split, axisLabel: { color: 'rgba(232,244,248,0.55)', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(0,212,170,0.08)' } }, axisLine: { lineStyle: { color: 'rgba(0,212,170,0.3)' } } }
    ],
    series: [
      { type: 'bar', xAxisIndex: 0, yAxisIndex: 0, data: values, itemStyle: { borderRadius: [4, 4, 0, 0], color: colors[1] } },
      { type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: values, itemStyle: { color: colors[0] } }
    ]
  }
})

const regressionOpt = computed(() => {
  const points = (overview.value?.dailyTrend || []).map((d, i) => [i + 1, d.total_count])
  const data = points.length
    ? points
    : Array.from({ length: 30 }, (_, i) => [i + 1, Math.round(25 + i * 0.8 + Math.random() * 15)])
  const { line, expr } = exponentialFit(data)
  return {
    color: [colors[0], colors[2]],
    tooltip: { ...tooltipStyle(), trigger: 'axis' },
    legend: { data: ['日检测量', '指数回归'], textStyle: { color: 'rgba(232,244,248,0.6)', fontSize: 10 }, top: 0 },
    grid: { top: 36, left: 45, right: 20, bottom: 28 },
    xAxis: { type: 'value', name: '天数', ...axisStyle() },
    yAxis: { type: 'value', name: '检测量', ...axisStyle() },
    series: [
      { name: '日检测量', type: 'scatter', data, symbolSize: 6 },
      {
        name: '指数回归', type: 'line', data: line, showSymbol: false, smooth: true,
        lineStyle: { width: 2, type: 'dashed' },
        endLabel: { show: !!expr, formatter: expr, color: colors[2], fontSize: 10 }
      }
    ]
  }
})

const boxplotOpt = computed(() => {
  const dist = overview.value?.diseaseDist?.length
    ? overview.value.diseaseDist
    : [{ name: '早疫病' }, { name: '晚疫病' }, { name: '叶霉病' }, { name: '斑点病' }, { name: '健康叶片' }]
  const names = dist.map(d => d.name)
  const raw = boxplotSeed.value.length === names.length
    ? boxplotSeed.value
    : names.map(() => {
      const base = 0.75 + Math.random() * 0.15
      return Array.from({ length: 20 }, () => Math.min(0.99, Math.max(0.65, base + (Math.random() - 0.5) * 0.2)))
    })
  const { boxData, outliers } = buildBoxplot(raw)
  return {
    color: [colors[0]],
    tooltip: {
      ...tooltipStyle(),
      formatter: p => {
        if (p.seriesType === 'boxplot') {
          const d = Array.isArray(p.data) ? p.data : p.value
          if (Array.isArray(d) && d.length >= 5) {
            const vals = d.length >= 6 ? d.slice(1, 6) : d
            return `${p.name}<br/>下限: ${vals[0].toFixed(3)}<br/>Q1: ${vals[1].toFixed(3)}<br/>中位: ${vals[2].toFixed(3)}<br/>Q3: ${vals[3].toFixed(3)}<br/>上限: ${vals[4].toFixed(3)}`
          }
        }
        return `${p.name || ''}<br/>${Array.isArray(p.value) ? p.value.join(', ') : p.value}`
      }
    },
    grid: { top: 30, left: 50, right: 20, bottom: 55 },
    xAxis: {
      type: 'category', data: names,
      axisLabel: { color: 'rgba(232,244,248,0.55)', fontSize: 10, rotate: 25 },
      axisLine: { lineStyle: { color: 'rgba(0,212,170,0.3)' } }
    },
    yAxis: { type: 'value', name: '置信度', min: 0.6, max: 1, ...axisStyle() },
    series: [
      {
        name: 'boxplot', type: 'boxplot', data: boxData,
        itemStyle: { color: 'rgba(0,212,170,0.25)', borderColor: colors[0] }
      },
      {
        name: 'outlier', type: 'scatter', data: outliers, symbolSize: 5,
        itemStyle: { color: colors[2] }
      }
    ]
  }
})

const heatmapOpt = computed(() => {
  const hours = Array.from({ length: 24 }, (_, i) => i + 'h')
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const data = []
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 24; j++) {
      data.push([j, i, Math.floor(Math.random() * 50 + (j > 8 && j < 18 ? 30 : 5))])
    }
  }
  return {
    tooltip: {
      ...tooltipStyle(),
      formatter: p => `${days[p.value[1]]} ${hours[p.value[0]]}<br/>检测量: ${p.value[2]}`
    },
    grid: { top: 20, left: 50, right: 50, bottom: 30 },
    xAxis: {
      type: 'category', data: hours, splitArea: { show: true },
      axisLabel: { color: 'rgba(232,244,248,0.55)', fontSize: 9 },
      axisLine: { lineStyle: { color: 'rgba(0,212,170,0.3)' } }
    },
    yAxis: {
      type: 'category', data: days, splitArea: { show: true },
      axisLabel: { color: 'rgba(232,244,248,0.55)', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(0,212,170,0.3)' } }
    },
    visualMap: {
      min: 0, max: 80, calculable: true, orient: 'vertical', right: 0, top: 'center',
      inRange: { color: ['#0a1628', '#0d4a3a', '#00d4aa', '#ffcc33', '#ff6b35'] },
      textStyle: { color: 'rgba(232,244,248,0.5)', fontSize: 10 }
    },
    series: [{
      type: 'heatmap', data,
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,212,170,0.5)' } }
    }]
  }
})

onMounted(async () => {
  try {
    const [ov, m3d] = await Promise.all([dataApi.overview(), dataApi.model3d()])
    if (ov.code === 0) {
      overview.value = ov.data
      const names = (ov.data.diseaseDist || []).map(d => d.name)
      boxplotSeed.value = names.map(() => {
        const base = 0.75 + Math.random() * 0.15
        return Array.from({ length: 20 }, () => Math.min(0.99, Math.max(0.65, base + (Math.random() - 0.5) * 0.2)))
      })
    }
    if (m3d.code === 0) model3dData.value = m3d.data
  } catch (e) {
    console.error('高级图表数据加载失败', e)
  }
})
</script>

<style scoped>
.charts-page { width: 100%; height: 100%; position: relative; overflow: hidden; }
.bg-3d { z-index: 1; opacity: 0.5; }
.charts-grid {
  position: absolute; inset: 0; z-index: 10;
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr 1fr;
  gap: 10px; padding: 12px 16px; pointer-events: none;
}
.cell { pointer-events: auto; min-height: 0; }
.cell.wide { grid-column: 1 / -1; }
</style>
