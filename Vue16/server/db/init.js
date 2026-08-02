const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const path = require('path')
const fs = require('fs')

const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const dbPath = path.join(dataDir, 'tomato_disease.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'viewer',
    nickname TEXT,
    avatar TEXT,
    status INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS diseases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    category TEXT,
    severity TEXT,
    symptoms TEXT,
    treatment TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS detection_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disease_id INTEGER,
    disease_name TEXT,
    confidence REAL,
    image_path TEXT,
    region TEXT,
    farm TEXT,
    temperature REAL,
    humidity REAL,
    detected_at TEXT DEFAULT (datetime('now','localtime')),
    operator TEXT,
    model_version TEXT DEFAULT 'ResNet50-v2',
    status TEXT DEFAULT 'confirmed',
    FOREIGN KEY (disease_id) REFERENCES diseases(id)
  );

  CREATE TABLE IF NOT EXISTS model_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT,
    epoch INTEGER,
    accuracy REAL,
    loss REAL,
    val_accuracy REAL,
    val_loss REAL,
    precision_score REAL,
    recall_score REAL,
    f1_score REAL,
    recorded_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    total_count INTEGER DEFAULT 0,
    healthy_count INTEGER DEFAULT 0,
    diseased_count INTEGER DEFAULT 0,
    disease_types TEXT,
    avg_confidence REAL
  );

  CREATE TABLE IF NOT EXISTS region_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region TEXT NOT NULL,
    province TEXT,
    lng REAL,
    lat REAL,
    disease_count INTEGER DEFAULT 0,
    healthy_count INTEGER DEFAULT 0,
    main_disease TEXT,
    risk_level TEXT
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS db_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'sqlite',
    host TEXT,
    port INTEGER,
    database_name TEXT,
    username TEXT,
    password TEXT,
    file_path TEXT,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`)

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c
if (userCount === 0) {
  const hash = bcrypt.hashSync('admin123', 10)
  const userHash = bcrypt.hashSync('user123', 10)
  const viewerHash = bcrypt.hashSync('viewer123', 10)
  db.prepare(`INSERT INTO users (username, password, phone, role, nickname) VALUES (?, ?, ?, ?, ?)`).run('admin', hash, '13800000001', 'admin', '系统管理员')
  db.prepare(`INSERT INTO users (username, password, phone, role, nickname) VALUES (?, ?, ?, ?, ?)`).run('operator', userHash, '13800000002', 'operator', '数据分析员')
  db.prepare(`INSERT INTO users (username, password, phone, role, nickname) VALUES (?, ?, ?, ?, ?)`).run('viewer', viewerHash, '13800000003', 'viewer', '只读访客')
}

const diseaseCount = db.prepare('SELECT COUNT(*) as c FROM diseases').get().c
if (diseaseCount === 0) {
  const diseases = [
    ['早疫病', 'Early Blight', '真菌性', '中', '叶片出现同心轮纹褐色病斑', '喷施代森锰锌、嘧菌酯', '由茄链格孢引起，高温高湿易发'],
    ['晚疫病', 'Late Blight', '真菌性', '高', '水浸状暗绿色病斑迅速扩展', '喷施烯酰吗啉、霜脲氰', '由致病疫霉引起，危害极大'],
    ['叶霉病', 'Leaf Mold', '真菌性', '中', '叶背面灰紫色霉层', '喷施多菌灵、氟硅唑', '温室高湿环境多发'],
    ['斑点病', 'Septoria Leaf Spot', '真菌性', '中', '小圆形褐色斑点带黄晕', '清除病叶，喷施百菌清', '由番茄壳针孢引起'],
    ['细菌性斑点病', 'Bacterial Spot', '细菌性', '中', '水渍状小斑点后变褐色', '铜制剂防治，减少湿度', '由丁香假单胞菌引起'],
    ['黄化曲叶病毒', 'TYLCV', '病毒性', '高', '叶片黄化皱缩向上卷曲', '防治烟粉虱，拔除病株', '由番茄黄化曲叶病毒引起'],
    ['花叶病毒', 'TMV', '病毒性', '中', '叶片花叶、畸形', '种子消毒，清除病株', '烟草花叶病毒侵染'],
    ['白粉病', 'Powdery Mildew', '真菌性', '低', '叶面白色粉状物', '硫磺制剂、三唑类杀菌剂', '干燥环境偶发'],
    ['健康叶片', 'Healthy', '健康', '无', '叶片深绿有光泽无病斑', '保持通风透光', '正常健康番茄叶片']
  ]
  const insertDisease = db.prepare(`INSERT INTO diseases (name, name_en, category, severity, symptoms, treatment, description) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  const insertMany = db.transaction((rows) => { rows.forEach(r => insertDisease.run(...r)) })
  insertMany(diseases)
}

