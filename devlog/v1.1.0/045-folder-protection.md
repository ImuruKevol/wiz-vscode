# 045. Source/Packages 폴더 보호

## 개요
Source 및 Packages 카테고리의 루트 폴더(controller, model, libs, styles 등)에 대해 삭제, 이름 변경, 복사 작업을 제한하여 프로젝트 구조를 보호합니다.

## 변경 사항

### 1. Source 카테고리 루트 폴더 보호
- `src/controller`, `src/model` 폴더에 `sourceRootFolder` contextValue 적용
- 삭제, 이름 변경, 복사 메뉴가 표시되지 않음
- 파일 생성, 폴더 생성, 붙여넣기, 다운로드, 업로드는 허용

**변경 파일:**
- `src/explorer/models/categoryHandlers.js`: forcedFolders의 context를 `sourceRootFolder`로 변경

### 2. Packages 카테고리 루트 폴더 보호
- Portal 패키지 내 `controller`, `model`, `assets`, `libs`, `styles` 폴더에 `portalRootFolder` contextValue 적용
- 동일하게 삭제, 이름 변경, 복사 메뉴 제한

**변경 파일:**
- `src/explorer/fileExplorerProvider.js`: Portal 패키지 하위 특수 폴더에 `portalRootFolder` context 적용

### 3. package.json 메뉴 조건 업데이트

```json
// 허용되는 작업
"wizExplorer.newFile": "viewItem == folder || viewItem == sourceRootFolder || viewItem == portalRootFolder"
"wizExplorer.newFolder": "viewItem == folder || viewItem == sourceRootFolder || viewItem == portalRootFolder"
"wizExplorer.paste": "viewItem == folder || viewItem == sourceRootFolder || viewItem == portalRootFolder"
"wizExplorer.downloadFile": "... || viewItem == sourceRootFolder || viewItem == portalRootFolder"
"wizExplorer.uploadFile": "... || viewItem == sourceRootFolder || viewItem == portalRootFolder"

// 제한되는 작업 (sourceRootFolder, portalRootFolder 제외)
"wizExplorer.delete": "viewItem == file || viewItem == folder"
"wizExplorer.rename": "viewItem == file || viewItem == folder"
"wizExplorer.copy": "viewItem == file || viewItem == folder"
```

## 보호되는 폴더 목록

### Source 카테고리
- `src/controller`
- `src/model`

### Packages 카테고리 (각 패키지 내)
- `controller`
- `model`
- `assets`
- `libs`
- `styles`
