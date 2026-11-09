# EXP BANK

本地优先的个人成长管理 PWA。当前版本 **v1.15.5 — Independent AI Agent Worker**。

## 本版更新

- **奖励排序可靠性**：保留 v1.15.3 的意图队列和失败回滚；上移/下移、奖励集切换、跨组移动控件扩大至至少 44px 触控高度，并增加无障碍标签和保存状态反馈。拖拽也复用同一串行持久化路径。
- **AI Agent MVP**：新增 DeepSeek 在线任务规划 Worker；自然语言输入生成结构化任务草稿，经现有任务助手校验、人工编辑和确认后才创建。在线调用失败时自动回退本地规则助手。
- **安全边界**：DeepSeek API Key 只保存在 Cloudflare Worker Secret；PWA 不直接持有模型密钥。Worker 地址与访问令牌保存在本机独立配置，不进入主数据备份。
- **数据兼容**：奖励、奖励集、兑换记录继续使用现有数据结构，不要求清空 localStorage 或重新导入数据。

## 启动与部署

无需构建。保留整个目录结构，在根目录运行 `python3 -m http.server 8080`，打开 `http://localhost:8080`。正式使用应部署到 HTTPS；GitHub Pages 从仓库根目录发布即可。以下资源必须一起部署：`index.html`、`support.js`、`money.js`、`progression.js`、`life-architecture.js`、`task-assistant.js`、`reward-order.js`、`agent-client.js` 与 `vendor/`。单独替换 `index.html` 不足以完成升级。

顶部“↻ 更新”会安装完整版本资源；个人账本和奖励图片仍保存在本机。更新前可使用“备份”导出完整 TXT。

## AI Agent 部署

在线 Agent 必须独立部署名为 `exp-bank-agent` 的 Cloudflare Worker（与承载网页的 `exp-bank-ai` 分离），部署时显式使用 `worker/wrangler.toml`，并配置 `DEEPSEEK_API_KEY`、`AGENT_ACCESS_TOKEN` 与 `ALLOWED_ORIGINS`。客户端会自动把已保存的旧 `exp-bank-ai` Agent 地址迁移到独立 Worker 地址并保留访问令牌；详细步骤见 [AI Agent Worker 部署说明](docs/agent-worker-deploy.md)。DeepSeek API Key 不要放入前端、GitHub 仓库或 EXP BANK 设置面板。

AI Agent 只负责生成任务草稿；本地校验与人工确认后才写入任务系统。它只接收用户主动提交的目标描述和必要任务集名称，不默认上传完整任务账本、EXP 余额、奖励或财务记录。本地规则助手继续支持离线使用。

## 验证

使用 Node 18 或更高版本：

```bash
node tests/money-state.smoke.mjs
node tests/component.smoke.mjs
node tests/sw-update.smoke.mjs
node tests/assistant.smoke.mjs
node tests/life.smoke.mjs
node tests/reward-order.smoke.mjs
node tests/agent-client.smoke.mjs
node tests/agent-worker.smoke.mjs
```

浏览器脚本需要 Playwright 与 Chromium；`node tests/reward-order.browser.smoke.mjs` 使用触屏模拟在 360px、390px 和 768px 视口验收奖励集排序、组内排序、跨组移动、未分类往返、商城展示及刷新恢复。CI 会自动安装 Chromium 并运行该测试。其他已配置 Playwright 的环境也可运行 `node tests/browser.smoke.mjs`、`node tests/assistant-browser.smoke.mjs` 和 `node tests/life-browser.smoke.mjs`。脚本使用合成数据，不读取日常账本。

## 数据与能力边界

EXP BANK 是本地优先的 PWA。任务、EXP、奖励、奖励集、兑换历史和个人记录主要保存在浏览器本地；公开仓库不包含用户个人账本。当前在线 Agent 是独立可选服务，不影响本地任务系统和离线规则助手。

奖励集顺序由 `rewardCategories` 数组保存，奖励在各组中的顺序由 `rewards` 数组的相对顺序保存。排序只调整顺序和奖励归属，不修改奖励成本、图片、兑换记录或 EXP。
