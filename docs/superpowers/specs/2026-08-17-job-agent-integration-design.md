# InterviewGuide 融合 BossHunter 求职投递 Agent 设计文档

日期：2026-08-17
状态：已确认

## 目标

以 InterviewGuide 作为统一产品入口，把 BossHunter 作为内置“求职投递”模块接入。用户可以在同一个 React 平台中：

1. 使用 InterviewGuide 原有能力：简历管理、模拟面试、语音面试、知识库、面试日程。
2. 使用 BossHunter 能力：岗位采集、AI 评分、人工确认、招呼语发送、HR 回复监测、定制简历。
3. 从 InterviewGuide 简历库手动选择一份简历同步给投递 Agent，两处共享同一份简历来源。

本次按本地单机实现，但 Agent 的启动、配置、状态全部封装为后端接口，便于以后扩展为多实例。

## 架构

```
React 前端
  └── /api/job-agent/*（只与 InterviewGuide 后端通信）
        └── Spring Boot jobagent 模块
              ├── JobAgentProcessManager（懒启动/停止 BossHunter 子进程）
              ├── JobAgentClient（HTTP 代理 BossHunter /api/*）
              └── ResumeSyncService（InterviewGuide 简历 -> Markdown -> BossHunter 上传）
                    └── BossHunter Web Server（127.0.0.1:8686，job-agent/ 内）
```

- BossHunter 源码放入 `job-agent/`，保留 CLI、测试、配置模板。
- Spring Boot 首次收到 `/api/job-agent/*` 请求时启动 Agent；应用退出时关闭子进程。
- 前端不直接访问 `8686` 端口。

## 仓库布局

```text
interview-guide-master/
├── app/                                 # 原有 Spring Boot 后端
│   └── src/main/java/interview/guide/modules/jobagent/
│       ├── JobAgentProperties.java      # app.job-agent.* 配置
│       ├── JobAgentProcessManager.java  # 子进程生命周期
│       ├── JobAgentClient.java          # BossHunter API 代理
│       ├── JobAgentController.java      # /api/job-agent/*
│       ├── ResumeSyncService.java       # 简历同步
│       └── model/                       # 请求/响应 DTO
├── frontend/src/
│   ├── api/jobAgent.ts                  # 前端 API 客户端
│   ├── pages/JobAgentPage.tsx           # 投递工作台
│   ├── pages/JobAgentJobsPage.tsx       # 岗位池
│   ├── pages/JobAgentMonitorPage.tsx    # 监测执行
│   ├── pages/JobAgentConfigPage.tsx     # 投递配置
│   └── components/jobagent/             # 工作台子组件
├── job-agent/                           # BossHunter 源码
│   ├── src/bosshunter/
│   ├── tests/
│   ├── config.example.yaml
│   └── resume.example.md
└── docs/superpowers/plans/
```

## BossHunter 启动方式

默认命令：

```text
python -m bosshunter.main --config config.yaml web --no-open --port 8686
```

工作目录为 `job-agent/`，环境变量 `PYTHONPATH=src`。`config.yaml` 不存在时使用 BossHunter 默认配置启动。

`application.yml` 新增配置段：

```yaml
app:
  job-agent:
    enabled: ${APP_JOB_AGENT_ENABLED:true}
    host: 127.0.0.1
    port: ${APP_JOB_AGENT_PORT:8686}
    base-dir: ${APP_JOB_AGENT_BASE_DIR:${user.dir}/job-agent}
    python-path: ${APP_JOB_AGENT_PYTHON:python}
    health-check-interval: 2s
    health-check-timeout: 3s
    startup-timeout: 30s
```

## 后端接口

所有接口统一返回 `Result<T>`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/job-agent/status` | Agent 进程状态、健康状态、启动日志 |
| POST | `/api/job-agent/start` | 手动启动 Agent |
| POST | `/api/job-agent/stop` | 手动停止 Agent |
| GET | `/api/job-agent/workbench` | 工作台聚合数据（漏斗、待确认、待发送、任务） |
| GET | `/api/job-agent/funnel` | 漏斗统计 |
| GET | `/api/job-agent/stats` | 状态统计 |
| GET | `/api/job-agent/activity` | 每日活动 |
| GET | `/api/job-agent/jobs` | 岗位池 |
| GET | `/api/job-agent/history` | 历史与监测记录 |
| GET | `/api/job-agent/workbench/preflight` | 启动预检 |
| POST | `/api/job-agent/workbench/task` | 启动任务（full/collect/monitor/rescore） |
| POST | `/api/job-agent/workbench/task/{id}/stop` | 停止任务 |
| POST | `/api/job-agent/workbench/deliver` | 确认投递岗位 |
| POST | `/api/job-agent/workbench/reject` | 放弃岗位 |
| GET | `/api/job-agent/config` | 读取配置（脱敏） |
| POST | `/api/job-agent/config` | 保存配置 |
| GET | `/api/job-agent/config/schema` | 配置表单 schema |
| GET | `/api/job-agent/config/cities` | 城市列表 |
| POST | `/api/job-agent/resume/sync` | 从 InterviewGuide 简历库同步简历 |
| GET | `/api/job-agent/resume` | 当前 Agent 使用的简历 |
| GET | `/api/job-agent/jobs/{id}/resume/download` | 下载定制简历 |

## 简历同步

请求体：`{ "resumeId": 1 }`。

流程：

1. 调用现有 `ResumeHistoryService.getResumeDetail(resumeId)` 获取 `resumeText`。
2. 校验 `resumeText` 非空。
3. 生成临时 Markdown 文件，文件名使用简历原始文件名 + `.md`。
4. 通过 `JobAgentClient` 调用 BossHunter `POST /api/resume/upload`。
5. 返回 Agent 保存后的文件名和大小。

同步是手动触发的，不覆盖 InterviewGuide 简历库数据。

## 前端页面

导航新增“求职投递”分组：

| 路径 | 页面 | 内容 |
| --- | --- | --- |
| `/job-agent` | 投递工作台 | Agent 状态、任务卡片、日志、预检、待确认、待发送、简历同步 |
| `/job-agent/jobs` | 岗位池 | 岗位表格、AI 分数、状态、详情 |
| `/job-agent/monitor` | 监测执行 | HR 回复建议、简历请求、跟进记录 |
| `/job-agent/config` | 投递配置 | 按 schema 渲染的表单 |

工作台每 5 秒轮询 `/api/job-agent/status` 和 `/api/job-agent/workbench`。

## 错误处理

- Agent 启动失败：`/status` 返回 `state=ERROR`、错误摘要、最近日志。
- Agent 不可达：`JobAgentClient` 抛出 `BusinessException(ErrorCode.JOB_AGENT_UNAVAILABLE)`。
- 预检失败：前端阻止任务启动，逐项展示问题。
- 应用退出：`@PreDestroy` 关闭子进程。
- Agent 异常退出：健康轮询检测到后标记 `STOPPED`，前端提供重新启动按钮。

## 测试

- Java：`JobAgentPropertiesTest`、`JobAgentClientTest`、`ResumeSyncServiceTest`、`JobAgentControllerTest`。
- Python：保留 `job-agent/tests`，运行 `pytest`。
- 前端：`pnpm run build`。
- 集成：启动后端，调用 `/api/job-agent/status` 确认自动拉起 `8686`。
