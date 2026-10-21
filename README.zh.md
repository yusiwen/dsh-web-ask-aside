# dsh-web-ask-aside

在阅读回答时，针对看不懂的一段话，在右侧分栏的派生会话中单独提问，不污染当前会话。

在主对话里选中一段文字，点击 **分栏提问**，右侧栏会打开一个由 fork 得到的独立会话。
派生会话继承源会话的历史，所以模型能看到产生这段话的上下文；父会话不会新增任何事件，
它的上下文和 KV（Key-Value）缓存都不受影响。

[English](README.md) | 中文

## 行为

- 只有主 Chat 正文里的非空选区才会触发。composer、左侧栏、右侧栏内部的选区不会触发。
- 选区所在轮次已结束时，fork 切在该轮次的 `turn/end`；如果选区来自还在流式输出的轮次，
  则退到最近完成轮次，并把可见文本引用进草稿。
- 右侧栏在 pane 预算和宽度允许时新开一个 docked pane；否则在当前 pane 里新开 tab。
- composer 预填：

  ```text
  关于这段内容：

  > 选中的文字
  ```

  用户补上问题再发送；在发送前不会产生任何模型请求。
- tab 标题会在 Host 产生派生会话标题后跟随更新。

## 安装

这是 profile bundle，用插件管理器或 CLI 安装：

```bash
dsh plugin --profile web add dsh-web-ask-aside
```

命令会记录依赖并把包加入 `dsh.profile.bundles`。profile watcher 会就地重组 Host
rows；刷新页面后加载新的 Client 模块。

从本仓库开发时：

```bash
pnpm install
pnpm run build
dsh plugin --profile web add link:"$PWD"
```

## 语义

旁问是真正的 fork，不是一次性浮层：

- 它是持久 Session，会出现在同一 Workspace 的会话列表里。
- 它会把继承的事件前缀复制进自己的会话日志和后续请求。
- 关闭 tab 不会删除或归档 Session；不再需要时请在会话列表里归档。
- 父会话不会被修改：没有分支、没有隐藏轮次、没有上下文注入。
- 派生会话拥有和普通会话一样的工具与权限，不是只读问答。

## 已知限制

- fork 无法包含尚未 durable 的流式输出片段；来自进行中回答的选区会以引用文本进入草稿。
- 右侧栏最多两个 docked pane；第三次旁问会落在当前 pane 的新 tab 里。
- 不读取 Trajectory 视图的选区；此时退到最近完成轮次。
- tab 内的会话使用共享的 embedded Conversation Factory，因此没有主 Header 和内容宽度控制。
- 选区到轮次的映射读取 Chat DOM 标记（`data-chat-turn`、`data-chat-flow`），
  这些标记隔离在 `src/client/selection.ts`；Chat 表面变化时只需改该文件和测试。

## 兼容性

- DSH `>=0.2.1-rc.2 <0.3.0-0`（`engines.dsh`）。
- Node `^22.19.0 || >=24.0.0`。
- React 18 来自 DSH Web 的模块表，不会被打包进插件。

## 开发

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run check
pnpm run test:e2e
```

`pnpm run check` 是快速门禁（类型检查、lint、构建、单测、publint）。
`pnpm run test:e2e` 会创建临时 DSH home，把本仓库作为 link bundle 装进去，写一个
fixture 会话，在系统分配的端口启动 `dsh web`，再用 headless Chromium/Edge 通过 CDP
走完“打开 fixture 会话 → 选中回答 → 点击分栏提问 → 检查右侧栏和引用草稿”的流程。
它需要 PATH 上有 `dsh` 和 Chrome/Edge/Chromium（找不到时可用 `CHROME` 指定）；
`E2E_HOME` 可复用已准备好的 home，`E2E_KEEP=1` 保留临时目录。没有浏览器时会打印
skip 并以 0 退出，作为可选本地门禁。

构建产物：Host ESM 入口 `lib/index.js` + `lib/index.d.ts`，浏览器 factory
`lib/client.cjs`。浏览器 bundle 外层是
`window.__ModuleLoader__.load({ id: "dsh-web-ask-aside", ... })`，id 必须等于包名。

阶段账本见 [PROJECT.md](PROJECT.md)，验收标准见
[需求文档](docs/requirements.md)。开发规范见 [AGENTS.md](AGENTS.md)。

## License

MIT
