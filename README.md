# Flickr MCP Server

An MCP (Model Context Protocol) server that connects AI assistants to the Flickr API. Manage albums, tag photos, and organize your Flickr library through natural language.

## Features

**26 tools** covering photo, album, group, and social management:

### Photo Tools

| Tool | Description | Read/Write |
|------|-------------|------------|
| `flickr_search_photos` | Search photos by keyword, tags, date range | Read |
| `flickr_get_photo_info` | Get detailed photo metadata | Read |
| `flickr_get_photo_sizes` | Get image URLs for all available sizes | Read |
| `flickr_get_exif` | Get camera & EXIF metadata for a photo | Read |
| `flickr_get_explore` | Get photos from Flickr Explore (interestingness) | Read |
| `flickr_list_my_photos` | List your own photos (including private) | Read |
| `flickr_get_not_in_set` | List photos not in any album | Read |
| `flickr_set_photo_tags` | Replace all tags on a photo | Write |
| `flickr_add_photo_tags` | Append tags to a photo | Write |
| `flickr_set_photo_meta` | Update photo title and description | Write |
| `flickr_set_photo_license` | Set photo license (All Rights Reserved, CC, etc.) | Write |
| `flickr_set_photo_perms` | Set photo visibility and permissions | Write |
| `flickr_add_favorite` | Add a photo to your favorites (like) | Write |
| `flickr_remove_favorite` | Remove a photo from your favorites (unlike) | Write |

### Album Tools

| Tool | Description | Read/Write |
|------|-------------|------------|
| `flickr_list_albums` | List all albums | Read |
| `flickr_get_album_photos` | List photos in an album | Read |
| `flickr_create_album` | Create a new album | Write |
| `flickr_add_photo_to_album` | Add a photo to an album | Write |
| `flickr_remove_photo_from_album` | Remove a photo from an album | Write |
| `flickr_edit_album_meta` | Update album title and description | Write |

### Group Tools

| Tool | Description | Read/Write |
|------|-------------|------------|
| `flickr_list_my_groups` | List all groups you've joined | Read |
| `flickr_search_groups` | Search for groups by keyword | Read |
| `flickr_add_photo_to_group` | Submit a photo to a group pool | Write |
| `flickr_leave_group` | Leave a group | Delete |

### Contact Tools

| Tool | Description | Read/Write |
|------|-------------|------------|
| `flickr_follow_user` | Follow a user (add as contact) | Write |
| `flickr_unfollow_user` | Unfollow a user (remove contact) | Write |

All list/search tools return **thumbnail and medium image URLs** for AI-powered visual analysis.

## Prerequisites

- Node.js >= 18
- A Flickr account
- Flickr API key ([apply here](https://www.flickr.com/services/apps/create/))

## Setup

### 1. Clone and install

```bash
git clone https://github.com/chochinlu/flickr-mcp-server.git
cd flickr-mcp-server
npm install
```

### 2. Get your Flickr API key

1. Go to [Flickr App Garden](https://www.flickr.com/services/apps/create/)
2. Create a new app to get your **API Key** and **API Secret**
3. Create a `.env` file:

```bash
cp .env.example .env
```

4. Fill in `FLICKR_API_KEY` and `FLICKR_API_SECRET` in `.env`

### 3. Authenticate with OAuth

Run the interactive setup script:

```bash
npm run oauth-setup
```

This will:
1. Generate an authorization URL
2. Open Flickr in your browser to grant access
3. Ask you to enter the verification code
4. Save the OAuth tokens to `.env`

> Flickr OAuth tokens **never expire** -- you only need to do this once.

### 4. Build

```bash
npm run build
```

### 5. Configure your MCP client

#### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "flickr": {
      "command": "node",
      "args": ["/absolute/path/to/flickr-mcp-server/dist/index.js"]
    }
  }
}
```

#### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "flickr": {
      "command": "node",
      "args": ["/absolute/path/to/flickr-mcp-server/dist/index.js"]
    }
  }
}
```

## Usage Examples

Once connected, you can ask your AI assistant things like:

- "List all my Flickr albums"
- "Show me photos not in any album"
- "Search my photos tagged with `travel`"
- "Add tags `tokyo`, `japan`, `2024` to photo 12345678"
- "Create a new album called 'Tokyo Trip' with photo 12345678 as the cover"
- "Move these photos into the Tokyo Trip album"
- "List all groups I've joined"
- "Submit this photo to the Street Photography group"
- "Leave all inactive groups with less than 100 photos"
- "Like this photo and follow the photographer"
- "Add this photo to my favorites"

## Project Structure

```
src/
  index.ts              # MCP server entry point (stdio transport)
  config.ts             # Environment variable validation (Zod)
  flickr-client.ts      # Flickr API client with rate limiting
  tools/
    photos.ts           # Photo management tools (incl. favorites)
    albums.ts           # Album management tools
    groups.ts           # Group management tools
    contacts.ts         # Contact/follow tools
  auth/
    oauth-setup.ts      # One-time OAuth setup CLI
scripts/
  batch-set-license.ts  # Batch update all photos to a specified license
```

## API Rate Limits

- Flickr allows **3,600 requests/hour** (~1 req/sec)
- The client enforces a 1-second minimum interval between requests
- List endpoints return up to **500 items per page** with pagination support

## License

MIT

---

# Flickr MCP Server (正體中文)

一個 MCP (Model Context Protocol) 伺服器，讓 AI 助手能透過 Flickr API 管理你的相簿、標記照片、整理照片庫。

## 功能

