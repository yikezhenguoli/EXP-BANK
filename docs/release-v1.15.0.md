# EXP BANK v1.15.0

AI Agent & Reward Sorting · 从 v1.14.0 升级。

本版包含两个独立功能增量：Shopping Mall 奖励排序重构，以及可选的 DeepSeek 在线任务规划 Agent。产品仍然是本地优先 PWA；不要求清空 localStorage，不重写奖励或任务数据结构。

## 1. Shopping Mall 奖励排序

排序面板现在提供两个视图：

- **奖励**：按奖励集分组展示，包含空奖励集和“未分类”投放区；拖动奖励可调整组内顺序，也可拖到其他奖励集标题或未分类区完成移动。
- **奖励集**：独立拖动调整奖励集在 Shopping Mall 的显示顺序。

实现细节：
- 奖励集顺序使用现有 `rewardCategories` 数组顺序。
- 奖励在各组中的相对顺序使用现有 `rewards` 数组顺序。
- 拖动过程中只更新临时草稿；松手时统一提交一次，避免 pointermove 期间重复持久化造成列表跳动。
- 跨组移动只修改奖励的 `categoryId` 与数组位置；成本、风险规则、图片、兑换历史、冷却和 EXP 均保留。
- 删除奖励集仍按既有规则把奖励移至未分类，不删除奖励资产。

## 2. 在线 AI Agent MVP

新增 Cloudflare Worker 网关，调用 DeepSeek Chat Completions API 的 JSON Output 模式。默认模型为 `deepseek-flash`，可通过 Worker 环境变量覆盖。

工作流：
1. 用户主动输入目标描述。
2. 前端只发送该段文本和必要的任务集名称。
3. Cloudflare Worker 验证 Origin、Bearer 访问令牌、请求大小与基础频率限制。
4. Worker 使用服务器端 Secret 调用 DeepSeek，返回结构化任务建议。
5. 前端将结果适配为现有 `ExpTaskAssistant` 草稿格式。
6. 现有本地校验、重复检测、字段修正与人工确认继续生效。
7. 用户确认后复用现有任务创建与保存链路。

在线服务失败时保留输入，并自动回退到本地规则解析；若本地解析也无法识别，则提示错误，不创建任务。

### AI 权限边界

- 模型不直接读写 localStorage，不结算 EXP，不删除或覆盖任务，不执行奖励兑换。
- 不默认上传完整任务列表、EXP 余额、奖励、照片、财务流水或历史账本。
- DeepSeek API Key 仅存在 Worker Secret。
- Worker 访问令牌与 URL 保存在本机独立 localStorage 键 `exp-bank-agent-config-v1`，不进入主数据备份码。
- 内存频率限制为 best-effort；公开服务需在 Cloudflare 另配 Rate Limiting 规则。

## 3. 新增文件

| 文件 | 职责 |
| --- | --- |
| `reward-order.js` | 奖励与奖励集排序纯函数，支持跨组移动 |
| `agent-client.js` | 本机 Worker 配置、请求封装、超时与错误提示 |
| `worker/index.mjs` | Cloudflare Worker、鉴权、CORS、限流、DeepSeek 调用与响应归一化 |
| `worker/wrangler.toml` | Worker 部署配置 |
| `docs/agent-worker-deploy.md` | Worker 与前端本机配置步骤 |

## 4. 修改文件

- `index.html`：在线 Agent 入口、Agent 设置、草稿来源与澄清提示；奖励 / 奖励集双视图排序与拖动草稿。
- `sw.js`：版本 v1.15.0、缓存构建标识更新、纳入两个新增前端模块。
- `README.md`：更新部署、功能和验证说明。
- `tests/`：增加排序、Agent Client、Worker 测试；更新组件与 Service Worker 回归。

## 5. 测试

新增：
- `node tests/reward-order.smoke.mjs`
- `node tests/agent-client.smoke.mjs`
- `node tests/agent-worker.smoke.mjs`

并更新：
- `node tests/component.smoke.mjs`
- `node tests/sw-update.smoke.mjs`
- `node tests/assistant-browser.smoke.mjs`

本次代码变更不包含真实 DeepSeek API Key，也未代替用户部署 Cloudflare Worker。在线调用需完成独立 Worker 部署后再验收；本地规则助手与奖励排序不依赖 Worker。
