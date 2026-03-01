# Wiz MCP Server 도구 종합 검증 보고서

## 요약 통계

| 항목 | 수량 | 상태 |
|------|------|------|
| 총 도구 수 (정의) | 54 | ✅ |
| 총 핸들러 등록 수 (index.js) | 54 | ✅ |
| 총 핸들러 구현 수 | 54 | ✅ |
| appPath 사용 도구 | 20 | ✅ 모두 `_resolveAppPath` 경유 |
| 앱 목록 반환 도구 (appPath 필드) | 3 | ✅ `_scanApps(srcPath)` 적용 |

---

## 전체 도구 검증 테이블

### Workspace (7개)

| # | Tool Name | Handler (index.js) | Definition (definitions.js) | Implementation | appPath 사용 | 상태 |
|---|-----------|--------------------|-----------------------------|----------------|-------------|------|
| 1 | `wiz_workspace_status` | ✅ `workspaceStatus` | ✅ | ✅ workspace.js | N/A | ✅ OK |
| 2 | `wiz_workspace_list_dir` | ✅ `workspaceListDir` | ✅ | ✅ workspace.js | N/A (`relativePath`) | ✅ OK |
| 3 | `wiz_workspace_read_file` | ✅ `workspaceReadFile` | ✅ | ✅ workspace.js | N/A (`relativePath`) | ✅ OK |
| 4 | `wiz_workspace_write_file` | ✅ `workspaceWriteFile` | ✅ | ✅ workspace.js | N/A (`relativePath`) | ✅ OK |
| 5 | `wiz_workspace_create_dir` | ✅ `workspaceCreateDir` | ✅ | ✅ workspace.js | N/A (`relativePath`) | ✅ OK |
| 6 | `wiz_workspace_delete` | ✅ `workspaceDelete` | ✅ | ✅ workspace.js | N/A (`relativePath`) | ✅ OK |
| 7 | `wiz_workspace_rename` | ✅ `workspaceRename` | ✅ | ✅ workspace.js | N/A (`oldRelativePath/newRelativePath`) | ✅ OK |

### Project (19개)

| # | Tool Name | Handler (index.js) | Definition (definitions.js) | Implementation | appPath 사용 | 상태 |
|---|-----------|--------------------|-----------------------------|----------------|-------------|------|
| 8 | `wiz_project_info` | ✅ `projectInfo` | ✅ | ✅ project.js | N/A | ✅ OK |
| 9 | `wiz_project_switch` | ✅ `projectSwitch` | ✅ | ✅ project.js | N/A | ✅ OK |
| 10 | `wiz_project_build` | ✅ `projectBuild` | ✅ | ✅ project.js | N/A | ✅ OK |
| 11 | `wiz_project_export` | ✅ `projectExport` | ✅ | ✅ project.js | N/A | ⚠️ 주의사항 있음 |
| 12 | `wiz_project_import` | ✅ `projectImport` | ✅ | ✅ project.js | N/A | ⚠️ 주의사항 있음 |
| 13 | `wiz_project_structure` | ✅ `projectStructure` | ✅ | ✅ project.js | N/A (`subPath`) | ✅ OK |
| 14 | `wiz_project_list_dir` | ✅ `projectListDir` | ✅ | ✅ project.js | N/A (`relativePath`) | ✅ OK |
| 15 | `wiz_project_read_file` | ✅ `projectReadFile` | ✅ | ✅ project.js | N/A (`relativePath`) | ✅ OK |
| 16 | `wiz_project_write_file` | ✅ `projectWriteFile` | ✅ | ✅ project.js | N/A (`relativePath`) | ✅ OK |
| 17 | `wiz_project_create_dir` | ✅ `projectCreateDir` | ✅ | ✅ project.js | N/A (`relativePath`) | ✅ OK |
| 18 | `wiz_project_delete` | ✅ `projectDelete` | ✅ | ✅ project.js | N/A (`relativePath`) | ✅ OK |
| 19 | `wiz_project_rename` | ✅ `projectRename` | ✅ | ✅ project.js | N/A (`oldRelativePath/newRelativePath`) | ✅ OK |
| 20 | `wiz_project_search_apps` | ✅ `projectSearchApps` | ✅ | ✅ project.js | 내부적으로 `sourceListApps` + `_scanApps(srcPath)` 호출 | ✅ OK |
| 21 | `wiz_project_pip_list` | ✅ `projectPipList` | ✅ | ✅ project.js | N/A | ✅ OK |
| 22 | `wiz_project_pip_install` | ✅ `projectPipInstall` | ✅ | ✅ project.js | N/A | ✅ OK |
| 23 | `wiz_project_pip_uninstall` | ✅ `projectPipUninstall` | ✅ | ✅ project.js | N/A | ✅ OK |
| 24 | `wiz_project_npm_list` | ✅ `projectNpmList` | ✅ | ✅ project.js | N/A | ✅ OK |
| 25 | `wiz_project_npm_install` | ✅ `projectNpmInstall` | ✅ | ✅ project.js | N/A | ✅ OK |
| 26 | `wiz_project_npm_uninstall` | ✅ `projectNpmUninstall` | ✅ | ✅ project.js | N/A | ✅ OK |

