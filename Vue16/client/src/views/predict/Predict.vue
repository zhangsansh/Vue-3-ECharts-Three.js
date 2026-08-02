<template>
  <div class="predict-page">
    <div class="page-header panel-glass">
      <div>
        <h2>病害预测 · 参数调试</h2>
        <p class="sub">支持上传叶片照片，手动调节特征与模型超参数，页面可滚动查看全部内容</p>
      </div>
      <div class="header-actions">
        <el-select v-model="presetName" placeholder="快速预设" clearable style="width:160px" @change="applyPreset">
          <el-option v-for="p in presets" :key="p.name" :label="p.name" :value="p.name" />
        </el-select>
        <el-button @click="resetParams">重置参数</el-button>
        <el-button type="primary" :loading="loading" @click="runPredict">开始预测</el-button>
      </div>
    </div>

    <div class="predict-body">
      <div class="param-panel panel-glass">
        <h3>叶片图片上传</h3>
        <div class="upload-box">
          <el-upload
            class="image-uploader"
            drag
            :auto-upload="false"
            :show-file-list="false"
            accept="image/jpeg,image/png,image/webp,image/bmp,image/gif"
            :on-change="onImageChange"
          >
            <div v-if="imagePreview" class="preview-wrap" @click.stop>
              <img :src="imagePreview" alt="叶片预览" class="preview-img" />
              <div class="preview-actions">
                <el-button size="small" type="danger" plain @click.stop="clearImage">移除图片</el-button>
                <el-button size="small" type="primary" plain @click.stop="analyzeImageColors">重新分析特征</el-button>
              </div>
            </div>
            <div v-else class="upload-placeholder">
              <el-icon :size="36"><UploadFilled /></el-icon>
              <p>拖拽或点击上传叶片照片</p>
              <p class="hint">支持 jpg / png / webp，最大 8MB</p>
            </div>
          </el-upload>
          <p v-if="imageFile" class="file-name">已选：{{ imageFile.name }}</p>
        </div>

        <h3>模型超参数</h3>
        <el-form label-width="110px" label-position="left" class="param-form">
          <el-form-item label="推理模型">
            <el-select v-model="form.model_name" style="width:100%">
              <el-option v-for="m in models" :key="m.value" :label="m.label" :value="m.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="输入尺寸">
            <el-slider v-model="form.input_size" :min="64" :max="512" :step="32" show-input />
          </el-form-item>
          <el-form-item label="Softmax温度">
            <el-slider v-model="form.temperature_softmax" :min="0.1" :max="2.5" :step="0.05" show-input />
          </el-form-item>
          <el-form-item label="Top-K">
            <el-slider v-model="form.top_k" :min="1" :max="9" :step="1" show-input />
          </el-form-item>
          <el-form-item label="置信度阈值">
            <el-slider v-model="form.confidence_threshold" :min="0.1" :max="0.95" :step="0.01" show-input />
          </el-form-item>
          <el-form-item label="数据增强">
            <el-switch v-model="form.use_augmentation" />
          </el-form-item>
          <el-form-item label="保存记录">
            <el-switch v-model="form.save_record" />
          </el-form-item>
          <el-form-item label="产区">
            <el-input v-model="form.region" />
          </el-form-item>
          <el-form-item label="农场">
            <el-input v-model="form.farm" />
          </el-form-item>
        </el-form>

        <h3>叶片特征参数（滑动条）</h3>
        <el-form label-width="110px" label-position="left" class="param-form">
          <el-form-item v-for="item in featureFields" :key="item.key" :label="item.label">
            <el-slider
              v-model="form.features[item.key]"
              :min="item.min"
              :max="item.max"
              :step="item.step"
              show-input
            />
          </el-form-item>
        </el-form>
      </div>

      <div class="result-panel">
        <div class="result-top panel-glass">
          <div class="result-layout" v-if="result">
            <div class="result-image" v-if="resultImageSrc">
              <img :src="resultImageSrc" alt="预测图片" />
              <span>输入图像</span>
            </div>
            <div class="result-main">
              <div class="pred-badge" :class="result.accepted ? 'ok' : 'warn'">
                {{ result.accepted ? '已通过阈值' : '未达阈值' }}
              </div>
              <h3 class="pred-name">{{ result.prediction.disease_name }}</h3>
              <p class="pred-en">{{ result.prediction.name_en }}</p>
              <div class="pred-metrics">
                <div class="metric">
                  <span class="label">置信度</span>
                  <span class="value stat-num">{{ (result.prediction.probability * 100).toFixed(2) }}%</span>
                </div>
                <div class="metric">
                  <span class="label">严重度</span>
                  <span class="value" :class="'sev-' + result.prediction.severity">{{ result.prediction.severity }}</span>
                </div>
                <div class="metric">
                  <span class="label">类别</span>
                  <span class="value">{{ result.prediction.category }}</span>
                </div>
                <div class="metric">
                  <span class="label">耗时</span>
                  <span class="value stat-num">{{ result.inference_ms }} ms</span>
                </div>
              </div>
              <div class="pred-desc">
                <p><span>症状</span>{{ result.prediction.symptoms }}</p>
                <p><span>防治</span>{{ result.prediction.treatment }}</p>
              </div>
              <p v-if="result.saved_id" class="saved-tip">已写入检测记录 #{{ result.saved_id }}</p>
            </div>
          </div>
          <div class="result-empty" v-else>
            <el-icon :size="42"><Cpu /></el-icon>
            <p>上传叶片照片或调整参数后，点击「开始预测」</p>
            <p class="hint">上传图片后可自动分析颜色特征并同步到滑动条</p>
          </div>
        </div>

        <div class="chart-row">
          <ChartPanel title="Top-K 概率分布" :option="barOpt" class="chart-box panel-glass" />
          <ChartPanel title="全类别概率" :option="pieOpt" class="chart-box panel-glass" />
        </div>

        <div class="table-box panel-glass">
          <div class="panel-title">预测明细</div>
          <el-table :data="result?.all_ranking || []" stripe>
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="disease_name" label="病害" width="120" />
            <el-table-column prop="name_en" label="英文名" width="150" />
            <el-table-column prop="category" label="类别" width="90" />
            <el-table-column prop="severity" label="严重度" width="80" />
            <el-table-column prop="percent" label="概率%" width="100">
              <template #default="{ row }">
                <span class="stat-num">{{ row.percent }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="probability" label="置信度" min-width="160">
              <template #default="{ row }">
                <el-progress
                  :percentage="Math.round(row.probability * 100)"
                  :stroke-width="10"
                  :color="row.probability >= form.confidence_threshold ? '#00d4aa' : '#ff9933'"
                />
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import ChartPanel from '../../components/ChartPanel.vue'
import { predictApi } from '../../api'
import { colors, tooltipStyle } from '../../utils/chartTheme'

const loading = ref(false)
const models = ref([])
const presets = ref([])
const presetName = ref('')
const result = ref(null)
const defaultsSnapshot = ref(null)
const imageFile = ref(null)
const imagePreview = ref('')

const form = reactive({
  model_name: 'ResNet50-v2',
  temperature_softmax: 0.85,
  top_k: 5,
  confidence_threshold: 0.35,
  input_size: 224,
  use_augmentation: false,
  save_record: false,
  region: '山东寿光',
  farm: '智慧农业园',
  features: {
    temperature: 26,
    humidity: 72,
    green_ratio: 0.48,
    yellow_ratio: 0.22,
    brown_spot_ratio: 0.18,
    lesion_count: 12,
    lesion_size: 0.32,
    leaf_curl: 0.15,
    mosaic_pattern: 0.08,
    powdery_cover: 0.04,
    water_soak: 0.28,
    concentric_ring: 0.35
  }
})

const featureFields = [
  { key: 'temperature', label: '环境温度℃', min: 5, max: 45, step: 0.5 },
  { key: 'humidity', label: '环境湿度%', min: 10, max: 100, step: 1 },
  { key: 'green_ratio', label: '绿色占比', min: 0, max: 1, step: 0.01 },
  { key: 'yellow_ratio', label: '黄化占比', min: 0, max: 1, step: 0.01 },
  { key: 'brown_spot_ratio', label: '褐斑占比', min: 0, max: 1, step: 0.01 },
  { key: 'lesion_count', label: '病斑数量', min: 0, max: 40, step: 1 },
  { key: 'lesion_size', label: '病斑尺寸', min: 0, max: 1, step: 0.01 },
  { key: 'leaf_curl', label: '卷曲程度', min: 0, max: 1, step: 0.01 },
  { key: 'mosaic_pattern', label: '花叶纹理', min: 0, max: 1, step: 0.01 },
  { key: 'powdery_cover', label: '白粉覆盖', min: 0, max: 1, step: 0.01 },
  { key: 'water_soak', label: '水浸状', min: 0, max: 1, step: 0.01 },
  { key: 'concentric_ring', label: '同心轮纹', min: 0, max: 1, step: 0.01 }
]

const resultImageSrc = computed(() => {
  if (result.value?.image_path) return result.value.image_path
  return imagePreview.value || ''
})

const barOpt = computed(() => {
  const list = result.value?.ranking || []
  return {
    color: [colors[0]],
    tooltip: { ...tooltipStyle(), trigger: 'axis' },
    grid: { top: 24, left: 90, right: 30, bottom: 24 },
    xAxis: {
      type: 'value', max: 100,
      axisLabel: { color: 'rgba(232,244,248,0.55)', formatter: v => v + '%' },
      splitLine: { lineStyle: { color: 'rgba(0,212,170,0.08)' } }
    },
    yAxis: {
      type: 'category',
      data: list.map(i => i.disease_name).reverse(),
      axisLabel: { color: 'rgba(232,244,248,0.7)', fontSize: 11 }
    },
    series: [{
      type: 'bar',
      data: list.map(i => i.percent).reverse(),
      barWidth: 14,
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [{ offset: 0, color: '#00d4aa' }, { offset: 1, color: '#3b9eff' }]
        }
      },
      label: { show: true, position: 'right', color: '#00d4aa', formatter: '{c}%', fontSize: 10 }
    }]
  }
})

