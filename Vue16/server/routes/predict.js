const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { getDb } = require('../db')
const { authRequired } = require('../middleware/auth')

const router = express.Router()

const uploadDir = path.join(__dirname, '..', 'uploads', 'predict')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg'
    cb(null, `pred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|bmp|gif)$/i.test(file.mimetype)) cb(null, true)
    else cb(new Error('仅支持 jpg/png/webp/bmp/gif 图片'))
  }
})

const MODEL_PROFILES = {
  'ResNet50-v2': { bias: 0.02, sharpness: 1.05, label: 'ResNet50-v2' },
  'EfficientNet-B3': { bias: 0.04, sharpness: 1.12, label: 'EfficientNet-B3' },
  'YOLOv8-cls': { bias: 0.01, sharpness: 0.98, label: 'YOLOv8-cls' },
  'ViT-Base': { bias: 0.03, sharpness: 1.18, label: 'ViT-Base' }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function softmax(logits, temperature = 1) {
  const t = Math.max(0.05, Number(temperature) || 1)
  const scaled = logits.map(x => x / t)
  const maxLogit = Math.max(...scaled)
  const exps = scaled.map(x => Math.exp(x - maxLogit))
  const sum = exps.reduce((a, b) => a + b, 0) || 1
  return exps.map(e => e / sum)
}

function scoreDiseases(params, diseases) {
  const {
    temperature = 25,
    humidity = 65,
    green_ratio = 0.55,
    yellow_ratio = 0.15,
    brown_spot_ratio = 0.12,
    lesion_count = 8,
    lesion_size = 0.25,
    leaf_curl = 0.2,
    mosaic_pattern = 0.1,
    powdery_cover = 0.05,
    water_soak = 0.15,
    concentric_ring = 0.1
  } = params

  const envHot = clamp((temperature - 22) / 12, -1, 1)
  const envHumid = clamp((humidity - 55) / 35, -1, 1)

  return diseases.map(d => {
    let score = 0.15
    const name = d.name

    if (name === '健康叶片') {
      score += green_ratio * 2.2
      score -= brown_spot_ratio * 2.5
      score -= yellow_ratio * 1.2
      score -= lesion_count * 0.04
      score -= powdery_cover * 1.5
      score -= mosaic_pattern * 1.8
      score -= leaf_curl * 1.2
    }

    if (name === '早疫病') {
      score += concentric_ring * 2.8
      score += brown_spot_ratio * 2.2
      score += lesion_size * 1.4
      score += envHot * 0.6
      score += Math.max(0, envHumid) * 0.4
    }

    if (name === '晚疫病') {
      score += water_soak * 2.8
      score += envHumid * 1.4
      score += lesion_size * 1.6
      score += brown_spot_ratio * 1.2
      score -= envHot * 0.3
    }

    if (name === '叶霉病') {
      score += Math.max(0, envHumid) * 1.6
      score += (1 - green_ratio) * 0.8
      score += yellow_ratio * 1.2
      score += lesion_count * 0.03
    }

    if (name === '斑点病') {
      score += lesion_count * 0.08
      score += brown_spot_ratio * 1.8
      score += (1 - lesion_size) * 0.6
      score += yellow_ratio * 0.8
    }

    if (name === '细菌性斑点病') {
      score += water_soak * 1.5
      score += brown_spot_ratio * 1.6
      score += lesion_count * 0.05
      score += Math.max(0, envHumid) * 0.8
    }

    if (name === '黄化曲叶病毒') {
      score += leaf_curl * 3.0
      score += yellow_ratio * 2.2
      score += (1 - green_ratio) * 1.0
      score += mosaic_pattern * 0.8
    }

    if (name === '花叶病毒') {
      score += mosaic_pattern * 3.2
      score += yellow_ratio * 1.4
      score += (1 - green_ratio) * 0.7
      score += leaf_curl * 0.6
    }

    if (name === '白粉病') {
      score += powdery_cover * 3.5
      score += (1 - Math.max(0, envHumid)) * 0.5
      score += yellow_ratio * 0.5
    }

    // mild noise for realism
    score += (Math.random() - 0.5) * 0.08
    return { disease: d, score }
  })
}

router.get('/models', authRequired, (req, res) => {
  res.json({
    code: 0,
    data: Object.keys(MODEL_PROFILES).map(k => ({
      value: k,
      label: MODEL_PROFILES[k].label
    }))
  })
})

router.get('/defaults', authRequired, (req, res) => {
  res.json({
    code: 0,
    data: {
      model_name: 'ResNet50-v2',
      temperature_softmax: 0.85,
      top_k: 5,
      confidence_threshold: 0.35,
      input_size: 224,
      use_augmentation: false,
      save_record: false,
      region: '山东寿光',
      farm: '智慧农业园',
      features: {
        temperature: 26,
        humidity: 72,
        green_ratio: 0.48,
        yellow_ratio: 0.22,
        brown_spot_ratio: 0.18,
        lesion_count: 12,
        lesion_size: 0.32,
        leaf_curl: 0.15,
        mosaic_pattern: 0.08,
        powdery_cover: 0.04,
        water_soak: 0.28,
        concentric_ring: 0.35
      },
      presets: [
        { name: '疑似早疫病', features: { temperature: 28, humidity: 68, green_ratio: 0.42, yellow_ratio: 0.18, brown_spot_ratio: 0.26, lesion_count: 10, lesion_size: 0.4, leaf_curl: 0.1, mosaic_pattern: 0.05, powdery_cover: 0.02, water_soak: 0.15, concentric_ring: 0.72 } },
        { name: '疑似晚疫病', features: { temperature: 20, humidity: 88, green_ratio: 0.35, yellow_ratio: 0.2, brown_spot_ratio: 0.3, lesion_count: 8, lesion_size: 0.55, leaf_curl: 0.12, mosaic_pattern: 0.05, powdery_cover: 0.02, water_soak: 0.8, concentric_ring: 0.1 } },
        { name: '疑似黄化曲叶', features: { temperature: 30, humidity: 55, green_ratio: 0.28, yellow_ratio: 0.55, brown_spot_ratio: 0.05, lesion_count: 2, lesion_size: 0.1, leaf_curl: 0.85, mosaic_pattern: 0.25, powdery_cover: 0.02, water_soak: 0.05, concentric_ring: 0.02 } },
        { name: '健康叶片', features: { temperature: 25, humidity: 60, green_ratio: 0.88, yellow_ratio: 0.05, brown_spot_ratio: 0.02, lesion_count: 0, lesion_size: 0.02, leaf_curl: 0.05, mosaic_pattern: 0.02, powdery_cover: 0.01, water_soak: 0.02, concentric_ring: 0.01 } }
      ]
    }
  })
})

function parseBody(req) {
  const body = req.body || {}
  let features = body.features
  if (typeof features === 'string') {
    try { features = JSON.parse(features) } catch { features = {} }
  }
  if (!features || typeof features !== 'object') features = {}

  const toBool = (v) => v === true || v === 'true' || v === '1' || v === 1
  return {
    model_name: body.model_name || 'ResNet50-v2',
    temperature_softmax: Number(body.temperature_softmax ?? 0.85),
    top_k: Number(body.top_k ?? 5),
    confidence_threshold: Number(body.confidence_threshold ?? 0.35),
    input_size: Number(body.input_size ?? 224),
    use_augmentation: toBool(body.use_augmentation),
    save_record: toBool(body.save_record),
    region: body.region || '预测调试',
    farm: body.farm || '参数调试',
    features
  }
}

router.post('/run', authRequired, upload.single('image'), (req, res) => {
  try {
    const body = parseBody(req)
    const modelName = body.model_name
    const profile = MODEL_PROFILES[modelName] || MODEL_PROFILES['ResNet50-v2']
    const temperatureSoftmax = clamp(body.temperature_softmax, 0.1, 3)
    const topK = clamp(Math.floor(body.top_k), 1, 9)
    const threshold = clamp(body.confidence_threshold, 0.05, 0.99)
    const inputSize = clamp(Math.floor(body.input_size), 64, 512)
    const features = body.features

    const db = getDb()
    const diseases = db.prepare('SELECT * FROM diseases ORDER BY id').all()
    if (!diseases.length) {
      return res.json({ code: 400, message: '病害字典为空，请先初始化数据库' })
    }

    // 有上传图片时，对特征做轻微扰动，模拟视觉特征影响
    if (req.file) {
      const bump = ((req.file.size % 97) / 97 - 0.5) * 0.08
      features.brown_spot_ratio = clamp(Number(features.brown_spot_ratio || 0) + Math.abs(bump), 0, 1)
      features.green_ratio = clamp(Number(features.green_ratio || 0.5) - Math.abs(bump) * 0.4, 0, 1)
    }

    const scored = scoreDiseases(features, diseases).map(item => ({
      ...item,
      score: item.score * profile.sharpness + profile.bias
    }))

    const probs = softmax(scored.map(s => s.score), temperatureSoftmax)
    const ranking = scored.map((s, i) => ({
      disease_id: s.disease.id,
      disease_name: s.disease.name,
      name_en: s.disease.name_en,
      category: s.disease.category,
      severity: s.disease.severity,
      symptoms: s.disease.symptoms,
      treatment: s.disease.treatment,
      probability: Math.round(probs[i] * 10000) / 10000,
      percent: Math.round(probs[i] * 1000) / 10
    })).sort((a, b) => b.probability - a.probability)

    const top = ranking[0]
    const accepted = top.probability >= threshold
    const topList = ranking.slice(0, topK)
    const imagePath = req.file ? `/uploads/predict/${req.file.filename}` : null

    let savedId = null
    if (body.save_record && accepted) {
      const r = db.prepare(`INSERT INTO detection_records
        (disease_id, disease_name, confidence, image_path, region, farm, temperature, humidity, detected_at, operator, model_version, status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(
          top.disease_id,
          top.disease_name,
          top.probability,
          imagePath,
          body.region,
          body.farm,
          features.temperature ?? null,
          features.humidity ?? null,
          new Date().toISOString().slice(0, 19).replace('T', ' '),
          req.user.username,
          modelName,
          'confirmed'
        )
      savedId = r.lastInsertRowid
    }

    res.json({
      code: 0,
      message: accepted ? '预测完成' : '最高置信度未达阈值，结果仅供参考',
      data: {
        accepted,
        model_name: modelName,
        input_size: inputSize,
        temperature_softmax: temperatureSoftmax,
        confidence_threshold: threshold,
        top_k: topK,
        prediction: top,
        ranking: topList,
        all_ranking: ranking,
        image_path: imagePath,
        image_name: req.file?.originalname || null,
        params_used: {
          model_name: modelName,
          temperature_softmax: temperatureSoftmax,
          top_k: topK,
          confidence_threshold: threshold,
          input_size: inputSize,
          use_augmentation: body.use_augmentation,
          features
        },
        inference_ms: Math.round(18 + Math.random() * 40 + (inputSize / 224) * 12 + (req.file ? 15 : 0)),
        saved_id: savedId
      }
    })
  } catch (e) {
    res.json({ code: 500, message: e.message || '预测失败' })
  }
})

module.exports = router
