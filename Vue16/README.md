# 基于深度学习的番茄叶病害分类系统 · 数据可视化大屏

面向番茄叶病害智能识别场景的 **Web 端数据可视化大屏系统**。系统以深度学习分类结果与产区监测数据为核心，通过 **Vue 3 + ECharts + Three.js** 构建沉浸式可视化界面，并通过 **Express + SQLite** 提供用户认证、权限管控、数据管理与系统配置能力。

---

## 一、项目简介

番茄叶病害（早疫病、晚疫病、叶霉病、病毒病等）是设施农业与露地番茄种植中的常见问题。本系统围绕「识别结果展示—趋势分析—产区风险研判—模型训练监控」闭环，提供：

1. **登录与权限体系**：账号/手机号登录、图形验证码、三角色权限隔离  
2. **交互式可视化大屏**：中央 3D 番茄叶片模型 + 透明图表覆盖层  
3. **多页图表分析**：基础 / 高级 / 三维 / 特效等多类 ECharts 图表  
4. **病害预测调试**：手动调节叶片特征与模型超参数，查看分类结果与概率分布  
5. **业务数据管理**：病害类型与检测记录的增删改查、Excel 导入导出  
6. **系统运维配置**：SQLite 连接管理、全局主题样式自定义  

项目适合作为毕业设计、课程设计、数据可视化大屏演示，或智慧农业相关原型系统。

---

## 二、功能特性

### 2.1 用户与安全

| 功能 | 说明 |
|------|------|
| 账号登录 | 用户名 + 密码 |
| 手机号登录 | 手机号 + 密码 |
| 图形验证码 | SVG 验证码，点击可刷新，校验通过后登录 |
| JWT 鉴权 | 登录后携带 Bearer Token，接口统一鉴权 |
| 密码加密 | bcrypt 哈希存储 |
| 角色权限 | `admin` / `operator` / `viewer` 三级 |

### 2.2 可视化大屏

- **总览大屏**：中央全屏 Three.js 3D 模型（番茄果实 + 环绕病斑叶片）  
- **交互能力**：拖拽旋转、滚轮缩放、点击叶片弹出病害详情（居中浮层，不遮挡两侧图表）  
- **透明覆盖层**：左右两侧玻璃拟态图表面板，叠加于 3D 场景之上  
- **顶部导航 / 底部分页目录**：在不同图表页与管理页间切换  
- **实时时钟与滚动播报**：展示最新检测记录  

### 2.3 图表分页

| 页面 | 包含图表类型 |
|------|----------------|
| 基础图表 | 凹凸图、折线区域高亮、折柱混合、南丁格尔玫瑰图、可滚动图例训练曲线 |
| 高级图表 | 折线鱼眼（dataZoom）、断轴柱状图、指数回归拟合、盒须图、热力图 |
| 三维图表 | Dataset 三维柱状图、Bar3D 星云、图像特征三维柱状、三维散点图 |
| 特效图表 | 涟漪散点、散点聚合柱状动画、标签顶部对齐散点、关系图、产区传播网络图 |

### 2.4 数据与系统管理

- **用户管理**（管理员）：新增/编辑/删除用户，角色与启停状态维护  
- **数据管理**（管理员/操作员）：检测记录与病害类型 CRUD；Excel 导入导出  
- **数据库设置**（管理员）：查看表统计、配置/切换 SQLite 连接  
- **样式设置**（管理员）：背景、主色/次色/强调色、字体、图表透明度；支持实时预览与持久化  

---

## 三、技术栈

### 前端 (`client/`)

| 技术 | 用途 |
|------|------|
| Vue 3 | 响应式 UI 框架（Composition API） |
| Vite 5 | 开发与构建工具 |
| Vue Router 4 | 路由与页面权限守卫 |
| Pinia | 用户态、主题态管理 |
| Element Plus | 表单、表格、弹窗、分页等后台组件 |
| ECharts 5 | 二维可视化图表 |
| ECharts-GL | 三维柱状图、三维散点等 |
| Three.js | 中央可交互 3D 模型 |
| Axios | HTTP 请求与拦截器 |
| XLSX / file-saver | 前端导入导出辅助 |

### 后端 (`server/`)

| 技术 | 用途 |
|------|------|
| Express | REST API 服务 |
| better-sqlite3 | 本地 SQLite 数据库 |
| jsonwebtoken | JWT 签发与校验 |
| bcryptjs | 密码加密 |
| svg-captcha | 图形验证码 |
| multer | 文件上传（Excel 导入） |
| xlsx | Excel 读写 |
| cors | 跨域支持 |
| nodemon | 开发热重启 |

---

## 四、系统架构

```
浏览器 (Vue3 大屏)
    │  /api 代理 (Vite → :3001)
    ▼
Express 后端
    ├── /api/auth      登录、验证码、权限
    ├── /api/users     用户 CRUD
    ├── /api/data      病害/检测记录/大屏统计/导入导出
    └── /api/settings  主题样式、数据库连接
            │
            ▼
      SQLite (server/data/tomato_disease.db)
```

**前端布局结构：**

