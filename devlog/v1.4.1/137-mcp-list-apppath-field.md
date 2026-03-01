# 137. MCP list 도구 appPath 상대경로 필드 추가 (v1.4.1)

## 개요
MCP 앱 목록 도구의 반환값에 `appPath` 필드를 추가하여, 다른 도구에서 바로 사용할 수 있는 상대경로를 제공.

## 변경 사항

### 1. `_scanApps()` 헬퍼 개선
- `src/mcp/helpers.js`의 `_scanApps(dirPath, category, srcPath)` — 세 번째 파라미터 `srcPath` 추가
- `srcPath` 전달 시 `appPath = path.relative(srcPath, entryPath)` 계산하여 결과 객체에 포함
- 경로 구분자를 `/`로 정규화 (`replace(/\\/g, '/')`)

### 2. `sourceListApps` 업데이트
- `src/mcp/handlers/source.js`: `_scanApps()` 호출 시 `srcPath` 전달
- 반환 예: `{ name: "page.agent", appPath: "app/page.agent", path: "/abs/..." }`

### 3. `packageListApps` 업데이트
- `src/mcp/handlers/package.js`: `_scanApps()` 호출 시 `srcPath` 전달
- 반환 예: `{ name: "login", appPath: "portal/season/app/login", path: "/abs/..." }`

### 4. `projectSearchApps` 업데이트
- `src/mcp/handlers/project.js`: 포탈 패키지 직접 스캔 시 `srcPath` 전달
