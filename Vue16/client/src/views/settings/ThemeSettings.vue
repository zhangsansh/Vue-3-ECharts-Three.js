<template>
  <div class="theme-page">
    <div class="page-header panel-glass">
      <h2>系统样式设置</h2>
      <div class="actions">
        <el-button @click="resetDefaults">恢复默认</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存并应用</el-button>
      </div>
    </div>

    <div class="settings-body">
      <div class="form-panel panel-glass">
        <h3>基础信息</h3>
        <el-form label-width="100px" label-position="left">
          <el-form-item label="系统标题">
            <el-input v-model="form.system_title" @input="preview" />
          </el-form-item>
          <el-form-item label="副标题">
            <el-input v-model="form.system_subtitle" @input="preview" />
          </el-form-item>
        </el-form>

        <h3>颜色</h3>
        <el-form label-width="100px">
          <el-form-item label="主色调">
            <div class="color-row">
              <el-color-picker v-model="form.theme_primary" @change="preview" />
              <el-input v-model="form.theme_primary" @input="preview" />
            </div>
          </el-form-item>
          <el-form-item label="次要色">
            <div class="color-row">
              <el-color-picker v-model="form.theme_secondary" @change="preview" />
              <el-input v-model="form.theme_secondary" @input="preview" />
            </div>
          </el-form-item>
          <el-form-item label="强调色">
            <div class="color-row">
              <el-color-picker v-model="form.theme_accent" @change="preview" />
              <el-input v-model="form.theme_accent" @input="preview" />
            </div>
          </el-form-item>
          <el-form-item label="文字颜色">
            <div class="color-row">
              <el-color-picker v-model="form.theme_text" @change="preview" />
              <el-input v-model="form.theme_text" @input="preview" />
            </div>
          </el-form-item>
        </el-form>

        <h3>背景</h3>
        <el-form label-width="100px">
          <el-form-item label="背景样式">
            <el-select v-model="bgPreset" style="width:100%" @change="applyBgPreset">
              <el-option label="深绿科技（默认）" value="default" />
              <el-option label="深蓝夜空" value="blue" />
              <el-option label="墨绿田野" value="green" />
              <el-option label="暗紫科幻" value="purple" />
              <el-option label="暖橙暮光" value="orange" />
              <el-option label="自定义渐变" value="custom" />
            </el-select>
          </el-form-item>
          <el-form-item label="背景 CSS">
            <el-input v-model="form.theme_bg" type="textarea" :rows="3" @input="preview" />
          </el-form-item>
        </el-form>

        <h3>字体与图表</h3>
        <el-form label-width="100px">
          <el-form-item label="字体">
            <el-select v-model="form.theme_font" style="width:100%" @change="preview">
              <el-option label="Noto Sans SC" value='"Noto Sans SC", "PingFang SC", sans-serif' />
              <el-option label="思源黑体" value='"Source Han Sans SC", "Noto Sans SC", sans-serif' />
              <el-option label="微软雅黑" value='"Microsoft YaHei", sans-serif' />
              <el-option label="Orbitron + 中文" value='Orbitron, "Noto Sans SC", sans-serif' />
              <el-option label="衬线风格" value='"Noto Serif SC", "Songti SC", serif' />
            </el-select>
          </el-form-item>
          <el-form-item label="图表透明度">
            <el-slider v-model="chartOpacity" :min="0.4" :max="1" :step="0.05" @input="onOpacityChange" />
          </el-form-item>
        </el-form>
      </div>

      <div class="preview-panel panel-glass">
        <h3>实时预览</h3>
        <div class="preview-screen" :style="{ background: form.theme_bg, fontFamily: form.theme_font, color: form.theme_text }">
          <div class="preview-header" :style="{ borderColor: form.theme_primary + '40' }">
            <span :style="{ color: form.theme_primary }">●</span>
            <span class="preview-title" :style="{ background: `linear-gradient(90deg, ${form.theme_primary}, ${form.theme_secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }">
              {{ form.system_title }}
            </span>
          </div>
          <div class="preview-body">
            <div class="preview-card" :style="{ borderColor: form.theme_primary + '40', opacity: chartOpacity }">
              <div class="preview-card-title" :style="{ color: form.theme_primary }">病害分布</div>
              <div class="preview-bars">
                <div v-for="(b, i) in bars" :key="i" class="bar" :style="{ height: b + '%', background: i % 2 ? form.theme_secondary : form.theme_primary }"></div>
              </div>
            </div>
            <div class="preview-center">
              <div class="preview-tomato" :style="{ background: `radial-gradient(circle at 35% 35%, ${form.theme_accent}, #c0392b)` }"></div>
              <p class="preview-sub">{{ form.system_subtitle }}</p>
            </div>
            <div class="preview-card" :style="{ borderColor: form.theme_primary + '40', opacity: chartOpacity }">
              <div class="preview-card-title" :style="{ color: form.theme_primary }">检测趋势</div>
              <svg viewBox="0 0 120 60" class="preview-line">
                <polyline :points="linePoints" fill="none" :stroke="form.theme_secondary" stroke-width="2" />
                <polyline :points="areaPoints" :fill="form.theme_primary" fill-opacity="0.2" stroke="none" />
              </svg>
            </div>
          </div>
          <div class="preview-stats">
            <div v-for="s in ['累计 1520', '健康率 42%', '今日 68']" :key="s" class="stat" :style="{ color: form.theme_primary, borderColor: form.theme_primary + '30' }">{{ s }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useThemeStore } from '../../stores/theme'

