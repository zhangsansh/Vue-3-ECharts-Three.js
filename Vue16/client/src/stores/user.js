import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const permissions = ref([])

  const isLoggedIn = computed(() => !!token.value)
  const role = computed(() => user.value?.role || 'viewer')
  const isAdmin = computed(() => role.value === 'admin')
  const isOperator = computed(() => ['admin', 'operator'].includes(role.value))

  function hasPermission(p) {
    return permissions.value.includes(p)
  }

  async function login(form) {
    const res = await authApi.login(form)
    if (res.code === 0) {
      token.value = res.data.token
      user.value = res.data.user
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      await fetchPermissions()
    }
    return res
  }

  async function fetchPermissions() {
    try {
      const res = await authApi.permissions()
      if (res.code === 0) permissions.value = res.data.permissions
    } catch { /* ignore */ }
  }

  function logout() {
    token.value = ''
    user.value = null
    permissions.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, permissions, isLoggedIn, role, isAdmin, isOperator, hasPermission, login, fetchPermissions, logout }
})
