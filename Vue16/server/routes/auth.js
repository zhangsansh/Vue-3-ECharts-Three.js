const express = require('express')
const bcrypt = require('bcryptjs')
const svgCaptcha = require('svg-captcha')
const { getDb } = require('../db')
const { signToken, authRequired } = require('../middleware/auth')

const router = express.Router()
const captchaStore = new Map()

setInterval(() => {
  const now = Date.now()
  for (const [k, v] of captchaStore) {
    if (now - v.time > 5 * 60 * 1000) captchaStore.delete(k)
  }
}, 60000)

router.get('/captcha', (req, res) => {
  const captcha = svgCaptcha.create({
    size: 4,
    ignoreChars: '0oO1ilI',
    noise: 3,
    color: true,
    background: '#0d2137',
    width: 120,
    height: 40,
    fontSize: 40
  })
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  captchaStore.set(id, { text: captcha.text.toLowerCase(), time: Date.now() })
  res.json({ code: 0, data: { id, svg: captcha.data } })
})

function verifyCaptcha(id, text) {
  const item = captchaStore.get(id)
  if (!item) return false
  captchaStore.delete(id)
  return item.text === String(text || '').toLowerCase()
}

router.post('/login', (req, res) => {
  const { username, password, phone, captchaId, captcha, loginType } = req.body
  if (!verifyCaptcha(captchaId, captcha)) {
    return res.json({ code: 400, message: '验证码错误或已过期' })
  }

  const db = getDb()
  let user
  if (loginType === 'phone') {
    if (!phone || !password) return res.json({ code: 400, message: '请输入手机号和密码' })
    user = db.prepare('SELECT * FROM users WHERE phone = ? AND status = 1').get(phone)
  } else {
    if (!username || !password) return res.json({ code: 400, message: '请输入用户名和密码' })
    user = db.prepare('SELECT * FROM users WHERE username = ? AND status = 1').get(username)
  }

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.json({ code: 400, message: '账号或密码错误' })
  }

  const token = signToken(user)
  res.json({
    code: 0,
    message: '登录成功',
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        role: user.role,
        nickname: user.nickname,
        avatar: user.avatar
      }
    }
  })
})

router.get('/me', authRequired, (req, res) => {
  const db = getDb()
  const user = db.prepare('SELECT id, username, phone, role, nickname, avatar, status, created_at FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ code: 404, message: '用户不存在' })
  res.json({ code: 0, data: user })
})

router.get('/permissions', authRequired, (req, res) => {
  const role = req.user.role
  const permissions = {
    viewer: ['dashboard:view', 'chart:view'],
    operator: ['dashboard:view', 'chart:view', 'data:view', 'data:create', 'data:update', 'data:export', 'data:import'],
    admin: ['dashboard:view', 'chart:view', 'data:view', 'data:create', 'data:update', 'data:delete', 'data:export', 'data:import', 'user:view', 'user:create', 'user:update', 'user:delete', 'settings:view', 'settings:update', 'db:view', 'db:update']
  }
  res.json({ code: 0, data: { role, permissions: permissions[role] || permissions.viewer } })
})

module.exports = router