```
ScreenLayout
├── Header（系统标题 / 图表导航 / 时钟 / 用户菜单）
├── Main（路由页面）
│   ├── Dashboard / Charts* ：3D 全屏底图 + 透明图表层
│   └── Manage* / ThemeSettings ：管理与配置页
└── Footer（首页 / 数据 / 用户 / 数据库 / 样式 等入口）
```

---

## 五、目录结构

```
Vue16/
├── README.md                 # 项目说明（本文件）
├── package.json              # 根目录脚本说明
├── client/                   # 前端工程
│   ├── index.html
│   ├── public/               # 静态资源（favicon 等）
│   ├── vite.config.js        # 开发代理 /api → :3001
│   └── src/
│       ├── api/              # 接口封装
│       ├── components/       # Tomato3D、ChartPanel
│       ├── layouts/          # 大屏布局
│       ├── router/           # 路由与守卫
│       ├── stores/           # user / theme
│       ├── styles/           # 全局主题样式
│       ├── utils/            # 图表主题工具
│       └── views/
│           ├── Login.vue
│           ├── dashboard/    # 总览大屏
│           ├── charts/       # 各类图表页
│           ├── manage/       # 用户/数据/数据库
│           └── settings/     # 样式设置
└── server/                   # 后端工程
    ├── index.js              # 服务入口
    ├── db/
    │   ├── index.js          # 数据库连接
    │   └── init.js           # 建表与种子数据
    ├── middleware/auth.js    # JWT 与角色中间件
    ├── routes/               # 业务路由
    ├── data/                 # SQLite 数据文件（运行后生成）
    └── uploads/              # 导入临时文件
```

---

## 六、环境要求

- **Node.js**：建议 `v18+`，当前验证环境为 `v20.15.0`
- **npm**：`v9+` / `v10+`
- **浏览器**：Chrome / Edge / Firefox 最新版（需支持 WebGL）
- **操作系统**：Windows / macOS / Linux

> 说明：前端使用 Vite 5，以兼容 Node 20；若使用过新的 Vite 8，在部分 Node 版本下可能出现原生绑定安装问题。

---

## 七、快速开始

### 7.1 安装依赖

```bash
# 后端
cd server
npm install

# 前端
cd ../client
npm install
```

### 7.2 初始化数据库

首次启动前执行（会创建数据文件并写入演示数据）：

```bash
cd server
npm run init-db
```

初始化内容包括：

- 用户表（3 个演示账号）  
- 9 种病害类型  
- 约 500 条检测记录  
- 多模型训练指标（50 epoch）  
- 近 90 天日统计、10 个产区统计  
- 默认主题样式与 SQLite 连接配置  

数据库文件路径：

```text
server/data/tomato_disease.db
```

### 7.3 启动服务

**终端 1 — 后端（默认端口 3001）：**

```bash
cd server
npm run dev
```

**终端 2 — 前端（默认端口 5173）：**

```bash
cd client
npm run dev
```

浏览器访问：

```text
http://localhost:5173
```

### 7.4 生产构建（可选）

```bash
cd client
npm run build
npm run preview
```

后端生产启动：

```bash
cd server
npm start
```

---

## 八、演示账号与权限

| 用户名 | 密码 | 手机号 | 角色 | 权限范围 |
|--------|------|--------|------|----------|
| `admin` | `admin123` | 13800000001 | 管理员 | 全部功能：大屏、图表、用户、数据、数据库、样式 |
| `operator` | `user123` | 13800000002 | 操作员 | 大屏、图表、数据查看/新增/编辑/导入导出 |
| `viewer` | `viewer123` | 13800000003 | 访客 | 仅大屏与图表查看 |

### 权限点说明

| 权限标识 | 说明 | viewer | operator | admin |
|----------|------|:------:|:--------:|:-----:|
| dashboard:view / chart:view | 查看大屏与图表 | ✓ | ✓ | ✓ |
| data:view / create / update / export / import | 数据管理 | | ✓ | ✓ |
| data:delete | 删除数据 | | | ✓ |
| user:* | 用户管理 | | | ✓ |
| settings:* / db:* | 样式与数据库 | | | ✓ |

---

## 九、页面说明

### 9.1 登录页

- 左侧：系统介绍、能力说明、病害叶片示意、技术标签  
- 右侧：账号登录 / 手机号登录切换、验证码、演示账号快捷填充  

### 9.2 总览大屏

- 中央 3D 模型展示病害叶片，点击查看：名称、类别、严重度、检测数、置信度、症状与防治  
- 左侧：病害分布饼图、日趋势折线、模型准确率条形图  
- 右侧：产区分布、严重度玫瑰图、置信度直方图  
- 顶部：关键指标卡片；底部：最新检测滚动条  

### 9.3 病害预测（参数调试）

路径：`/predict`

- 左侧手动调试：推理模型、输入尺寸、Softmax 温度、Top-K、置信度阈值、数据增强开关  
- 叶片特征：温湿度、绿色/黄化/褐斑占比、病斑数量与尺寸、卷曲、花叶、白粉、水浸状、同心轮纹等  
- 支持「疑似早疫病 / 晚疫病 / 黄化曲叶 / 健康叶片」等快速预设  
- 右侧展示预测类别、置信度、耗时、Top-K 柱状图、全类别饼图与明细表  
- 可选择将通过阈值的结果写入检测记录  

