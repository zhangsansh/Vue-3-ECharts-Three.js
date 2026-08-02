import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('../layouts/ScreenLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/Dashboard.vue'),
        meta: { title: '总览大屏' }
      },
      {
        path: 'charts/basic',
        name: 'ChartsBasic',
        component: () => import('../views/charts/ChartsBasic.vue'),
        meta: { title: '基础图表' }
      },
      {
        path: 'charts/advanced',
        name: 'ChartsAdvanced',
        component: () => import('../views/charts/ChartsAdvanced.vue'),
        meta: { title: '高级图表' }
      },
      {
        path: 'charts/3d',
        name: 'Charts3D',
        component: () => import('../views/charts/Charts3D.vue'),
        meta: { title: '三维图表' }
      },
      {
        path: 'charts/special',
        name: 'ChartsSpecial',
        component: () => import('../views/charts/ChartsSpecial.vue'),
        meta: { title: '特效图表' }
      },
      {
        path: 'predict',
        name: 'Predict',
        component: () => import('../views/predict/Predict.vue'),
        meta: { title: '病害预测' }
      },
      {
        path: 'manage/users',
        name: 'ManageUsers',
        component: () => import('../views/manage/Users.vue'),
        meta: { title: '用户管理', roles: ['admin'] }
      },
      {
        path: 'manage/data',
        name: 'ManageData',
        component: () => import('../views/manage/DataManage.vue'),
        meta: { title: '数据管理', roles: ['admin', 'operator'] }
      },
      {
        path: 'manage/database',
        name: 'ManageDatabase',
        component: () => import('../views/manage/Database.vue'),
        meta: { title: '数据库设置', roles: ['admin'] }
      },
      {
        path: 'settings/theme',
        name: 'ThemeSettings',
        component: () => import('../views/settings/ThemeSettings.vue'),
        meta: { title: '系统样式', roles: ['admin'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (!to.meta.public && !token) {
    next('/login')
    return
  }
  if (to.path === '/login' && token) {
    next('/dashboard')
    return
  }
  if (to.meta.roles) {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (!user || !to.meta.roles.includes(user.role)) {
      next('/dashboard')
      return
    }
  }
  next()
})

export default router
