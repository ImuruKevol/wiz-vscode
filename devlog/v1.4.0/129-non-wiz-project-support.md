# 129. 비-WIZ 프로젝트 기능 지원 (v1.4.0)

## 개요
WIZ 프로젝트가 아닌 일반 프로젝트에서도 작업 관리(wizTask)와 인스트럭션(wizInstruction) 기능을 사용할 수 있도록 지원. WIZ 전용 기능은 자동으로 숨김 처리.

## 변경 사항

### 1. WIZ 프로젝트 자동 감지 (`src/extension.js`)
- `updateProjectRoot()`에서 `project/` 폴더 존재 여부로 WIZ 프로젝트 판별
- `fileExplorerProvider.isWizProject` 속성 설정
- `vscode.commands.executeCommand('setContext', 'wiz.isWizProject', ...)` 로 VS Code 컨텍스트 설정
- 비-WIZ 시 `wizRoot`를 워크스페이스 폴더로 설정하여 `.github/` 경로 접근 가능

### 2. 메인 탐색기 분기 (`src/explorer/fileExplorerProvider.js`)
- `isWizProject` 속성 추가
- 비-WIZ일 때 Source/Portal/Project/Config 카테고리 대신 "WIZ 프로젝트가 아닙니다" 메시지 표시

### 3. INFO 뷰 분기 (`src/explorer/models/categoryHandlers.js`)
- `SettingsCategory.getChildren()`에서 비-WIZ일 때 최소 항목만 표시
  - "WIZ 프로젝트가 아닙니다" 경고 + 버전 정보
  - WIZ 전용 항목(프로젝트명, README, MCP, 빌드, pip, npm 등) 숨김

### 4. WIZ 전용 버튼 조건부 표시 (`package.json`)
- `wizExplorer.build`: `wiz.isWizProject` 조건 추가
- `wizExplorer.switchProject`: `wiz.isWizProject` 조건 추가

### 5. 작업관리/인스트럭션 뷰 — 변경 없음
- `InstructionCategory`와 `TaskCategory`는 `wizRoot` 기반으로 동작
- 비-WIZ에서도 `wizRoot = workspaceRoot`로 설정되어 `.github/` 하위 파일 자동 탐색

## 관련 파일
- `src/extension.js`
- `src/explorer/fileExplorerProvider.js`
- `src/explorer/models/categoryHandlers.js`
- `package.json`
