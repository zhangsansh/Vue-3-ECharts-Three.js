const express = require('express')
const path = require('path')
const fs = require('fs')
const { getDb, reconnect, getCurrentPath, defaultPath } = require('../db')
const { authRequired, requireRole } = require('../middleware/auth')

const router = express.Router()

router.get('/', authRequired, (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM system_settings').all()
  const settings = {}
  rows.forEach(r => { settings[r.key] = r.value })
  res.json({ code: 0, data: settings })
})

router.put('/', authRequired, requireRole('admin'), (req, res) => {
  const db = getDb()
  const upsert = db.prepare(`INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`)
  const tx = db.transaction((obj) => {
    Object.entries(obj).forEach(([k, v]) => upsert.run(k, String(v)))
  })
  tx(req.body || {})
  res.json({ code: 0, message: '设置已保存' })
})

router.get('/db-config', authRequired, requireRole('admin'), (req, res) => {
  const db = getDb()
  const list = db.prepare('SELECT id, name, type, host, port, database_name, username, file_path, is_active, created_at FROM db_config ORDER BY id').all()
  res.json({ code: 0, data: { list, currentPath: getCurrentPath() } })
})

router.post('/db-config', authRequired, requireRole('admin'), (req, res) => {
  const { name, type = 'sqlite', host, port, database_name, username, password, file_path } = req.body
  if (!name) return res.json({ code: 400, message: '名称必填' })
  const db = getDb()
  const r = db.prepare(`INSERT INTO db_config (name, type, host, port, database_name, username, password, file_path) VALUES (?,?,?,?,?,?,?,?)`)
    .run(name, type, host, port, database_name, username, password, file_path)
  res.json({ code: 0, message: '创建成功', data: { id: r.lastInsertRowid } })
})

router.put('/db-config/:id', authRequired, requireRole('admin'), (req, res) => {
  const db = getDb()
  const cfg = db.prepare('SELECT * FROM db_config WHERE id=?').get(req.params.id)
  if (!cfg) return res.json({ code: 404, message: '配置不存在' })
  const b = req.body
  db.prepare(`UPDATE db_config SET name=?, type=?, host=?, port=?, database_name=?, username=?, password=?, file_path=? WHERE id=?`)
    .run(b.name ?? cfg.name, b.type ?? cfg.type, b.host ?? cfg.host, b.port ?? cfg.port, b.database_name ?? cfg.database_name, b.username ?? cfg.username, b.password ?? cfg.password, b.file_path ?? cfg.file_path, req.params.id)
  res.json({ code: 0, message: '更新成功' })
})

router.post('/db-config/:id/activate', authRequired, requireRole('admin'), (req, res) => {
  const db = getDb()
  const cfg = db.prepare('SELECT * FROM db_config WHERE id=?').get(req.params.id)
  if (!cfg) return res.json({ code: 404, message: '配置不存在' })
  if (cfg.type === 'sqlite') {
    const fp = cfg.file_path || defaultPath
    if (!fs.existsSync(fp) && fp !== defaultPath) {
      return res.json({ code: 400, message: '数据库文件不存在: ' + fp })
    }
    db.prepare('UPDATE db_config SET is_active = 0').run()
    db.prepare('UPDATE db_config SET is_active = 1 WHERE id = ?').run(req.params.id)
    reconnect(fp)
    res.json({ code: 0, message: '已切换到: ' + cfg.name, data: { path: fp } })
  } else {
    res.json({ code: 400, message: '当前仅支持切换 SQLite 连接，其他类型请配置后使用外部连接' })
  }
})

router.delete('/db-config/:id', authRequired, requireRole('admin'), (req, res) => {
  const db = getDb()
  const cfg = db.prepare('SELECT * FROM db_config WHERE id=?').get(req.params.id)
  if (!cfg) return res.json({ code: 404, message: '不存在' })
  if (cfg.is_active) return res.json({ code: 400, message: '不能删除当前活跃连接' })
  db.prepare('DELETE FROM db_config WHERE id=?').run(req.params.id)
  res.json({ code: 0, message: '删除成功' })
})

router.get('/db-info', authRequired, requireRole('admin'), (req, res) => {
  const db = getDb()
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all()
  const info = tables.map(t => {
    const count = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get().c
    return { name: t.name, count }
  })
  res.json({ code: 0, data: { path: getCurrentPath(), tables: info } })
})

module.exports = router