const pieOpt = computed(() => {
  const list = (result.value?.all_ranking || []).slice(0, 8)
  return {
    color: colors,
    tooltip: { ...tooltipStyle(), trigger: 'item', formatter: '{b}: {c}%' },
    series: [{
      type: 'pie',
      radius: ['34%', '68%'],
      center: ['50%', '55%'],
      itemStyle: { borderRadius: 4, borderColor: 'rgba(8,28,48,0.5)', borderWidth: 2 },
      label: { color: 'rgba(232,244,248,0.7)', fontSize: 10 },
      data: list.map(i => ({ name: i.disease_name, value: i.percent }))
    }]
  }
})

function applyForm(data) {
  form.model_name = data.model_name
  form.temperature_softmax = data.temperature_softmax
  form.top_k = data.top_k
  form.confidence_threshold = data.confidence_threshold
  form.input_size = data.input_size
  form.use_augmentation = !!data.use_augmentation
  form.save_record = !!data.save_record
  form.region = data.region
  form.farm = data.farm
  Object.assign(form.features, data.features || {})
}

function applyPreset(name) {
  const p = presets.value.find(i => i.name === name)
  if (!p) return
  Object.assign(form.features, p.features)
  ElMessage.success(`已应用预设：${name}`)
}

function resetParams() {
  if (defaultsSnapshot.value) {
    applyForm(JSON.parse(JSON.stringify(defaultsSnapshot.value)))
    presetName.value = ''
    result.value = null
    clearImage()
    ElMessage.success('参数已重置')
  }
}

