# 095. 액션버튼 구성 변경 및 에디터 UI 개선 (v1.3.1)

## 개요
작업관리 액션버튼을 QuickPick 메뉴로 통합, 인스트럭션 마법사에 아키텍처 분석 기능 추가, 리뷰 에디터의 UX 개선 (확인 대화상자, 구분선 제거, 리사이즈 패널).

## 변경 사항

### 1. 작업관리 액션버튼 통합 (FN-0023)
- `taskCategory` 인라인 버튼을 `+` 하나로 통합 (`wizCopilot.taskAction`)
- QuickPick 다이얼로그에서 3가지 작업 선택: 작업 생성 / 리뷰 정리 / 작업 실행
- `package.json`: `taskAction` 커맨드 추가, `todoWizard`/`runTask` 인라인 메뉴 제거
- `src/extension.js`: `taskAction` 핸들러 추가 (QuickPick → 기존 핸들러 호출)
- `src/explorer/copilotExplorerProvider.js`: Instruction 카테고리 레이블을 '인스트럭션'으로 변경하여 '작업 관리'와 구분 강화

### 2. 리뷰 에디터 화면 구성 변경 (FN-0024)
- `src/editor/editors/workedReviewEditor.js`:
  - 리뷰 반영 버튼 클릭 시 `vscode.window.showWarningMessage` 모달 확인 대화상자 추가
  - Review 구분선(`.line` div) 제거 — 라벨만 표시
  - 작업 내역과 Review 패널 사이 드래그 리사이즈 핸들 추가 (`.resize-handle`)
  - mousedown/mousemove/mouseup 이벤트로 패널 높이 동적 조절 (최소 60px)

### 3. 인스트럭션 마법사 기능 변경 (FN-0025)
- `src/extension.js`: `generateTaskInstruction` 핸들러를 QuickPick 형태로 변경
  - "작업 관리 인스트럭션 적용": 기존 인스트럭션 반영 기능 유지
  - "아키텍처 분석": Copilot Chat에 프로젝트 분석 프롬프트 전송 (가이드라인/아키텍처 문서 생성)
