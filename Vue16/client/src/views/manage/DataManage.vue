<template>
  <div class="manage-page">
    <div class="page-header panel-glass">
      <h2>数据管理</h2>
      <div class="actions">
        <el-radio-group v-model="tab" size="small">
          <el-radio-button value="records">检测记录</el-radio-button>
          <el-radio-button value="diseases">病害类型</el-radio-button>
        </el-radio-group>
        <el-input v-if="tab === 'records'" v-model="keyword" placeholder="搜索" clearable style="width:180px" @keyup.enter="loadRecords" />
        <el-button type="primary" @click="openDialog()" v-if="canEdit">新增</el-button>
        <el-button @click="handleExport" v-if="tab === 'records' && canEdit">导出 Excel</el-button>
        <el-upload v-if="tab === 'records' && canEdit" :show-file-list="false" :http-request="handleImport" accept=".xlsx,.xls">
          <el-button>导入 Excel</el-button>
        </el-upload>
      </div>
    </div>

    <div class="table-wrap panel-glass" v-if="tab === 'records'">
      <el-table :data="records" stripe height="100%">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="disease_name" label="病害" width="120" />
        <el-table-column prop="confidence" label="置信度" width="90">
          <template #default="{ row }">{{ (row.confidence * 100).toFixed(1) }}%</template>
        </el-table-column>
        <el-table-column prop="region" label="产区" />
        <el-table-column prop="farm" label="农场" />
        <el-table-column prop="temperature" label="温度" width="70" />
        <el-table-column prop="humidity" label="湿度" width="70" />
        <el-table-column prop="model_version" label="模型" width="120" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'confirmed' ? 'success' : 'warning'">{{ row.status === 'confirmed' ? '已确认' : '待审' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="detected_at" label="检测时间" width="160" />
        <el-table-column label="操作" width="140" fixed="right" v-if="canEdit">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDeleteRecord(row)" v-if="isAdmin">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination background layout="total, prev, pager, next" :total="total" v-model:current-page="page" :page-size="pageSize" @current-change="loadRecords" />
      </div>
    </div>

    <div class="table-wrap panel-glass" v-else>
      <el-table :data="diseases" stripe height="100%">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="名称" width="120" />
        <el-table-column prop="name_en" label="英文名" width="140" />
        <el-table-column prop="category" label="类别" width="90" />
        <el-table-column prop="severity" label="严重度" width="80" />
        <el-table-column prop="symptoms" label="症状" show-overflow-tooltip />
        <el-table-column prop="treatment" label="防治" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right" v-if="canEdit">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDiseaseDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDeleteDisease(row)" v-if="isAdmin">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="recordForm.id ? '编辑记录' : '新增记录'" width="520px">
      <el-form :model="recordForm" label-width="90px">
        <el-form-item label="病害名称" required>
          <el-select v-model="recordForm.disease_name" filterable style="width:100%" @change="onDiseaseChange">
            <el-option v-for="d in diseases" :key="d.id" :label="d.name" :value="d.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="置信度"><el-input-number v-model="recordForm.confidence" :min="0" :max="1" :step="0.01" :precision="4" /></el-form-item>
        <el-form-item label="产区"><el-input v-model="recordForm.region" /></el-form-item>
        <el-form-item label="农场"><el-input v-model="recordForm.farm" /></el-form-item>
        <el-form-item label="温度"><el-input-number v-model="recordForm.temperature" :step="0.1" /></el-form-item>
        <el-form-item label="湿度"><el-input-number v-model="recordForm.humidity" :step="0.1" /></el-form-item>
        <el-form-item label="模型"><el-input v-model="recordForm.model_version" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="recordForm.status" style="width:100%">
            <el-option label="已确认" value="confirmed" />
            <el-option label="待审" value="pending" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRecord">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="diseaseDialogVisible" :title="diseaseForm.id ? '编辑病害' : '新增病害'" width="520px">
      <el-form :model="diseaseForm" label-width="80px">
        <el-form-item label="名称" required><el-input v-model="diseaseForm.name" /></el-form-item>
        <el-form-item label="英文名"><el-input v-model="diseaseForm.name_en" /></el-form-item>
        <el-form-item label="类别"><el-input v-model="diseaseForm.category" /></el-form-item>
        <el-form-item label="严重度">
          <el-select v-model="diseaseForm.severity" style="width:100%">
            <el-option label="高" value="高" /><el-option label="中" value="中" /><el-option label="低" value="低" /><el-option label="无" value="无" />
          </el-select>
        </el-form-item>
        <el-form-item label="症状"><el-input v-model="diseaseForm.symptoms" type="textarea" /></el-form-item>
        <el-form-item label="防治"><el-input v-model="diseaseForm.treatment" type="textarea" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="diseaseForm.description" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="diseaseDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDisease">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { dataApi } from '../../api'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const canEdit = computed(() => userStore.isOperator)
