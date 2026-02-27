# 125. RichEditor 복사 붙여넣기 수정 (v1.3.3)

## 개요
RichEditor에서 복사 붙여넣기가 동작하지 않는 문제를 수정하고, 서식 제거 후 정상적으로 텍스트를 붙여넣을 수 있도록 개선.

## 변경 사항

### 1. 붙여넣기 방식 변경 (`resources/editor/richEditor.js`)
- `document.execCommand('insertHTML')` 방식을 Selection/Range API 기반 `_insertHtmlAtCursor()` 메서드로 교체
- VS Code Webview 환경에서 deprecated `execCommand`가 제대로 동작하지 않던 문제 해결

### 2. `_insertHtmlAtCursor()` 메서드 추가
- `window.getSelection()` + `Range` API를 사용하여 커서 위치에 HTML 삽입
- 기존 선택 영역 삭제 후 DocumentFragment로 삽입
- 삽입 후 커서를 삽입된 내용 끝으로 이동

### 3. Plain text 붙여넣기 명시적 처리
- 기존: 브라우저 기본 동작에 위임 (동작하지 않을 수 있음)
- 변경: `text/plain` 데이터를 가져와 HTML 이스케이프 후 `<br>` 줄바꿈으로 변환하여 `_insertHtmlAtCursor()`로 삽입
