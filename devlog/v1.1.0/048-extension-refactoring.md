# 048. Extension.js 리팩토링

## 개요
extension.js에 남아있던 비즈니스 로직을 서비스 매니저로 이동하여 코드를 더욱 간결하게 정리했습니다.

## 변경 사항

### 1. NavigationManager로 이동된 기능

**파일:** `src/services/app/navigationManager.js`

#### switchFile(type)
파일 타입별 전환 기능:
- info, controller, ui, component, scss, api, socket 타입 지원
- wiz:// URI 생성 및 문서 열기
- 파일이 없으면 자동 생성

#### resolveCurrentAppPath()
현재 활성화된 앱 경로 해석:
- 텍스트 에디터의 URI 분석
- Webview 활성화 상태 확인
- wiz:// 스킴 처리

#### showAppMenu()
앱 파일 메뉴 표시:
- 존재하는 파일만 QuickPick으로 표시
- 선택 시 해당 파일로 전환

### 2. ProjectManager로 이동된 기능

**파일:** `src/services/project/projectManager.js`

#### showProjectMenu(currentProject)
프로젝트 관리 메뉴 표시:
- 프로젝트 목록 표시
- Git 불러오기
- 파일 불러오기
- 내보내기
- 삭제

반환값: `{action, projectName}` 객체로 extension.js에서 상태 업데이트

### 3. Extension.js 변경사항

#### 제거된 함수
- `switchFile(type)` - NavigationManager로 이동
- `resolveCurrentAppPath()` - NavigationManager로 이동

#### 간소화된 커맨드 핸들러

**Before:**
```javascript
['wizExplorer.switch.info', () => switchFile('info')]

['wizExplorer.switchProject', async () => {
    // 100줄 이상의 프로젝트 관리 로직
}]
```

**After:**
```javascript
['wizExplorer.switch.info', () => navigationManager.switchFile('info')]

['wizExplorer.switchProject', async () => {
    const result = await projectManager.showProjectMenu(currentProject);
    if (result?.action === 'switch') {
        currentProject = result.projectName;
        updateProjectRoot();
    }
}]
```

### 4. NavigationManager 생성자 옵션 추가

```javascript
const navigationManager = new NavigationManager({
    getWorkspaceRoot: () => fileExplorerProvider.workspaceRoot,
    openInfoEditor: (appPath) => appEditorProvider.openInfoEditor(appPath, appContextListener),
    getActiveEditor: () => appEditorProvider.activeEditor,
    closeWebview: () => appEditorProvider.closeWebview?.() || appEditorProvider.currentWebviewPanel?.dispose()
});
```

## 코드 축소 효과

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| extension.js 라인 수 | ~695줄 | ~549줄 |
| switchProject 핸들러 | ~90줄 | ~15줄 |
| 파일 전환 함수 | ~60줄 | 1줄 (위임) |