const isAdmin = computed(() => userStore.isAdmin)

const tab = ref('records')
const keyword = ref('')
const records = ref([])
const diseases = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const dialogVisible = ref(false)
const diseaseDialogVisible = ref(false)

const recordForm = reactive({
  id: null, disease_id: null, disease_name: '', confidence: 0.9,
  region: '', farm: '', temperature: 25, humidity: 60, model_version: 'ResNet50-v2', status: 'confirmed'
})

const diseaseForm = reactive({
  id: null, name: '', name_en: '', category: '', severity: '中', symptoms: '', treatment: '', description: ''
})

async function loadRecords() {
  const res = await dataApi.records({ page: page.value, pageSize, keyword: keyword.value })
  if (res.code === 0) { records.value = res.data.list; total.value = res.data.total }
}

async function loadDiseases() {
  const res = await dataApi.diseases()
  if (res.code === 0) diseases.value = res.data
}

function onDiseaseChange(name) {
  const d = diseases.value.find(x => x.name === name)
  if (d) recordForm.disease_id = d.id
}

function openDialog(row) {
  if (row) Object.assign(recordForm, { ...row })
  else Object.assign(recordForm, { id: null, disease_id: null, disease_name: '', confidence: 0.9, region: '', farm: '', temperature: 25, humidity: 60, model_version: 'ResNet50-v2', status: 'confirmed' })
  dialogVisible.value = true
}

function openDiseaseDialog(row) {
  if (row) Object.assign(diseaseForm, { ...row })
  else Object.assign(diseaseForm, { id: null, name: '', name_en: '', category: '', severity: '中', symptoms: '', treatment: '', description: '' })
  diseaseDialogVisible.value = true
}

async function saveRecord() {
  if (!recordForm.disease_name) return ElMessage.warning('请选择病害')
  const res = recordForm.id ? await dataApi.updateRecord(recordForm.id, recordForm) : await dataApi.createRecord(recordForm)
  if (res.code === 0) { ElMessage.success(res.message); dialogVisible.value = false; loadRecords() }
  else ElMessage.error(res.message)
}

async function saveDisease() {
  if (!diseaseForm.name) return ElMessage.warning('请输入名称')
  const res = diseaseForm.id ? await dataApi.updateDisease(diseaseForm.id, diseaseForm) : await dataApi.createDisease(diseaseForm)
  if (res.code === 0) { ElMessage.success(res.message); diseaseDialogVisible.value = false; loadDiseases() }
  else ElMessage.error(res.message)
}

async function handleDeleteRecord(row) {
  await ElMessageBox.confirm('确定删除该记录？', '提示', { type: 'warning' })
  const res = await dataApi.removeRecord(row.id)
  if (res.code === 0) { ElMessage.success('已删除'); loadRecords() }
}

async function handleDeleteDisease(row) {
  await ElMessageBox.confirm('确定删除该病害类型？', '提示', { type: 'warning' })
  const res = await dataApi.removeDisease(row.id)
  if (res.code === 0) { ElMessage.success('已删除'); loadDiseases() }
}

async function handleExport() {
  const res = await dataApi.exportRecords()
  const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'detection_records.xlsx'
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

async function handleImport({ file }) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await dataApi.importRecords(fd)
  if (res.code === 0) { ElMessage.success(res.message); loadRecords() }
  else ElMessage.error(res.message)
}

watch(tab, (v) => { if (v === 'records') loadRecords(); else loadDiseases() })

onMounted(async () => {
  await loadDiseases()
  await loadRecords()
})
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
  padding: 12px 20px; flex-shrink: 0; flex-wrap: wrap; gap: 10px;
}
.page-header h2 { font-size: 18px; color: var(--theme-primary); }
.actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.table-wrap {
  flex: 1; min-height: 0; padding: 12px;
  display: flex; flex-direction: column;
}
.pager { display: flex; justify-content: flex-end; padding-top: 12px; }
</style>
