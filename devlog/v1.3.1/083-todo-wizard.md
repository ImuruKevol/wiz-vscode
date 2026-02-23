# 083. TODO 생성 마법사 (v1.3.1)

## 개요
작업 관리 카테고리에 "TODO 생성 마법사" 인라인 버튼을 추가하고, 기존 버튼 순서를 TODO 마법사 → 리뷰 마법사 → 작업 실행 순으로 정렬하였다.

## 변경 사항

### 1. 새 명령 등록 (package.json)
- `wizCopilot.todoWizard`: "TODO 생성 마법사" — `$(add)` 아이콘
- `taskCategory` viewItem에 `inline@1` 그룹으로 배치 (최우선 순서)
- 기존 `reviewWizard`를 `inline@2`, `runTask`를 `inline@3`으로 변경하여 순서 보장
- commandPalette에서 숨김 처리

### 2. 명령 핸들러 구현 (src/extension.js)
- `wizCopilot.todoWizard`: `showInputBox`로 다이얼로그를 표시하여 사용자 입력을 받음
- 입력된 내용을 "TODO 작성해줘" 프롬프트 아래에 이어붙여 Copilot Chat에 전송
- Copilot Chat 미설치 시 경고 메시지 표시
