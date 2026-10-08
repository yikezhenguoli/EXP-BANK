# EXP BANK

本地优先的 EXP 积分与生活记录 PWA。当前版本 **v1.12.0 — Life Architecture Update**：以 CORE、GROWTH、MAINTENANCE、EXPLORATION 四层组织任务，支持独立排序与完成统计。WAR MODE 聚焦 CORE，作为人生最低运行模式。旧任务、EXP、周期和历史保留；此前的奖励、目标资金联动与 OPEX 类别排序继续保留。

## 启动与部署

无需构建。保留整个目录结构，在根目录运行 `python3 -m http.server 8080`，打开 `http://localhost:8080`。正式使用应部署到 HTTPS；GitHub Pages 从仓库根目录发布即可。`money.js`、`progression.js`、`life-architecture.js`、`task-assistant.js` 与 `vendor/` 必须一起部署，单独替换 `index.html` 不足以完成升级。

现有 PWA 可使用顶部“↻ 更新”。完整资源就绪后才切换版本，账本和照片保留。更新前可使用“备份”导出完整 TXT；个人账本存在本机，不在此代码仓库中。

[完整版本说明](docs/release-v1.12.0.md)列出交互、数据迁移、涉及文件和验证范围。[AI HELP 的进一步智能化方案](docs/ai-help-next.md)说明本地能力与后端大模型方案的边界。

## 验证

使用 Node 18 或更高版本：

```bash
node tests/money-state.smoke.mjs
node tests/component.smoke.mjs
node tests/sw-update.smoke.mjs
node tests/assistant.smoke.mjs
node tests/life.smoke.mjs
```

浏览器脚本需要 Playwright 与 Chromium；已配置 Playwright 的环境可运行 `node tests/browser.smoke.mjs` 、`node tests/assistant-browser.smoke.mjs` 和 `node tests/life-browser.smoke.mjs`。需要指定已有浏览器时设置 `EXP_BANK_CHROME` 为其绝对路径。脚本使用临时本地服务与合成数据，不读取日常账本。

人生分类只负责组织生活结构，不再叠加第二套任务积分规则：CORE / GROWTH / MAINTENANCE / EXPLORATION 都按任务自身 EXP 正常结算。本周完成率从任务迁移或创建日起计算，统计截至今天的每日／每周目标。AI 目前为本地解析与分类推荐，可在预览中纠正，尚未接入云端模型。

`support.js` 和 `image-slot.js` 为既有运行时，本次不修改。React 与 ReactDOM 18.3.1 的本地分发及许可证放在 `vendor/`。
