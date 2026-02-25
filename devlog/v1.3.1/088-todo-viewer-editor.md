# 088. todo.md 에디터 뷰어 (v1.3.1)

## 개요
todo.md 파일을 클릭하면 커스텀 Webview 뷰어가 열리도록 구현하였다. `#` 헤딩 기준으로 TODO를 파싱하여 페이지네이션으로 탐색하며, 추가/저장/마크다운 보기/작업 시작 기능을 제공한다.

## 변경 사항

### 1. TodoViewerEditor 신규 생성
- `src/editor/editors/todoViewerEditor.js`: `EditorBase` 상속, todo.md 파일 기반 뷰어
- `#` 헤딩 기준 파싱: ID (`FN-XXXXXXXX-XXXX`)와 제목 자동 분리
- 페이지네이션: 도트 네비게이션, 좌우 버튼, 키보드 화살표 지원
- 상단 Page Info 바: ID 뱃지, 제목, 페이지 카운터 표시

### 2. 기능 버튼
- **추가**: 날짜 기반 자동 번호 생성하여 빈 페이지 추가, 마크다운 모드로 전환
- **저장**: 전체 페이지를 Markdown으로 직렬화하여 todo.md에 저장 (Ctrl+S 단축키)
- **마크다운으로 보기**: textarea 기반 소스 편집 모드 토글
- **작업 시작**: 저장 후 `wizCopilot.runTask` 동작 실행, 뷰어 닫기

### 3. 파일 열기 인터셉트
- `src/extension.js`: `wizExplorer.openFile` 핸들러에서 `.github/task/todo.md` 파일을 감지하면 기본 텍스트 에디터 대신 `TodoViewerEditor`를 열도록 분기
- `TodoViewerEditor` import 추가
