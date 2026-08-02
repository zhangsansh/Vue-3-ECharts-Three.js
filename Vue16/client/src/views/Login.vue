<template>
  <div class="login-page">
    <div class="login-left">
      <div class="left-overlay"></div>
      <div class="left-content">
        <div class="brand">
          <div class="brand-icon">🍅</div>
          <h1>番茄叶病害分类系统</h1>
          <p class="en">Deep Learning Tomato Leaf Disease Classification</p>
        </div>
        <div class="feature-list">
          <div class="feature-item" v-for="f in features" :key="f.title">
            <div class="feature-dot"></div>
            <div>
              <h3>{{ f.title }}</h3>
              <p>{{ f.desc }}</p>
            </div>
          </div>
        </div>
        <div class="leaf-gallery">
          <div class="leaf-card" v-for="(leaf, i) in leaves" :key="i" :style="{ animationDelay: i * 0.15 + 's' }">
            <div class="leaf-visual" :style="{ background: leaf.color }">
              <svg viewBox="0 0 80 80" class="leaf-svg">
                <ellipse cx="40" cy="42" rx="22" ry="30" :fill="leaf.fill" opacity="0.9"/>
                <path d="M40 12 Q42 42 40 72" stroke="#1a3a2a" stroke-width="1.5" fill="none"/>
                <path d="M40 30 Q28 35 22 42" stroke="#1a3a2a" stroke-width="1" fill="none" opacity="0.6"/>
                <path d="M40 30 Q52 35 58 42" stroke="#1a3a2a" stroke-width="1" fill="none" opacity="0.6"/>
                <circle v-for="(s, si) in leaf.spots" :key="si" :cx="s.x" :cy="s.y" :r="s.r" :fill="s.color" opacity="0.8"/>
              </svg>
            </div>
            <span>{{ leaf.name }}</span>
          </div>
        </div>
        <div class="tech-tags">
          <span>Vue3</span><span>ECharts</span><span>Three.js</span><span>深度学习</span><span>SQLite</span>
        </div>
      </div>
    </div>

    <div class="login-right">
      <div class="login-card">
        <h2>用户登录</h2>
        <p class="sub">欢迎使用可视化数据大屏系统</p>

        <el-tabs v-model="loginType" class="login-tabs">
          <el-tab-pane label="账号登录" name="account" />
          <el-tab-pane label="手机号登录" name="phone" />
        </el-tabs>

        <el-form :model="form" @submit.prevent="handleLogin" class="login-form">
          <el-form-item v-if="loginType === 'account'">
            <el-input v-model="form.username" placeholder="用户名" size="large" prefix-icon="User" />
          </el-form-item>
          <el-form-item v-else>
            <el-input v-model="form.phone" placeholder="手机号" size="large" prefix-icon="Phone" maxlength="11" />
          </el-form-item>
          <el-form-item>
            <el-input v-model="form.password" type="password" placeholder="密码" size="large" prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
          </el-form-item>
          <el-form-item>
            <div class="captcha-row">
              <el-input v-model="form.captcha" placeholder="验证码" size="large" prefix-icon="Key" @keyup.enter="handleLogin" />
              <div class="captcha-img" @click="loadCaptcha" v-html="captchaSvg" title="点击刷新"></div>
            </div>
          </el-form-item>
          <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
            登 录
          </el-button>
        </el-form>

        <div class="demo-accounts">
          <p>演示账号</p>
          <div class="demo-tags">
            <el-tag size="small" effect="plain" @click="fillDemo('admin')">admin / admin123</el-tag>
            <el-tag size="small" effect="plain" type="success" @click="fillDemo('operator')">operator / user123</el-tag>
            <el-tag size="small" effect="plain" type="info" @click="fillDemo('viewer')">viewer / viewer123</el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '../api'
import { useUserStore } from '../stores/user'
import { useThemeStore } from '../stores/theme'

const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()

const loginType = ref('account')
const loading = ref(false)
const captchaSvg = ref('')
const captchaId = ref('')

const form = reactive({
  username: '',
  phone: '',
  password: '',
  captcha: ''
})

const features = [
  { title: '深度学习识别', desc: '基于 ResNet / EfficientNet / ViT 多模型融合分类' },
  { title: '三维交互大屏', desc: '中央 3D 模型联动病害数据，支持点击探索' },
  { title: '多维可视化', desc: '折线、玫瑰、热力、3D 柱状等 20+ 图表类型' },
  { title: '权限分级管理', desc: '管理员 / 操作员 / 访客，数据安全可控' }
]

const leaves = [
  { name: '早疫病', color: 'linear-gradient(145deg,#2d5a3d,#1a3a28)', fill: '#3d8b5a', spots: [{ x: 32, y: 35, r: 4, color: '#8b4513' }, { x: 48, y: 48, r: 5, color: '#a0522d' }, { x: 38, y: 55, r: 3, color: '#654321' }] },
  { name: '晚疫病', color: 'linear-gradient(145deg,#2a4a3a,#152820)', fill: '#2e6b4a', spots: [{ x: 30, y: 40, r: 6, color: '#1a1a1a' }, { x: 50, y: 50, r: 7, color: '#2a2a2a' }] },
  { name: '叶霉病', color: 'linear-gradient(145deg,#2d5a3d,#1a3a28)', fill: '#3a7a50', spots: [{ x: 35, y: 45, r: 8, color: '#6b5b8a' }, { x: 48, y: 38, r: 5, color: '#7a6a9a' }] },
  { name: '健康叶', color: 'linear-gradient(145deg,#2d6a3d,#1a4a28)', fill: '#4caf70', spots: [] }
]

