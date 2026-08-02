<template>
  <div class="manage-page">
    <div class="page-header panel-glass">
      <h2>数据库连接设置</h2>
      <el-button type="primary" @click="openDialog()">新增连接</el-button>
    </div>

    <div class="info-bar panel-glass">
      <div class="info-item">
        <span class="label">当前连接</span>
        <span class="value">{{ currentPath }}</span>
      </div>
      <div class="info-item" v-for="t in tables" :key="t.name">
        <span class="label">{{ t.name }}</span>
        <span class="value stat-num">{{ t.count }}</span>
      </div>
    </div>

    <div class="table-wrap panel-glass">
      <el-table :data="list" stripe height="100%">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="host" label="主机" />
        <el-table-column prop="port" label="端口" width="80" />
        <el-table-column prop="database_name" label="数据库名" />
        <el-table-column prop="file_path" label="文件路径" show-overflow-tooltip />
        <el-table-column prop="is_active" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'" size="small">{{ row.is_active ? '活跃' : '备用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button link type="success" @click="handleActivate(row)" :disabled="!!row.is_active">启用</el-button>
            <el-button link type="danger" @click="handleDelete(row)" :disabled="!!row.is_active">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑连接' : '新增连接'" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width:100%">
            <el-option label="SQLite" value="sqlite" />
            <el-option label="MySQL" value="mysql" />
            <el-option label="PostgreSQL" value="postgres" />
          </el-select>
        </el-form-item>
        <template v-if="form.type === 'sqlite'">
          <el-form-item label="文件路径"><el-input v-model="form.file_path" placeholder="SQLite 数据库文件绝对路径" /></el-form-item>
        </template>
        <template v-else>
          <el-form-item label="主机"><el-input v-model="form.host" /></el-form-item>
          <el-form-item label="端口"><el-input-number v-model="form.port" /></el-form-item>
          <el-form-item label="数据库名"><el-input v-model="form.database_name" /></el-form-item>
          <el-form-item label="用户名"><el-input v-model="form.username" /></el-form-item>
          <el-form-item label="密码"><el-input v-model="form.password" type="password" show-password /></el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { settingsApi } from '../../api'

const list = ref([])
const tables = ref([])
const currentPath = ref('')
const dialogVisible = ref(false)
const form = reactive({
  id: null, name: '', type: 'sqlite', host: '', port: 3306,
  database_name: '', username: '', password: '', file_path: ''
})

async function load() {
  const [cfg, info] = await Promise.all([settingsApi.dbConfig(), settingsApi.dbInfo()])
  if (cfg.code === 0) {
    list.value = cfg.data.list
    currentPath.value = cfg.data.currentPath
  }
  if (info.code === 0) {
    tables.value = info.data.tables
    currentPath.value = info.data.path
  }
}

function openDialog(row) {
  if (row) Object.assign(form, { ...row, password: '' })
  else Object.assign(form, { id: null, name: '', type: 'sqlite', host: 'localhost', port: 3306, database_name: '', username: '', password: '', file_path: '' })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.name) return ElMessage.warning('请输入名称')
  const res = form.id ? await settingsApi.updateDbConfig(form.id, form) : await settingsApi.createDbConfig(form)
  if (res.code === 0) { ElMessage.success(res.message); dialogVisible.value = false; load() }
  else ElMessage.error(res.message)
}

async function handleActivate(row) {
  await ElMessageBox.confirm(`确定切换到连接「${row.name}」？`, '提示', { type: 'warning' })
  const res = await settingsApi.activateDb(row.id)
  if (res.code === 0) { ElMessage.success(res.message); load() }
  else ElMessage.error(res.message)
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确定删除该连接配置？', '提示', { type: 'warning' })
  const res = await settingsApi.removeDbConfig(row.id)
  if (res.code === 0) { ElMessage.success('已删除'); load() }
  else ElMessage.error(res.message)
}

onMounted(load)
</script>

<style scoped>
.manage-page {
  height: 100%; padding: 16px;
  display: flex; flex-direction: column; gap: 12px; overflow: hidden;
  background: transparent;
}

.table-wrap :deep(.el-table),
.table-wrap :deep(.el-table__inner-wrapper),
.table-wrap :deep(.el-table__body-wrapper),
.table-wrap :deep(.el-table__header-wrapper) {
  background: transparent !important;
}
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; flex-shrink: 0;
}
.page-header h2 { font-size: 18px; color: var(--theme-primary); }
.info-bar {
  display: flex; flex-wrap: wrap; gap: 16px;
  padding: 12px 20px; flex-shrink: 0;
}
.info-item { display: flex; flex-direction: column; gap: 2px; min-width: 100px; }
.info-item .label { font-size: 11px; color: rgba(232,244,248,0.45); }
.info-item .value { font-size: 13px; word-break: break-all; }
.table-wrap { flex: 1; min-height: 0; padding: 12px; }
</style>
