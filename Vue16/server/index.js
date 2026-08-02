const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir) || !fs.existsSync(path.join(dataDir, 'tomato_disease.db'))) {
  require('./db/init')
}

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const dataRoutes = require('./routes/data')
const settingsRoutes = require('./routes/settings')
const predictRoutes = require('./routes/predict')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/predict', predictRoutes)

app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: 'ok', time: new Date().toISOString() })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ code: 500, message: err.message || '服务器错误' })
})

app.listen(PORT, () => {
  console.log(`番茄叶病害分类系统后端已启动: http://localhost:${PORT}`)
})
