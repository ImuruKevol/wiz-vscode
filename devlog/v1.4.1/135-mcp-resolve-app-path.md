# 135. MCP `_resolveAppPath` 경로 해석 개선 (v1.4.1)

## 개요
MCP 도구의 `appPath` 파라미터 경로 해석 로직을 개선하여 bare app name(예: `page.agent`)을 포함한 다양한 형식을 지원하도록 수정.

## 변경 사항

### 1. `_resolveAppPath()` 다중 경로 탐색 구현
- `src/mcp/helpers.js`의 `_resolveAppPath()` 메서드를 전면 재작성
- 기존: `src/{appPath}` fallback만 존재하여 `page.agent` → `src/page.agent`로 잘못 해석
- 변경: 10단계 탐색 순서 구현
  1. 절대경로 → 그대로 반환
  2. `src/` 접두사 → 프로젝트 루트에 합침
  3. 프로젝트 루트 직접 경로 확인
  4. `src/{appPath}` (src 하위 상대경로)
  5. `src/app/{appPath}` (Source Apps: page.*, component.*, layout.*)
  6. `src/route/{appPath}` (Source Routes)
  7. `{type}.{name}` 패턴 → `src/{type}/{appPath}` (타입별 디렉토리 탐색)
  8. `src/portal/*/app/{appPath}` (Portal App glob 탐색)
  9. `src/portal/*/route/{appPath}` (Portal Route glob 탐색)
  10. Fallback: `src/{appPath}`
- 영향 범위: appPath를 사용하는 모든 20개 도구에 자동 적용