const theme = useThemeStore()
const saving = ref(false)
const bgPreset = ref('default')
const chartOpacity = ref(0.85)
const bars = [40, 70, 55, 85, 45, 60, 75]
const linePoints = '0,40 20,30 40,45 60,20 80,28 100,15 120,25'
const areaPoints = '0,60 0,40 20,30 40,45 60,20 80,28 100,15 120,25 120,60'

const defaults = {
  theme_bg: 'linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #132f4c 100%)',
  theme_primary: '#00d4aa',
  theme_secondary: '#3b9eff',
  theme_accent: '#ff6b35',
  theme_text: '#e8f4f8',
  theme_font: '"Noto Sans SC", "PingFang SC", sans-serif',
  theme_chart_opacity: '0.85',
  system_title: '基于深度学习的番茄叶病害分类系统',
  system_subtitle: 'Tomato Leaf Disease Classification Visualization Platform'
}

const bgPresets = {
  default: 'linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #132f4c 100%)',
  blue: 'linear-gradient(160deg, #061018 0%, #0a1f3d 50%, #0d2b4a 100%)',
  green: 'linear-gradient(160deg, #0a1a10 0%, #0d2a18 45%, #123020 100%)',
  purple: 'linear-gradient(160deg, #0e0a18 0%, #1a1030 45%, #1e1540 100%)',
  orange: 'linear-gradient(160deg, #1a1008 0%, #2a1810 45%, #3a2010 100%)'
}

const form = reactive({ ...defaults })

function preview() {
  theme.preview({ ...form })
}

function onOpacityChange(v) {
  form.theme_chart_opacity = String(v)
  preview()
}

function applyBgPreset(key) {
  if (key !== 'custom' && bgPresets[key]) {
    form.theme_bg = bgPresets[key]
    preview()
  }
}

function resetDefaults() {
  Object.assign(form, { ...defaults })
  chartOpacity.value = 0.85
  bgPreset.value = 'default'
  preview()
}

async function handleSave() {
  saving.value = true
  try {
    const res = await theme.save({ ...form })
    if (res.code === 0) ElMessage.success('样式已保存并应用')
    else ElMessage.error(res.message)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  Object.assign(form, { ...defaults, ...theme.settings })
  chartOpacity.value = Number(form.theme_chart_opacity) || 0.85
})
</script>

<style scoped>
.theme-page {
  height: 100%; padding: 16px;
  display: flex; flex-direction: column; gap: 12px; overflow: hidden;
}
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; flex-shrink: 0;
}
.page-header h2 { font-size: 18px; color: var(--theme-primary); }
.actions { display: flex; gap: 10px; }
.settings-body {
  flex: 1; min-height: 0;
  display: grid; grid-template-columns: 420px 1fr; gap: 12px;
}
.form-panel {
  padding: 20px; overflow-y: auto;
}
.form-panel h3 {
  font-size: 14px; color: var(--theme-primary);
  margin: 16px 0 12px; padding-bottom: 6px;
  border-bottom: 1px solid var(--panel-border);
}
.form-panel h3:first-child { margin-top: 0; }
.color-row { display: flex; gap: 10px; align-items: center; width: 100%; }
.preview-panel {
  padding: 20px; display: flex; flex-direction: column; min-height: 0;
}
.preview-panel h3 {
  font-size: 14px; color: var(--theme-primary); margin-bottom: 12px;
}
.preview-screen {
  flex: 1; border-radius: 10px; overflow: hidden;
  display: flex; flex-direction: column;
  border: 1px solid rgba(255,255,255,0.08);
}
.preview-header {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid;
  background: rgba(0,0,0,0.25);
}
.preview-title { font-size: 14px; font-weight: 700; }
.preview-body {
  flex: 1; display: grid; grid-template-columns: 1fr 1.2fr 1fr;
  gap: 10px; padding: 12px;
}
.preview-card {
  background: rgba(8,28,48,0.55); border: 1px solid;
  border-radius: 8px; padding: 10px;
  display: flex; flex-direction: column;
}
.preview-card-title { font-size: 11px; margin-bottom: 8px; }
.preview-bars {
  flex: 1; display: flex; align-items: flex-end; gap: 4px; padding: 4px;
}
.bar { flex: 1; border-radius: 2px 2px 0 0; min-height: 4px; transition: height 0.3s; }
.preview-center {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
}
.preview-tomato {
  width: 80px; height: 80px; border-radius: 50%;
  box-shadow: 0 0 30px rgba(255,100,50,0.4);
}
.preview-sub { font-size: 10px; opacity: 0.5; text-align: center; padding: 0 8px; }
.preview-line { width: 100%; flex: 1; }
.preview-stats {
  display: flex; justify-content: center; gap: 12px;
  padding: 10px; background: rgba(0,0,0,0.2);
}
.stat {
  padding: 4px 14px; border: 1px solid; border-radius: 4px;
  font-size: 12px; font-family: Orbitron, sans-serif;
}
</style>
