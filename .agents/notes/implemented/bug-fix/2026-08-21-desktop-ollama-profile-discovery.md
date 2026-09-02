# Agent Note: Desktop startup discovers an existing Ollama launch profile

Status: implemented

English | [中文](2026-08-21-desktop-ollama-profile-discovery.zh.md)

## Problem

The Electron wrapper accepts its DSH patch and Ollama proxy paths through its launch environment. Finder does not inherit the shell variables used by the old `ollama launch dsh` command, so the desktop app can boot the base DeepSeek route instead of the user's configured Ollama route. The base route then opens the DeepSeek credential setup even though the user's Ollama credential and model configuration are already stored.

## Decision

The desktop wrapper first honours an explicit `DSH_PATCH` value and otherwise discovers `desktop-ollama.cordis.yml` only under `~/.ollama/launch/dsh/`. A missing file leaves the optional Ollama integration disabled, so a checkout without this local profile continues to boot its normal base composition.

The discovered patch selects the existing Ollama provider and its `OLLAMA_API_KEY` credential reference. It targets Ollama's OpenAI-compatible server API directly. A sampling proxy runs only when `DSH_OLLAMA_PROXY` explicitly names one, as recorded in [the direct API route decision](2026-08-30-desktop-ollama-direct-api-route.md). The wrapper continues to supply the non-secret placeholder used by the profile's local search route. No credential is copied into the application bundle or its launch environment.

## Alternatives considered

- **Copy the Ollama credential into `DEEPSEEK_API_KEY`.** Rejected because it would mislabel a provider-specific secret, duplicate the credential, and still leave the app booting the wrong model route.
- **Always force the Ollama profile.** Rejected because a desktop checkout without the user's local launch files must retain the standard base composition, and an explicit deployment environment must continue to win.
- **Require launching from a shell that exports the patch path.** Rejected because it makes the Finder application entry unreliable and reintroduces the per-launch setup this wrapper is meant to remove.

## Consequences

An existing local Ollama launch profile becomes the desktop default without making it a repository-wide dependency. Moving or deleting the patch deliberately returns startup to the base composition; an operator can instead select another patch or opt into a sampling proxy through the existing environment variables.

## Testing

`curl http://127.0.0.1:11434/v1/models` returned the local OpenAI-compatible model list. The desktop settings patch targets that endpoint, and a configured proxy fails before desktop startup when its path is missing.
