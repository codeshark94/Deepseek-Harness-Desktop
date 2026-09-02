# Agent Note: Desktop Ollama uses the server API directly

Status: implemented

English | [中文](2026-08-30-desktop-ollama-direct-api-route.zh.md)

## Problem

The Ollama GUI owns local integration ports in addition to its server API. Discovering and starting a user-local sampling proxy as part of every desktop launch can claim the same port, prevent DSH from starting, and make the selected model appear unavailable.

## Decision

The desktop Ollama settings patch uses the OpenAI-compatible API exposed by `ollama serve` at `http://127.0.0.1:11434/v1`. The Electron wrapper discovers the settings patch but does not discover a sampling proxy. `DSH_OLLAMA_PROXY` remains an explicit opt-in for deployments that provide a separate proxy and a matching settings patch.

The wrapper does not install models, change the profile's default model, or rewrite the user's model selection. This refines [the local-profile discovery decision](2026-08-21-desktop-ollama-profile-discovery.md).

## Alternatives considered

- **Move the automatically discovered proxy to another port.** Rejected because the OpenAI-compatible server API supplies the required transport without a second listener, and automatic proxy startup still makes a user-local implementation part of every desktop launch.
- **Disable an Ollama GUI integration to free its port.** Rejected because that port is owned by Ollama and its lifecycle may change independently of DSH.
- **Replace the configured default model with an installed model.** Rejected because provider reachability and model selection are separate concerns; the user retains control of the selected model.

## Consequences

The desktop application avoids Ollama GUI integration ports and starts without a sampling proxy by default. Deployments that need injected sampling options must opt in through `DSH_OLLAMA_PROXY`, choose a non-conflicting listener, and point their explicit settings patch at it.

## Testing

Ollama's direct `/v1/models` endpoint returned the installed model list. The desktop settings patch points to that endpoint, and the launcher only starts a proxy when `DSH_OLLAMA_PROXY` is set.
