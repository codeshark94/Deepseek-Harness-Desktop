# Agent Note: Desktop Ollama uses the server API directly

Status: implemented

[English](2026-08-30-desktop-ollama-direct-api-route.md) | 中文

## Problem

Ollama GUI 除了 server API 外还会占用本地集成端口。在每次桌面启动时发现并启动用户本地的 sampling proxy 可能占用同一端口、阻止 DSH 启动，并使所选模型看似不可用。

## Decision

桌面 Ollama settings patch 使用 `ollama serve` 在 `http://127.0.0.1:11434/v1` 提供的 OpenAI-compatible API。Electron 包装器会发现 settings patch，但不会发现 sampling proxy。对于提供独立 proxy 和匹配 settings patch 的部署，`DSH_OLLAMA_PROXY` 仍是显式 opt-in。

包装器不会安装模型、修改 profile 的默认模型，或重写用户的模型选择。这一决定细化了[本地 profile 发现决策](2026-08-21-desktop-ollama-profile-discovery.zh.md)。

## Alternatives considered

- **将自动发现的 proxy 移到另一个端口。** 未采用，因为 OpenAI-compatible server API 已提供所需传输，无需第二个 listener；自动启动 proxy 仍会让用户本地实现成为每次桌面启动的一部分。
- **禁用某个 Ollama GUI integration 来释放端口。** 未采用，因为该端口由 Ollama 拥有，其生命周期可独立于 DSH 改变。
- **把配置的默认模型替换为已安装模型。** 未采用，因为 provider 连通性与模型选择是不同问题；用户保留所选模型的控制权。

## Consequences

桌面应用避开 Ollama GUI integration ports，默认不启动 sampling proxy。需要注入 sampling options 的部署必须通过 `DSH_OLLAMA_PROXY` 显式 opt in，选择不冲突的 listener，并让显式 settings patch 指向它。

## Testing

Ollama 的直接 `/v1/models` 端点返回了已安装模型列表。桌面 settings patch 指向该端点，且 launcher 仅在设置 `DSH_OLLAMA_PROXY` 时启动 proxy。
