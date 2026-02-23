# 078. 작업 관리 카테고리 및 인스트럭션 생성 기능 (v1.3.1)

## 개요
Copilot 탐색기에 작업 관리(Task) 전용 카테고리를 추가하고, `.github/copilot-instructions.md`에 Task 기반 작업 관리 인스트럭션을 자동 생성하는 기능을 구현하였다.

## 변경 사항

### 1. Copilot 카테고리 구조 개편
- Copilot 카테고리 명칭을 "instruction"으로 변경 (아이콘: book)
- `.github/task` 폴더를 instruction 카테고리에서 필터링하여 숨김
- 새로운 TaskCategory 추가 (이름: "작업 관리", 아이콘: tasklist)
- TaskCategory에 `.github/task` 폴더의 파일/폴더 표시

### 2. 인라인 버튼 및 컨텍스트 메뉴
- `wizCopilot.generateTaskInstruction` 커맨드 등록 (아이콘: sparkle)
- 작업 관리 카테고리 항목에 인라인 버튼으로 표시
- taskCategory에 파일 탐색기 기본 메뉴 추가 (새 파일, 새 폴더, 붙여넣기, 업로드)

### 3. 인스트럭션 자동 생성
- 마커 기반(`<!-- WIZ_TASK_FORCED_START -->`, `<!-- WIZ_TASK_REFER_START -->`) 삽입/갱신
- Forced Instruction: 파일 상단에 Task 기반 작업 관리 요약 블록 삽입
- Refer Instruction: 파일 하단에 상세 Task 관리 규칙 섹션 삽입
- 이미 마커가 존재하면 해당 영역만 갱신 (중복 방지)
- 생성 완료 후 해당 파일을 에디터에서 자동 열기
