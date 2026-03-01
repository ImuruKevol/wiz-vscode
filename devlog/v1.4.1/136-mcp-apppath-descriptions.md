# 136. MCP appPath 파라미터 설명 보강 (v1.4.1)

## 개요
MCP 도구의 `appPath` 파라미터 description에 지원 형식 예시를 추가하여 AI agent가 올바른 경로 형식을 사용하도록 안내.

## 변경 사항

### 1. Source 도구 appPath 설명 업데이트
- `src/mcp/definitions.js` 내 Source 계열 8개 도구의 appPath 설명 업데이트
- 대상: `wiz_source_app_info`, `wiz_source_update_app`, `wiz_source_delete_app`, `wiz_source_list_files`, `wiz_source_read_file`, `wiz_source_write_file`, `wiz_source_delete_file`, `wiz_source_rename_file`
- 형식 예시 추가: `"page.home"`, `"app/page.home"`, `"src/app/page.home"`, `"route/my-api"`

### 2. Package 도구 appPath 설명 업데이트
- Package 계열 8개 도구의 appPath 설명 업데이트
- 대상: `wiz_package_app_info`, `wiz_package_update_app`, `wiz_package_delete_app`, `wiz_package_list_files`, `wiz_package_read_file`, `wiz_package_write_file`, `wiz_package_delete_file`, `wiz_package_rename_file`
- 형식 예시 추가: `"login"`, `"portal/season/app/login"`, `"src/portal/season/app/login"`
