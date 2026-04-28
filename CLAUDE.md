<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# 核心原则

## 1.开发基本原则

### 1.1 中文优先

- 所有文档、代码注释、提交信息和 PR 描述必须使用**中文**
- 英文术语仅在无标准中文翻译时使用，且必须提供中文解释

### 1.2 规范驱动

- 所有功能开发必须从规范（spec）开始
- 未通过评审的规范禁止编码
- 使用 OpenSpec 系统进行变更管理

### 1.3 测试优先

- 遵循 TDD：先编写失败的测试，再用最小实现通过，最后重构
- 测试先行能约束设计、及时暴露缺陷
- 禁止在没有自动化测试的情况下提交代码

### 1.4 简单优先

- 在满足需求前提下选择最易理解的实现
- 避免过度工程化和不必要的抽象
- 不添加未明确要求的功能

### 1.5 最小化更改

- 只修改完成当前需求所必需的部分
- 避免过度重构、大范围格式化或"顺手优化"
- 每次更改必须能明确对应到业务需求

### 1.6 禁止无需求兼容性代码

- 不为非目标平台/旧版本/低概率场景编写额外代码
- 优先保证核心功能的稳定性

---

# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在本仓库中编写代码时的指导。

## 开发命令

- `npm run dev` - 启动开发服务器
- `npm run lib` - 构建库（运行 lint、类型检查并构建库）
- `npm run build` - 构建应用（运行 lint、类型检查并构建应用）
- `npm run lint` - 运行 ESLint
- `npm run type:check` - 仅运行 TypeScript 类型检查，不输出文件
- `npm run cypress:open` - 打开 Cypress 测试运行器 GUI
- `npm run cypress:run` - 无头模式运行 Cypress 测试
- `npm run docs:dev` - 启动 VitePress 文档服务器
- `npm run docs:build` - 构建 VitePress 文档
- `npm run release` - 运行发布脚本

运行单个 Cypress 测试文件：`npx cypress run --spec cypress/e2e/<test-file>.cy.ts`

## Git 钩子

提交前钩子会运行 `npm run lint` 和 `npm run type:check`。提交信息必须遵循 Conventional Commits 格式：`feat:`、`fix:`、`docs:`、`refactor:` 等。

## 架构概览

这是一个基于 Canvas 的富文本编辑器，使用 TypeScript 构建。核心架构遵循模块化、分层设计：

### 核心组件

**Editor 类** (`src/editor/index.ts`)

- 统筹所有子系统的主入口
- 通过 `command` 属性暴露公共 API（例如 `editor.command.executeBold()`）
- 通过 `destroy()` 方法管理生命周期

**Draw 类** (`src/editor/core/draw/Draw.ts`)

- 负责 Canvas 绘制的中央渲染引擎（约 96KB）
- 管理页面、行、元素和光标渲染
- 协调所有粒子类型和框架元素

**命令模式** (`src/editor/core/command/`)

- `Command.ts`：外观类，暴露所有 execute 方法（例如 `executeBold`、`executeUndo`）
- `CommandAdapt.ts`：将命令桥接到 Draw 上下文的适配器
- 所有命令遵循 `execute*` 命名约定

### 元素系统

编辑器使用在 `src/editor/interface/Element.ts` 中定义的分层元素模型：

**IElement** - 所有内容元素的基接口，包含：

- 基本属性：`id`、`type`、`value`、`extension`、`externalId`
- 样式：`font`、`size`、`bold`、`color` 等（IElementStyle）
- 规则：`hide`（IElementRule）
- 分组：`groupIds`（IElementGroup）

**元素类型** (ElementType 枚举)：

- 文本粒子：TextParticle、ListParticle、HyperlinkParticle 等
- 块级粒子：ImageParticle、TableParticle、LaTexParticle 等
- 控件粒子：CheckboxParticle、RadioParticle 等
- 框架元素：Margin、Background、PageNumber 等

### 目录结构

```
src/editor/
├── core/
│   ├── draw/           # 渲染引擎
│   │   ├── particle/    # 元素渲染（文本、图像、表格、latex 等）
│   │   ├── control/    # 控件组件渲染
│   │   ├── frame/       # 框架元素（边距、背景、边框）
│   │   ├── richtext/    # 富文本装饰（下划线、高亮）
│   │   └── interactive/ # 交互功能（搜索、涂鸦）
│   ├── command/         # 命令模式实现
│   ├── event/          # Canvas 和全局事件处理
│   ├── observer/        # 鼠标、选区、图像观察器
│   ├── worker/          # 用于异步操作的 Web Workers
│   └── [其他子系统]
├── interface/           # TypeScript 接口（40+ 文件）
├── dataset/            # 枚举和常量
└── utils/               # 工具函数
```

### Web Workers

异步操作由 `WorkerManager.ts` 管理的 Web Workers 处理：

- WordCountWorker - 统计元素列表中的字数
- CatalogWorker - 生成文档目录/目录（TOC）
- GroupWorker - 从元素中提取分组 ID
- ValueWorker - 异步获取文档值

### 事件系统

**EventBus** (`src/editor/core/event/eventbus/`) - 编辑器事件的发布/订阅系统
**Listener** (`src/editor/core/listener/`) - 变更通知的回调系统
**CanvasEvent** 和 **GlobalEvent** - 处理鼠标、键盘和拖拽事件

### 插件系统

插件通过 `editor.use(plugin)` 模式扩展功能。参见 `src/editor/core/plugin/Plugin.ts`。

## 关键模式

**命令-绘制分离**：命令通过 CommandAdapt 访问 Draw 功能，而非直接访问。这防止将内部 Draw 上下文暴露给外部使用者。

**元素格式化**：元素通过 `formatElementList()` 工具函数进行格式化，该函数应用默认值并补充缺失的属性。

**基于区域的布局**：文档通过 Zone 系统支持 header/main/footer 区域。

**位置-范围模型**：光标位置和选区通过 Position 和 RangeManager 类进行跟踪。

**历史管理**：通过带有命令历史栈的 HistoryManager 实现撤销/重做功能。
