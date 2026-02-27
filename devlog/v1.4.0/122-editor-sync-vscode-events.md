# 122. 에디터 파일 동기화 — VS Code 이벤트 기반 재구현 (v1.4.0)

## 개요
`fs.watch()`도 `.github/task/` 경로에서 이벤트가 발생하지 않는 문제가 확인되어, VS Code 텍스트 문서 이벤트(`onDidChangeTextDocument`, `onDidSaveTextDocument`) 기반으로 전면 재구현. VS Code 에디터에서 파일 편집 시 저장 전에도 실시간으로 Webview에 반영됨.

## 변경 사항

### 1. VS Code 이벤트 기반 파일 동기화 (4개 에디터)
- `fs.watch()` 제거 → `vscode.workspace.onDidChangeTextDocument` + `onDidSaveTextDocument` 조합으로 교체
- `onDidChangeTextDocument`: VS Code 에디터에서 편집 시 저장 전에도 실시간 감지, `document.getText()`로 버퍼 내용 전달
- `onDidSaveTextDocument`: 저장 시 확정 갱신
- 스킴 필터링 (`e.document.uri.scheme !== 'file'`) 추가로 가상 문서 이벤트 무시
- `e.contentChanges.length === 0` 체크로 메타데이터 변경 무시
- 300ms 디바운스 유지 (키 입력마다 이벤트 발생하므로 필수)
- 대상: TodoViewerEditor, MemoViewerEditor, WorkedReviewEditor, MarkdownViewerEditor

### 2. 문서 버퍼 우선 로드 패턴 도입
- `loadTodoContent()`, `loadMemoContent()`, `loadWorkedFiles()`, `_renderContent()` 수정
- `vscode.workspace.textDocuments`에서 열린 문서 검색 → `getText()`로 미저장 내용 우선 반영
- 탭 전환 복귀(`onDidChangeViewState`) 시에도 최신 버퍼 내용 반영

### 3. WorkedReviewEditor 디렉토리 감시 강화
- `onDidCreateFiles`, `onDidDeleteFiles` 이벤트 추가 — 파일 생성/삭제 시에도 갱신
- 디렉토리 내 `.md` 파일 경로 필터링으로 대상 파일만 처리

### 4. 리소스 관리 개선
- `_fsWatcher` → `_disposables[]` 배열로 교체
- `_fileWatcher` 미사용 필드 제거
- `onDispose()`에서 `_disposables.forEach(d => d.dispose())` 일괄 정리

### 5. 아키텍처 가이드 업데이트
- `fs.watch()` 패턴 → VS Code 이벤트 패턴으로 전체 가이드 재작성
- 문서 버퍼 우선 로드, 디렉토리 감시, `_disposables` 정리 패턴 추가
- 핵심 원칙 테이블 업데이트

### 변경 파일
- `src/editor/editors/todoViewerEditor.js`
- `src/editor/editors/memoViewerEditor.js`
- `src/editor/editors/workedReviewEditor.js`
- `src/editor/editors/markdownViewerEditor.js`
- `.github/architecture-guide.md`
