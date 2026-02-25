# 099. 마크다운 뷰어 remarkable + highlight.js 전환 (v1.3.2)

## 개요
showdown + github-markdown-css 대신 remarkable + highlight.js로 마크다운 렌더링 라이브러리 전환. 코드블록 구문 강조 지원 추가.

## 변경 사항

### 1. NPM 의존성 변경
- `remarkable`, `highlight.js` 설치
- `showdown`, `github-markdown-css` 제거
- `resources/editor/markdownViewer.js` 삭제 (사용되지 않는 커스텀 파서)

### 2. markdownViewerEditor.js 재작성 (`src/editor/editors/markdownViewerEditor.js`)
- Node.js에서 remarkable + highlight.js로 마크다운 → HTML 변환 (Webview에 JS 로드 불필요)
- `highlight` 콜백으로 코드블록 자동 구문 강조 (언어 감지 또는 auto)
- highlight.js `github-dark.css` 테마 CSS를 Webview에 인라인 삽입
- 자체 마크다운 스타일 정의 (h1~h6, code, pre, table, blockquote 등)
