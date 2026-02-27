# 120. 에디터 파일 동기화 새로고침 동작 수정 (v1.3.3)

## 개요
FN-20260227-0001에서 추가한 FileSystemWatcher 기반 외부 파일 변경 감지의 실제 UI 갱신이 동작하지 않는 문제를 수정.

## 변경 사항

### 1. 디바운스 적용 (3개 에디터 공통)
- watcher 이벤트 직후 파일을 읽으면 쓰기가 완료되지 않은 상태일 수 있는 타이밍 문제 해결
- 300ms 디바운스 추가하여 연속 이벤트 병합 및 파일 쓰기 완료 보장
- `_refreshDebounceTimer` 필드 추가, `onDispose()`에서 타이머 정리

### 2. `onDidCreate` 이벤트 추가 (TodoViewerEditor, MemoViewerEditor)
- 파일 삭제 후 재생성 시 기존 `onDidChange`만으로는 감지 불가
- `onDidCreate` 이벤트도 동일 디바운스 핸들러에 연결
- WorkedReviewEditor는 이미 `onDidCreate` 처리 되어 있었음

### 3. 패널 가시성 변경 시 최신화 (3개 에디터 공통)
- `panel.onDidChangeViewState` 핸들러 추가
- 패널이 다시 보이게 될 때 (탭 전환 복귀 등) 파일을 재로드하여 webview에 전달
- `_isSaving` 플래그 체크로 자체 저장과의 충돌 방지

### 변경 파일
- `src/editor/editors/todoViewerEditor.js`
- `src/editor/editors/memoViewerEditor.js`
- `src/editor/editors/workedReviewEditor.js`
