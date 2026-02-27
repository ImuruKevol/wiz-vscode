# 130. MCP 프로젝트 스위칭 UI 동기화 (v1.3.3)

## 개요
MCP 서버에서 `wiz_project_switch`로 프로젝트를 전환하면 `.vscode/.wiz-state.json`이 업데이트되는데, 이 파일 변경을 익스텐션이 감지하여 Explorer UI를 자동 동기화.

## 변경 사항

### 1. State File Watcher 추가 (`src/extension.js`)
- `vscode.workspace.createFileSystemWatcher()`로 `.vscode/.wiz-state.json` 파일 감시
- 파일 변경/생성 시 500ms 디바운스 후 상태 읽기
- 가장 최근 세션의 `currentProject`가 현재와 다르면 `updateProjectRoot()` 호출로 UI 갱신
- 워크스페이스 변경 시 watcher 자동 재설정

### 2. 동기화 흐름
```
MCP: projectSwitch() → _saveState() → .wiz-state.json 쓰기
                                            ↓
Extension: FileSystemWatcher → handleStateChange() → currentProject 갱신 → updateProjectRoot()
                                                                                    ↓
                                                                    Explorer/Info/Task 뷰 자동 새로고침
```

## 관련 파일
- `src/extension.js`
