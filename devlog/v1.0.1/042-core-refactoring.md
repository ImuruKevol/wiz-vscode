# 042. Core 모듈 리팩토링 (v1.0.1)

## 개요
extension.js의 중복되는 앱 생성 및 파일 처리 로직을 별도 클래스로 분리하여 재사용 가능한 구조로 리팩토링했습니다.

## 변경 사항

### 1. 새 파일 생성

#### src/core/appCreator.js
앱 생성 로직을 담당하는 클래스입니다.

**주요 메서드:**
- `promptStandardAppInputs(groupType, parentPath)` - Standard App 입력 프롬프트
- `promptPortalAppInputs(parentPath)` - Portal App 입력 프롬프트
- `createStandardApp(groupType, parentPath)` - Standard App 생성 (입력 → 파일 생성)
- `createPortalApp(parentPath)` - Portal App 생성
- `createRoute(parentPath, isPortalRoute)` - Route 생성
- `createStandardAppFromUpload(sourceDir, parentPath)` - 업로드용 Standard App 생성
- `createPortalAppFromUpload(sourceDir, parentPath)` - 업로드용 Portal App 생성
- `finalizeAppCreation(sourceDir, targetPath, appJson)` - 업로드 파일 복사 및 완료 처리

**생성자 옵션:**
```javascript
const appCreator = new AppCreator({
    workspaceRoot: fileExplorerProvider.workspaceRoot,
    onRefresh: () => fileExplorerProvider.refresh()
});
```

#### src/core/zipUtils.js
압축/해제 관련 유틸리티 클래스입니다.

**주요 메서드:**
- `compress(sourcePath, outputPath, prefix)` - 폴더를 ZIP으로 압축
- `extractFromBase64(base64Data, extension)` - Base64 데이터를 임시 파일로 저장 후 압축 해제
- `cleanupTempFiles(zipPath, extractDir)` - 임시 파일 정리
- `copyFolderContents(sourceDir, targetDir, excludeFiles)` - 폴더 내용 복사 (특정 파일 제외 가능)

#### src/core/uploadWebview.js
파일 업로드용 Webview HTML 템플릿 클래스입니다.

**주요 메서드:**
```javascript
UploadWebview.getUploadHtml({
    title: 'App 업로드 (.wizapp)',
    acceptExtension: '.wizapp',
    description: '.wizapp 파일만 지원'
});
```

**기능:**
- 드래그 앤 드롭 지원
- 파일 확장자 검증
- 대용량 파일을 위한 청크 방식 Base64 인코딩
- VS Code 테마 스타일 적용

### 2. src/core/index.js 업데이트

```javascript
module.exports = {
    // Constants
    ...Constants,
    
    // Utilities
    WizPathUtils,
    WizFileUtils,
    WizUriFactory,
    WebviewTemplates,
    
    // App Creation
    AppCreator,
    ZipUtils,
    UploadWebview
};
```

### 3. src/extension.js 리팩토링

#### 제거된 함수
- `createStandardApp(groupType, parentPath, fileExplorerProvider)`
- `createPortalApp(parentPath, fileExplorerProvider)`
- `createRoute(parentPath, isPortalRoute, fileExplorerProvider)`

#### 추가된 코드
```javascript
// AppCreator 인스턴스 생성
const appCreator = new AppCreator({
    workspaceRoot: fileExplorerProvider.workspaceRoot,
    onRefresh: () => fileExplorerProvider.refresh()
});

// workspaceRoot 변경 시 appCreator도 업데이트
const originalUpdateProjectRoot = updateProjectRoot;
updateProjectRoot = function() {
    originalUpdateProjectRoot();
    appCreator.workspaceRoot = fileExplorerProvider.workspaceRoot;
};
```

#### 변경된 커맨드 핸들러
- `wizExplorer.newApp` - `appCreator.createStandardApp()`, `appCreator.createPortalApp()`, `appCreator.createRoute()` 호출
- `wizExplorer.uploadApp` - `ZipUtils`, `UploadWebview`, `appCreator` 메서드 사용
- `wizExplorer.createPage/Component/Layout/Route` - `appCreator` 메서드 호출

## 코드 축소 효과

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| extension.js 라인 수 | ~2130줄 | ~1580줄 |
| 앱 생성 관련 중복 코드 | ~350줄 | 클래스로 통합 |
| 업로드 Webview HTML | 인라인 ~60줄 | 재사용 가능한 클래스 |

## 파일 구조

```
src/core/
├── appCreator.js      # NEW: 앱 생성 로직 클래스
├── constants.js
├── fileUtils.js
├── index.js           # UPDATED: 새 모듈 export
├── pathUtils.js
├── uploadWebview.js   # NEW: 업로드 Webview 템플릿
├── uriFactory.js
├── webviewTemplates.js
└── zipUtils.js        # NEW: 압축/해제 유틸리티
```
