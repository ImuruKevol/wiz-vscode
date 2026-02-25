# 094. RichEditor 자동변환 수정 및 worked 리뷰 에디터 (v1.3.2)

## 개요
RichEditor의 자동변환 기능을 `keydown` 이벤트 기반으로 전면 재작성하여 VS Code Webview에서의 안정적 동작을 보장하고, worked 파일을 리뷰할 수 있는 전용 에디터를 구현했다.

## 변경 사항

### 1. RichEditor 자동변환 keydown 방식 전환 (FN-0021)
- 기존 `input` 이벤트의 `inputType`/`data` 프로퍼티 기반 → `keydown` 이벤트 기반으로 전환
- VS Code Webview에서 `input` 이벤트의 `inputType`이 `'insertText'`로 설정되지 않는 문제 해결
- Space 키: 입력 전 텍스트 확인 후 서식 적용 (`-`, `*`, `1.`, `>`) + `preventDefault()`
- Enter 키: 입력 전 텍스트 확인 후 구분선 변환 (`---`, `***`, `___`)
- 공통 유틸 메서드 추출: `_getCurrentLineInfo()`, `_applyFormat()`

### 2. worked 리뷰 에디터 구현 (FN-0022)
- `src/editor/editors/workedReviewEditor.js` 신규 — worked 폴더 파일 리뷰 전용 Webview
- 레이아웃: 상단 헤더(저장/리뷰 반영) + ID/제목(읽기전용) + 본문(읽기전용 렌더링) + 하단 RichEditor(리뷰 작성)
- 페이지네이션: worked 폴더 내 .md 파일 목록 기반
- `# Review` 마커로 본문/리뷰 영역 분리, 리뷰 내용이 비어있으면 저장 시 `# Review` 섹션 미생성
- 리뷰 반영 버튼: 저장 후 Copilot Chat에 "리뷰 정리해줘" 전달
- Singleton 패턴 적용

### 3. 트리 뷰 및 명령 연동
- `copilotExplorerProvider.js`: worked 폴더에 `workedFolder` contextValue 부여
- `package.json`: `reviewWizard` 인라인 버튼을 `workedFolder`로 이동
- `extension.js`: `reviewWizard` 핸들러를 `WorkedReviewEditor.openOrCreate()` 호출로 변경

### 4. 변경된 파일
- `resources/editor/richEditor.js` — 자동변환 keydown 전환
- `src/editor/editors/workedReviewEditor.js` — 신규
- `src/editor/editors/todoEditor.js` — (이전 세션에서 heading 제거)
- `src/explorer/copilotExplorerProvider.js` — workedFolder contextValue
- `src/extension.js` — WorkedReviewEditor import, reviewWizard 핸들러 변경
- `package.json` — reviewWizard 메뉴 위치 변경
