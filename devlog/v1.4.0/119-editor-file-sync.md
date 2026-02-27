# 119. 에디터 외부 파일 변경 자동 동기화 (v1.4.0)

## 개요
TodoViewerEditor, MemoViewerEditor, WorkedReviewEditor에서 열린 파일이 외부에서 변경될 때 Webview가 자동으로 최신화되지 않는 문제를 해결하고, 무한루프 방지 전략을 적용.

## 변경 사항

### 1. TodoViewerEditor 파일 감시 추가
- `FileSystemWatcher`로 `todo.md` 파일 변경 감시
- `_isSaving` 플래그로 자체 저장 시 watcher 이벤트 무시 (무한루프 방지)
- 외부 변경 시 `refreshContent` 메시지로 webview 갱신 (save 미트리거)
- `onDispose()`에서 watcher 정리
- 파일: `src/editor/editors/todoViewerEditor.js`

### 2. MemoViewerEditor 파일 감시 추가
- TodoViewerEditor와 동일 패턴으로 `memo.md` 파일 감시
- `_isSaving` 플래그 + `refreshContent` 패턴 적용
- 파일: `src/editor/editors/memoViewerEditor.js`

### 3. WorkedReviewEditor 디렉토리 감시 추가
- `worked/` 디렉토리 내 `*.md` 파일 변경/생성/삭제 감시
- `onDidChange`, `onDidCreate`, `onDidDelete` 모두 핸들링
- 외부 변경 시 전체 파일 목록 재로드 후 `refreshFiles` 메시지로 webview 갱신
- webview 측에서 이전 페이지 위치(fileName 기준) 보존 시도
- 파일: `src/editor/editors/workedReviewEditor.js`

### 4. 아키텍처 가이드 업데이트
- `architecture-guide.md`에 "에디터 파일 동기화 가이드라인" 섹션 추가
- 무한루프 방지 필수 구현 패턴 4가지 문서화
- 체크리스트에 `_isSaving` 적용 확인 항목 추가
- 파일: `.github/architecture-guide.md`

### 5. 무한루프 방지 전략
- **`_isSaving` 플래그**: `handleSave()` 진입 시 `true`, 500ms 후 `false` (지연 해제로 비동기 watcher 경합 방지)
- **watcher 콜백 필터링**: `_isSaving === true`이면 콜백 즉시 리턴
- **webview refresh ≠ save**: `refreshContent`/`refreshFiles` 수신 시 내부 상태만 갱신, save 메시지 미전송
