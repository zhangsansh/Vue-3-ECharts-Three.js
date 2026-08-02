<template>
  <div class="charts-page">
    <Tomato3D :diseases="model3dData" class="bg-3d" />
    <div class="charts-grid">
      <ChartPanel title="Dataset 三维柱状图 · 产区×病害" :option="bar3dDatasetOpt" class="cell" />
      <ChartPanel title="Bar3D 星云 · 时空检测密度" :option="nebulaOpt" class="cell" />
      <ChartPanel title="图像转三维柱状图 · 叶片特征强度" :option="imageBar3dOpt" class="cell" />
      <ChartPanel title="三维散点 + 散点矩阵 · 温湿度置信度" :option="scatter3dOpt" class="cell" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Tomato3D from '../../components/Tomato3D.vue'
import ChartPanel from '../../components/ChartPanel.vue'
import { dataApi } from '../../api'
import { colors, tooltipStyle } from '../../utils/chartTheme'

const overview = ref(null)
const model3dData = ref([])

const bar3dDatasetOpt = computed(() => {
  const diseases = (overview.value?.diseaseDist || []).slice(0, 5).map(d => d.name)
  const regions = (overview.value?.regionDist || []).slice(0, 6).map(d => d.name)
  const data = []
  regions.forEach((r, i) => {
    diseases.forEach((d, j) => {
      data.push([i, j, Math.floor(Math.random() * 40 + 5)])
    })
  })
  return {
    tooltip: { ...tooltipStyle() },
    visualMap: {
      max: 50, inRange: { color: ['#0d2137', '#00d4aa', '#ffcc33', '#ff6b35'] },
      textStyle: { color: 'rgba(232,244,248,0.5)' }
    },
    xAxis3D: { type: 'category', data: regions, axisLabel: { color: 'rgba(232,244,248,0.5)', fontSize: 9 } },
    yAxis3D: { type: 'category', data: diseases, axisLabel: { color: 'rgba(232,244,248,0.5)', fontSize: 9 } },
    zAxis3D: { type: 'value', axisLabel: { color: 'rgba(232,244,248,0.5)' } },
    grid3D: {
      boxWidth: 120, boxDepth: 80, viewControl: { projection: 'perspective', autoRotate: true, autoRotateSpeed: 4 },
      light: { main: { intensity: 1.2 }, ambient: { intensity: 0.4 } },
      environment: 'auto'
    },
    series: [{
      type: 'bar3D', data,
      shading: 'lambert',
      label: { show: false },
      itemStyle: { opacity: 0.85 },
      emphasis: { label: { show: true, color: '#fff', fontSize: 10 } }
    }]
  }
})

const nebulaOpt = computed(() => {
  const data = []
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      for (let k = 0; k < 5; k++) {
        if (Math.random() > 0.4) {
          data.push([i, j, k, Math.floor(Math.random() * 30 + 1)])
        }
      }
    }
  }
  return {
    tooltip: { ...tooltipStyle() },
    visualMap: {
      max: 30, inRange: { color: ['#132f4c', '#3b9eff', '#00d4aa', '#ffcc33', '#ff6b35'] },
      textStyle: { color: 'rgba(232,244,248,0.5)' }
    },
    xAxis3D: { type: 'value', max: 8, axisLabel: { color: 'rgba(232,244,248,0.4)' } },
    yAxis3D: { type: 'value', max: 8, axisLabel: { color: 'rgba(232,244,248,0.4)' } },
    zAxis3D: { type: 'value', max: 5, axisLabel: { color: 'rgba(232,244,248,0.4)' } },
    grid3D: {
      viewControl: { autoRotate: true, autoRotateSpeed: 6, distance: 180 },
      light: { main: { intensity: 1.5, shadow: true }, ambient: { intensity: 0.3 } }
    },
    series: [{
      type: 'bar3D', data: data.map(d => ({ value: d })),
      shading: 'realistic',
      itemStyle: { opacity: 0.7 },
      bevelSize: 0.3
    }]
  }
})

const imageBar3dOpt = computed(() => {
  const size = 20
  const data = []
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const cx = size / 2, cy = size / 2
      const dist = Math.sqrt((i - cx) ** 2 + (j - cy) ** 2)
      const leaf = Math.max(0, 12 - dist) * (0.7 + 0.3 * Math.sin(i * 0.5) * Math.cos(j * 0.5))
      const spot = (Math.abs(i - 7) < 2 && Math.abs(j - 8) < 2) ? 8 : 0
      data.push([i, j, Math.round(leaf + spot)])
    }
  }
  return {
    tooltip: { ...tooltipStyle() },
    visualMap: {
      max: 15, show: false,
      inRange: { color: ['#1a3a28', '#2d6b3a', '#3d9b5a', '#8b6914', '#a0522d', '#8b0000'] }
    },
    xAxis3D: { type: 'value', axisLabel: { show: false } },
    yAxis3D: { type: 'value', axisLabel: { show: false } },
    zAxis3D: { type: 'value', axisLabel: { color: 'rgba(232,244,248,0.4)' } },
    grid3D: {
      boxWidth: 100, boxDepth: 100,
      viewControl: { autoRotate: true, autoRotateSpeed: 5, alpha: 30, beta: 40 },
      light: { main: { intensity: 1.2 }, ambient: { intensity: 0.5 } }
    },
    series: [{ type: 'bar3D', data, shading: 'lambert', barSize: 0.8, itemStyle: { opacity: 0.9 } }]
  }
})

const scatter3dOpt = computed(() => {
  const raw = overview.value?.tempHumidity || []
  const data = raw.map(r => [r.temperature, r.humidity, r.confidence * 100, r.disease_name])
  const diseaseNames = [...new Set(data.map(d => d[3]))]
  return {
    color: colors,
    tooltip: {
      ...tooltipStyle(),
      formatter: p => `温度: ${p.value[0]}℃<br/>湿度: ${p.value[1]}%<br/>置信度: ${p.value[2]?.toFixed?.(1) || p.value[2]}%<br/>${p.value[3] || ''}`
    },
    legend: { data: diseaseNames.slice(0, 6), textStyle: { color: 'rgba(232,244,248,0.55)', fontSize: 9 }, top: 0, type: 'scroll' },
    xAxis3D: { name: '温度', type: 'value', axisLabel: { color: 'rgba(232,244,248,0.4)' } },
    yAxis3D: { name: '湿度', type: 'value', axisLabel: { color: 'rgba(232,244,248,0.4)' } },
    zAxis3D: { name: '置信度', type: 'value', axisLabel: { color: 'rgba(232,244,248,0.4)' } },
    grid3D: {
      viewControl: { autoRotate: true, autoRotateSpeed: 3 },
      light: { main: { intensity: 1.2 }, ambient: { intensity: 0.4 } }
    },
    series: diseaseNames.slice(0, 6).map((name, i) => ({
      name,
      type: 'scatter3D',
      data: data.filter(d => d[3] === name).map(d => [d[0], d[1], d[2]]),
      symbolSize: 6,
      itemStyle: { opacity: 0.8 }
    }))
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
.bg-3d { z-index: 1; opacity: 0.4; }
.charts-grid {
  position: absolute; inset: 0; z-index: 10;
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
  gap: 10px; padding: 12px 16px; pointer-events: none;
}
.cell { pointer-events: auto; min-height: 0; }
</style>
