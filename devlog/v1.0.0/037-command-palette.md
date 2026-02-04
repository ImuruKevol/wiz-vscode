# 037. 커맨드 팔레트 기능 추가

## 개요
VS Code 커맨드 팔레트(Ctrl+Shift+P)에서 Wiz Extension의 주요 기능에 빠르게 접근할 수 있도록 기능을 확장했습니다.

## 변경 사항

### 1. package.json - 신규 명령어 등록
새로 추가된 커맨드 팔레트용 명령어:

| 명령어 ID | 표시 이름 | 설명 |
|-----------|-----------|------|
| `wizExplorer.build` | Wiz: Build Project | 빌드 타입 선택 후 빌드 |
| `wizExplorer.normalBuild` | Wiz: Normal Build | 일반 빌드 직접 실행 |
| `wizExplorer.cleanBuild` | Wiz: Clean Build | 클린 빌드 직접 실행 |
| `wizExplorer.showBuildOutput` | Wiz: Show Build Output | 빌드 출력 채널 표시 |
| `wizExplorer.switchProject` | Wiz: Switch Project | 프로젝트 전환 |
| `wizExplorer.exportCurrentProject` | Wiz: Export Current Project | 현재 프로젝트 내보내기 |
| `wizExplorer.importProject` | Wiz: Import Project | .wizproject 파일 가져오기 |
| `wizExplorer.refresh` | Wiz: Refresh Explorer | 탐색기 새로고침 |
| `wizExplorer.newPackage` | Wiz: Create New Package | 새 패키지 생성 |
| `wizExplorer.goToApp` | Wiz: Go to App | 앱 이름으로 검색/이동 |
| `wizExplorer.showAppMenu` | Wiz: Switch App File | 앱 파일 전환 메뉴 |
| `wizExplorer.openAppInfo` | Wiz: Open App Info | 현재 앱의 Info 에디터 열기 |
| `wizExplorer.copyCurrentTemplate` | Wiz: Copy Current App Template | 현재 앱의 Template 값 복사 |
| `wizExplorer.revealInWizExplorer` | Wiz: Reveal in Wiz Explorer | Wiz 탐색기에서 파일 선택 |
| `wizExplorer.createPage` | Wiz: Create New Page | 새 Page 앱 생성 |
| `wizExplorer.createComponent` | Wiz: Create New Component | 새 Component 앱 생성 |
| `wizExplorer.createWidget` | Wiz: Create New Widget | 새 Widget 앱 생성 |
| `wizExplorer.createLayout` | Wiz: Create New Layout | 새 Layout 앱 생성 |
| `wizExplorer.createRoute` | Wiz: Create New Route | 새 Route 생성 |
| `wizExplorer.openFolder` | Wiz: Open Workspace Folder | 워크스페이스 폴더 열기 |

### 2. package.json - commandPalette 메뉴 설정
- 글로벌 명령어는 `workspaceFolderCount > 0` 조건으로 표시
- 앱 관련 명령어는 `wizExplorer:isAppFile` 조건으로 표시
- 컨텍스트 메뉴 전용 명령어는 `when: "false"`로 팔레트에서 숨김

### 3. extension.js - 신규 핸들러 구현

#### 빌드 관련
- `normalBuild`: 메뉴 선택 없이 바로 일반 빌드 실행
- `cleanBuild`: 메뉴 선택 없이 바로 클린 빌드 실행
- `showBuildOutput`: 빌드 출력 채널 표시

#### 프로젝트 관련
- `exportCurrentProject`: 현재 선택된 프로젝트를 바로 내보내기
- `importProject`: .wizproject 파일 선택 및 가져오기

#### 앱 탐색
- `goToApp`: 프로젝트 내 모든 앱을 검색하여 선택하면 Info 에디터로 열기
  - 표준 앱 (page, component, widget, layout)
  - Route 앱
  - Portal 앱
- `openAppInfo`: 현재 열린 앱 파일의 Info 에디터 열기
- `copyCurrentTemplate`: 현재 앱의 template 값 클립보드에 복사
- `revealInWizExplorer`: 현재 파일을 Wiz Explorer에서 선택

#### 앱 생성 단축키
- `createPage`, `createComponent`, `createWidget`, `createLayout`, `createRoute`
- 트리뷰 없이 커맨드 팔레트에서 직접 앱 생성 가능

## 기술적 세부사항

### goToApp 구현
```javascript
// 모든 앱 디렉토리를 스캔하여 app.json이 있는 폴더를 찾음
function scanApps(dirPath, category) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const appJsonPath = path.join(dirPath, entry.name, 'app.json');
            if (fs.existsSync(appJsonPath)) {
                const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                apps.push({
                    label: `$(icon) ${appJson.title}`,
                    description: appJson.id,
                    detail: category,
                    appPath: path.join(dirPath, entry.name)
                });
            }
        }
    }
}
```

### commandPalette when 조건 패턴
```json
{
  "command": "wizExplorer.goToApp",
  "when": "workspaceFolderCount > 0"
},
{
  "command": "wizExplorer.openAppInfo",
  "when": "wizExplorer:isAppFile"
},
{
  "command": "wizExplorer.newFile",
  "when": "false"  // 팔레트에서 숨김
}
```

## 사용 예시

1. **앱으로 빠르게 이동**: `Ctrl+Shift+P` → "Wiz: Go to App" → 앱 이름 검색
2. **프로젝트 빌드**: `Ctrl+Shift+P` → "Wiz: Normal Build" 또는 "Wiz: Clean Build"
3. **새 앱 생성**: `Ctrl+Shift+P` → "Wiz: Create New Page/Component/Widget/Layout/Route"
4. **현재 앱 정보 보기**: `Ctrl+Shift+P` → "Wiz: Open App Info"

## 결론
커맨드 팔레트를 통해 마우스 없이 키보드만으로도 Wiz Extension의 주요 기능을 빠르게 사용할 수 있게 되었습니다.
