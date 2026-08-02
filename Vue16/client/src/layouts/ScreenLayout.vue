<template>
  <div class="screen-layout">
    <header class="screen-header">
      <div class="header-left">
        <span class="logo-dot"></span>
        <span class="system-title">{{ theme.settings.system_title }}</span>
      </div>
      <nav class="header-nav">
        <router-link
          v-for="item in topMenus"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          {{ item.title }}
        </router-link>
      </nav>
      <div class="header-right">
        <span class="clock">{{ clock }}</span>
        <el-dropdown @command="handleCommand">
          <span class="user-info">
            <el-icon><UserFilled /></el-icon>
            {{ userStore.user?.nickname || userStore.user?.username }}
            <el-tag size="small" effect="plain" style="margin-left:6px">{{ roleLabel }}</el-tag>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <main class="screen-main">
      <router-view />
    </main>

    <footer class="screen-footer">
      <nav class="footer-nav">
        <router-link
          v-for="item in bottomMenus"
          :key="item.path"
          :to="item.path"
          class="footer-item"
          :class="{ active: isActive(item.path) }"
        >
          <el-icon :size="16"><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </router-link>
      </nav>
    </footer>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useThemeStore } from '../stores/theme'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const theme = useThemeStore()
const clock = ref('')
let timer = null

const roleLabel = computed(() => {
  const map = { admin: '管理员', operator: '操作员', viewer: '访客' }
  return map[userStore.role] || userStore.role
})

const topMenus = computed(() => {
  const menus = [
    { path: '/dashboard', title: '总览大屏' },
    { path: '/charts/basic', title: '基础图表' },
    { path: '/charts/advanced', title: '高级图表' },
    { path: '/charts/3d', title: '三维图表' },
    { path: '/charts/special', title: '特效图表' },
    { path: '/predict', title: '病害预测' }
  ]
  return menus
})

const bottomMenus = computed(() => {
  const menus = [
    { path: '/dashboard', title: '首页', icon: 'HomeFilled' },
    { path: '/predict', title: '预测调试', icon: 'Cpu' }
  ]
  if (userStore.isOperator) {
    menus.push({ path: '/manage/data', title: '数据管理', icon: 'Document' })
  }
  if (userStore.isAdmin) {
    menus.push(
      { path: '/manage/users', title: '用户管理', icon: 'User' },
      { path: '/manage/database', title: '数据库', icon: 'Coin' },
      { path: '/settings/theme', title: '样式设置', icon: 'Brush' }
    )
  }
  return menus
})

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

function handleCommand(cmd) {
  if (cmd === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}

function updateClock() {
  const now = new Date()
  clock.value = now.toLocaleString('zh-CN', { hour12: false })
}

onMounted(() => {
  updateClock()
  timer = setInterval(updateClock, 1000)
  theme.load()
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.screen-layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg);
  overflow: hidden;
}

.screen-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(8, 20, 36, 0.75);
  border-bottom: 1px solid var(--panel-border);
  backdrop-filter: blur(12px);
  z-index: 100;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 280px;
}

.logo-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--theme-primary);
  box-shadow: 0 0 12px var(--theme-primary);
  animation: pulse 2s infinite;
}

.system-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(90deg, var(--theme-primary), var(--theme-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

.header-nav {
  display: flex;
  gap: 4px;
}

.nav-item {
  padding: 6px 16px;
  font-size: 13px;
  color: rgba(232, 244, 248, 0.6);
  border-radius: 4px;
  transition: all 0.25s;
  border: 1px solid transparent;
}

.nav-item:hover {
  color: var(--theme-primary);
  background: rgba(0, 212, 170, 0.08);
}

.nav-item.active {
  color: var(--theme-primary);
  border-color: var(--panel-border);
  background: rgba(0, 212, 170, 0.12);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 280px;
  justify-content: flex-end;
}

.clock {
  font-family: 'Orbitron', sans-serif;
  font-size: 13px;
  color: var(--theme-secondary);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--theme-text);
  font-size: 13px;
}

.screen-main {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.screen-footer {
  height: var(--footer-height);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 20, 36, 0.75);
  border-top: 1px solid var(--panel-border);
  backdrop-filter: blur(12px);
  z-index: 100;
  flex-shrink: 0;
}

.footer-nav {
  display: flex;
  gap: 8px;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 18px;
  font-size: 12px;
  color: rgba(232, 244, 248, 0.55);
  border-radius: 20px;
  transition: all 0.25s;
}

.footer-item:hover,
.footer-item.active {
  color: var(--theme-primary);
  background: rgba(0, 212, 170, 0.12);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