function clearImage() {
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
  imagePreview.value = ''
  imageFile.value = null
}

function onImageChange(file) {
  const raw = file?.raw
  if (!raw) return
  if (!raw.type.startsWith('image/')) {
    ElMessage.warning('请上传图片文件')
    return
  }
  if (raw.size > 8 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 8MB')
    return
  }
  clearImage()
  imageFile.value = raw
  imagePreview.value = URL.createObjectURL(raw)
  analyzeImageColors()
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function analyzeImageColors() {
  if (!imagePreview.value) return
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const size = 96
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, size, size)
    const data = ctx.getImageData(0, 0, size, size).data

    let green = 0, yellow = 0, brown = 0, white = 0, dark = 0, total = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
      if (a < 40) continue
      total++
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const sat = max === 0 ? 0 : (max - min) / max
      if (g > r + 12 && g > b + 8) green++
      else if (r > 140 && g > 110 && b < 110 && r >= g) yellow++
      else if (r > 70 && g > 35 && b < 70 && r > b + 15) brown++
      else if (r > 180 && g > 180 && b > 180 && sat < 0.2) white++
      else if (max < 70) dark++
    }
    if (!total) return

    const greenRatio = green / total
    const yellowRatio = yellow / total
    const brownRatio = brown / total
    const powdery = white / total
    const waterSoak = dark / total

    form.features.green_ratio = Number(clamp(greenRatio, 0, 1).toFixed(2))
    form.features.yellow_ratio = Number(clamp(yellowRatio * 1.2, 0, 1).toFixed(2))
    form.features.brown_spot_ratio = Number(clamp(brownRatio * 1.3, 0, 1).toFixed(2))
    form.features.powdery_cover = Number(clamp(powdery * 1.5, 0, 1).toFixed(2))
    form.features.water_soak = Number(clamp(waterSoak * 1.2, 0, 1).toFixed(2))
    form.features.lesion_count = Math.round(clamp(brownRatio * 35, 0, 40))
    form.features.lesion_size = Number(clamp(brownRatio * 1.8 + waterSoak * 0.5, 0.02, 1).toFixed(2))
    form.features.concentric_ring = Number(clamp(brownRatio * 1.4, 0, 1).toFixed(2))
    form.features.mosaic_pattern = Number(clamp(yellowRatio * 0.9 + (1 - satAvgSafe(data)) * 0.2, 0, 1).toFixed(2))
    form.features.leaf_curl = Number(clamp(yellowRatio * 0.8 + (1 - greenRatio) * 0.3, 0, 1).toFixed(2))

    ElMessage.success('已根据图片颜色自动更新特征滑动条，可继续手动微调')
  }
  img.onerror = () => ElMessage.error('图片分析失败')
  img.src = imagePreview.value
}

