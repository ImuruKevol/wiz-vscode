# 080. 인스트럭션 생성 방식 변경 — Copilot 채팅 연동 (v1.3.1)

## 개요
작업 관리 인스트럭션 생성 버튼이 copilot-instructions.md 파일을 직접 수정하던 방식에서, Copilot 채팅창에 프롬프트를 전송하여 AI가 기존 파일을 분석하고 적절히 업데이트하도록 변경하였다.

## 변경 사항

### 1. wizCopilot.generateTaskInstruction 커맨드 핸들러 전면 수정
- 기존: `fs.writeFileSync`로 마커 기반 직접 파일 수정
- 변경: `vscode.commands.executeCommand('workbench.action.chat.open', { query })` 으로 Copilot Chat에 프롬프트 전송
- 프롬프트에 Forced Instruction(상단 배치)과 Refer Instruction(하단 상세 규칙) 내용을 포함
- Copilot Chat이 없을 경우 경고 메시지 표시 (fallback)

### 2. 이점
- 기존 copilot-instructions.md 내용을 보존하면서 인스트럭션 병합 가능
- AI가 컨텍스트를 이해하고 적절한 위치에 삽입/업데이트
- 사용자가 적용 전 내용을 검토할 수 있음
