# 081. 인스트럭션 마법사 기능 보완 (v1.3.1)

## 개요
인스트럭션 생성 기능의 이름을 "인스트럭션 생성 마법사"로 변경하고, 중복 반영 방지 로직을 추가하며, 버튼을 instruction 카테고리로 이동하였다.

## 변경 사항

### 1. 명령 이름 변경
- `package.json`의 command title: "작업 관리 인스트럭션 생성" → "인스트럭션 생성 마법사"

### 2. 중복 반영 방지 로직 추가
- `src/extension.js`의 `wizCopilot.generateTaskInstruction` 핸들러에 중복 감지 로직 추가
- `copilot-instructions.md` 파일이 이미 존재하고 "Task 기반 작업 관리" 문구가 포함된 경우 안내 메시지를 표시하고 작업을 중단

### 3. 인라인 버튼 위치 이동
- `package.json` `view/item/context` 메뉴에서 인스트럭션 마법사 버튼의 `viewItem` 조건을 `taskCategory` → `copilotCategory`로 변경
- instruction 카테고리 옆에 sparkle 아이콘으로 표시
