# 132. 작업 관리 인스트럭션 적용 기능 개선 (v1.4.0)

## 개요
`wizCopilot.generateTaskInstruction` 명령이 Copilot Chat에 보내는 프롬프트를 상세화하여, 인스트럭션 적용 시 완전한 작업 관리 규칙이 반영되도록 개선했다.

## 변경 사항

### 1. 인스트럭션 프롬프트 내용 확충
- **Forced Instruction** (상단 요약): 기존 장문 요약을 간결하게 변경, 하단 규칙 섹션 참조로 유도
- **Refer Instruction** (하단 상세 규칙): 기존 약식 규칙을 전면 확장
  - `src/extension.js` `wizCopilot.generateTaskInstruction` 핸들러

### 2. 추가된 상세 규칙 항목
- ⚠️ TODO 파일 경로 고정 (`.github/task/todo.md` 고정, 프로젝트 소스 내 생성 금지)
- ⚠️ "TODO 작성해줘" 명령 (신규 등록만, 실제 작업 미수행)
- 디렉토리 구조: worked/reviewed 폴더 내 파일 예시 추가
- todo.md 형식: 실제 코드 블록 예시 추가
- 작업 수행 흐름: 3단계를 4개 하위 단계로 세분화 + ⚠️ 즉시 정리 원칙
- worked 아카이브 형식: 마크다운 코드 블록 템플릿 추가
- todo 항목 추가 규칙: 3단계 절차 명시
- 특정 작업 지정 실행: 번호 지정/순서 지정 동작 규칙 (신규 섹션)
- 리뷰 정리 및 TODO 생성: 5단계 프로세스 상세 기술
