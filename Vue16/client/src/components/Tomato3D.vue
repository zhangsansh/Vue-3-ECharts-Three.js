<template>
  <div class="tomato-3d" ref="containerRef">
    <div class="model-hint" v-if="!selected">点击叶片查看病害数据 · 拖拽旋转 · 滚轮缩放</div>
  </div>

  <Teleport to="body">
    <transition name="fade">
      <div v-if="selected" class="disease-popup-center" @click.stop>
        <div class="popup-header">
          <h3>{{ selected.name }}</h3>
          <button class="close-btn" @click="closePopup">×</button>
        </div>
        <div class="popup-body">
          <p><span>英文名</span>{{ selected.name_en }}</p>
          <p><span>类别</span>{{ selected.category }}</p>
          <p><span>严重度</span><em :class="'sev-' + selected.severity">{{ selected.severity }}</em></p>
          <p><span>检测数</span><b class="stat-num">{{ selected.count }}</b></p>
          <p><span>平均置信度</span><b class="stat-num">{{ (selected.avg_confidence * 100 || 0).toFixed(1) }}%</b></p>
          <p class="desc"><span>症状</span>{{ selected.symptoms }}</p>
          <p class="desc"><span>防治</span>{{ selected.treatment }}</p>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const props = defineProps({
  diseases: { type: Array, default: () => [] }
})

const emit = defineEmits(['select'])

const containerRef = ref(null)
const selected = ref(null)

let renderer, scene, camera, controls, animationId
let leafMeshes = []
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

function closePopup() {
  selected.value = null
  leafMeshes.forEach(m => {
    if (m.material?.emissive) m.material.emissive = new THREE.Color(0x000000)
    m.scale.set(0.7, 0.7, 0.7)
  })
  if (controls) controls.autoRotate = true
}

const severityColor = {
  '高': 0xff3344,
  '中': 0xff9933,
  '低': 0xffcc33,
  '无': 0x44cc66
}

function createLeaf(color, spots = []) {
  const shape = new THREE.Shape()
  shape.moveTo(0, -1.2)
  shape.bezierCurveTo(0.8, -0.8, 1.1, 0.2, 0.6, 1.0)
  shape.bezierCurveTo(0.3, 1.3, 0, 1.4, 0, 1.4)
  shape.bezierCurveTo(0, 1.4, -0.3, 1.3, -0.6, 1.0)
  shape.bezierCurveTo(-1.1, 0.2, -0.8, -0.8, 0, -1.2)

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.03,
    bevelSegments: 2
  })
  geom.center()

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.65,
    metalness: 0.1,
    side: THREE.DoubleSide
  })
  const mesh = new THREE.Mesh(geom, mat)

  spots.forEach(s => {
    const spotGeom = new THREE.CircleGeometry(s.r, 12)
    const spotMat = new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.85 })
    const spot = new THREE.Mesh(spotGeom, spotMat)
    spot.position.set(s.x, s.y, 0.05)
    mesh.add(spot)
  })

  return mesh
}

function createTomato() {
  const group = new THREE.Group()

  const bodyGeom = new THREE.SphereGeometry(1.1, 32, 32)
  bodyGeom.scale(1, 0.92, 1)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe6392b,
    roughness: 0.45,
    metalness: 0.15
  })
  const body = new THREE.Mesh(bodyGeom, bodyMat)
  body.position.y = 0.1
  group.add(body)

  const highlightGeom = new THREE.SphereGeometry(1.05, 32, 32)
  highlightGeom.scale(1, 0.92, 1)
  const highlightMat = new THREE.MeshStandardMaterial({
    color: 0xff6655,
    roughness: 0.3,
    metalness: 0.2,
    transparent: true,
    opacity: 0.15
  })
  group.add(new THREE.Mesh(highlightGeom, highlightMat))

  const stemGeom = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 8)
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3a6b2a })
  const stem = new THREE.Mesh(stemGeom, stemMat)
  stem.position.y = 1.2
  group.add(stem)

  for (let i = 0; i < 5; i++) {
    const sep = createLeaf(0x2d8a3e, [])
    sep.scale.set(0.35, 0.35, 0.35)
    const angle = (i / 5) * Math.PI * 2
    sep.position.set(Math.cos(angle) * 0.35, 1.15, Math.sin(angle) * 0.35)
    sep.rotation.z = Math.PI / 2
    sep.rotation.y = -angle
    sep.rotation.x = -0.6
    group.add(sep)
  }

  return group
}