async function loadCaptcha() {
  const res = await authApi.captcha()
  if (res.code === 0) {
    captchaId.value = res.data.id
    captchaSvg.value = res.data.svg
  }
}

function fillDemo(role) {
  const map = {
    admin: { username: 'admin', password: 'admin123', phone: '13800000001' },
    operator: { username: 'operator', password: 'user123', phone: '13800000002' },
    viewer: { username: 'viewer', password: 'viewer123', phone: '13800000003' }
  }
  const d = map[role]
  form.username = d.username
  form.password = d.password
  form.phone = d.phone
}

async function handleLogin() {
  if (loginType.value === 'account' && !form.username) return ElMessage.warning('请输入用户名')
  if (loginType.value === 'phone' && !form.phone) return ElMessage.warning('请输入手机号')
  if (!form.password) return ElMessage.warning('请输入密码')
  if (!form.captcha) return ElMessage.warning('请输入验证码')

  loading.value = true
  try {
    const res = await userStore.login({
      loginType: loginType.value,
      username: form.username,
      phone: form.phone,
      password: form.password,
      captchaId: captchaId.value,
      captcha: form.captcha
    })
    if (res.code === 0) {
      ElMessage.success('登录成功')
      await themeStore.load()
      router.push('/dashboard')
    } else {
      ElMessage.error(res.message || '登录失败')
      loadCaptcha()
      form.captcha = ''
    }
  } catch {
    loadCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(loadCaptcha)
</script>

<style scoped>
.login-page {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 100vh;
}

.login-left {
  flex: 1.2;
  position: relative;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(0, 212, 170, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(59, 158, 255, 0.12) 0%, transparent 40%),
    linear-gradient(160deg, #071420 0%, #0a2a1a 45%, #0d2137 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.left-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 212, 170, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 170, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

.left-content {
  position: relative;
  z-index: 1;
  max-width: 560px;
}

.brand-icon {
  font-size: 48px;
  margin-bottom: 12px;
  filter: drop-shadow(0 0 20px rgba(255, 100, 50, 0.4));
}

.brand h1 {
  font-size: 32px;
  font-weight: 900;
  background: linear-gradient(90deg, #00d4aa, #3b9eff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.brand .en {
  color: rgba(232, 244, 248, 0.5);
  font-size: 13px;
  letter-spacing: 1px;
  margin-bottom: 36px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 36px;
}

.feature-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.feature-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00d4aa;
  margin-top: 6px;
  box-shadow: 0 0 8px #00d4aa;
  flex-shrink: 0;
}

.feature-item h3 {
  font-size: 15px;
  color: #e8f4f8;
  margin-bottom: 2px;
}

.feature-item p {
  font-size: 12px;
  color: rgba(232, 244, 248, 0.55);
}

.leaf-gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}

.leaf-card {
  text-align: center;
  animation: floatUp 0.6s ease both;
}

.leaf-visual {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 212, 170, 0.2);
  margin-bottom: 6px;
  transition: transform 0.3s;
}

.leaf-card:hover .leaf-visual {
  transform: translateY(-4px) scale(1.05);
}

.leaf-svg { width: 70%; height: 70%; }

.leaf-card span {
  font-size: 11px;
  color: rgba(232, 244, 248, 0.7);
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tech-tags span {
  padding: 4px 12px;
  border: 1px solid rgba(0, 212, 170, 0.3);
  border-radius: 20px;
  font-size: 11px;
  color: #00d4aa;
  background: rgba(0, 212, 170, 0.08);
}

.login-right {
  flex: 0.8;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #0a1628 0%, #0d2137 100%);
  padding: 40px;
  min-width: 400px;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.login-card h2 {
  font-size: 28px;
  font-weight: 700;
  color: #e8f4f8;
  margin-bottom: 4px;
}

.login-card .sub {
  color: rgba(232, 244, 248, 0.45);
  font-size: 13px;
  margin-bottom: 24px;
}

.login-tabs :deep(.el-tabs__item) {
  color: rgba(232, 244, 248, 0.5);
}
.login-tabs :deep(.el-tabs__item.is-active) {
  color: #00d4aa;
}
.login-tabs :deep(.el-tabs__active-bar) {
  background: #00d4aa;
}
.login-tabs :deep(.el-tabs__nav-wrap::after) {
  background: rgba(0, 212, 170, 0.15);
}

.captcha-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.captcha-img {
  flex-shrink: 0;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(0, 212, 170, 0.3);
  transition: opacity 0.2s;
}

.captcha-img:hover { opacity: 0.8; }
.captcha-img :deep(svg) { display: block; height: 40px; width: 120px; }

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  letter-spacing: 4px;
  background: linear-gradient(90deg, #00d4aa, #3b9eff) !important;
  border: none !important;
  margin-top: 8px;
}

.demo-accounts {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 212, 170, 0.15);
}

.demo-accounts p {
  font-size: 12px;
  color: rgba(232, 244, 248, 0.4);
  margin-bottom: 10px;
}

.demo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.demo-tags .el-tag {
  cursor: pointer;
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .login-page { flex-direction: column; }
  .login-left { flex: none; padding: 32px 24px; min-height: auto; }
  .login-right { flex: 1; min-width: auto; }
  .leaf-gallery { grid-template-columns: repeat(4, 1fr); }
}
</style>