const recordCount = db.prepare('SELECT COUNT(*) as c FROM detection_records').get().c
if (recordCount === 0) {
  const diseaseNames = ['早疫病', '晚疫病', '叶霉病', '斑点病', '细菌性斑点病', '黄化曲叶病毒', '花叶病毒', '白粉病', '健康叶片']
  const regions = ['山东寿光', '河北廊坊', '河南周口', '江苏徐州', '浙江嘉兴', '四川攀枝花', '云南元谋', '内蒙古赤峰', '辽宁朝阳', '甘肃武威']
  const farms = ['绿源农场', '丰收基地', '阳光温室', '智慧农业园', '田野合作社', '生态种植园']
  const insert = db.prepare(`INSERT INTO detection_records (disease_id, disease_name, confidence, region, farm, temperature, humidity, detected_at, operator, model_version, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const insertAll = db.transaction(() => {
    for (let i = 0; i < 500; i++) {
      const dIdx = Math.floor(Math.random() * diseaseNames.length)
      const conf = diseaseNames[dIdx] === '健康叶片' ? 0.85 + Math.random() * 0.14 : 0.7 + Math.random() * 0.28
      const day = Math.floor(Math.random() * 90)
      const date = new Date()
      date.setDate(date.getDate() - day)
      const dateStr = date.toISOString().slice(0, 19).replace('T', ' ')
      insert.run(
        dIdx + 1,
        diseaseNames[dIdx],
        Math.round(conf * 10000) / 10000,
        regions[Math.floor(Math.random() * regions.length)],
        farms[Math.floor(Math.random() * farms.length)],
        Math.round((18 + Math.random() * 15) * 10) / 10,
        Math.round((40 + Math.random() * 50) * 10) / 10,
        dateStr,
        ['admin', 'operator', '系统自动'][Math.floor(Math.random() * 3)],
        ['ResNet50-v2', 'EfficientNet-B3', 'YOLOv8-cls', 'ViT-Base'][Math.floor(Math.random() * 4)],
        Math.random() > 0.1 ? 'confirmed' : 'pending'
      )
    }
  })
  insertAll()
}

const metricCount = db.prepare('SELECT COUNT(*) as c FROM model_metrics').get().c
if (metricCount === 0) {
  const insert = db.prepare(`INSERT INTO model_metrics (model_name, epoch, accuracy, loss, val_accuracy, val_loss, precision_score, recall_score, f1_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const models = ['ResNet50-v2', 'EfficientNet-B3', 'YOLOv8-cls', 'ViT-Base']
  models.forEach(model => {
    let acc = 0.55, loss = 1.2, vacc = 0.52, vloss = 1.3
    for (let e = 1; e <= 50; e++) {
      acc = Math.min(0.98, acc + (0.98 - acc) * 0.08 + (Math.random() - 0.5) * 0.01)
      loss = Math.max(0.05, loss * 0.92 + (Math.random() - 0.5) * 0.02)
      vacc = Math.min(0.96, vacc + (0.96 - vacc) * 0.07 + (Math.random() - 0.5) * 0.015)
      vloss = Math.max(0.08, vloss * 0.93 + (Math.random() - 0.5) * 0.025)
      insert.run(model, e,
        Math.round(acc * 10000) / 10000,
        Math.round(loss * 10000) / 10000,
        Math.round(vacc * 10000) / 10000,
        Math.round(vloss * 10000) / 10000,
        Math.round((acc - 0.02 + Math.random() * 0.03) * 10000) / 10000,
        Math.round((acc - 0.03 + Math.random() * 0.04) * 10000) / 10000,
        Math.round((acc - 0.025 + Math.random() * 0.03) * 10000) / 10000
      )
    }
  })
}

const dailyCount = db.prepare('SELECT COUNT(*) as c FROM daily_stats').get().c
if (dailyCount === 0) {
  const insert = db.prepare(`INSERT INTO daily_stats (date, total_count, healthy_count, diseased_count, disease_types, avg_confidence) VALUES (?, ?, ?, ?, ?, ?)`)
  for (let i = 89; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().slice(0, 10)
    const total = 20 + Math.floor(Math.random() * 80)
    const healthy = Math.floor(total * (0.3 + Math.random() * 0.4))
    insert.run(dateStr, total, healthy, total - healthy, String(3 + Math.floor(Math.random() * 5)), Math.round((0.75 + Math.random() * 0.2) * 10000) / 10000)
  }
}

const regionCount = db.prepare('SELECT COUNT(*) as c FROM region_stats').get().c
if (regionCount === 0) {
  const regions = [
    ['山东寿光', '山东', 118.79, 36.88, 156, 89, '早疫病', '中'],
    ['河北廊坊', '河北', 116.70, 39.52, 98, 120, '叶霉病', '低'],
    ['河南周口', '河南', 114.70, 33.63, 187, 65, '晚疫病', '高'],
    ['江苏徐州', '江苏', 117.18, 34.26, 112, 95, '斑点病', '中'],
    ['浙江嘉兴', '浙江', 120.76, 30.75, 76, 134, '白粉病', '低'],
    ['四川攀枝花', '四川', 101.72, 26.58, 145, 78, '黄化曲叶病毒', '高'],
    ['云南元谋', '云南', 101.87, 25.71, 203, 56, '晚疫病', '高'],
    ['内蒙古赤峰', '内蒙古', 118.89, 42.26, 67, 110, '早疫病', '低'],
    ['辽宁朝阳', '辽宁', 120.45, 41.57, 89, 98, '细菌性斑点病', '中'],
    ['甘肃武威', '甘肃', 102.64, 37.93, 54, 142, '健康叶片', '低']
  ]
  const insert = db.prepare(`INSERT INTO region_stats (region, province, lng, lat, disease_count, healthy_count, main_disease, risk_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
  regions.forEach(r => insert.run(...r))
}

const settingCount = db.prepare('SELECT COUNT(*) as c FROM system_settings').get().c
if (settingCount === 0) {
  const settings = {
    theme_bg: 'linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #132f4c 100%)',
    theme_primary: '#00d4aa',
    theme_secondary: '#3b9eff',
    theme_accent: '#ff6b35',
    theme_text: '#e8f4f8',
    theme_font: '"Noto Sans SC", "PingFang SC", sans-serif',
    theme_chart_opacity: '0.85',
    system_title: '基于深度学习的番茄叶病害分类系统',
    system_subtitle: 'Tomato Leaf Disease Classification Visualization Platform'
  }
  const insert = db.prepare(`INSERT INTO system_settings (key, value) VALUES (?, ?)`)
  Object.entries(settings).forEach(([k, v]) => insert.run(k, v))
}

const dbConfigCount = db.prepare('SELECT COUNT(*) as c FROM db_config').get().c
if (dbConfigCount === 0) {
  db.prepare(`INSERT INTO db_config (name, type, file_path, is_active) VALUES (?, ?, ?, ?)`).run('默认SQLite', 'sqlite', dbPath, 1)
}

console.log('数据库初始化完成:', dbPath)
db.close()