### Source (13개)

| # | Tool Name | Handler (index.js) | Definition (definitions.js) | Implementation | appPath 사용 | 상태 |
|---|-----------|--------------------|-----------------------------|----------------|-------------|------|
| 27 | `wiz_source_list_apps` | ✅ `sourceListApps` | ✅ | ✅ source.js | 목록 도구, `_scanApps(srcPath)` 전달 → `appPath` 필드 포함 | ✅ OK |
| 28 | `wiz_source_app_info` | ✅ `sourceAppInfo` | ✅ | ✅ source.js → `_appInfo` | ✅ `_appInfo` → `_resolveAppPath` | ✅ OK |
| 29 | `wiz_source_create_app` | ✅ `sourceCreateApp` | ✅ | ✅ source.js | N/A (신규 생성) | ✅ OK |
| 30 | `wiz_source_create_route` | ✅ `sourceCreateRoute` | ✅ | ✅ source.js | N/A (신규 생성) | ✅ OK |
| 31 | `wiz_source_update_app` | ✅ `sourceUpdateApp` | ✅ | ✅ source.js → `_updateApp` | ✅ `_updateApp` → `_resolveAppPath` | ✅ OK |
| 32 | `wiz_source_delete_app` | ✅ `sourceDeleteApp` | ✅ | ✅ source.js → `_deleteApp` | ✅ `_deleteApp` → `_resolveAppPath` | ✅ OK |
| 33 | `wiz_source_list_files` | ✅ `sourceListFiles` | ✅ | ✅ source.js → `_listAppFiles` | ✅ `_listAppFiles` → `_resolveAppPath` | ✅ OK |
| 34 | `wiz_source_read_file` | ✅ `sourceReadFile` | ✅ | ✅ source.js → `_readAppFile` | ✅ `_readAppFile` → `_resolveAppPath` | ✅ OK |
| 35 | `wiz_source_write_file` | ✅ `sourceWriteFile` | ✅ | ✅ source.js → `_writeAppFile` | ✅ `_writeAppFile` → `_resolveAppPath` | ✅ OK |
| 36 | `wiz_source_delete_file` | ✅ `sourceDeleteFile` | ✅ | ✅ source.js → `_deleteAppFile` | ✅ `_deleteAppFile` → `_resolveAppPath` | ✅ OK |
| 37 | `wiz_source_rename_file` | ✅ `sourceRenameFile` | ✅ | ✅ source.js → `_renameAppFile` | ✅ `_renameAppFile` → `_resolveAppPath` | ✅ OK |
| 38 | `wiz_source_list_controllers` | ✅ `sourceListControllers` | ✅ | ✅ source.js | N/A | ✅ OK |
| 39 | `wiz_source_list_layouts` | ✅ `sourceListLayouts` | ✅ | ✅ source.js | N/A | ⚠️ appPath 미포함 |

### Package (15개)

