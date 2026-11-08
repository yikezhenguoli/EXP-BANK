# AI HELP / Agent 架构状态

> 状态快照：EXP BANK v1.15.0 开发分支。在线 Agent 前端与 Worker 代码已纳入本分支；Worker 仍需部署并配置服务端密钥后，才能完成真实在线调用验收。

## 1. 现有本地规则助手

`task-assistant.js` 仍是离线任务草稿解析与校验核心，负责：
- 逐项抽取任务名称、EXP、周期、跨度、次数、优先级、任务集和 LifeType。
- 多任务草稿、字段校验、缺失值提示、同名任务默认跳过。
- 用户补充修正、人工编辑和最终确认。
- 统一复用现有任务创建与保存入口；确认前不改变账本。

本地规则助手保留为在线 Agent 的回退路径，不会因接入模型而移除。

## 2. v1.15.0 新增在线 Agent

在线任务规划通过 `agent-client.js` 调用独立 Cloudflare Worker（`worker/index.mjs`），Worker 再调用 DeepSeek Chat Completions API。

数据流：
1. 用户主动提交自然语言目标。
2. 前端只发送该段文本与必要的任务集名称。
3. Worker 验证 Origin、Bearer 访问令牌、请求体大小和基础频率限制。
4. Worker 使用服务端 Secret 调用 DeepSeek，并要求 JSON Output。
5. Worker 归一化任务字段，返回任务草稿与澄清项。
6. 前端把结果转换成现有 `ExpTaskAssistant` 可处理的结构化草稿。
7. 本地字段校验、重复检测、用户编辑和人工确认继续生效。
8. 用户确认后，复用现有 `applyTaskPlan` 保存链路。

在线调用失败时保留输入，并自动回退本地规则解析；若本地解析也无法识别，则提示错误，不创建任务。

## 3. 数据与权限边界

- 模型只生成任务草稿，不直接读写 localStorage、不结算 EXP、不删除任务、不兑换奖励。
- 默认只发送用户主动输入的目标描述和任务集名称；不上传完整任务账本、EXP 余额、奖励、照片、财务流水或历史记录。
- DeepSeek API Key 只配置在 Cloudflare Worker Secret。
- Worker URL 和访问令牌保存在本机独立 localStorage 键 `exp-bank-agent-config-v1`，不进入 EXP BANK 主数据或备份码。
- 在线结果仍可能误解用户意图；JSON 格式正确不代表语义正确，必须经过本地校验和人工确认。
- Worker 内存频率限制为 best-effort；如开放给更多用户，应在 Cloudflare 配置正式 Rate Limiting。

## 4. 部署

按 [Agent Worker 部署说明](agent-worker-deploy.md) 配置：
- `DEEPSEEK_API_KEY` Secret。
- `AGENT_ACCESS_TOKEN` Secret。
- `ALLOWED_ORIGINS` 精确来源白名单。
- `DEEPSEEK_MODEL` 默认 `deepseek-flash`。

PWA 的 AI HELP 与新建任务窗口均可进入 Agent 设置，填写 Worker API 地址和访问令牌。

## 5. 测试与验收

- `tests/agent-client.smoke.mjs`：本机配置、HTTPS 地址规范化、请求体与错误提示。
- `tests/agent-worker.smoke.mjs`：Origin、Bearer 鉴权、JSON 输出、字段归一化与缺失密钥。
- `tests/assistant.smoke.mjs`：现有本地解析与多任务草稿回归。
- `tests/assistant-browser.smoke.mjs`：浏览器端草稿编辑、回退入口和确认保存。

在线验收必须在 Worker 实际部署后进行，记录字段级准确率、整组任务正确率、需澄清比例、用户修改次数和端到端成功率；没有测试数据前不宣称准确率或效率提升。

## 6. 官方 API 参考

Worker 使用 DeepSeek 官方 Chat Completions 端点与 JSON Output 模式。模型名可通过 `DEEPSEEK_MODEL` 覆盖，默认使用 `deepseek-flash`。具体部署与密钥配置见 Worker 部署说明。
