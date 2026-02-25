# 093. RichEditor 자동변환 수정 및 이미지 blob 삽입 (v1.3.2)

## 개요
RichEditor 자동변환 기능의 미동작 버그를 수정하고 Heading 관련 코드를 제거했으며, 이미지 업로드를 파일 저장 방식에서 base64 data URI 인라인 삽입 방식으로 전환했다.

## 변경 사항

### 1. RichEditor 자동변환 수정 (FN-0019)
- `_handleAutoFormat()`, `_handleEnterAutoFormat()` 수정 — 에디터 루트에 직접 입력된 텍스트 노드 처리 (기존에는 `_getBlockParent()`가 null을 반환하여 자동변환이 동작하지 않던 문제)
- Heading(`#`) 관련 자동변환 코드 제거
- `todoEditor.js`에서 `showHeading: true`, `headingMinLevel: 2` 옵션 제거

### 2. 이미지 blob 삽입 방식 전환 (FN-0020)
- 기존: webview → extension 파일 저장 → webviewUri 반환 → img 삽입
- 변경: webview 내에서 FileReader + Canvas로 직접 처리
- `_handleImageFile()` 메서드 추가 — 이미지 읽기, 512px 초과 시 canvas로 비율 유지 리사이즈, base64 data URI로 에디터에 직접 삽입
- `onImageUpload` 옵션 제거, `insertPlaceholder()` / `replacePlaceholder()` 메서드 제거
- `todoEditor.js`, `todoViewerEditor.js`에서 extension 측 `handleImageUpload()` 메서드 및 관련 webview 코드 제거
- `htmlToMarkdown` img 처리: `dataset.mdPath` 우선 → `src` 폴백, alt 텍스트 정리

### 3. 변경된 파일
- `resources/editor/richEditor.js` — 자동변환 수정, heading 제거, 이미지 blob 삽입
- `src/editor/editors/todoEditor.js` — heading/이미지 업로드 코드 제거
- `src/editor/editors/todoViewerEditor.js` — 이미지 업로드 코드 제거