function satAvgSafe(data) {
  let sum = 0, n = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max === 0) continue
    sum += (max - min) / max
    n++
  }
  return n ? sum / n : 0.5
}

async function runPredict() {
  loading.value = true
  try {
    const fd = new FormData()
    fd.append('model_name', form.model_name)
    fd.append('temperature_softmax', String(form.temperature_softmax))
    fd.append('top_k', String(form.top_k))
    fd.append('confidence_threshold', String(form.confidence_threshold))
    fd.append('input_size', String(form.input_size))
    fd.append('use_augmentation', String(form.use_augmentation))
    fd.append('save_record', String(form.save_record))
    fd.append('region', form.region)
    fd.append('farm', form.farm)
    fd.append('features', JSON.stringify(form.features))
    if (imageFile.value) fd.append('image', imageFile.value)

    const res = await predictApi.run(fd)
    if (res.code === 0) {
      result.value = res.data
      ElMessage.success(res.message || '预测完成')
    } else {
      ElMessage.error(res.message || '预测失败')
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const [mRes, dRes] = await Promise.all([predictApi.models(), predictApi.defaults()])
  if (mRes.code === 0) models.value = mRes.data
  if (dRes.code === 0) {
    defaultsSnapshot.value = dRes.data
    presets.value = dRes.data.presets || []
    applyForm(dRes.data)
  }
})

onUnmounted(() => {
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
})
</script>

<style scoped>
.predict-page {
  height: 100%;
  padding: 12px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-x: hidden;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  flex-shrink: 0;
  gap: 12px;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 5;
  backdrop-filter: blur(12px);
}

.page-header h2 {
  font-size: 18px;
  color: var(--theme-primary);
  margin-bottom: 2px;
}

.page-header .sub {
  font-size: 12px;
  color: rgba(232, 244, 248, 0.45);
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.predict-body {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 10px;
  align-items: start;
  padding-bottom: 12px;
}

.param-panel {
  padding: 14px 16px 24px;
}

.param-panel h3 {
  font-size: 13px;
  color: var(--theme-primary);
  margin: 14px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--panel-border);
}

.param-panel h3:first-child { margin-top: 0; }

.upload-box {
  margin-bottom: 4px;
}

.image-uploader :deep(.el-upload) {
  width: 100%;
}

.image-uploader :deep(.el-upload-dragger) {
  width: 100%;
  height: auto;
  min-height: 180px;
  padding: 12px;
  background: rgba(8, 28, 48, 0.45);
  border: 1px dashed rgba(0, 212, 170, 0.4);
  border-radius: 8px;
}

.image-uploader :deep(.el-upload-dragger:hover) {
  border-color: var(--theme-primary);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(232, 244, 248, 0.5);
  min-height: 150px;
}

.upload-placeholder .hint {
  font-size: 12px;
  color: rgba(232, 244, 248, 0.35);
}

.preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.preview-img {
  max-width: 100%;
  max-height: 220px;
  border-radius: 8px;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.25);
}

