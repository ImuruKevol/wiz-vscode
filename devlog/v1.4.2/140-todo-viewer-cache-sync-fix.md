# 140. TODO/메모 뷰어 캐시 동기화 문제 해결 (v1.4.2)

## 개요
TodoViewerEditor와 MemoViewerEditor에서 외부 프로세스(git, Copilot Chat, 터미널 등)에 의해 파일이 변경되었을 때 Webview에 캐시된 이전 내용이 표시되는 간헐적 문제를 해결.

## 변경 사항

### 1. FileSystemWatcher 재도입 (2개 에디터)
- `vscode.workspace.createFileSystemWatcher`로 대상 파일 감시 추가
- `onDidChange`, `onDidCreate`, `onDidDelete` 이벤트 핸들링
- `RelativePattern`으로 정확한 파일만 감시
- `_isSaving` 플래그로 자체 저장 시 이벤트 무시 (무한루프 방지)
- 300ms 디바운스 적용 (기존 `_refreshDebounceTimer` 공유)
- `_disposables`에 watcher + 이벤트 리스너 추가하여 리소스 정리

### 2. 디스크 우선 읽기 전략 도입
- `loadTodoContentFromDisk()` / `loadMemoContentFromDisk()` 신규 메서드 추가
  - `fs.readFileSync`로 항상 디스크의 실제 파일 내용 반환
  - VS Code 텍스트 버퍼 캐시를 우회
- FileSystemWatcher 이벤트, `onDidSaveTextDocument`, `onDidChangeViewState`(탭 복귀)에서는 디스크 우선 읽기 사용

### 3. 버퍼 우선 로드 조건 변경
- `loadTodoContent()` / `loadMemoContent()` 수정
- 기존: 열린 문서가 있으면 무조건 `getText()` 반환 → 캐시 문제 원인
- 변경: 열린 문서가 `isDirty` (미저장 편집 중)일 때만 버퍼 사용
- dirty가 아니면 `loadTodoContentFromDisk()`로 폴백 → 항상 최신 디스크 내용 보장

### 변경 파일
- `src/editor/editors/todoViewerEditor.js`
- `src/editor/editors/memoViewerEditor.js`
