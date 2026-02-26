# 117. 메모 TODO 반영 동작 수정 및 작업관리 메뉴 상태 유지 (v1.3.2)

## 개요
"TODO에 반영" 시 memo.md가 정상적으로 비워지지 않는 문제를 수정하고, 반영 후 메모 뷰어가 닫히고 TODO 뷰어가 열리도록 개선. 또한 `.github/task` 폴더가 없어도 작업관리 메뉴 항목이 표시되도록 변경.

## 변경 사항

### 1. 메모 TODO 반영 플로우 수정 (`src/editor/editors/memoViewerEditor.js`)
- **handleSave 호출 제거**: `confirmApplyToTodo` 핸들러에서 불필요한 `handleSave()` 사전 호출 제거. `saveComplete` 메시지에 의한 웹뷰 상태 경합 방지
- **마크다운 직접 전달**: `handleApplyToTodo(markdown)` 메서드가 웹뷰에서 전달받은 마크다운을 직접 파싱하도록 변경. 파일 I/O를 통한 중간 저장/읽기 제거
- **딜레이 추가**: todo.md 저장 후 memo.md 비우기 전(150ms), 비우기 확인(100ms), 메모 뷰어 닫기 후 TODO 뷰어 열기 전(300ms)에 딜레이 추가
- **비우기 검증**: memo.md 비우기 후 내용을 재확인하여 비어있지 않으면 재시도
- **뷰어 전환**: 웹뷰 새로고침 대신, 메모 뷰어를 `dispose()`로 닫고 딜레이 후 `TodoViewerEditor.openOrCreate()`로 TODO 뷰어를 열도록 변경

### 2. 작업관리 메뉴 폴더 미존재 시 표시 (`src/explorer/models/categoryHandlers.js`)
- `TaskCategory.getChildren()`에서 `.github/task` 폴더가 없을 때 빈 배열 대신 가상 항목 반환
- 가상 "메모" 항목: `note` 아이콘 + `(생성)` 설명, `memoFile` contextValue
- 가상 "TODO" 항목: `checklist` 아이콘 + `(생성)` 설명, `todoFile` contextValue
- 클릭 시 각 뷰어 에디터가 열리며, 첫 저장 시 디렉토리가 자동 생성됨
