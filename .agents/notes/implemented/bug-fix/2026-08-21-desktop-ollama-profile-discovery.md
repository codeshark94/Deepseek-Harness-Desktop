# Agent Note: Desktop startup discovers an existing Ollama launch profile

Status: implemented

English | [中文](2026-08-21-desktop-ollama-profile-discovery.zh.md)

## Problem

The Electron wrapper accepts its DSH patch and Ollama proxy paths only through its launch environment. Finder does not inherit the shell variables used by the old `ollama launch dsh` command, so the desktop app booted the base DeepSeek route instead of the user's configured Ollama route. The base route then opened the DeepSeek credential setup even though the user's Ollama credential and model configuration were already stored.

## Decision

The desktop wrapper first honours explicit `DSH_PATCH` and `DSH_OLLAMA_PROXY` values. When either is absent, it discovers the corresponding file only under `~/.ollama/launch/dsh/`: `desktop-ollama.cordis.yml` for the settings patch and `llm-proxy-configurable.mjs` for the local OpenAI-compatible proxy. A missing file leaves that part of the optional Ollama integration disabled, so a checkout without this local profile continues to boot its normal base composition.

The discovered patch selects the existing Ollama provider and its `OLLAMA_API_KEY` credential reference. The proxy starts before `dsh web`, and the wrapper continues to supply the non-secret placeholder used by the profile's local search route. No credential is copied into the application bundle or its launch environment.

## Alternatives considered

- **Copy the Ollama credential into `DEEPSEEK_API_KEY`.** Rejected because it would mislabel a provider-specific secret, duplicate the credential, and still leave the app booting the wrong model route.
- **Always force the Ollama profile.** Rejected because a desktop checkout without the user's local launch files must retain the standard base composition, and an explicit deployment environment must continue to win.
- **Require launching from a shell that exports the two paths.** Rejected because it makes the Finder application entry unreliable and reintroduces the per-launch setup this wrapper is meant to remove.

## Consequences

An existing local Ollama launch profile becomes the desktop default without making it a repository-wide dependency. Moving or deleting either file deliberately returns that part of startup to the base composition; an operator can instead select another profile or proxy through the existing environment variables.

## Testing

`pnpm run pack` produced the packaged application. Launching it through `/Applications/DeepSeek Harness.app` started both `llm-proxy-configurable.mjs` and `dsh web --patch ~/.ollama/launch/dsh/desktop-ollama.cordis.yml`; the proxy answered its local `/v1/models` endpoint, and the rendered desktop session selected `deepseek-v4-flash:0731-cloud` without a credential modal.
