# 116. 메모 기능 수정 및 검토필요 개수 표시 (v1.3.3)

## 개요
메모 뷰어에 기본 편집기 열기 인라인 버튼을 추가하고, 작업관리 "검토필요" 항목에 하위 파일 개수를 표시하도록 개선.

## 변경 사항

### 1. 메모 파일 기본 편집기 열기 버튼 (FN-0047)
- `package.json`: `wizCopilot.openTodoInDefaultEditor` 인라인 버튼의 `when` 조건에 `memoFile` contextValue 추가
- 메모 항목에서도 `$(edit)` 아이콘 버튼으로 VS Code 기본 마크다운 편집기를 열 수 있게 됨
- `memoFile`을 copy, rename, delete, download 컨텍스트 메뉴에도 추가

### 2. 메모 TODO 반영 후 내용 삭제 (FN-0047)
- 이미 `handleApplyToTodo()`에서 `memo.md` 비우기 + 웹뷰 새로고침이 구현되어 있어 추가 작업 불필요

### 3. 검토필요 항목 파일 개수 표시 (FN-0048)
- `src/explorer/models/categoryHandlers.js` TaskCategory의 `worked` 폴더 처리 로직에 파일 개수 계산 추가
- `worked` 디렉토리 내 `.md` 파일 수를 `item.description`에 표시 (예: "3")
- 파일이 0개일 때는 description 미표시
