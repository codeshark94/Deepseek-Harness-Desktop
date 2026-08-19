# DeepSeek Harness Desktop

DeepSeek Harness를 **macOS 데스크톱 앱**으로 포장한 개인 포크입니다.
Electron으로 감싸서, 더블클릭 한 번으로 DeepSeek Harness를 **Ollama Cloud**와 함께 바로 사용할 수 있습니다.

## ✨ 특징

- **데스크톱 앱** — Finder에서 더블클릭하면 실행되는 `.app`
- **Ollama Cloud 지원** — 로컬 Ollama 게이트웨이를 통해 cloud 모델 사용
- **웹서치 동작** — Ollama 경유로 DeepSeek Harness 웹서치 사용 가능
- **reasoning effort 모델별 표시** — 지원하는 모델에만 reasoning effort 노출
- **API 키 입력 없음** — Ollama는 로컬 인증이라 DeepSeek 키 입력이 필요 없음
- **Ungrouped 선택 가능** — 새 대화 시작 시 폴더 없이 시작 가능
- **창 닫아도 안 꺼짐** — 창을 닫아도 도크에 남고, 도크 클릭으로 다시 열림

## 🚀 실행

Finder에서 `DeepSeek Harness.app`을 더블클릭합니다.

## 🔧 설정

### Ollama sampling (선택)

앱 실행 시 환경변수로 temperature / top_p / reasoning effort를 지정할 수 있습니다.

```bash
DSH_OLLAMA_TEMPERATURE=0.7 \
DSH_OLLAMA_TOP_P=0.9 \
DSH_OLLAMA_REASONING_EFFORT=high \
open "DeepSeek Harness.app"
```

### Ollama 패치/프록시 (선택)

Ollama 전용 dsh 패치와 프록시는 `DSH_PATCH`, `DSH_OLLAMA_PROXY` 환경변수로 지정합니다. 지정하지 않으면 앱은 Ollama 패치 없이 기본 dsh로 실행됩니다.

## 🛠 설치 (빌드)

레포를 내려받아 한 번에 `.app`을 만듭니다. macOS arm64와 Node.js ^22.19 || >=24, pnpm이 필요합니다.

```bash
git clone https://github.com/codeshark94/Deepseek-Harness-Desktop.git
cd Deepseek-Harness-Desktop
pnpm run build:desktop
```

결과물은 `dist-desktop/DeepSeek Harness-darwin-arm64/DeepSeek Harness.app`에 생성됩니다.

> **참고** — 이 앱은 빌드된 dsh CLI를 구동하므로 레포가 필요합니다. 앱을 레포 밖(예: `/Applications`)으로 옮기면 `DSH_REPO_ROOT` 환경변수로 빌드된 레포 경로를 지정해야 합니다. 완전 자체포함 단일 `.app`은 아직 지원하지 않습니다.

## 🛠 개발

```bash
pnpm install
pnpm run build
pnpm dsh web
```

데스크톱 래퍼 소스는 `apps/desktop/`에 있습니다. 앱은 실행 시 자신의 위치에서 레포 루트를 찾아 빌드된 dsh CLI를 구동합니다.

## 📄 라이선스

[MIT](LICENSE)

원본 프로젝트: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
