# 091. 에디터 컴포넌트 분리 및 TODO 뷰어 개선 (v1.3.1)

## 개요
리치 에디터(툴바+contentEditable+htmlToMarkdown)를 별도 재사용 가능한 컴포넌트로 분리하고, TODO 뷰어의 기능을 개선하였다.

## 변경 사항

### 1. RichEditor 컴포넌트 분리 (FN-0010)
- `resources/editor/richEditor.js` 신규 생성
- 재사용 가능한 WYSIWYG 에디터 클래스 (`RichEditor`)
  - 옵션: placeholder, showHeading, headingMinLevel, showImage, showLink, onInput, onImageUpload
  - 공개 API: `getHtml()`, `setHtml()`, `getText()`, `focus()`, `setEditable()`, `insertPlaceholder()`, `replacePlaceholder()`
  - 정적 메서드: `RichEditor.htmlToMarkdown()`, `RichEditor.markdownToHtml()`, `RichEditor.getStyles()`
  - 이미지 드래그&드롭, 클립보드 붙여넣기 지원
  - 제목 드롭다운(H2/H3/본문), 텍스트 서식, 목록, 인용, 코드블록, 링크 삽입 등 전체 툴바 기능

### 2. TODO 에디터 리팩토링 (FN-0010)
- `src/editor/editors/todoEditor.js` — 인라인 에디터 코드 제거, RichEditor 컴포넌트로 대체
- 829줄 → 290줄로 대폭 감소
- 이미지 업로드, 링크 삽입 기능은 RichEditor 옵션으로 활성화

### 3. 에디터 제목 레벨 제한 (FN-0011)
- `headingMinLevel: 2` 옵션으로 H1 선택 방지 (H2부터 시작)
- todo.md의 `#` 헤딩은 페이지 구분 트리거이므로 에디터에서 H1 입력을 차단

### 4. TODO 뷰어 개선 (FN-0012)
- **기본뷰어 버튼 제거**: `handleOpenInDefaultEditor()` 메서드 및 관련 UI 삭제
- **삭제 버튼 추가**: confirm 다이얼로그 후 현재 페이지 삭제 및 자동 저장
- **RichEditor 컴포넌트 재사용**: 인라인 툴바/에디터 코드를 RichEditor 컴포넌트로 대체
- **파일 트리 편집 아이콘**: todo.md에 인라인 편집 버튼 추가 (기본 에디터로 열기)

### 5. 파일 트리 인라인 편집 버튼 (FN-0012)
- `src/explorer/copilotExplorerProvider.js` — todo.md에 `contextValue: 'todoFile'` 부여
- `wizCopilot.openTodoInDefaultEditor` 커맨드 등록 (`package.json`, `extension.js`)
- 파일 트리에서 todo.md 오른쪽에 편집 아이콘(✏️) 표시, 클릭 시 기본 에디터로 열기
- todo.md 클릭 시에는 기존대로 TODO 뷰어 에디터로 열림