### 9.4 管理与配置页

- **数据管理**：检测记录 / 病害类型双页签；支持条件检索与 Excel 导入导出  
- **用户管理**：分页列表、角色筛选、密码重置  
- **数据库设置**：连接列表、启用切换、表记录数统计  
- **样式设置**：颜色/背景/字体/透明度调整，右侧实时预览，保存后全局生效  

---

## 十、数据库设计（核心表）

| 表名 | 说明 |
|------|------|
| `users` | 用户账号、手机号、角色、状态 |
| `diseases` | 病害类型字典（中英文、类别、严重度、症状、防治） |
| `detection_records` | 检测记录（病害、置信度、产区、温湿度、模型版本等） |
| `model_metrics` | 模型训练过程指标（accuracy / loss / f1 等） |
| `daily_stats` | 按日汇总统计 |
| `region_stats` | 产区经纬度与风险等级 |
| `system_settings` | 键值对形式的系统主题配置 |
| `db_config` | 数据库连接配置 |

---

## 十一、主要 API 一览

基础前缀：`http://localhost:3001/api`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/auth/captcha` | 获取验证码 |
| POST | `/auth/login` | 登录 |
| GET | `/auth/me` | 当前用户信息 |
| GET | `/auth/permissions` | 当前权限列表 |
| GET/POST/PUT/DELETE | `/users` | 用户管理 |
| GET/POST/PUT/DELETE | `/data/diseases` | 病害类型 |
| GET/POST/PUT/DELETE | `/data/records` | 检测记录 |
| GET | `/data/export/records` | 导出 Excel |
| POST | `/data/import/records` | 导入 Excel |
| GET | `/data/dashboard/overview` | 大屏聚合数据 |
| GET | `/data/dashboard/model3d` | 3D 模型病害数据 |
| GET | `/predict/models` | 可选推理模型列表 |
| GET | `/predict/defaults` | 默认参数与预设场景 |
| POST | `/predict/run` | 执行参数化病害预测 |
| GET/PUT | `/settings` | 主题样式读写 |
| GET/POST/PUT/DELETE | `/settings/db-config` | 数据库连接配置 |
| POST | `/settings/db-config/:id/activate` | 启用指定连接 |
| GET | `/settings/db-info` | 当前库与表统计 |
| GET | `/health` | 健康检查 |

除验证码、登录、健康检查外，其余接口需在请求头携带：

```http
Authorization: Bearer <token>
```

---

## 十二、配置说明

### 前端代理

`client/vite.config.js` 中将 `/api` 代理到后端：

```js
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true
  }
}
```

### JWT 密钥

后端默认密钥为：

```text
tomato-disease-viz-secret-2024
```

生产环境建议通过环境变量 `JWT_SECRET` 覆盖。

### 端口

| 服务 | 默认端口 |
|------|----------|
| 前端 Vite | 5173 |
| 后端 Express | 3001（可用环境变量 `PORT` 修改） |

---

## 十三、常见问题

**1. 前端启动报 rolldown / native binding 错误？**  
请确认使用 Vite 5（本仓库已锁定），删除 `client/node_modules` 与 `package-lock.json` 后重新 `npm install`。

**2. 登录提示验证码错误？**  
点击验证码图片刷新后重新输入；验证码区分大小写已做忽略处理，但仍需在有效期内使用。

**3. 高级图表曾空白？**  
已对回归/盒须图做本地计算兜底；若仍异常，打开浏览器控制台查看报错，并确认后端 `/api/data/dashboard/overview` 返回正常。

**4. 3D 模型不显示？**  
确认浏览器开启硬件加速 / WebGL；尝试切换 Chrome/Edge。

**5. 表格出现白底？**  
全局样式已覆盖 Element Plus 表格默认背景；强制刷新（Ctrl+F5）即可。

**6. 重新初始化数据？**  
删除 `server/data/tomato_disease.db` 后执行 `npm run init-db`。

---

## 十四、开发说明

- 前端状态：`stores/user.js`（登录态与权限）、`stores/theme.js`（主题 CSS 变量）  
- 图表封装：`components/ChartPanel.vue`（自适应 resize、异常容错）  
- 3D 封装：`components/Tomato3D.vue`（叶片点击、居中详情浮层）  
- 路由守卫：未登录跳转登录页；角色不足回退总览大屏  
- 代码风格：页面按业务拆分，管理页与大屏页分离，便于二次扩展  

---

## 十五、后续可扩展方向

- 对接真实深度学习推理服务（上传叶片图片实时分类）  
- 接入 WebSocket 实现检测数据实时推送  
- 增加中国地图 GeoJSON，完善地理坐标系可视化  
- 支持 MySQL / PostgreSQL 正式切换（当前以 SQLite 为主，连接配置已预留字段）  
- 增加操作审计日志、密码找回与短信验证码  

---

## 十六、许可证

本项目仅供学习、研究与演示使用。如需商用，请自行评估依赖库许可证并补充业务合规要求。
