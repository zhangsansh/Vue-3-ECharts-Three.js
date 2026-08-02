const express = require('express')
const multer = require('multer')
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')
const { getDb } = require('../db')
const { authRequired, requireRole } = require('../middleware/auth')

const router = express.Router()
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') })
const uploadDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// ========== 病害类型 ==========
router.get('/diseases', authRequired, (req, res) => {
  const db = getDb()
  const list = db.prepare('SELECT * FROM diseases ORDER BY id').all()
  res.json({ code: 0, data: list })
})

router.post('/diseases', authRequired, requireRole('operator', 'admin'), (req, res) => {
  const { name, name_en, category, severity, symptoms, treatment, description } = req.body
  if (!name) return res.json({ code: 400, message: '病害名称必填' })
  const db = getDb()
  const r = db.prepare(`INSERT INTO diseases (name, name_en, category, severity, symptoms, treatment, description) VALUES (?,?,?,?,?,?,?)`)
    .run(name, name_en, category, severity, symptoms, treatment, description)
  res.json({ code: 0, message: '创建成功', data: { id: r.lastInsertRowid } })
})

router.put('/diseases/:id', authRequired, requireRole('operator', 'admin'), (req, res) => {
  const db = getDb()
  const d = db.prepare('SELECT * FROM diseases WHERE id=?').get(req.params.id)
  if (!d) return res.json({ code: 404, message: '不存在' })
  const b = req.body
  db.prepare(`UPDATE diseases SET name=?, name_en=?, category=?, severity=?, symptoms=?, treatment=?, description=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(b.name ?? d.name, b.name_en ?? d.name_en, b.category ?? d.category, b.severity ?? d.severity, b.symptoms ?? d.symptoms, b.treatment ?? d.treatment, b.description ?? d.description, req.params.id)
  res.json({ code: 0, message: '更新成功' })
})

router.delete('/diseases/:id', authRequired, requireRole('admin'), (req, res) => {
  getDb().prepare('DELETE FROM diseases WHERE id=?').run(req.params.id)
  res.json({ code: 0, message: '删除成功' })
})

// ========== 检测记录 ==========
router.get('/records', authRequired, (req, res) => {
  const db = getDb()
  const { page = 1, pageSize = 15, keyword = '', region = '', disease_name = '' } = req.query
  let where = 'WHERE 1=1'
  const params = []
  if (keyword) {
    where += ' AND (disease_name LIKE ? OR farm LIKE ? OR operator LIKE ?)'
    const k = `%${keyword}%`
    params.push(k, k, k)
  }
  if (region) { where += ' AND region = ?'; params.push(region) }
  if (disease_name) { where += ' AND disease_name = ?'; params.push(disease_name) }
  const total = db.prepare(`SELECT COUNT(*) as c FROM detection_records ${where}`).get(...params).c
  const offset = (Number(page) - 1) * Number(pageSize)
  const list = db.prepare(`SELECT * FROM detection_records ${where} ORDER BY detected_at DESC LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), offset)
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } })
})

