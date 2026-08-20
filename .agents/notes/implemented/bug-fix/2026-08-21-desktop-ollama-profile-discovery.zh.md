# Agent Note: Desktop startup discovers an existing Ollama launch profile

Status: implemented

[English](2026-08-21-desktop-ollama-profile-discovery.md) | 中文

## Problem

Electron 包装器只从启动环境读取 DSH patch 与 Ollama 代理路径。Finder 不会继承旧版 `ollama launch dsh` 命令设置的 shell 变量，因此桌面应用启动的是基础 DeepSeek 路由，而不是用户已经配置好的 Ollama 路由。即使用户的 Ollama 凭据和模型配置已保存，基础路由仍会打开 DeepSeek 凭据设置。

## Decision

桌面包装器先遵从显式的 `DSH_PATCH` 与 `DSH_OLLAMA_PROXY`。任一变量缺失时，它只会在 `~/.ollama/launch/dsh/` 下发现对应文件：`desktop-ollama.cordis.yml` 用作 settings patch，`llm-proxy-configurable.mjs` 用作本地 OpenAI-compatible 代理。文件不存在时，相关的可选 Ollama 集成保持禁用，因此没有这份本地 profile 的 checkout 仍按正常基础 composition 启动。

发现的 patch 选择已有的 Ollama provider 及其 `OLLAMA_API_KEY` 凭据引用。代理在 `dsh web` 之前启动，包装器继续为 profile 的本地搜索路由提供非机密占位值。不会把任何凭据复制到应用 bundle 或启动环境中。

## Alternatives considered

- **把 Ollama 凭据复制为 `DEEPSEEK_API_KEY`。** 未采用，因为这会错误标注提供方专属机密、复制凭据，并且仍会让应用启动错误的模型路由。
- **始终强制 Ollama profile。** 未采用，因为没有用户本地启动文件的桌面 checkout 必须保留标准基础 composition，显式部署环境也必须继续优先。
- **要求从导出两个路径的 shell 启动。** 未采用，因为这会让 Finder 中的应用入口不可靠，并重新引入这个包装器本应消除的逐次启动设置。

## Consequences

已有的本地 Ollama launch profile 成为桌面默认值，但不会变成仓库范围的依赖。移动或删除任一文件会刻意让那部分启动回到基础 composition；操作员也可以继续通过已有环境变量选择另一份 profile 或代理。

## Testing

`pnpm run pack` 生成了打包应用。通过 `/Applications/DeepSeek Harness.app` 启动后，`llm-proxy-configurable.mjs` 与 `dsh web --patch ~/.ollama/launch/dsh/desktop-ollama.cordis.yml` 都已启动；代理的本地 `/v1/models` 端点可用，渲染出的桌面会话选择了 `deepseek-v4-flash:0731-cloud`，且没有出现凭据 modal。
