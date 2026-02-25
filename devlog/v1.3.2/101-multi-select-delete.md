# 101. 파일 다중 선택 삭제 (v1.3.2)

## 개요
트리 뷰에서 다중 선택된 파일/폴더를 한번에 삭제하는 기능 추가.

## 변경 사항

### 1. FileManager에 deleteMultiple 메서드 추가 (`src/services/file/fileManager.js`)
- `deleteMultiple(paths, options)`: 경로 배열을 받아 일괄 삭제
- 단일 항목이면 기존 `delete()` 메서드에 위임
- 다중 항목: 항목 수와 파일명 목록을 보여주는 확인 다이얼로그
- 각 항목 삭제 후 `onDeleted` 콜백 호출 (에디터 정리 등)
- 개별 실패 시 에러 메시지 표시 후 나머지 계속 처리

### 2. 삭제 커맨드 핸들러 업데이트 (`src/extension.js`)
- `wizExplorer.delete` 핸들러: `(node, selectedNodes)` 시그니처로 변경
- VS Code 다중 선택 시 두 번째 인자로 선택된 노드 배열 전달
- `selectedNodes.length > 1`이면 다중 삭제, 아니면 단일 삭제