router.post('/records', authRequired, requireRole('operator', 'admin'), (req, res) => {
  const b = req.body
  if (!b.disease_name) return res.json({ code: 400, message: '病害名称必填' })
  const db = getDb()
  const r = db.prepare(`INSERT INTO detection_records (disease_id, disease_name, confidence, region, farm, temperature, humidity, detected_at, operator, model_version, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(b.disease_id, b.disease_name, b.confidence ?? 0.9, b.region, b.farm, b.temperature, b.humidity, b.detected_at || new Date().toISOString().slice(0, 19).replace('T', ' '), b.operator || req.user.username, b.model_version || 'ResNet50-v2', b.status || 'confirmed')
  res.json({ code: 0, message: '创建成功', data: { id: r.lastInsertRowid } })
})

router.put('/records/:id', authRequired, requireRole('operator', 'admin'), (req, res) => {
  const db = getDb()
  const d = db.prepare('SELECT * FROM detection_records WHERE id=?').get(req.params.id)
  if (!d) return res.json({ code: 404, message: '不存在' })
  const b = req.body
  db.prepare(`UPDATE detection_records SET disease_id=?, disease_name=?, confidence=?, region=?, farm=?, temperature=?, humidity=?, operator=?, model_version=?, status=? WHERE id=?`)
    .run(b.disease_id ?? d.disease_id, b.disease_name ?? d.disease_name, b.confidence ?? d.confidence, b.region ?? d.region, b.farm ?? d.farm, b.temperature ?? d.temperature, b.humidity ?? d.humidity, b.operator ?? d.operator, b.model_version ?? d.model_version, b.status ?? d.status, req.params.id)
  res.json({ code: 0, message: '更新成功' })
})

router.delete('/records/:id', authRequired, requireRole('admin'), (req, res) => {
  getDb().prepare('DELETE FROM detection_records WHERE id=?').run(req.params.id)
  res.json({ code: 0, message: '删除成功' })
})

// ========== 导入导出 ==========
router.get('/export/records', authRequired, requireRole('operator', 'admin'), (req, res) => {
  const db = getDb()
  const list = db.prepare('SELECT * FROM detection_records ORDER BY id').all()
  const ws = XLSX.utils.json_to_sheet(list)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '检测记录')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Disposition', 'attachment; filename=detection_records.xlsx')
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buf)
})

router.post('/import/records', authRequired, requireRole('operator', 'admin'), upload.single('file'), (req, res) => {
  if (!req.file) return res.json({ code: 400, message: '请上传文件' })
  try {
    const wb = XLSX.readFile(req.file.path)
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet)
    const db = getDb()
    const insert = db.prepare(`INSERT INTO detection_records (disease_id, disease_name, confidence, region, farm, temperature, humidity, detected_at, operator, model_version, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    const tx = db.transaction((items) => {
      let count = 0
      for (const r of items) {
        if (!r.disease_name) continue
        insert.run(r.disease_id || null, r.disease_name, r.confidence || 0.9, r.region || '', r.farm || '', r.temperature || null, r.humidity || null, r.detected_at || new Date().toISOString().slice(0, 19).replace('T', ' '), r.operator || req.user.username, r.model_version || 'ResNet50-v2', r.status || 'confirmed')
        count++
      }
      return count
    })
    const count = tx(rows)
    fs.unlinkSync(req.file.path)
    res.json({ code: 0, message: `成功导入 ${count} 条记录` })
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    res.json({ code: 500, message: '导入失败: ' + e.message })
  }
})

// ========== 大屏统计数据 ==========
router.get('/dashboard/overview', authRequired, (req, res) => {
  const db = getDb()
  const total = db.prepare('SELECT COUNT(*) as c FROM detection_records').get().c
  const healthy = db.prepare(`SELECT COUNT(*) as c FROM detection_records WHERE disease_name = '健康叶片'`).get().c
  const diseaseTypes = db.prepare(`SELECT COUNT(DISTINCT disease_name) as c FROM detection_records WHERE disease_name != '健康叶片'`).get().c
  const avgConf = db.prepare('SELECT AVG(confidence) as a FROM detection_records').get().a
  const today = db.prepare(`SELECT COUNT(*) as c FROM detection_records WHERE date(detected_at) = date('now','localtime')`).get().c
  const pending = db.prepare(`SELECT COUNT(*) as c FROM detection_records WHERE status = 'pending'`).get().c
  const diseaseDist = db.prepare(`SELECT disease_name as name, COUNT(*) as value FROM detection_records GROUP BY disease_name ORDER BY value DESC`).all()
  const regionDist = db.prepare(`SELECT region as name, COUNT(*) as value FROM detection_records GROUP BY region ORDER BY value DESC`).all()
  const dailyTrend = db.prepare(`SELECT date, total_count, healthy_count, diseased_count, avg_confidence FROM daily_stats ORDER BY date`).all()
  const modelAcc = db.prepare(`SELECT model_name, MAX(val_accuracy) as accuracy, MAX(f1_score) as f1 FROM model_metrics GROUP BY model_name`).all()
  const severityDist = db.prepare(`SELECT d.severity as name, COUNT(*) as value FROM detection_records r JOIN diseases d ON r.disease_id = d.id GROUP BY d.severity`).all()
  const categoryDist = db.prepare(`SELECT d.category as name, COUNT(*) as value FROM detection_records r JOIN diseases d ON r.disease_id = d.id GROUP BY d.category`).all()
  const recentRecords = db.prepare(`SELECT id, disease_name, confidence, region, farm, detected_at, model_version FROM detection_records ORDER BY detected_at DESC LIMIT 20`).all()
  const regions = db.prepare('SELECT * FROM region_stats').all()
  const confHist = db.prepare(`
    SELECT 
      CASE 
        WHEN confidence < 0.75 THEN '0.70-0.75'
        WHEN confidence < 0.80 THEN '0.75-0.80'
        WHEN confidence < 0.85 THEN '0.80-0.85'
        WHEN confidence < 0.90 THEN '0.85-0.90'
        WHEN confidence < 0.95 THEN '0.90-0.95'
        ELSE '0.95-1.00'
      END as range,
      COUNT(*) as count
    FROM detection_records GROUP BY range ORDER BY range
  `).all()
  const modelTrend = db.prepare(`SELECT model_name, epoch, accuracy, loss, val_accuracy, val_loss, f1_score FROM model_metrics ORDER BY model_name, epoch`).all()
  const tempHumidity = db.prepare(`SELECT temperature, humidity, disease_name, confidence FROM detection_records WHERE temperature IS NOT NULL LIMIT 200`).all()

  res.json({
    code: 0,
    data: {
      summary: {
        total, healthy, diseased: total - healthy, diseaseTypes,
        avgConfidence: Math.round((avgConf || 0) * 10000) / 10000,
        today, pending,
        healthyRate: total ? Math.round(healthy / total * 10000) / 100 : 0
      },
      diseaseDist, regionDist, dailyTrend, modelAcc, severityDist, categoryDist,
      recentRecords, regions, confHist, modelTrend, tempHumidity
    }
  })
})

router.get('/dashboard/model3d', authRequired, (req, res) => {
  const db = getDb()
  const diseases = db.prepare(`
    SELECT d.id, d.name, d.name_en, d.category, d.severity, d.symptoms, d.treatment,
      COUNT(r.id) as count, AVG(r.confidence) as avg_confidence
    FROM diseases d
    LEFT JOIN detection_records r ON d.id = r.disease_id
    GROUP BY d.id
    ORDER BY count DESC
  `).all()
  res.json({ code: 0, data: diseases })
})

module.exports = router
