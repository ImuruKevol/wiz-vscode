# 085. MCP Configuration / Copilot 탐색기 무한루프 수정 (v1.3.2)

## 개요
MCP configuration에서 mcp.json을 열었다가 닫거나, Copilot 파일트리를 반복 탐색하면 메모리 부족으로 VS Code가 멈추는 문제를 수정하였다.

## 원인 분석

### 근본 원인: `getParent()` 경계 미설정
`FileExplorerProvider.getParent()`가 `workspaceRoot` (project/{name}) 외부 경로에 대해 호출되면, 상위 디렉토리를 따라 파일시스템 루트(`/`)까지 올라간 뒤 `path.dirname('/') === '/'`로 동일 FileTreeItem을 무한 생성. VS Code TreeView가 이를 반복 호출하여 메모리 고갈.

### 트리거 1: Auto-Reveal
Copilot 트리에서 `.github` 파일 클릭 → `onDidChangeActiveTextEditor` → main explorer의 `treeView.reveal()` 호출 → `.github`은 `workspaceRoot` 밖 → `getParent()` 무한 체인.

### 트리거 2: MCP 파일 열기
`showConfig()`로 `.vscode/mcp.json` 열기 → 동일 auto-reveal 경로 → `.vscode`는 `workspaceRoot` 밖 → `getParent()` 무한 체인.

### 트리거 3: MCP Watcher 다중 발생
`FileSystemWatcher`가 mcp.json create/change/delete를 동시에 발생시키면 `_notifyState()` → `refresh()`가 디바운스 없이 연쇄 호출.

## 변경 사항

### 1. FileExplorerProvider.getParent() 경계 가드 (`src/explorer/fileExplorerProvider.js`)
- `workspaceRoot` 외부 경로에 대해 즉시 `return null` 처리
- `!fsPath.startsWith(this.workspaceRoot + path.sep) && fsPath !== this.workspaceRoot` 조건으로 판별

### 2. CopilotExplorerProvider.getParent() 경계 가드 (`src/explorer/copilotExplorerProvider.js`)
- `.github` 디렉토리 외부 경로에 대해 즉시 `return null` 처리
- 방어적 코딩으로 copilot 트리에서도 무한 체인 방지

### 3. Auto-Reveal 프로젝트 외부 파일 건너뛰기 (`src/extension.js`)
- `onDidChangeActiveTextEditor`에서 `filePath.startsWith(projectRoot + path.sep)` 확인
- `.github`, `.vscode` 등 프로젝트 외부 파일은 main explorer reveal을 시도하지 않음

### 4. McpManager._notifyState() 디바운스 (`src/services/project/mcpManager.js`)
- 200ms 디바운스 적용으로 FileSystemWatcher 다중 이벤트 시 마지막 호출만 실행
- `_notifyTimer` 필드로 타이머 관리
