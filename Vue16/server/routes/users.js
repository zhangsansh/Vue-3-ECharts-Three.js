const express = require('express')
const bcrypt = require('bcryptjs')
const { getDb } = require('../db')
const { authRequired, requireRole } = require('../middleware/auth')

const router = express.Router()

router.get('/', authRequired, requireRole('admin'), (req, res) => {
  const db = getDb()
  const { page = 1, pageSize = 10, keyword = '', role = '' } = req.query
  let where = 'WHERE 1=1'
  const params = []
  if (keyword) {
    where += ' AND (username LIKE ? OR phone LIKE ? OR nickname LIKE ?)'
    const k = `%${keyword}%`
    params.push(k, k, k)
  }
  if (role) {
    where += ' AND role = ?'
    params.push(role)
  }
  const total = db.prepare(`SELECT COUNT(*) as c FROM users ${where}`).get(...params).c
  const offset = (Number(page) - 1) * Number(pageSize)
  const list = db.prepare(`SELECT id, username, phone, role, nickname, avatar, status, created_at, updated_at FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), offset)
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } })
})

router.post('/', authRequired, requireRole('admin'), (req, res) => {
  const { username, password, phone, role = 'viewer', nickname } = req.body
  if (!username || !password) return res.json({ code: 400, message: '用户名和密码必填' })
  if (!['admin', 'operator', 'viewer'].includes(role)) return res.json({ code: 400, message: '无效角色' })
  const db = getDb()
  try {
    const hash = bcrypt.hashSync(password, 10)
    const result = db.prepare(`INSERT INTO users (username, password, phone, role, nickname) VALUES (?, ?, ?, ?, ?)`)
      .run(username, hash, phone || null, role, nickname || username)
    res.json({ code: 0, message: '创建成功', data: { id: result.lastInsertRowid } })
  } catch (e) {
    res.json({ code: 400, message: e.message.includes('UNIQUE') ? '用户名或手机号已存在' : e.message })
  }
})

router.put('/:id', authRequired, requireRole('admin'), (req, res) => {
  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.json({ code: 404, message: '用户不存在' })
  const { phone, role, nickname, status, password } = req.body
  if (password) {
    db.prepare(`UPDATE users SET phone=?, role=?, nickname=?, status=?, password=?, updated_at=datetime('now','localtime') WHERE id=?`)
      .run(phone ?? user.phone, role ?? user.role, nickname ?? user.nickname, status ?? user.status, bcrypt.hashSync(password, 10), req.params.id)
  } else {
    db.prepare(`UPDATE users SET phone=?, role=?, nickname=?, status=?, updated_at=datetime('now','localtime') WHERE id=?`)
      .run(phone ?? user.phone, role ?? user.role, nickname ?? user.nickname, status ?? user.status, req.params.id)
  }
  res.json({ code: 0, message: '更新成功' })
})

router.delete('/:id', authRequired, requireRole('admin'), (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.json({ code: 400, message: '不能删除自己' })
  const db = getDb()
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ code: 0, message: '删除成功' })
})

module.exports = router
