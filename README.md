# Deepseek Harness Desktop

DeepSeek Harness를 **macOS 데스크톱 앱**으로 포장한 개인 포크입니다.
Electron으로 감싸서, 더블클릭 한 번으로 DeepSeek Harness를 **Ollama Cloud**와 함께 바로 쓸 수 있게 만들었습니다.

## ✨ 특징

- **데스크톱 앱** — Finder에서 더블클릭하면 실행되는 `.app`
- **Ollama Cloud 지원** — 로컬 Ollama 게이트웨이를 통해 cloud 모델 사용
- **웹서치 동작** — Ollama 경유로 DeepSeek Harness 웹서치 사용 가능
- **reasoning effort 모델별 표시** — 지원하는 모델에만 reasoning effort 노출
- **API 키 입력 없음** — Ollama는 로컬 인증이라 DeepSeek 키 입력 안 뜸
- **Ungrouped 선택 가능** — 새 대화 시작 시 폴더 없이 시작 가능
- **창 닫아도 안 꺼짐** — X 눌러도 도크에 남고, 도크 클릭으로 다시 열림

## 🚀 실행

```bash
open "/Users/seungyeop/workspace/dist-desktop/DeepSeek Harness-darwin-arm64/DeepSeek Harness.app"
```

또는 Finder에서 `DeepSeek Harness.app` 더블클릭.

## 🔧 설정

### Ollama sampling (선택)

앱 실행 시 환경변수로 temperature / top_p / reasoning effort를 지정할 수 있습니다.

```bash
DSH_OLLAMA_TEMPERATURE=0.7 \
DSH_OLLAMA_TOP_P=0.9 \
DSH_OLLAMA_REASONING_EFFORT=high \
open ".../DeepSeek Harness.app"
```

값을 안 주면 dsh가 보내는 값 그대로 통과합니다.

### 설정 파일

- `~/.ollama/launch/dsh/desktop-settings.yaml` — 모델/프로바이더/reasoning 설정
- `~/.ollama/launch/dsh/llm-proxy-configurable.mjs` — temperature/top_p/effort 주입 프록시
- `~/.ollama/launch/dsh/desktop-ollama.cordis.yml` — dsh 패치

## 🛠 개발

```bash
git clone https://github.com/codeshark94/Deepseek-Harness-Desktop.git
cd Deepseek-Harness-Desktop
pnpm install
pnpm run build
pnpm dsh web
```

데스크톱 래퍼 소스는 `apps/desktop/`에 있습니다.

## 📦 패키징

```bash
cd apps/desktop
pnpm install
pnpm run pack
```

결과물은 `dist-desktop/DeepSeek Harness-darwin-arm64/DeepSeek Harness.app` 입니다.

## 📄 라이선스

[MIT](LICENSE)

원본 프로젝트: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
