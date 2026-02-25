# 097. 마크다운 뷰어 showdown 라이브러리 전환 (v1.3.2)

## 개요
기존 커스텀 markdownViewer.js의 코드블록 렌더링 문제를 해결하기 위해 showdown + github-markdown-css 라이브러리로 전환.

## 변경 사항

### 1. NPM 의존성 추가
- `showdown` (markdown → HTML 변환 라이브러리) 설치
- `github-markdown-css` (GitHub 스타일 마크다운 CSS) 설치
- `package.json` dependencies에 추가

### 2. markdownViewerEditor.js 재작성
- `src/editor/editors/markdownViewerEditor.js` 전면 재작성
- 기존: 커스텀 `resources/editor/markdownViewer.js` 로드 → 코드블록 줄바꿈 문제 발생
- 변경: `node_modules/showdown/dist/showdown.min.js` + `node_modules/github-markdown-css/github-markdown-dark.css` 사용
- Showdown 설정: `{tables: true, ghCodeBlocks: true, tasklists: true, strikethrough: true, simplifiedAutoLink: true, literalMidWordUnderscores: true, emoji: true}`, flavor: 'github'
- VS Code 변수 오버라이드로 `pre`, `code` 배경색 통합
- `<article class="markdown-body">` 래퍼로 GitHub 스타일 적용

### 3. 기존 markdownViewer.js 유지
- `resources/editor/markdownViewer.js`는 삭제하지 않음 (다른 잠재적 용도 대비)
- markdownViewerEditor.js에서 더 이상 참조하지 않음
