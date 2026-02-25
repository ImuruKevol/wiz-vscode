# 096. 인스트럭션 확인창 변경 및 마크다운 뷰어 구현 (v1.3.1)

## 개요
인스트럭션 중복 적용 시 알림창을 확인 모달로 변경하고, GitHub 스타일 마크다운 뷰어를 구현하여 .md 파일 클릭 시 미리보기로 여는 기능 추가.

## 변경 사항

### 1. 인스트럭션 적용 확인창 변경 (FN-0026)
- `src/extension.js`: `generateTaskInstruction` 핸들러에서 이미 적용된 경우 `showInformationMessage` → `showWarningMessage({ modal: true })` 변경
- "다시 적용" 선택 시 재적용 진행, 취소 시 중단

### 2. 마크다운 뷰어 구현 (FN-0027)
- `resources/editor/markdownViewer.js` 신규 생성: 재사용 가능한 GitHub 스타일 마크다운 렌더러 컴포넌트
  - `MarkdownViewer.toHtml()`: Markdown → HTML 변환 (코드블록, 인라인코드, 이미지, 링크, Bold/Italic/Strikethrough, 수평선, H1~H6, 인용, 체크리스트, 리스트, GFM 테이블)
  - `MarkdownViewer.getStyles()`: GitHub 스타일 CSS 반환
- `src/editor/editors/markdownViewerEditor.js` 신규 생성: Webview 에디터
  - EditorBase 상속, 파일 경로 기반 싱글톤 (같은 파일은 기존 패널 reveal)
  - 상단 헤더: 파일명 + "편집하기" 버튼
  - "편집하기" 클릭 시 VS Code 기본 에디터로 파일 오픈
  - FileSystemWatcher로 외부 편집 시 자동 새로고침
- `src/extension.js`: MarkdownViewerEditor import 추가, `wizExplorer.openFile`에서 .md 파일을 마크다운 뷰어로 라우팅
