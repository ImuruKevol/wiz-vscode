# 084. Copilot Explorer 메모리 누수 수정 (v1.3.1)

## 개요
Copilot Explorer 분리 후 `onDidChangeTreeData` 이벤트 리스너가 fileExplorerProvider의 모든 refresh를 copilotExplorerProvider에 연쇄 전파하여 발생하는 메모리 고갈 문제를 수정하였다.

## 변경 사항

### 1. 블랭킷 이벤트 리스너 제거 (`src/extension.js`)
- `fileExplorerProvider.onDidChangeTreeData(() => copilotExplorerProvider.refresh())` 리스너 제거
- 이 리스너는 소스 파일 변경, MCP 상태 변경, 버전 체크, `_deferRefresh()` (가상 폴더 생성) 등 copilot과 무관한 모든 refresh에서 copilot 트리까지 연쇄 재빌드를 유발
- 특히 `_deferRefresh()` → `refresh()` → 리스너 → copilot `refresh()` → 양쪽 트리 재빌드 사이클이 반복되어 메모리 고갈의 직접 원인

### 2. 타겟팅된 Copilot Refresh 추가 (`src/extension.js`)
- `fileManager.onRefresh` 콜백에 `copilotExplorerProvider.refresh()` 추가
  - 파일 생성/삭제/이름변경/복사/붙여넣기 등 `.github` 파일 작업 시 copilot 트리도 갱신
- `updateProjectRoot()` 함수의 두 경로 (워크스페이스 없음 / 프로젝트 전환) 모두에 `copilotExplorerProvider.refresh()` 추가
  - 프로젝트 전환 시 copilot 트리도 새 프로젝트의 `.github` 내용으로 갱신
- 기존 `wizCopilot.refresh` 커맨드 (수동 새로고침) 유지

### 3. 불필요한 Copilot Refresh 차단
- `_deferRefresh()` (가상 폴더 생성 후 디바운스 refresh) — copilot 연쇄 없음
- `mcpManager.onStateChange` (MCP 설정 변경) — copilot 연쇄 없음
- 최신 버전 확인 후 refresh — copilot 연쇄 없음
- `sourceManager`, `packageManager`, `projectManager` 의 `onRefresh` — copilot 연쇄 없음

## 원인 분석
기존 아키텍처에서 `fileExplorerProvider`의 `_deferRefresh()`는 가상 폴더 생성 후 100ms 디바운스로 `refresh()`를 호출하는데, 이 refresh가 `onDidChangeTreeData` 이벤트를 fire하면 블랭킷 리스너가 `copilotExplorerProvider.refresh()`를 동기적으로 호출하여 양쪽 트리 모두 재빌드. 파일 저장마다 빌드 트리거 → refresh → copilot refresh → 객체 생성이 누적되어 시간이 지나면 메모리 고갈로 트리가 멈추는 현상 발생.