**26 個工具**，涵蓋照片、相簿、群組與社交管理：

### 照片工具

| 工具 | 功能 | 讀/寫 |
|------|------|-------|
| `flickr_search_photos` | 依關鍵字、標籤、日期範圍搜尋照片 | 讀 |
| `flickr_get_photo_info` | 取得照片詳細資訊 | 讀 |
| `flickr_get_photo_sizes` | 取得照片各尺寸的圖片 URL | 讀 |
| `flickr_get_exif` | 取得照片的相機與 EXIF 資訊 | 讀 |
| `flickr_get_explore` | 取得 Flickr Explore 精選照片 | 讀 |
| `flickr_list_my_photos` | 列出自己的照片（含私人照片） | 讀 |
| `flickr_get_not_in_set` | 列出未歸入任何相簿的照片 | 讀 |
| `flickr_set_photo_tags` | 設定照片標籤（覆蓋原有標籤） | 寫 |
| `flickr_add_photo_tags` | 新增標籤（不覆蓋） | 寫 |
| `flickr_set_photo_meta` | 更新照片標題與描述 | 寫 |
| `flickr_set_photo_license` | 設定照片授權條款（All Rights Reserved、CC 等） | 寫 |
| `flickr_set_photo_perms` | 設定照片可見性與權限（公開/私人） | 寫 |
| `flickr_add_favorite` | 將照片加入最愛（按讚） | 寫 |
| `flickr_remove_favorite` | 從最愛移除照片（取消按讚） | 寫 |

### 相簿工具

| 工具 | 功能 | 讀/寫 |
|------|------|-------|
| `flickr_list_albums` | 列出所有相簿 | 讀 |
| `flickr_get_album_photos` | 列出相簿內照片 | 讀 |
| `flickr_create_album` | 建立新相簿 | 寫 |
| `flickr_add_photo_to_album` | 將照片加入相簿 | 寫 |
| `flickr_remove_photo_from_album` | 從相簿移除照片 | 寫 |
| `flickr_edit_album_meta` | 修改相簿標題與描述 | 寫 |

### 群組工具

| 工具 | 功能 | 讀/寫 |
|------|------|-------|
| `flickr_list_my_groups` | 列出已加入的所有群組 | 讀 |
| `flickr_search_groups` | 依關鍵字搜尋群組 | 讀 |
| `flickr_add_photo_to_group` | 將照片投稿到群組 | 寫 |
| `flickr_leave_group` | 退出群組 | 刪除 |

### 聯絡人工具

| 工具 | 功能 | 讀/寫 |
|------|------|-------|
| `flickr_follow_user` | 追蹤使用者（加入聯絡人） | 寫 |
| `flickr_unfollow_user` | 取消追蹤（移除聯絡人） | 寫 |

所有列表/搜尋工具都會回傳**縮圖與中等尺寸圖片 URL**，方便 AI 進行視覺分析。

## 前置需求

- Node.js >= 18
- Flickr 帳號
- Flickr API 金鑰（[在此申請](https://www.flickr.com/services/apps/create/)）

## 安裝設定

### 1. 下載並安裝

```bash
git clone https://github.com/chochinlu/flickr-mcp-server.git
cd flickr-mcp-server
npm install
```

### 2. 取得 Flickr API 金鑰

1. 前往 [Flickr App Garden](https://www.flickr.com/services/apps/create/) 建立應用程式
2. 取得 **API Key** 與 **API Secret**
3. 建立 `.env` 檔案：

```bash
cp .env.example .env
```

4. 在 `.env` 中填入 `FLICKR_API_KEY` 和 `FLICKR_API_SECRET`

### 3. OAuth 認證

執行互動式設定腳本：

```bash
npm run oauth-setup
```

腳本會引導你：
1. 產生授權 URL
2. 在瀏覽器中開啟 Flickr 進行授權
3. 輸入頁面上顯示的驗證碼
4. 自動將 OAuth token 存入 `.env`

> Flickr 的 OAuth token **永不過期**，只需設定一次。

### 4. 編譯

```bash
npm run build
```

### 5. 設定 MCP 用戶端

#### Claude Code

在專案的 `.mcp.json` 中加入：

```json
{
  "mcpServers": {
    "flickr": {
      "command": "node",
      "args": ["/absolute/path/to/flickr-mcp-server/dist/index.js"]
    }
  }
}
```

#### Claude Desktop

在 `claude_desktop_config.json` 中加入：

```json
{
  "mcpServers": {
    "flickr": {
      "command": "node",
      "args": ["/absolute/path/to/flickr-mcp-server/dist/index.js"]
    }
  }
}
```

## 使用範例

連線後，你可以用自然語言請 AI 助手幫你：

- 「列出我所有的 Flickr 相簿」
- 「找出沒有歸入任何相簿的照片」
- 「搜尋標記了 `travel` 的照片」
- 「幫照片 12345678 加上 `tokyo`、`japan`、`2024` 標籤」
- 「建立一個叫『東京之旅』的新相簿，用照片 12345678 當封面」
- 「把這些照片移到東京之旅相簿」
- 「列出我加入的所有群組」
- 「把這張照片投稿到街拍群組」
- 「退出所有照片數不到 100 的不活躍群組」
- 「幫我對這張照片按讚，然後追蹤這個攝影師」
- 「把這張照片加入我的最愛」

## API 限制

- Flickr 允許每小時 **3,600 次請求**（約每秒 1 次）
- Client 內建 1 秒最小間隔的速率限制
- 列表類 API 每頁最多 **500 筆**，支援分頁
