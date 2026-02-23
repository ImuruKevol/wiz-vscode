# 082. 작업 관리 카테고리 마법사 기능 추가 (v1.3.1)

## 개요
작업 관리 카테고리에 "리뷰 정리 마법사"와 "작업 실행" 인라인 버튼을 추가하여, 클릭 한 번으로 Copilot Chat을 통한 리뷰 정리 및 작업 수행이 가능하도록 하였다.

## 변경 사항

### 1. 새 명령 등록 (package.json)
- `wizCopilot.reviewWizard`: "리뷰 정리 마법사" — wand 아이콘
- `wizCopilot.runTask`: "작업 실행" — play 아이콘
- 두 명령 모두 `taskCategory` viewItem에 대한 inline 그룹으로 배치
- commandPalette에서는 숨김 처리 (`"when": "false"`)

### 2. 명령 핸들러 구현 (src/extension.js)
- `wizCopilot.reviewWizard`: Copilot Chat에 "리뷰 정리해줘" 프롬프트 전송
- `wizCopilot.runTask`: todo.md 파일을 `#file:` 참조로 첨부하여 "작업 수행해줘" 프롬프트 전송
- 두 명령 모두 Copilot Chat 미설치 시 경고 메시지 표시
