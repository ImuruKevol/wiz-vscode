# 118. Copilot Chat Agent 모드 및 attachFiles 적용 (v1.3.3)

## 개요
모든 `workbench.action.chat.open` 호출에 `mode: 'agent'` 파라미터를 추가하여 Copilot Chat이 Agent 모드로 열리도록 변경. 작업 실행 관련 호출에서 `#file:` 문자열 방식 대신 `attachFiles` API로 파일 컨텍스트를 전달하도록 전환.

## 변경 사항

### 1. Agent 모드 적용 (전체 8개 호출부)
- 모든 `workbench.action.chat.open` 호출에 `mode: 'agent'` 추가
- Agent 모드에서 LLM이 도구/파일시스템에 접근 가능하여 실제 작업 수행 능력 향상

### 2. attachFiles API 전환 (작업 실행 3곳)
- `src/editor/editors/todoViewerEditor.js` — `handleRunTask()`: `#file:${path}` → `attachFiles: [vscode.Uri.file(path)]`
- `src/extension.js` — `wizCopilot.runTask` 커맨드: 동일 전환 + 미사용 `todoUri` 변수 제거
- `src/extension.js` — `wizCopilot.taskAction` case 'run': 동일 전환

### 3. 기타 Agent 모드 추가 (5곳)
- `src/editor/editors/todoViewerEditor.js` — `handleReviewWizard()`: 리뷰 정리
- `src/editor/editors/workedReviewEditor.js` — `handleReviewCleanup()`: 리뷰 정리
- `src/editor/editors/todoEditor.js` — `handleSubmit()`: TODO 생성
- `src/extension.js` — Copilot 인스트럭션 위저드 'task': 작업관리 프롬프트
- `src/extension.js` — Copilot 인스트럭션 위저드 'architecture': 아키텍처 분석

### 4. modelSelector 관련
- Chat 패널의 모델 리셋 이슈는 수동 테스트 필요 — 코드 변경 없이 모니터링 예정
- `modelSelector` 미지정 시 사용자가 Chat UI에서 선택한 모델이 유지되므로 현재는 추가 조치 불필요