.preview-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.file-name {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(232, 244, 248, 0.55);
  word-break: break-all;
}

.param-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.param-form :deep(.el-form-item__label) {
  color: rgba(232, 244, 248, 0.65);
  font-size: 12px;
}

.param-form :deep(.el-slider) {
  --el-slider-main-bg-color: var(--theme-primary);
  width: 100%;
}

.param-form :deep(.el-slider__runway) {
  margin-right: 12px;
}

.result-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.result-top {
  padding: 16px 18px;
  min-height: 160px;
}

.result-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.result-image {
  width: 160px;
  flex-shrink: 0;
  text-align: center;
}

.result-image img {
  width: 100%;
  max-height: 160px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid rgba(0, 212, 170, 0.25);
  background: rgba(0, 0, 0, 0.2);
}

.result-image span {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: rgba(232, 244, 248, 0.45);
}

.result-empty {
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(232, 244, 248, 0.4);
}

.result-empty .hint { font-size: 12px; }

.pred-badge {
  display: inline-block;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 20px;
  margin-bottom: 8px;
}

.pred-badge.ok {
  color: #00d4aa;
  background: rgba(0, 212, 170, 0.12);
  border: 1px solid rgba(0, 212, 170, 0.35);
}

.pred-badge.warn {
  color: #ff9933;
  background: rgba(255, 153, 51, 0.12);
  border: 1px solid rgba(255, 153, 51, 0.35);
}

.pred-name {
  font-size: 26px;
  color: var(--theme-text);
  margin-bottom: 2px;
}

.pred-en {
  font-size: 12px;
  color: rgba(232, 244, 248, 0.45);
  margin-bottom: 12px;
}

.pred-metrics {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 80px;
}

.metric .label {
  font-size: 11px;
  color: rgba(232, 244, 248, 0.45);
}

.metric .value { font-size: 18px; }

.pred-desc p {
  font-size: 12px;
  margin-bottom: 6px;
  display: flex;
  gap: 8px;
  color: rgba(232, 244, 248, 0.8);
}

.pred-desc span {
  color: rgba(232, 244, 248, 0.45);
  min-width: 36px;
}

.saved-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--theme-primary);
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  min-height: 280px;
}

.chart-box {
  height: 280px;
  overflow: hidden;
}

.table-box {
  padding: 0 0 12px;
}

.sev-高 { color: #ff4455; }
.sev-中 { color: #ff9933; }
.sev-低 { color: #ffcc33; }
.sev-无 { color: #44cc66; }

@media (max-width: 1200px) {
  .predict-body { grid-template-columns: 1fr; }
  .chart-row { grid-template-columns: 1fr; }
  .result-layout { flex-direction: column; }
}
</style>
