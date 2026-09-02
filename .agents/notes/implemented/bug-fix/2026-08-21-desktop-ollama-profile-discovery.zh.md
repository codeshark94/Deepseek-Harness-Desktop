# Agent Note: Desktop startup discovers an existing Ollama launch profile

Status: implemented

[English](2026-08-21-desktop-ollama-profile-discovery.md) | 中文

## Problem

Electron 包装器从启动环境读取 DSH patch 与 Ollama 代理路径。Finder 不会继承旧版 `ollama launch dsh` 命令设置的 shell 变量，因此桌面应用可能启动基础 DeepSeek 路由，而不是用户已经配置好的 Ollama 路由。即使用户的 Ollama 凭据和模型配置已保存，基础路由也会打开 DeepSeek 凭据设置。

## Decision

桌面包装器先遵从显式的 `DSH_PATCH`，缺失时只会在 `~/.ollama/launch/dsh/` 下发现 `desktop-ollama.cordis.yml` 作为 settings patch。文件不存在时，可选 Ollama 集成保持禁用，因此没有这份本地 profile 的 checkout 仍按正常基础 composition 启动。

发现的 patch 选择已有的 Ollama provider 及其 `OLLAMA_API_KEY` 凭据引用，并直接指向 Ollama 的 OpenAI-compatible server API。只有 `DSH_OLLAMA_PROXY` 明确指定 sampling proxy 时才会启动它，如[直接 API 路由决策](2026-08-30-desktop-ollama-direct-api-route.zh.md)所述。包装器继续为 profile 的本地搜索路由提供非机密占位值。不会把任何凭据复制到应用 bundle 或启动环境中。

## Alternatives considered

- **把 Ollama 凭据复制为 `DEEPSEEK_API_KEY`。** 未采用，因为这会错误标注提供方专属机密、复制凭据，并且仍会让应用启动错误的模型路由。
- **始终强制 Ollama profile。** 未采用，因为没有用户本地启动文件的桌面 checkout 必须保留标准基础 composition，显式部署环境也必须继续优先。
- **要求从导出 patch 路径的 shell 启动。** 未采用，因为这会让 Finder 中的应用入口不可靠，并重新引入这个包装器本应消除的逐次启动设置。

## Consequences

已有的本地 Ollama launch profile 成为桌面默认值，但不会变成仓库范围的依赖。移动或删除 patch 会刻意让启动回到基础 composition；操作员也可以继续通过已有环境变量选择另一份 patch 或选择启用 sampling proxy。

## Testing

`curl http://127.0.0.1:11434/v1/models` 返回了本地 OpenAI-compatible 模型列表。桌面 settings patch 指向该端点；配置的 proxy 路径缺失时，桌面启动前会失败。
