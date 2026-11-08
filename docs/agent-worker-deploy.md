# EXP BANK AI Agent Worker 部署说明

本目录提供 EXP BANK 在线任务规划 Agent 的 Cloudflare Worker。静态 PWA 不直接连接 DeepSeek；DeepSeek API Key 只保存在 Worker Secret。

## 1. 需要准备

- 一个 Cloudflare 账号。
- 一个 DeepSeek API Key。
- 一个随机生成的访问令牌（建议 32 字节以上随机值）。
- Node.js 与 Wrangler CLI。

## 2. 配置 Worker

在本目录的 `wrangler.toml` 中，把 `ALLOWED_ORIGINS` 改成 EXP BANK 实际部署站点的 **Origin**，只填写协议和域名，不带路径。例如 GitHub Pages 常见形式是 `https://用户名.github.io`；如果使用自定义域名，则填写自定义域名的 Origin。不要照抄示例域名。

安装并登录 Wrangler：

```bash
npm install -g wrangler
wrangler login
```

在 `worker/` 目录执行以下命令，把密钥写入 Cloudflare，不要写入仓库：

```bash
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put AGENT_ACCESS_TOKEN
```

其中：
- `DEEPSEEK_API_KEY`：DeepSeek 控制台生成的 API Key。
- `AGENT_ACCESS_TOKEN`：你自己生成的随机访问令牌。稍后还要填入 EXP BANK 的 Agent 设置。

部署：

```bash
wrangler deploy
```

部署成功后会得到类似 `https://exp-bank-agent.<你的子域>.workers.dev` 的地址。

## 3. 配置 EXP BANK

打开 EXP BANK → AI HELP 或新建任务 → **Agent 设置**：

1. Agent API 地址填写完整 Worker 地址，并以 `/api/agent/plan` 结尾。
2. 访问令牌填写与 Worker Secret `AGENT_ACCESS_TOKEN` 完全相同的值。
3. 保存。地址和访问令牌只保存在本机独立的 localStorage 键 `exp-bank-agent-config-v1`，不进入 EXP BANK 主数据、备份码或 GitHub 仓库。
4. 点击“在线智能规划”测试。即使在线服务超时或不可用，输入也会保留，并自动回退现有本地规则助手。

## 4. 安全边界

- DeepSeek API Key 仅存在 Cloudflare Worker Secret，绝不放入 `index.html`、`agent-client.js`、GitHub 仓库或浏览器存储。
- 前端只发送用户主动提交的描述和任务集名称；不会默认上传完整任务列表、EXP 余额、奖励、照片、财务流水或历史账本。
- Worker 通过 Origin 白名单、Bearer 访问令牌、请求体限制和每个 Worker 实例的基础频率限制保护接口。
- 内存频率限制属于 best-effort，不是跨实例的全局配额。若公开给更多用户，应在 Cloudflare 控制台另配 Rate Limiting 规则。
- 模型只生成草稿；本地再次校验后，用户编辑并确认才写入现有任务系统。

## 5. 常见问题

- **403 Origin not allowed**：检查 `ALLOWED_ORIGINS` 是否与浏览器地址栏的 Origin 完全一致（包含 https，不包含路径）。
- **401 Invalid access token**：检查 EXP BANK 中的访问令牌是否与 `AGENT_ACCESS_TOKEN` Secret 完全一致。
- **503 Agent secrets are not configured**：确认两个 Secret 均已设置并重新部署。
- **502 Model service**：检查 DeepSeek API Key、账户余额、模型可用性或稍后重试。
- **在线规划失败**：不会自动创建任何任务；现有本地规则助手仍可离线使用。

## 6. DeepSeek API 约定

Worker 使用 `POST https://api.deepseek.com/chat/completions`、`response_format: { "type": "json_object" }`，并显式要求 JSON 输出。结构化 JSON 只保证格式，不保证语义正确；因此返回内容仍经过 Worker 字段归一化、前端 `ExpTaskAssistant` 校验与人工确认。
