# 138. MCP 인스트럭션 도구명 불일치 수정 (v1.4.1)

## 개요
`wiz-copilot-instructions/instructions.md` 섹션 3의 MCP 도구 이름을 실제 v3.0 네이밍과 일치하도록 전면 업데이트.

## 변경 사항

### 1. 섹션 3 MCP 도구 참조표 업데이트
- `wiz-copilot-instructions/instructions.md` 섹션 3.1~3.5의 도구명을 모두 v3.0 네이밍으로 수정
- 섹션 3.1: Workspace 도구 (4→4행, `wiz_list_projects` 제거 — `wiz_workspace_status`에서 목록 반환)
- 섹션 3.2: Source/Package 도구 (11→15행, Source/Package 분리 반영)
- 섹션 3.3: 파일/디렉토리 도구 (8→12행, 범위별 분리)
- 섹션 3.5: 사용 원칙 업데이트

### 2. 본문 내 산재된 도구명 참조 수정
- ~30건의 잘못된 도구명 참조를 실제 이름으로 수정
- 예: `wiz_get_workspace_state` → `wiz_workspace_status`, `wiz_create_app` → `wiz_source_create_app`, `wiz_build` → `wiz_project_build` 등
