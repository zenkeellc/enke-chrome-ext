# en.ke — Chrome Web Store 表单对照表

按页面顺序逐字段复制粘贴。

---

## Store listing 标签页

| 字段 | 内容 |
|------|------|
| Name | en.ke — URL Shortener & QR Codes |
| Short name | en.ke |
| Description | Shorten URLs, generate QR codes, and manage links with en.ke — all without leaving your current page. |
| Category | Productivity |
| Language | English (en) |

---

## Privacy practices 标签页

### Single purpose description

```
Shorten URLs and generate QR codes with en.ke. Right-click to shorten, AI-powered slugs, plan-aware customization.
```

### Permission justification

**activeTab:**

```
To read the current page URL for shortening
```

**contextMenus:**

```
To provide right-click "Shorten" commands
```

**notifications:**

```
To notify you when a link is created via context menu
```

**scripting:**

```
To show a toast notification and copy the short URL to your clipboard
```

**storage:**

```
To save your login session and recent links locally
```

**Host permission:**

```
This extension connects only to en.ke (api.en.ke, www.en.ke) and the en.ke authentication server (user.zenkee.com). No third-party tracking or analytics are included.
```

### Are you using remote code?

选择：**No, I am not using Remote code**

Justification:

```
All JavaScript, CSS, and HTML are bundled in the extension package. No code is fetched or executed from external sources at runtime. API calls are data-only (JSON).
```

### What user data do you plan to collect?

**只勾选这两项，其他全部不勾选：**

#### ✅ Authentication information

```
JWT access and refresh tokens stored in chrome.storage.local to authenticate API requests to en.ke.
```

#### ✅ User activity

```
The URL the user chooses to shorten is transmitted to api.en.ke to create a short link. Shortened link results are stored locally in chrome.storage.local for recent-links history.
```

### 三项合规声明

全部勾选：

- ✅ I do not sell or transfer user data to third parties, apart from the approved use cases
- ✅ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ✅ I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy URL

```
https://en.ke/privacy
```

---

填完后点页面底部 **Save draft**，然后回到主页面 **Submit for review**。
