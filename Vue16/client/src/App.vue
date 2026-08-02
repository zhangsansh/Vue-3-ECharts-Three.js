<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useThemeStore } from './stores/theme'
import { useUserStore } from './stores/user'

const theme = useThemeStore()
const userStore = useUserStore()

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await theme.load()
    await userStore.fetchPermissions()
  }
})
</script>
