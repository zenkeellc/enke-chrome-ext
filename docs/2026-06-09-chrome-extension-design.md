# en.ke Chrome/Edge 浏览器扩展设计文档

**日期：** 2026-06-09
**状态：** 已确认

---

## 1. 产品概述

为 en.ke 短链接服务构建 Chrome/Edge 浏览器扩展，支持登录用户在浏览器中快速生成短链接和二维码，无需离开当前页面。

**兼容性：** Chrome (Manifest V3) + Microsoft Edge (Chromium)，同一套代码同时提交 Chrome Web Store 和 Edge Add-ons。

---

## 2. 核心功能决策

| 决策点 | 选择 | 说明 |
|--------|------|------|
| 用户定位 | 兼顾：默认极简，高级可展开 | popup 首页只做核心操作 |
| 核心交互 | 半自动（B） | URL 预填，用户点 Shorten 确认 |
| 首屏展示 | 标准（B） | 短链接 + 复制 + 二维码 + 分享 |
| 登录要求 | 必须登录（A） | 扩展仅限已登录用户 |
| 登录方式 | 弹出窗口 OAuth（B） | 复用现有 web 端 Google 登录 |
| 右键菜单 | 有（B） | Shorten page + Shorten selected link |
| 历史记录 | 本地最近 10 条（B） | chrome.storage.local |

---

## 3. 技术架构

### 3.1 技术栈
- **Manifest V3** + Service Worker（background）
- **Vue 3** + TypeScript + Composition API
- **Vite** + `@crxjs/vite-plugin`（HMR 开发）
- **Axios** — HTTP 客户端
- **chrome.storage.local** — token/用户/历史持久化
- **qr-code-styling** — 二维码生成（与主项目共用）
- **纯 CSS** — 无 UI 框架（popup 体积 < 200KB）

### 3.2 目录结构
```
enke-chrome-ext/
├── public/icons/              # 16/48/128 图标
├── src/
│   ├── manifest.json          # Manifest V3
│   ├── background/index.ts    # Service Worker
│   ├── popup/
│   │   ├── index.html
│   │   ├── index.ts           # Vue 挂载
│   │   ├── App.vue            # 路由容器
│   │   ├── pages/
│   │   │   ├── LoginPage.vue
│   │   │   ├── ShortenPage.vue
│   │   │   └── HistoryPage.vue
│   │   ├── components/
│   │   │   ├── QRCodeCard.vue
│   │   │   ├── LinkResult.vue
│   │   │   └── UserBadge.vue
│   │   ├── composables/
│   │   │   ├── useAuth.ts
│   │   │   ├── useShorten.ts
│   │   │   └── useStorage.ts
│   │   └── styles/main.css
│   └── utils/
│       ├── api.ts             # API 客户端
│       └── types.ts           # 类型定义
├── vite.config.ts
├── package.json
└── tsconfig.json
```

### 3.3 零后端改动
- 复用所有现有 en.ke API 端点
- 登录复用 `www.en.ke/login` 页面
- Token 刷新复用 jwtsvr `/api/v1/refresh`

---

## 4. 认证流程

```
Popup LoginPage
  → 点击 "Sign in with Google"
  → chrome.tabs.create 打开 en.ke 登录页
  → 用户完成 Google OAuth
  → 登录页通过 postMessage 回传 token
  → Service Worker 接收消息 → 存入 chrome.storage.local
  → 通知 popup → 切换 ShortenPage
  → 关闭登录 tab
```

- Token 过期自动刷新（Axios interceptor）
- User info、plan、subscription 通过 `/api/v1/me` 获取

---

## 5. Popup UI 设计

### 5.1 顶栏
- en.ke logo + 用户徽章（头像 + 计划标识 + 下拉菜单）
- 菜单：Settings, Sign Out

### 5.2 缩短页（ShortenPage）
- URL 输入框（自动获取当前标签页 URL）
- 可选自定义 slug（折叠，点击展开）
- AI Suggest 按钮（按 plan 配额显示）
- Shorten 按钮
- 结果卡片（替换输入区）：
  - 短链接 + 一键复制 + toast
  - 二维码 180×180（qr-code-styling）
  - 操作按钮：Copy / Download QR / Open
  - Shorten Another 返回输入

### 5.3 历史记录
- 底部 Recent 列表（最多 5 条）
- 点击复制 / 查看二维码
- View All 跳转网页端

### 5.4 设置页
- 账户信息（邮箱、plan、使用量概览）
- Manage Subscription → 打开网页端
- 偏好设置：Auto-copy after shorten、Default expiry
- Sign Out

---

## 6. 右键菜单

两个 context menu 项（Service Worker 注册）：
- **Shorten selected link** — 选中 URL 文本时显示
- **Shorten this page** — 始终显示

缩短成功后：Chrome notification "✅ Link copied!" + 自动复制到剪贴板。

---

## 7. 数据流

```
chrome.storage.local:
  - token / refreshToken / tokenExp / refreshTokenExp
  - user (UserModelsAppUser)
  - plan / role / subscription
  - recentLinks[] (最近 10 条)

每次 popup 打开:
  1. 读取 chrome.storage.local
  2. 检查 token 过期 → 自动刷新
  3. 获取当前 tab URL → 预填输入框
  4. 渲染 recent 列表

每次缩短:
  1. POST /api/v1/links
  2. 成功后生成二维码（客户端）
  3. 保存到 recentLinks
  4. 展示结果卡片
```

---

## 8. 构建与发布

- `npm run build` → 生成 `dist/` 目录（zip 包）
- 同时提交 Chrome Web Store 和 Edge Add-ons
- 版本号独立管理，初始 v1.0.0

---

## 9. Web 端集成（必需）

在 `www.en.ke` 的登录成功后，需要检测 `source=extension` 参数并回传 token：

```typescript
// 在登录成功后的回调中添加：
const urlParams = new URLSearchParams(window.location.search);
const extId = urlParams.get('extid');
if (extId && urlParams.get('source') === 'extension') {
  try {
    chrome.runtime.sendMessage(extId, {
      type: 'enke-auth-success',
      token: accessToken,
      refreshToken: refreshToken,
      user: { id: userId, username, email },
    });
    // 显示 "Login successful! You can close this tab."
  } catch (e) {
    // Extension not available — normal web login
  }
}
```

## 10. API 端点依赖

| 端点 | 用途 |
|------|------|
| `POST /api/v1/links` | 创建短链接 |
| `GET /api/v1/me` | 获取用户信息、plan、subscription |
| `POST /api/v1/links/ai-slug` | AI slug 建议 |
| `GET /api/v1/links?uid=...` | 获取链接列表（可选云端历史） |
| jwtsvr `/api/v1/refresh` | Token 刷新 |
| jwtsvr Google OAuth 流程 | 登录认证 |

## 11. 待完成

- [ ] 替换 `public/icons/` 中的占位图标为 en.ke 品牌图标
- [ ] 在 `www.en.ke/login` 添加扩展消息回传代码
- [ ] 加载为 Chrome 未打包扩展测试
- [ ] 提交 Chrome Web Store 审核
- [ ] 提交 Edge Add-ons 审核