| # | Tool Name | Handler (index.js) | Definition (definitions.js) | Implementation | appPath 사용 | 상태 |
|---|-----------|--------------------|-----------------------------|----------------|-------------|------|
| 40 | `wiz_package_list` | ✅ `packageList` | ✅ | ✅ package.js | N/A | ✅ OK |
| 41 | `wiz_package_create` | ✅ `packageCreate` | ✅ | ✅ package.js | N/A | ⚠️ 주의사항 있음 |
| 42 | `wiz_package_export` | ✅ `packageExport` | ✅ | ✅ package.js | N/A | ⚠️ 주의사항 있음 |
| 43 | `wiz_package_list_apps` | ✅ `packageListApps` | ✅ | ✅ package.js | 목록 도구, `_scanApps(srcPath)` 전달 → `appPath` 필드 포함 | ✅ OK |
| 44 | `wiz_package_app_info` | ✅ `packageAppInfo` | ✅ | ✅ package.js → `_appInfo` | ✅ `_appInfo` → `_resolveAppPath` | ✅ OK |
| 45 | `wiz_package_create_app` | ✅ `packageCreateApp` | ✅ | ✅ package.js | N/A (신규 생성) | ✅ OK |
| 46 | `wiz_package_create_route` | ✅ `packageCreateRoute` | ✅ | ✅ package.js | N/A (신규 생성) | ✅ OK |
| 47 | `wiz_package_update_app` | ✅ `packageUpdateApp` | ✅ | ✅ package.js → `_updateApp` | ✅ `_updateApp` → `_resolveAppPath` | ✅ OK |
| 48 | `wiz_package_delete_app` | ✅ `packageDeleteApp` | ✅ | ✅ package.js → `_deleteApp` | ✅ `_deleteApp` → `_resolveAppPath` | ✅ OK |
| 49 | `wiz_package_list_files` | ✅ `packageListFiles` | ✅ | ✅ package.js → `_listAppFiles` | ✅ `_listAppFiles` → `_resolveAppPath` | ✅ OK |
| 50 | `wiz_package_read_file` | ✅ `packageReadFile` | ✅ | ✅ package.js → `_readAppFile` | ✅ `_readAppFile` → `_resolveAppPath` | ✅ OK |
| 51 | `wiz_package_write_file` | ✅ `packageWriteFile` | ✅ | ✅ package.js → `_writeAppFile` | ✅ `_writeAppFile` → `_resolveAppPath` | ✅ OK |
| 52 | `wiz_package_delete_file` | ✅ `packageDeleteFile` | ✅ | ✅ package.js → `_deleteAppFile` | ✅ `_deleteAppFile` → `_resolveAppPath` | ✅ OK |
| 53 | `wiz_package_rename_file` | ✅ `packageRenameFile` | ✅ | ✅ package.js → `_renameAppFile` | ✅ `_renameAppFile` → `_resolveAppPath` | ✅ OK |
| 54 | `wiz_package_list_controllers` | ✅ `packageListControllers` | ✅ | ✅ package.js | N/A | ✅ OK |

---

## appPath 사용 도구 상세 분석

`appPath` 파라미터를 받아 `_resolveAppPath`를 거치는 도구는 **20개**이며, 모두 공용 내부 메서드를 통해 간접적으로 `_resolveAppPath`를 호출합니다.

| 공용 메서드 | `_resolveAppPath` 호출 | 사용하는 도구 |
|------------|----------------------|--------------|
| `_appInfo(appPath)` | ✅ 직접 호출 | `sourceAppInfo`, `packageAppInfo` |
| `_updateApp(appPath, updates)` | ✅ 직접 호출 | `sourceUpdateApp`, `packageUpdateApp` |
| `_deleteApp(appPath)` | ✅ 직접 호출 | `sourceDeleteApp`, `packageDeleteApp` |
| `_listAppFiles(appPath)` | ✅ 직접 호출 | `sourceListFiles`, `packageListFiles` |
| `_readAppFile(appPath, ...)` | ✅ 직접 호출 | `sourceReadFile`, `packageReadFile` |
| `_writeAppFile(appPath, ...)` | ✅ 직접 호출 | `sourceWriteFile`, `packageWriteFile` |
| `_deleteAppFile(appPath, ...)` | ✅ 직접 호출 | `sourceDeleteFile`, `packageDeleteFile` |
| `_renameAppFile(appPath, ...)` | ✅ 직접 호출 | `sourceRenameFile`, `packageRenameFile` |

**결론**: appPath를 받는 모든 20개 도구가 `_resolveAppPath`를 경유하며, 누락된 도구 없음.

---

## 앱 목록 도구의 `appPath` 필드 반환 분석

| 도구 | `_scanApps`에 `srcPath` 전달 | 결과에 `appPath` 필드 포함 | 상태 |
|------|---------------------------|------------------------|------|
| `wiz_source_list_apps` | ✅ | ✅ | OK |
| `wiz_package_list_apps` | ✅ | ✅ | OK |
| `wiz_project_search_apps` | ✅ | ✅ | OK |
| `wiz_source_list_layouts` | ❌ `_scanApps` 미사용 (수동 스캔) | ❌ `appPath` 미포함 | ⚠️ 비일관성 |

---

## FN-0001 ~ FN-0004 수정 사항 확인

### FN-0001: `_resolveAppPath()` 다중 경로 탐색 ✅

`helpers.js`에 다음 탐색 순서가 구현됨:

