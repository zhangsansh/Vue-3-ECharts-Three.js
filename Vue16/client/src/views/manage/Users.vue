<template>
  <div class="manage-page">
    <div class="page-header panel-glass">
      <h2>用户管理</h2>
      <div class="actions">
        <el-input v-model="keyword" placeholder="搜索用户名/手机号" clearable style="width:200px" @clear="load" @keyup.enter="load" />
        <el-select v-model="roleFilter" placeholder="角色" clearable style="width:120px" @change="load">
          <el-option label="管理员" value="admin" />
          <el-option label="操作员" value="operator" />
          <el-option label="访客" value="viewer" />
        </el-select>
        <el-button type="primary" @click="openDialog()">新增用户</el-button>
      </div>
    </div>

    <div class="table-wrap panel-glass">
      <el-table :data="list" stripe height="100%">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : row.role === 'operator' ? 'success' : 'info'" size="small">
              {{ { admin: '管理员', operator: '操作员', viewer: '访客' }[row.role] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'danger'" size="small">{{ row.status ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination background layout="total, prev, pager, next" :total="total" v-model:current-page="page" :page-size="pageSize" @current-change="load" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑用户' : '新增用户'" width="460px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item :label="form.id ? '新密码' : '密码'" :required="!form.id">
          <el-input v-model="form.password" type="password" show-password :placeholder="form.id ? '不修改请留空' : ''" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" maxlength="11" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width:100%">
            <el-option label="管理员" value="admin" />
            <el-option label="操作员" value="operator" />
            <el-option label="访客" value="viewer" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" v-if="form.id">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '../../api'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 12
const keyword = ref('')
const roleFilter = ref('')
const dialogVisible = ref(false)
const saving = ref(false)
const form = reactive({ id: null, username: '', password: '', phone: '', nickname: '', role: 'viewer', status: 1 })

async function load() {
  const res = await userApi.list({ page: page.value, pageSize, keyword: keyword.value, role: roleFilter.value })
  if (res.code === 0) {
    list.value = res.data.list
    total.value = res.data.total
  }
}

function openDialog(row) {
  if (row) {
    Object.assign(form, { id: row.id, username: row.username, password: '', phone: row.phone || '', nickname: row.nickname || '', role: row.role, status: row.status })
  } else {
    Object.assign(form, { id: null, username: '', password: '', phone: '', nickname: '', role: 'viewer', status: 1 })
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.username) return ElMessage.warning('请输入用户名')
  if (!form.id && !form.password) return ElMessage.warning('请输入密码')
  saving.value = true
  try {
    const payload = { ...form }
    if (!payload.password) delete payload.password
    const res = form.id ? await userApi.update(form.id, payload) : await userApi.create(payload)
    if (res.code === 0) {
      ElMessage.success(res.message)
      dialogVisible.value = false
      load()
    } else ElMessage.error(res.message)
  } finally {
    saving.value = false
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除用户 ${row.username}？`, '提示', { type: 'warning' })
  const res = await userApi.remove(row.id)
  if (res.code === 0) { ElMessage.success('已删除'); load() }
  else ElMessage.error(res.message)
}

onMounted(load)
</script>

<style scoped>
.manage-page {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  background: transparent;
}

.table-wrap :deep(.el-table),
.table-wrap :deep(.el-table__inner-wrapper),
.table-wrap :deep(.el-table__body-wrapper),
.table-wrap :deep(.el-table__header-wrapper) {
  background: transparent !important;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  flex-shrink: 0;
}
.page-header h2 { font-size: 18px; color: var(--theme-primary); }
.actions { display: flex; gap: 10px; }
.table-wrap {
  flex: 1;
  min-height: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
}
.pager { display: flex; justify-content: flex-end; padding-top: 12px; }
</style>
