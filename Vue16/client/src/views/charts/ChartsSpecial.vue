<template>
  <div class="charts-page">
    <Tomato3D :diseases="model3dData" class="bg-3d" />
    <div class="charts-grid">
      <ChartPanel title="涟漪特效散点图 · 产区疫情热点" :option="rippleOpt" class="cell" />
      <ChartPanel title="散点聚合为柱状图动画 · 置信度演化" :option="scatterBarAnimOpt" class="cell" />
      <ChartPanel title="散点图标签顶部对齐 · 模型指标" :option="alignLabelOpt" class="cell" />
      <ChartPanel title="关系图 · 病害关联（自动隐藏重叠标签）" :option="graphOpt" class="cell" />
      <ChartPanel title="地理坐标系关系图 · 产区病害传播网络" :option="geoGraphOpt" class="cell wide" />
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

const rippleOpt = computed(() => {
  const regions = overview.value?.regions || []
  return {
    color: [colors[2]],
    tooltip: {
      ...tooltipStyle(),
      formatter: p => `${p.data[3]}<br/>病害: ${p.data[2]}<br/>风险: ${p.data[4]}`
    },
    grid: { top: 20, left: 40, right: 20, bottom: 30 },
    xAxis: { type: 'value', name: '经度', min: 95, max: 125, ...axisStyle() },
    yAxis: { type: 'value', name: '纬度', min: 20, max: 45, ...axisStyle() },
    series: [{
      type: 'effectScatter',
      symbolSize: val => Math.sqrt(val[2]) * 3 + 8,
      data: regions.map(r => [r.lng, r.lat, r.disease_count, r.region, r.risk_level]),
      rippleEffect: { brushType: 'stroke', scale: 3, period: 3 },
      itemStyle: {
        color: p => {
          const risk = p.data[4]
          return risk === '高' ? '#ff4455' : risk === '中' ? '#ff9933' : '#00d4aa'
        },
        shadowBlur: 10
      },
      label: { show: true, formatter: p => p.data[3], position: 'top', color: 'rgba(232,244,248,0.7)', fontSize: 9 }
    }]
  }
})

const scatterBarAnimOpt = computed(() => {
  const categories = ['0.7+', '0.8+', '0.85+', '0.9+', '0.95+']
  const scatterData = []
  categories.forEach((c, i) => {
    const n = 15 + Math.floor(Math.random() * 20)
    for (let j = 0; j < n; j++) {
      scatterData.push([i, 0.7 + i * 0.05 + Math.random() * 0.05, Math.random()])
    }
  })
  const counts = categories.map((_, i) => scatterData.filter(d => d[0] === i).length)
  return {
    color: colors,
    tooltip: { ...tooltipStyle() },
    grid: { top: 30, left: 40, right: 20, bottom: 30 },
    xAxis: { type: 'category', data: categories, ...axisStyle() },
    yAxis: { type: 'value', ...axisStyle() },
    series: [
      {
        name: '散点', type: 'scatter',
        data: scatterData.map(d => [categories[d[0]], d[1] * 100]),
        symbolSize: 6,
        itemStyle: { opacity: 0.6, color: colors[0] }
      },
      {
        name: '聚合柱', type: 'bar',
        data: counts,
        barWidth: 30,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#3b9eff' }, { offset: 1, color: 'rgba(59,158,255,0.2)' }] }
        },
        animationDuration: 2000,
        animationEasing: 'elasticOut'
      }
    ]
  }
})

const alignLabelOpt = computed(() => {
  const models = overview.value?.modelAcc || []
  return {
    color: colors,
    tooltip: { ...tooltipStyle() },
    grid: { top: 40, left: 40, right: 40, bottom: 30 },
    xAxis: { type: 'category', data: models.map(m => m.model_name), ...axisStyle() },
    yAxis: { type: 'value', min: 0.8, max: 1, ...axisStyle() },
    series: [{
      type: 'scatter',
      symbolSize: 28,
      data: models.map(m => m.accuracy),
      label: {
        show: true,
        formatter: p => (p.value * 100).toFixed(1) + '%',
        position: 'top',
        distance: 8,
        color: '#00d4aa',
        fontSize: 11,
        fontWeight: 'bold',
        align: 'center',
        verticalAlign: 'bottom'
      },
      itemStyle: {
        color: {
          type: 'radial', x: 0.4, y: 0.3, r: 0.8,
          colorStops: [{ offset: 0, color: '#00d4aa' }, { offset: 1, color: '#3b9eff' }]
        }
      }
    }]
  }
})