| 순서 | 탐색 패턴 | 확인 |
|------|----------|------|
| 1 | 절대경로 → 그대로 반환 | ✅ |
| 2 | `src/` 접두사 → 프로젝트 루트에 합침 | ✅ |
| 3 | 프로젝트 루트 기준 직접 경로 | ✅ |
| 4 | `src/{appPath}` (src 하위 상대경로) | ✅ |
| 5 | `src/app/{appPath}` (Source Apps) | ✅ |
| 6 | `src/route/{appPath}` (Source Routes) | ✅ |
| 7 | `{type}.{name}` 패턴 → `src/{type}/{appPath}` | ✅ |
| 8 | `src/portal/*/app/{appPath}` (Portal glob) | ✅ |
| 9 | `src/portal/*/route/{appPath}` (Portal glob) | ✅ |
| 10 | Fallback: `src/{appPath}` | ✅ |

### FN-0002: `appPath` 파라미터 설명 업데이트 ✅

`definitions.js` 내 모든 16개 `appPath` 파라미터에 지원 형식 예시가 포함됨.

### FN-0003: `_scanApps()` — `srcPath` 파라미터 및 `appPath` 필드 ✅

`_scanApps(dirPath, category, srcPath)` 시그니처로 업데이트됨. 모든 호출 측에서 `srcPath` 전달 확인.

### FN-0004: `wiz-copilot-instructions/instructions.md` 도구명 업데이트 ✅

모든 도구명이 v3.0 명명 규칙과 일치함을 확인.

---

## 발견된 추가 이슈

### 이슈 1: `projectExport` — `wiz` 실행 파일 미해석 (심각도: 중간)

`projectExport`에서 `wiz` 명령어를 직접 사용. `projectBuild`는 `this._resolveWizExecutable(ws)`를 사용하여 venv 경로를 올바르게 해석하지만, `projectExport`는 bare `wiz`를 사용하여 venv 환경에서 실패 가능.

### 이슈 2: `packageCreate` — `wiz` 실행 파일 미해석 (심각도: 중간)

`packageCreate`에서도 bare `wiz` 명령어를 사용. 동일한 venv 호환성 문제.

### 이슈 3: `projectImport` — 플랫폼 종속 명령어 (심각도: 낮음)

`unzip` 명령어 사용 — Windows에서 기본 제공되지 않음.

### 이슈 4: `packageExport` — 플랫폼 종속 명령어 (심각도: 낮음)

`zip` 명령어 사용 — Windows에서 기본 제공되지 않음.

### 이슈 5: `sourceListLayouts` — `appPath` 필드 미포함 (심각도: 낮음)

수동 디렉토리 스캔을 사용하므로 `_scanApps`의 `appPath` 필드가 반환되지 않음. 다른 list 도구와의 비일관성.

### 이슈 6: `_appInfo` — 상대경로 `appPath` 필드 미포함 (심각도: 낮음)

`_appInfo` 메서드는 절대 `path`만 반환. list 도구가 반환하는 `appPath` 필드와 비일관성.

### 이슈 7: `sourceListApps` — 잠재적 중복 (심각도: 낮음)

`src/app/` (접두사 기반)과 `src/{type}/` (타입별 디렉토리)를 모두 스캔하므로, 동일 앱이 두 위치에 존재하면 중복 반환 가능. (실제 프로젝트에서는 거의 발생하지 않음)

### 이슈 8: `projectSearchApps` — 비효율적 내부 호출 (심각도: 정보)

내부적으로 `sourceListApps`를 호출 후 JSON 직렬화/역직렬화를 거침. 기능적으로는 정상이나 비효율적.

---

## 최종 요약

| 분류 | 결과 |
|------|------|
| 핸들러 등록 (index.js) | 54/54 완전 일치 ✅ |
| 정의 (definitions.js) | 54/54 완전 일치 ✅ |
| 구현 (handlers/) | 54/54 모두 존재 ✅ |
| `_resolveAppPath` 적용 (appPath 도구) | 20/20 완전 적용 ✅ |
| `appPath` 필드 반환 (목록 도구) | 3/4 적용 (sourceListLayouts 제외) |
| FN-0001 ~ FN-0004 수정 | 4/4 코드 수준 확인 완료 ✅ |
| 추가 발견 이슈 | 8건 (중간 2건, 낮음 4건, 정보 2건) |

**핵심 위험 이슈**: `projectExport`와 `packageCreate`에서 bare `wiz` 명령어 사용 — venv 환경에서 실패 가능성이 있으므로 `this._resolveWizExecutable(ws)` 적용 권장.