function buildLeaves(diseases) {
  leafMeshes.forEach(m => scene.remove(m))
  leafMeshes = []

  const data = diseases.length ? diseases : [
    { name: '早疫病', severity: '中', count: 0 },
    { name: '晚疫病', severity: '高', count: 0 },
    { name: '叶霉病', severity: '中', count: 0 },
    { name: '斑点病', severity: '中', count: 0 },
    { name: '细菌性斑点病', severity: '中', count: 0 },
    { name: '黄化曲叶病毒', severity: '高', count: 0 },
    { name: '花叶病毒', severity: '中', count: 0 },
    { name: '白粉病', severity: '低', count: 0 },
    { name: '健康叶片', severity: '无', count: 0 }
  ]

  const n = data.length
  data.forEach((d, i) => {
    const color = severityColor[d.severity] || 0x44aa66
    const spots = d.severity === '无' ? [] : [
      { x: 0.2, y: 0.1, r: 0.12, color: 0x5a3010 },
      { x: -0.25, y: -0.2, r: 0.1, color: 0x4a2810 },
      { x: 0.1, y: -0.35, r: 0.08, color: 0x6a4020 }
    ]
    if (d.severity === '高') {
      spots.push({ x: -0.1, y: 0.3, r: 0.15, color: 0x2a1010 })
    }

    const leaf = createLeaf(d.severity === '无' ? 0x3d9b5a : 0x3a7a48, spots)
    const angle = (i / n) * Math.PI * 2
    const radius = 2.8
    const y = Math.sin(i * 0.7) * 0.6

    leaf.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    leaf.lookAt(0, y, 0)
    leaf.rotateY(Math.PI)
    leaf.scale.set(0.7, 0.7, 0.7)
    leaf.userData = { disease: d, index: i, baseY: y, angle, radius }
    scene.add(leaf)
    leafMeshes.push(leaf)

    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.roundRect(0, 8, 256, 48, 8)
    ctx.fill()
    ctx.fillStyle = '#00d4aa'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(d.name, 128, 42)
    const tex = new THREE.CanvasTexture(canvas)
    const labelMat = new THREE.SpriteMaterial({ map: tex, transparent: true })
    const label = new THREE.Sprite(labelMat)
    label.scale.set(1.4, 0.35, 1)
    label.position.set(Math.cos(angle) * (radius + 0.3), y + 1.0, Math.sin(angle) * (radius + 0.3))
    scene.add(label)
    leaf.userData.label = label
  })
}