const graphOpt = computed(() => {
  const diseases = (overview.value?.diseaseDist || []).filter(d => d.name !== '健康叶片')
  const categories = [
    { name: '真菌性' }, { name: '细菌性' }, { name: '病毒性' }
  ]
  const catMap = { '早疫病': 0, '晚疫病': 0, '叶霉病': 0, '斑点病': 0, '白粉病': 0, '细菌性斑点病': 1, '黄化曲叶病毒': 2, '花叶病毒': 2 }
  const nodes = diseases.map(d => ({
    name: d.name,
    value: d.value,
    symbolSize: Math.sqrt(d.value) * 3 + 20,
    category: catMap[d.name] ?? 0,
    label: { show: true }
  }))
  const links = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].category === nodes[j].category && Math.random() > 0.3) {
        links.push({ source: nodes[i].name, target: nodes[j].name, value: Math.floor(Math.random() * 10 + 1) })
      } else if (Math.random() > 0.7) {
        links.push({ source: nodes[i].name, target: nodes[j].name, lineStyle: { type: 'dashed', opacity: 0.3 } })
      }
    }
  }
  return {
    color: colors,
    tooltip: { ...tooltipStyle() },
    legend: { data: categories.map(c => c.name), textStyle: { color: 'rgba(232,244,248,0.6)', fontSize: 10 }, top: 0 },
    series: [{
      type: 'graph', layout: 'force',
      data: nodes, links, categories,
      roam: true,
      label: {
        show: true, position: 'right', color: 'rgba(232,244,248,0.8)', fontSize: 10,
        hideOverlap: true
      },
      force: { repulsion: 200, edgeLength: [60, 140] },
      lineStyle: { color: 'source', curveness: 0.2, opacity: 0.5 },
      emphasis: { focus: 'adjacency', label: { show: true } }
    }]
  }
})

const geoGraphOpt = computed(() => {
  const regions = overview.value?.regions || []
  const nodes = regions.map(r => ({
    name: r.region,
    value: [r.lng, r.lat, r.disease_count],
    symbolSize: Math.sqrt(r.disease_count) * 1.5 + 10,
    itemStyle: {
      color: r.risk_level === '高' ? '#ff4455' : r.risk_level === '中' ? '#ff9933' : '#00d4aa'
    },
    label: { show: true, formatter: r.region, color: 'rgba(232,244,248,0.75)', fontSize: 9, position: 'right', hideOverlap: true }
  }))
  const links = []
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      if (regions[i].main_disease === regions[j].main_disease || Math.random() > 0.6) {
        links.push({
          source: regions[i].region,
          target: regions[j].region,
          lineStyle: { color: 'rgba(0,212,170,0.35)', curveness: 0.2, width: 1.5 }
        })
      }
    }
  }
  return {
    tooltip: {
      ...tooltipStyle(),
      formatter: p => {
        if (p.dataType === 'node' || p.data?.value) {
          const r = regions.find(x => x.region === p.name)
          return r ? `${r.region}<br/>病害数: ${r.disease_count}<br/>主要病害: ${r.main_disease}<br/>风险: ${r.risk_level}` : p.name
        }
        return `${p.data.source} → ${p.data.target}`
      }
    },
    xAxis: { type: 'value', show: false, min: 95, max: 125 },
    yAxis: { type: 'value', show: false, min: 20, max: 48 },
    series: [{
      type: 'graph',
      coordinateSystem: 'cartesian2d',
      data: nodes.map(n => ({ ...n, x: n.value[0], y: n.value[1] })),
      links,
      roam: true,
      lineStyle: { opacity: 0.5 },
      emphasis: { focus: 'adjacency' },
      label: { show: true, hideOverlap: true }
    }]
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
.bg-3d { z-index: 1; opacity: 0.45; }
.charts-grid {
  position: absolute; inset: 0; z-index: 10;
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr 1fr;
  gap: 10px; padding: 12px 16px; pointer-events: none;
}
.cell { pointer-events: auto; min-height: 0; }
.cell.wide { grid-column: 1 / -1; }
</style>
