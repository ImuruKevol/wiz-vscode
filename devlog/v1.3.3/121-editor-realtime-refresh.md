# 121. 에디터 파일 동기화 — 실시간 새로고침 및 마크다운 뷰어 적용 (v1.3.3)

## 개요
`vscode.workspace.createFileSystemWatcher`가 `.github/task/` 경로의 파일 변경을 감지하지 못해 탭 전환 시에만 갱신되던 문제를 Node.js `fs.watch()` API로 교체하여 실시간 새로고침이 동작하도록 수정. MarkdownViewerEditor에도 동일 패턴 적용.

## 변경 사항

### 1. Node.js `fs.watch()` 기반 파일 감시로 전환 (4개 에디터)
- `vscode.workspace.createFileSystemWatcher` → `fs.watch()` 교체
- `fs.watch()`는 OS 레벨(Linux: inotify)에서 직접 파일 변경을 감지하므로 더 안정적
- 디렉토리 레벨에서 감시하고 파일명으로 필터링 (단일 파일 감시 안정성)
- `filename`이 null인 경우(일부 플랫폼)에도 갱신 처리
- 에러 핸들러 추가 (`this._fsWatcher.on('error', () => {})`)
- 대상: TodoViewerEditor, MemoViewerEditor, WorkedReviewEditor, MarkdownViewerEditor

### 2. MarkdownViewerEditor 개선
- 기존 `createFileSystemWatcher` → `fs.watch()` 교체
- 300ms 디바운스 추가 (기존에는 미적용)
- `panel.onDidChangeViewState` 가시성 갱신 핸들러 추가
- 타이머 정리 로직 추가

### 3. 아키텍처 가이드 업데이트
- `createFileSystemWatcher` → `fs.watch()` 패턴으로 전체 가이드 업데이트
- 디바운스 필수, 가시성 fallback, `_fsWatcher.close()` 정리 원칙 문서화
- 파일: `.github/architecture-guide.md`

### 변경 파일
- `src/editor/editors/todoViewerEditor.js`
- `src/editor/editors/memoViewerEditor.js`
- `src/editor/editors/workedReviewEditor.js`
- `src/editor/editors/markdownViewerEditor.js`
- `.github/architecture-guide.md`
