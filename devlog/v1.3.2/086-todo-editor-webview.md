# 086. TODO 생성 기능 개선 — Webview 리치 에디터 (v1.3.2)

## 개요
기존 `showInputBox` 다이얼로그 기반의 TODO 생성 마법사를 새 탭(Webview 패널)으로 전환하였다. CKEditor 스타일의 WYSIWYG 리치 텍스트 에디터를 제공하며, 이미지 업로드 및 Markdown 변환 기능을 포함한다.

## 변경 사항

### 1. TodoEditor 신규 생성
- `src/editor/editors/todoEditor.js`: `EditorBase`를 상속한 WYSIWYG 에디터 Webview 구현
- 서식 도구모음(Heading, Bold, Italic, Strikethrough, Code, List, Blockquote, Code Block, HR, Link)
- 이미지 업로드(버튼/드래그앤드롭/클립보드 붙여넣기) 지원
- HTML → Markdown 변환기 내장
- 제목 필드 분리, 글자수 카운터, 상태 유지(`vscode.setState`)

### 2. 이미지 업로드 기능
- 이미지를 `.github/task/resources/` 폴더에 자동 저장
- 중복 파일명 시 타임스탬프 접미사로 충돌 방지
- 업로드 중 placeholder 표시 후 webviewUri로 교체
- Markdown 변환 시 `resources/` 상대 경로로 이미지 삽입

### 3. 기존 다이얼로그 방식 제거
- `src/extension.js`의 `wizCopilot.todoWizard` 핸들러를 `showInputBox` → `TodoEditor.open()` 호출로 교체
- `TodoEditor` import 추가

### 4. Markdown 변환 및 Copilot Chat 연동
- "TODO 생성" 버튼 클릭 시 에디터 내용을 Markdown으로 변환
- 제목이 있으면 `# 제목` 헤더를 자동 추가
- 변환된 Markdown을 `TODO 작성해줘` 프롬프트와 함께 Copilot Chat으로 전달
