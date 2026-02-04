# 043. Services 레이어 리팩토링

## 개요
extension.js에 집중되어 있던 비즈니스 로직을 `src/services/` 레이어로 분리하여 관심사 분리(Separation of Concerns) 원칙을 적용했습니다.

## 변경 사항

### 1. Services 레이어 구조 생성

새로운 `src/services/` 디렉토리 구조:

```
src/services/
├── index.js              # 통합 Export
├── source/               # Source 카테고리
│   ├── index.js
│   └── appManager.js     # Standard App/Route 관리
├── packages/             # Packages 카테고리
│   ├── index.js
│   └── packageManager.js # Package/Portal App 관리
├── project/              # 프로젝트 관리
│   ├── index.js
│   └── projectManager.js # 프로젝트 전환/가져오기/내보내기/삭제
└── file/                 # 파일 작업
    ├── index.js
    └── fileManager.js    # 파일 CRUD 작업
```

### 2. AppManager (Source 카테고리)

**파일:** `src/services/source/appManager.js`

Standard App 및 Route 관리 담당:
- `promptAppInputs()` - App 생성 입력 프롬프트
- `promptRouteInputs()` - Route 생성 입력 프롬프트
- `createApp()` - Standard App 생성 (page, component, layout)
- `createRoute()` - Route 생성
- `createAppFromUpload()` - 업로드 파일로 App 생성
- `finalizeAppCreation()` - App 파일 복사 완료
- `showUploadWebview()` - 업로드 Webview 표시

### 3. PackageManager (Packages 카테고리)

**파일:** `src/services/packages/packageManager.js`

Package 및 Portal App 관리 담당:
- `promptPackageInputs()` - Package 생성 입력 프롬프트
- `promptPortalAppInputs()` - Portal App 생성 입력 프롬프트
- `createPortalApp()` - Portal App 생성
- `createPortalRoute()` - Portal Route 생성
- `createPackageFromUpload()` - 업로드 파일로 Package 생성
- `finalizePackageCreation()` - Package 파일 복사 완료
- `showPackageUploadWebview()` - Package 업로드 Webview 표시
- `showPortalAppUploadWebview()` - Portal App 업로드 Webview 표시

### 4. ProjectManager (프로젝트 관리)

**파일:** `src/services/project/projectManager.js`

프로젝트 수명주기 관리:
- `getProjectList()` - 프로젝트 목록 조회
- `ensureProjectFolder()` - project 폴더 확인/생성
- `deleteProject()` - 프로젝트 삭제
- `exportProject()` - 프로젝트 내보내기 (wiz CLI)
- `importFromFile()` - .wizproject 파일에서 가져오기
- `importFromGit()` - Git 저장소에서 가져오기
- `promptProjectName()` - 프로젝트 이름 입력
- `selectProject()` - 프로젝트 선택 QuickPick
- `promptGitUrl()` - Git URL 입력
- `selectProjectFile()` - .wizproject 파일 선택

### 5. FileManager (파일 작업)

**파일:** `src/services/file/fileManager.js`

파일/폴더 CRUD 작업 담당:
- `createFile()` - 새 파일 생성
- `createFolder()` - 새 폴더 생성
- `delete()` - 파일/폴더 삭제
- `copy()` - 클립보드에 복사
- `paste()` - 붙여넣기
- `rename()` - 이름 변경 (신규 기능)
- `download()` - 파일/폴더 다운로드

### 6. Core 모듈 정리

**파일:** `src/core/index.js`

- `AppCreator` 클래스 제거 (services로 이동)
- 유틸리티 모듈만 유지: Constants, PathUtils, FileUtils, UriFactory, WebviewTemplates, ZipUtils, UploadWebview

### 7. extension.js 간소화

- 약 400줄 이상의 비즈니스 로직 제거
- Manager 인스턴스 생성 및 위임으로 변경
- 커맨드 핸들러가 Manager 메서드 호출만 수행

### 8. 신규 기능 추가

**package.json 변경:**
- `wizExplorer.uploadPackage` 커맨드 추가
- `wizExplorer.rename` 커맨드 추가
- 해당 메뉴 항목 추가

## 아키텍처 원칙

이번 리팩토링에서 적용한 주요 원칙:

1. **관심사 분리 (SoC)**: UI/명령 처리와 비즈니스 로직 분리
2. **단일 책임 원칙 (SRP)**: 각 Manager는 하나의 도메인만 담당
3. **의존성 주입 (DI)**: 콜백과 설정을 생성자에서 주입
4. **Facade 패턴**: services/index.js가 통합 진입점 제공

## 마이그레이션 노트

### Before (extension.js 내부)
```javascript
const confirm = await vscode.window.showWarningMessage(...);
if (confirm === '삭제') {
    fs.rmSync(deletedPath, { recursive: true, force: true });
    // ... 많은 로직
}
```

### After (Manager 위임)
```javascript
await fileManager.delete(node.resourceUri.fsPath, {
    onDeleted: (deletedPath) => {
        if (appEditorProvider.currentAppPath === deletedPath) {
            appEditorProvider.currentWebviewPanel?.dispose();
        }
    }
});
```