function init() {
  const el = containerRef.value
  const w = el.clientWidth
  const h = el.clientHeight

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
  camera.position.set(0, 3, 8)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  el.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.minDistance = 4
  controls.maxDistance = 16
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.6

  const ambient = new THREE.AmbientLight(0x6688aa, 0.6)
  scene.add(ambient)
  const dir = new THREE.DirectionalLight(0xffffff, 1.2)
  dir.position.set(5, 8, 5)
  scene.add(dir)
  const fill = new THREE.DirectionalLight(0x3b9eff, 0.4)
  fill.position.set(-4, 2, -3)
  scene.add(fill)
  const point = new THREE.PointLight(0x00d4aa, 0.5, 20)
  point.position.set(0, 0, 0)
  scene.add(point)

  const tomato = createTomato()
  tomato.userData.isTomato = true
  scene.add(tomato)

  const ringGeom = new THREE.RingGeometry(3.5, 3.55, 64)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d4aa, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
  const ring = new THREE.Mesh(ringGeom, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = -1.5
  scene.add(ring)

  const particles = new THREE.BufferGeometry()
  const positions = new Float32Array(200 * 3)
  for (let i = 0; i < 200; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12
  }
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const pMat = new THREE.PointsMaterial({ color: 0x00d4aa, size: 0.04, transparent: true, opacity: 0.5 })
  scene.add(new THREE.Points(particles, pMat))

  buildLeaves(props.diseases)

  renderer.domElement.addEventListener('click', onClick)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  window.addEventListener('resize', onResize)

  animate()
}

function animate() {
  animationId = requestAnimationFrame(animate)
  const t = Date.now() * 0.001
  leafMeshes.forEach((leaf, i) => {
    const ud = leaf.userData
    leaf.position.y = ud.baseY + Math.sin(t * 1.2 + i * 0.8) * 0.15
    if (ud.label) {
      ud.label.position.y = leaf.position.y + 1.0
    }
  })
  controls.update()
  renderer.render(scene, camera)
}

function onClick(event) {
  const el = containerRef.value
  const rect = el.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(leafMeshes, true)
  if (intersects.length) {
    let obj = intersects[0].object
    while (obj && !obj.userData.disease) obj = obj.parent
    if (obj?.userData.disease) {
      selected.value = obj.userData.disease
      emit('select', obj.userData.disease)
      leafMeshes.forEach(m => {
        if (m.material?.emissive) m.material.emissive = new THREE.Color(0x000000)
        m.scale.set(0.7, 0.7, 0.7)
      })
      if (obj.material?.emissive) obj.material.emissive = new THREE.Color(0x224433)
      obj.scale.set(0.9, 0.9, 0.9)
      controls.autoRotate = false
    }
  }
}

function onPointerMove(event) {
  const el = containerRef.value
  const rect = el.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(leafMeshes, true)
  el.style.cursor = intersects.length ? 'pointer' : 'grab'
}

function onResize() {
  if (!containerRef.value || !renderer) return
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

watch(() => props.diseases, (val) => {
  if (scene) buildLeaves(val)
}, { deep: true })

onMounted(init)

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  if (renderer) {
    renderer.domElement.removeEventListener('click', onClick)
    renderer.dispose()
    containerRef.value?.removeChild(renderer.domElement)
  }
})
</script>

<style scoped>
.tomato-3d {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
  z-index: 1;
}

.model-hint {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: rgba(232, 244, 248, 0.4);
  letter-spacing: 2px;
  pointer-events: none;
  z-index: 5;
  white-space: nowrap;
}
</style>

<style>
/* 仅居中浮层卡片，无全屏遮罩，两侧图表可继续操作 */
.disease-popup-center {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  width: min(360px, calc(100vw - 680px));
  min-width: 280px;
  max-height: min(420px, calc(100vh - 180px));
  overflow: auto;
  background: rgba(8, 28, 48, 0.96);
  border: 1px solid rgba(0, 212, 170, 0.45);
  border-radius: 12px;
  backdrop-filter: blur(16px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.55), 0 0 28px rgba(0, 212, 170, 0.2);
  pointer-events: auto;
}

.disease-popup-center .popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 212, 170, 0.12);
  border-bottom: 1px solid rgba(0, 212, 170, 0.25);
  position: sticky;
  top: 0;
}

.disease-popup-center .popup-header h3 {
  font-size: 16px;
  color: var(--theme-primary, #00d4aa);
}

.disease-popup-center .close-btn {
  background: none;
  border: none;
  color: rgba(232, 244, 248, 0.6);
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
}

.disease-popup-center .close-btn:hover { color: #fff; }

.disease-popup-center .popup-body {
  padding: 14px 16px;
}

.disease-popup-center .popup-body p {
  font-size: 12px;
  margin-bottom: 8px;
  display: flex;
  gap: 8px;
  color: var(--theme-text, #e8f4f8);
}

.disease-popup-center .popup-body p span {
  color: rgba(232, 244, 248, 0.45);
  min-width: 70px;
  flex-shrink: 0;
}

.disease-popup-center .popup-body .desc {
  flex-direction: column;
  gap: 2px;
}

.disease-popup-center .sev-高 { color: #ff4455; font-style: normal; font-weight: 600; }
.disease-popup-center .sev-中 { color: #ff9933; font-style: normal; font-weight: 600; }
.disease-popup-center .sev-低 { color: #ffcc33; font-style: normal; font-weight: 600; }
.disease-popup-center .sev-无 { color: #44cc66; font-style: normal; font-weight: 600; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 1100px) {
  .disease-popup-center {
    width: min(320px, calc(100vw - 48px));
  }
}
</style>
