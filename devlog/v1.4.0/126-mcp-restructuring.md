# 126. MCP 구조 리팩토링 — 4개 카테고리 체계 전환 (v1.4.0)

## 개요
MCP 서버를 8개 카테고리/36개 도구에서 4개 카테고리/54개 도구 체계로 전면 재구성. 에이전트 관점에서 WIZ 프레임워크의 워크스페이스→프로젝트→소스/패키지 계층 구조를 직관적으로 탐색·편집할 수 있도록 최적화.

## 변경 사항

### 1. MCP 카테고리 재구성 (8 → 4 카테고리)
- **Workspace (7)**: 워크스페이스 상태, 프로젝트 목록, 워크스페이스 루트 기준 파일/폴더 관리
- **Project (19)**: 프로젝트 정보/빌드/전환/내보내기/가져오기, 프로젝트 루트 기준 파일/폴더 관리, pip/npm 의존성, 앱 검색
- **Source (13)**: Source App/Route CRUD, 앱 폴더 내 개별 파일 관리 (list/read/write/delete/rename), 컨트롤러/레이아웃 목록
- **Package (15)**: 패키지 관리, Portal App/Route CRUD, 앱 폴더 내 개별 파일 관리, 컨트롤러 목록

### 2. 새로운 경로 해석 체계
- `_resolveWorkspacePath(relativePath)`: 워크스페이스 루트 기준 상대 경로 해석
- `_resolveProjectPath(relativePath)`: 프로젝트 루트 기준 상대 경로 해석
- `_resolveAppPath(appPath)`: 앱 경로 해석 (상대 경로 → src/ 기준 자동 해석)
- 기존 범용 `_resolvePath()` 제거, 각 카테고리별 명확한 스코프 적용

### 3. 신규 도구 추가 (36 → 54)
- **워크스페이스 파일/폴더 관리**: `wiz_workspace_list_dir`, `wiz_workspace_read_file`, `wiz_workspace_write_file`, `wiz_workspace_create_dir`, `wiz_workspace_delete`, `wiz_workspace_rename`
- **프로젝트 파일/폴더 관리**: `wiz_project_list_dir`, `wiz_project_read_file`, `wiz_project_write_file`, `wiz_project_create_dir`, `wiz_project_delete`, `wiz_project_rename`
- **앱 내 파일 관리**: `wiz_source_list_files`, `wiz_source_delete_file`, `wiz_source_rename_file` (Package 대응 도구 포함)
- **패키지 앱 관리 확장**: `wiz_package_list_apps`, `wiz_package_app_info`, `wiz_package_update_app`, `wiz_package_delete_app`

### 4. 내부 구조 개선
- 공유 내부 메서드: `_appInfo()`, `_updateApp()`, `_deleteApp()`, `_listAppFiles()`, `_readAppFile()`, `_writeAppFile()`, `_deleteAppFile()`, `_renameAppFile()`
- Source와 Package 핸들러가 동일한 내부 메서드를 호출하여 코드 중복 최소화
- MCP 버전 2.0.0 → 3.0.0 업그레이드

### 5. 도구 네이밍 규칙 통일
- 기존: `wiz_get_workspace_state`, `wiz_build`, `wiz_list_apps` 등 비일관적 네이밍
- 변경: `wiz_{category}_{action}` 패턴으로 통일
  - 예: `wiz_workspace_status`, `wiz_project_build`, `wiz_source_list_apps`

### 6. README MCP 섹션 업데이트
- 8개 카테고리 테이블 → 4개 카테고리 테이블
- 36개 → 54개 도구 목록
- 각 카테고리별 도구 설명 및 카운트 표시

## 관련 파일
- `src/mcp/index.js`: 전면 재작성 (기존 백업: `index.js.bak`)
- `README.md`: MCP 섹션 업데이트
