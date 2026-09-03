---
title: Neovim 与 lazy.nvim 理解笔记
date: 2026-07-11
categories:
  - Nvim
---

# Neovim 与 lazy.nvim 理解笔记

> 从零理解 Neovim 的启动流程、插件管理机制和 lazy.nvim 的工作原理

---

## 目录

- [1. Neovim 启动全流程](#1-neovim-启动全流程)
- [2. Lua 的 require 机制](#2-lua-的-require-机制)
- [3. require().setup() 到底是什么](#3-require setup-到底是什么)
- [4. lazy.nvim 的 Plugin Spec 详解](#4-lazy-nvim-的-plugin-spec-详解)
- [5. lazy.nvim 作为"引擎"的工作方式](#5-lazy-nvim-作为引擎的工作方式)
- [6. 插件 README → Spec 翻译方法](#6-插件-readme--spec-翻译方法)
- [7. lazy-lock.json 与插件同步](#7-lazy-lock-json-与插件同步)
- [8. 为什么用 Lua 而不是 JSON](#8-为什么用-lua-而不是-json)
- [9. LazyVim vs 手写配置](#9-lazyvim-vs-手写配置)
- [10. 其他常用 vim.xxx 速查](#10-其他常用-vim-xxx-速查)
- [11. 关键对比速查表](#11-关键对比速查表)

---

## 1. Neovim 启动全流程

```
① 终端输入 nvim
         │
② Neovim 读取配置文件
         │
③ 加载 ~/.config/nvim/init.lua          ← 入口文件（唯一自动加载）
         │
④ init.lua 执行 require("config.lazy")   ← 找到自己的插件管理器
         │
⑤ lua/config/lazy.lua 执行
         │
    ├─ ⑤a 检查 lazy.nvim 是否已安装，没有则从 GitHub 克隆
    ├─ ⑤b require("lazy").setup({
    │       spec = {
    │           { import = "plugins" }    ← 关键：告诉 lazy 去加载哪些插件
    │       },
    │   })
    │
    └─ ⑤c lazy.nvim 遍历 lua/plugins/ 目录
            找到所有 .lua 文件，依次 require 它们
                    │
            你写的 nvim-tree.lua ↓
                    │
            ⑥ return { ... } 一个 table（Plugin Spec）
                    │
            ⑦ lazy.nvim 解析这个 table：
               • init 里的函数 → 立刻执行（启动阶段）
               • opts/config   → 存着，等插件加载时才执行
               • cmd/ft/keys   → 注册事件监听
               • dependencies  → 记录依赖关系
                    │
      ╔═══════════════════════════════════════╗
      ║  ⑧ Neovim 启动完成，进入编辑界面      ║
      ║                                       ║
      ║  ● init 已经执行完                    ║
      ║  ● 懒加载的插件还没加载               ║
      ║  ● 你按下快捷键或输入命令后...        ║
      ║                                       ║
      ║  ⑨ lazy.nvim 才真正加载该插件        ║
      ║  ⑩ 自动执行 opts → setup(opts)      ║
      ║  ⑪ 插件出现                          ║
      ╚═══════════════════════════════════════╝
```

### 关键理解

| 概念 | 说明 |
|------|------|
| `init.lua` | 唯一被 Neovim 自动加载的文件，相当于 `main()` |
| `require("config.lazy")` | 找到 `lua/config/lazy.lua` 并执行 |
| `{ import = "plugins" }` | lazy.nvim 去 `lua/plugins/` 下找所有 `.lua` 文件 |
| `lua/` 目录 | Neovim 自动把这个目录加到 Lua 的搜索路径，`require("config.lazy")` 实际找的是 `lua/config/lazy.lua` |

---

## 2. Lua 的 require 机制

### require vs C 的 #include

| | `#include` (C) | `require` (Lua) |
|---|---|---|
| 发生时机 | 编译前（预处理器） | 运行时 |
| 行为 | **文本替换**：直接把文件内容粘贴进来 | **执行文件**，拿到返回值 |
| 多次调用 | 无所谓（重复粘贴） | 只执行一次，后面返回**缓存** |

```lua
-- a.lua
return { name = "Alice" }

-- b.lua
local a1 = require("a")   -- 第一次：执行 a.lua，返回 { name = "Alice" }
local a2 = require("a")   -- 第二次：不再执行，直接返回缓存
print(a1 == a2)           --> true （是同一个 table）
```

### require 必须 return 一个 table 吗？

**不是必须的。** `require` 返回文件里 `return` 的值，可以是任何类型：

```lua
-- config.lua
return 42
-- main.lua
local x = require("config")  --> x = 42

-- greet.lua（没有 return）
print("hello")
-- main.lua
local r = require("greet")   --> r = true（默认值）
```

但对于 lazy.nvim，插件文件**必须 return 一个 table**，因为 lazy.nvim 要解析这个 table 作为插件规格。

---

## 3. require().setup() 到底是什么

```lua
require("nvim-tree").setup({ view = { width = 30 } })
```

拆解为两步：

| 步骤 | 代码 | 说明 |
|------|------|------|
| ① | `local m = require("nvim-tree")` | 加载插件模块，返回一个 table（这个 table 里有插件定义的各种函数） |
| ② | `m.setup({ view = { width = 30 } })` | 调用插件上的 `setup` 方法，传入配置参数 |

`setup` 不是 Lua 关键字，只是社区**约定俗称的函数名**。插件作者定义了它，用来接收用户配置并启动插件。

```lua
-- 插件内部大概长这样
local M = {}
function M.setup(user_config)
    -- 合并用户配置和默认配置
    -- 注册命令、快捷键
    -- 启动插件
end
return M
```

### 所有插件都需要 setup() 吗？

| 插件类型 | 激活方式 | 例子 |
|---------|---------|------|
| 颜色主题（Neovim 原生概念） | `vim.cmd("colorscheme xxx")` | tokyonight, catppuccin |
| 第三方插件（Neovim 不认识） | `require("xxx").setup({})` | nvim-tree, telescope, cmp |

tokyonight 不需要 setup()，因为它用的是 Neovim 内置的 `:colorscheme` 命令。nvim-tree 需要 setup()，因为 Neovim 本身不知道文件树是什么。

---

## 4. lazy.nvim 的 Plugin Spec 详解

一个插件规格就是一个普通的 Lua table，**所有属性平铺在里面**。

文档分多个表格只是为了分类说明，不是让你分开写多个 table。

```lua
return {
    -- === Spec Source：插件在哪（三选一） ===
    "作者/仓库名",           -- ① 简写（99% 用这个）
    -- dir = "~/my-plugin", -- ② 本地路径
    -- url = "..."          -- ③ 完整 URL

    -- === Spec Loading：加载控制 ===
    dependencies = { "另一个/插件" },   -- 依赖
    enabled = true,                     -- 完全启用/禁用
    cond = function() return true end,  -- 条件启用（不卸载）
    priority = 50,                      -- 启动优先级（主题设为 1000）

    -- === Spec Setup：配置（按执行时机排序） ===
    init = function()                   -- ① 启动时立刻执行
        -- 设 vim.g、vim.opt 等
    end,
    opts = { ... },                     -- ② 插件加载后自动 setup(opts)
    config = function(_, opts)          -- ③ 插件加载后执行（覆盖 opts 的默认行为）
        require("xxx").setup(opts)
    end,
    build = function() end,             -- 安装/更新后执行（编译等）

    -- === Spec Lazy Loading：懒加载时机 ===
    lazy = true,                        -- 是否懒加载（默认 true）
    event = "BufRead",                  -- 事件触发
    cmd = "SomeCommand",                -- 命令触发
    ft = "lua",                         -- 文件类型触发
    keys = { "<leader>f" },             -- 快捷键触发

    -- === Spec Versioning：版本控制 ===
    branch = "main",
    tag = "v1.0",
    commit = "abc123",
    version = false,                    -- 不跟随最新版
    pin = true,                         -- 锁定版本不更新
}
```

---

## 5. lazy.nvim 作为"引擎"的工作方式

lazy.nvim 的核心思想：**你把配置写成纯数据结构（table），lazy.nvim 负责在合适的时机执行它。**

```
你写的是数据（table）：
    return {
        "some/plugin",
        init = function() ... end,
        opts = { ... },
        cmd = "SomeCmd",
    }

lazy.nvim 是引擎：
    解析 table →
        init → 启动时执行 ✓
        opts → 插件加载时自动 setup(opts) ✓
        cmd → 监听 :SomeCmd 命令，按需加载 ✓
```

这有点像"钩子"或"事件驱动"的思想——你声明"什么时候该做什么"，lazy.nvim 帮你编排好一切。

### 对比：直接写 vs 通过 lazy.nvim

```lua
-- 插件 README 教你的写法（直接写在 init.lua 里）
vim.g.loaded_netrw = 1
vim.opt.termguicolors = true
require("nvim-tree").setup({ view = { width = 30 } })

-- 用 lazy.nvim 的写法（写到 plugins/nvim-tree.lua）
return {
    "nvim-tree/nvim-tree.lua",
    init = function()
        vim.g.loaded_netrw = 1
        vim.opt.termguicolors = true
    end,
    opts = { view = { width = 30 } },
    cmd = "NvimTreeToggle",   -- 按需加载！
}
```

| | 直接写 init.lua | 用 lazy.nvim |
|---|---|---|
| 插件加载时机 | 启动就加载 | 按需加载 |
| `require().setup()` | 自己手动调用 | 自动调用（通过 opts） |
| 组织方式 | 一个文件越来越大 | 每个插件一个文件 |

**lazy.nvim 的唯一价值：让你把 `require().setup()` 的执行时机往后拖延，换来启动速度。**

---

## 6. 插件 README → Spec 翻译方法

每个插件的 GitHub README 都会教你"怎么安装"。你只需要把它翻译成 lazy.nvim 的 table 格式。

### 步骤

```markdown
## 示例：nvim-tree 的 README 说

在 init.lua 中写：
1. vim.g.loaded_netrw = 1          ← 启动时要做的（→ init）
2. vim.opt.termguicolors = true    ← 启动时要做的（→ init）
3. require("nvim-tree").setup({    ← 插件加载时做的（→ opts）
      view = { width = 30 }
   })
```

### 翻译成 Spec

| README 中的代码 | 时机 | Spec 中的位置 |
|---|---|---|
| `vim.g.loaded_netrw = 1` | 启动时 | `init` |
| `vim.opt.termguicolors = true` | 启动时 | `init` |
| `require("xxx").setup({...})` | 加载插件时 | `opts = {...}` |

```lua
return {
    "nvim-tree/nvim-tree.lua",
    -- README 里启动时要执行的 → 放 init
    init = function()
        vim.g.loaded_netrw = 1
        vim.g.loaded_netrwPlugin = 1
        vim.opt.termguicolors = true
    end,
    -- README 里 setup() 的参数 → 放 opts
    opts = {
        view = { width = 30 }
    },
    -- 懒加载时机（README 没说，自己判断）
    cmd = "NvimTreeToggle",
}
```

---

## 7. lazy-lock.json 与插件同步

```json
{
  "lazy.nvim": { "branch": "main", "commit": "306a055..." },
  "tokyonight.nvim": { "branch": "main", "commit": "cdc07ac..." }
}
```

### 这个文件记录什么

只记录两件事：

| 字段 | 含义 |
|------|------|
| `branch` | 从哪个分支拉的 |
| `commit` | 当前装的哪个确切版本 |

### :Lazy sync 做了什么

```
:Lazy sync
├── ① 读 lua/plugins/*.lua      ← 知道要装哪些插件（这是前提！）
├── ② 对照 lazy-lock.json        ← 知道要装什么版本
└── ③ 下载/更新到匹配的版本
```

### 迁移到另一台电脑

```
需要复制：
├── lua/plugins/         ← 必须！告诉 lazy 装什么
└── lazy-lock.json       ← 可选！锁住版本

有 plugins/ 目录 → 运行 :Lazy sync → 自动下载所有插件
没有 lazy-lock.json → 下载最新版
有 lazy-lock.json → 下载指定 commit
```

---

## 8. 为什么用 Lua 而不是 JSON

JSON 只能表示静态数据，而插件配置需要表达**逻辑、条件和行为**。

### JSON 做不到的场景

| 场景 | Lua 写法 | JSON 能吗 |
|------|---------|-----------|
| 条件加载 | `cond = function() return exec("lazygit") end` | ❌ |
| 从别处导入 | `keys = require("config.mappings").keys` | ❌ |
| 动态生成 | `local function mk_plugin(name, theme) ... end` | ❌ |
| 执行命令 | `config = function() vim.cmd("...") end` | ❌ |
| 函数即数据 | `init = function() ... end` | ❌ |

**你是为了"可编程"这个能力付出学习成本，换来的是：不用等插件作者给你提供配置选项，你自己就能组合、控制、编排它们。**

---

## 9. LazyVim vs 手写配置

LazyVim = folke 做的 Neovim 发行版（预制配置，100+ 插件开箱即用）

| | 手写配置 | LazyVim |
|---|---|---|
| 理解程度 | 每个配置都亲手写过，知道为什么 | 很多"魔法"，排查问题需要翻源码 |
| 插件数量 | 只装需要的 | 100+ 预装 |
| 启动速度 | 更快 | 更慢 |
| 上手难度 | 先苦后甜 | 先甜后苦（出问题时） |
| 定制灵活度 | 完全可控 | 在 LazyVim 框架内定制 |

建议：**先用自己手搭的配置**，每加一个插件都理解它做了什么。用到什么新功能时，去 LazyVim 的配置里参考它是怎么配的，然后自己写。

---

## 10. 其他常用 vim.xxx 速查

| API | 作用 | 例子 |
|-----|------|------|
| `vim.cmd("...")` | 执行 Vimscript 命令 | `vim.cmd("colorscheme tokyonight")` |
| `vim.g.xxx` | 全局变量（Neovim） | `vim.g.mapleader = " "` |
| `vim.opt.xxx` | 设置选项 | `vim.opt.termguicolors = true` |
| `vim.fn.xxx` | 调用 Vim 内置函数 | `vim.fn.executable("lazygit")` |
| `vim.api.nvim_echo(...)` | 显示消息 | — |
| `vim.keymap.set(...)` | 设置快捷键 | — |

这些不需要记，用到了再查。

---

## 11. 关键对比速查表

| 概念 | Lua / Neovim | 类比 |
|------|-------------|------|
| require | 加载并执行一个 Lua 文件，**返回它的值** | Python `import` |
| #include | 编译前文本替换 | Lua **没有**这个 |
| return { ... } | 模块输出一个 table | Python `return [...]` |
| require("x").setup() | 加载插件并传参启动 | Python `import x; x.setup(...)` |
| init (spec 中) | 启动时执行的函数 | "预热" |
| opts (spec 中) | 传给 setup 的参数 | Python 的 `**kwargs` |
| lazy-lock.json | 锁定插件版本 | `package-lock.json` / `Cargo.lock` |
| Plugin Spec | 一个描述插件的 table | 一张"购物清单" |
| lazy.nvim | 解析 Spec 并按需加载的引擎 | 一个"智能管家" |

---

> 笔记生成时间：2026-07-11
