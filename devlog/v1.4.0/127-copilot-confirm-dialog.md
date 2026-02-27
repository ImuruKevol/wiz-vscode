# 127. Copilot Chat 메시지 전송 확인창 추가 (v1.4.0)

## 개요
Copilot Chat으로 메시지를 보내는 모든 경로에 확인 대화상자를 추가하여 실수로 인한 메시지 전송을 방지.

## 변경 사항

### 1. 확인창 추가 위치 (6개소)
- **todoEditor.js** `handleSubmit()`: TODO 생성 요청 전 확인
- **todoViewerEditor.js** `handleRunTask()`: 작업 실행 요청 전 확인 (선택된 작업 ID 표시)
- **todoViewerEditor.js** `handleReviewWizard()`: 리뷰 정리 요청 전 확인
- **extension.js** `wizCopilot.copilotWizard` DevOps 가이드: DevOps 가이드 생성 요청 전 확인
- **extension.js** `wizCopilot.copilotWizard` 아키텍처 분석: 아키텍처 분석 요청 전 확인
- **extension.js** `wizCopilot.runTask`: 작업 실행 명령 전 확인
- **extension.js** `wizCopilot.taskAction` run case: 작업 실행 메뉴 선택 후 확인

### 2. 기존 확인창 유지
- **workedReviewEditor.js** `confirmReview`: 기존에 이미 확인창 구현됨 (변경 없음)

### 3. 확인창 패턴
- 모든 확인창은 `vscode.window.showWarningMessage()` 사용
- `{ modal: true }` 옵션으로 모달 대화상자 표시
- 사용자가 확인 버튼을 클릭해야만 Copilot Chat으로 메시지 전송

## 관련 파일
- `src/editor/editors/todoEditor.js`
- `src/editor/editors/todoViewerEditor.js`
- `src/extension.js`
