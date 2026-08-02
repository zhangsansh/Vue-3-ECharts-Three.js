const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'tomato-disease-viz-secret-2024'

const ROLE_LEVELS = { viewer: 1, operator: 2, admin: 3 }

function authRequired(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录或令牌无效' })
  }
  try {
    const token = header.slice(7)
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ code: 401, message: '令牌已过期，请重新登录' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录' })
    const userLevel = ROLE_LEVELS[req.user.role] || 0
    const minLevel = Math.min(...roles.map(r => ROLE_LEVELS[r] || 99))
    if (userLevel < minLevel && !roles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, message: '权限不足' })
    }
    next()
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, nickname: user.nickname },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

module.exports = { authRequired, requireRole, signToken, JWT_SECRET, ROLE_LEVELS }
