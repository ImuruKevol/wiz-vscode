# 115. 메모 기능 구현 (v1.3.3)

## 개요
작업관리에 메모 기능을 추가하여, TODO 파일이 작업 실행 중 잠겨 있을 때에도 메모를 작성하고 나중에 TODO에 반영할 수 있도록 구현.

## 변경 사항

### 1. MemoViewerEditor 생성
- `src/editor/editors/memoViewerEditor.js` 신규 생성
- TodoViewerEditor와 동일한 구조 (EditorBase 상속, 싱글톤 패턴, RichEditor 활용)
- 주요 차이점:
  - 대상 파일: `memo.md` (.github/task/ 하위)
  - ID 필드 없음 — `# 제목` 형식만 사용 (FN-ID 없음)
  - 헤더: `📝 메모`
  - ViewType: `wizMemoViewer`
  - 버튼: 추가 / 저장 / 삭제 / **TODO에 반영** (리뷰반영/작업시작 대신)
- "TODO에 반영하기" 기능:
  - 현재 todo.md, worked/, reviewed/ 폴더를 스캔하여 최대 FN ID를 결정
  - 메모 항목에 순차적 FN-ID를 부여하여 todo.md에 추가
  - 반영 후 memo.md 비우기 및 웹뷰 새로고침

### 2. extension.js 라우팅 등록
- MemoViewerEditor import 추가
- `wizExplorer.openFile` 핸들러에 `memo.md` → MemoViewerEditor 라우팅 추가

### 3. categoryHandlers.js TaskCategory 업데이트
- displayNameMap에 `memo.md` → `메모` 추가
- 정렬 순서 변경: 메모(0) → TODO(1) → 검토필요(2) → 완료됨(3)
- memo.md 미존재 시 가상 항목 표시 (회색 아이콘 + "(생성)" 설명)
- memo.md에 `memoFile` contextValue 부여
