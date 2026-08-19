# DeepSeek Harness Desktop

A personal fork that packages [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) as a **macOS desktop app**. Wrapped in Electron, it lets you launch DeepSeek Harness with **Ollama Cloud** in a single double-click.

## Features

- **Desktop app** — a double-clickable `.app` for macOS
- **Ollama Cloud support** — uses cloud models through a local Ollama gateway
- **Web search** — DeepSeek Harness web search works via Ollama
- **Per-model reasoning effort** — the reasoning-effort control is shown only for models that support it

## Usage

Double-click `DeepSeek Harness.app` in Finder.

## Configuration

### Ollama sampling (optional)

You can set temperature, top_p, and reasoning effort via environment variables when launching the app:

```bash
DSH_OLLAMA_TEMPERATURE=0.7 \
DSH_OLLAMA_TOP_P=0.9 \
DSH_OLLAMA_REASONING_EFFORT=high \
open "DeepSeek Harness.app"
```

### Ollama patch / proxy (optional)

An Ollama-specific dsh patch and proxy are configured with the `DSH_PATCH` and `DSH_OLLAMA_PROXY` environment variables. If they are not set, the app runs plain dsh without the Ollama patch.

## Build

Build the `.app` from a fresh clone. Requires macOS arm64, Node.js ^22.19 || >=24, and pnpm.

```bash
git clone https://github.com/codeshark94/Deepseek-Harness-Desktop.git
cd Deepseek-Harness-Desktop
pnpm run build:desktop
```

The result is written to `dist-desktop/DeepSeek Harness-darwin-arm64/DeepSeek Harness.app`.

> **Note** — The app runs the built dsh CLI, so it needs the repository. If you move the app outside the repo (for example to `/Applications`), set the `DSH_REPO_ROOT` environment variable to the path of a built checkout. A fully self-contained single `.app` is not supported yet.

## Development

```bash
pnpm install
pnpm run build
pnpm dsh web
```

The desktop wrapper source lives in `apps/desktop/`. On launch the app locates the repository root from its own location and runs the built dsh CLI.

## License

[MIT](LICENSE)

Upstream project: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
