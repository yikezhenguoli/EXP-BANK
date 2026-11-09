# EXP BANK AI Agent Worker 部署说明

AI Agent 必须作为独立 Cloudflare Worker 部署，与 EXP BANK 静态 PWA / 当前网站部署完全分离。不要把 Worker 代码部署到 Pages 静态站点，也不要把静态站点绑定到 Agent Worker。

## 1. 部署目标

- PWA 网站：保持现有 GitHub Pages / 当前网站部署，不改域名、不改发布目录。
- AI 后端：独立 Worker，名称为 `exp-bank-agent`。
- 默认 Worker 地址：`https://exp-bank-agent.yikezhenguoli.workers.dev`（以 Cloudflare 实际分配的子域为准）。
- API 路由：`POST /api/agent/plan`。

仓库中的 `worker/wrangler.toml` 已将 `main` 指向 `index.mjs`，因此必须使用该配置部署，不能从仓库根目录直接运行不带配置的 `wrangler deploy`。

## 2. 首次部署（推荐：本地 Wrangler）

在仓库根目录执行：

```bash
npm exec --yes wrangler -- --version
npm exec --yes wrangler -- login
npm exec --yes wrangler -- deploy --config worker/wrangler.toml
```

部署成功后，Cloudflare 应显示独立 Worker `exp-bank-agent`。确认其部署版本来自本仓库的 `worker/index.mjs`，不要将现有承载 EXP BANK 网页的 `exp-bank-ai` 项目改名、删除或覆盖。

## 3. 配置变量和密钥

在 Cloudflare Dashboard 打开 **Workers 和 Pages → exp-bank-agent → 设置 → 变量和机密**，添加：

| 类型 | 名称 | 值 |
|---|---|---|
| Text | `ALLOWED_ORIGINS` | `https://yikezhenguoli.github.io` |
| Secret | `DEEPSEEK_API_KEY` | DeepSeek 控制台生成的 API Key |
| Secret | `AGENT_ACCESS_TOKEN` | 随机生成的长令牌（至少 16 字符，建议 32 字节随机值） |

Origin 只填写协议和域名，不带路径，也不要在末尾添加斜杠。密钥只保存在 Worker Secret，绝不提交 GitHub 或填入 PWA。

如果你的 EXP BANK 实际使用自定义域名，将其 Origin（协议+域名，不带路径）追加到 `ALLOWED_ORIGINS`，多个 Origin 用逗号分隔。

添加或修改变量 / Secret 后，确认新配置已应用于最新 Worker 部署。

## 4. 验收独立 Worker

1. 在 Cloudflare Worker 概览确认名称为 `exp-bank-agent`，而不是承载网页的 `exp-bank-ai`。
2. 直接打开 `https://exp-bank-agent.<你的子域>.workers.dev/api/agent/plan`。浏览器 GET 请求应返回 JSON 的 `Method not allowed`（带合法 Origin 的请求）或相应路由错误；**不应返回 EXP BANK HTML 首页**。
3. 通过 PWA 发起在线规划时，浏览器先发送 OPTIONS 预检，再发送带 Bearer Token 的 POST。
4. 用真实任务描述验证 DeepSeek 返回结构化 JSON。Worker 返回 200、模型字段和 tasks 数组后，客户端才显示在线草稿。
5. 人工检查草稿并点击确认后才创建任务。仅仅部署成功、GET 能访问或本地规则助手成功都不算在线 Agent 验收通过。

## 5. 配置 EXP BANK 客户端

打开 EXP BANK → AI HELP → Agent 设置：

- Worker API 地址填写 `https://exp-bank-agent.<你的子域>.workers.dev`；客户端会自动补全 `/api/agent/plan`。
- Worker 访问令牌填写与 Secret `AGENT_ACCESS_TOKEN` 完全相同的值。
- 保存配置。

客户端本版会将旧的 `exp-bank-ai.yikezhenguoli.workers.dev` 地址自动迁移到 `exp-bank-agent.yikezhenguoli.workers.dev`，只修改独立配置键 `exp-bank-agent-config-v1` 中的 endpoint，并保留原访问令牌。不会清理或重写任何任务、奖励、图片、兑换记录或其他 localStorage 数据。如果 Cloudflare 实际分配的子域不同，请在设置中手动填入真实域名。

## 6. 可选：GitHub Actions 手动部署

仓库提供手动工作流 `.github/workflows/deploy-agent-worker.yml`。如需从 GitHub Actions 部署，在仓库 Settings → Secrets and variables → Actions 添加：

- `CLOUDFLARE_API_TOKEN`：具有该账号 Workers Scripts 编辑权限的 API Token。
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare Account ID。

然后在 Actions 页面手动运行 **Deploy AI Agent Worker**。该工作流只部署 `worker/wrangler.toml` 指定的独立 Agent Worker，不会部署或覆盖 PWA。首次部署前仍须在 Cloudflare 配置上述两个 Secret 和 Origin 变量。

## 7. 安全与数据边界

- DeepSeek API Key 只存在 Cloudflare Worker Secret。
- 前端只发送用户主动提交的目标描述和必要任务集名称；不会默认上传完整任务账本、EXP 余额、奖励、照片、财务流水或历史账本。
- Worker 使用 Origin 白名单、Bearer 访问令牌、请求体限制和基础频率限制保护接口。
- 模型只生成草稿；本地再次校验后，用户编辑并确认才写入现有任务系统。
- 独立 Worker 部署不涉及 PWA 主数据结构，不清空 localStorage，也不要求重新安装应用。

## 8. 故障定位

- `Failed to fetch`：先确认客户端 endpoint 指向独立 Agent Worker，而不是当前网页域名；再检查网络、CORS 和预检请求。
- 403：检查 `ALLOWED_ORIGINS` 与浏览器 Origin 完全一致。
- 401：检查本机访问令牌与 `AGENT_ACCESS_TOKEN` Secret 是否一致。
- 503：检查 Worker 两个 Secret 是否都已配置并应用到当前部署。
- 502：检查 DeepSeek API Key、账户余额、模型可用性或上游服务。
- 若 GET API 地址返回完整 EXP BANK HTML，说明请求打到了静态网页部署，而不是独立 Agent Worker。
