# 103. 작업관리 업로드 및 worked 폴더 클릭 동작 개선 (v1.3.2)

## 개요
작업관리(wizTask) 뷰에 업로드 기능을 추가하고, worked 폴더 클릭 시 리뷰 에디터가 열리도록 개선.

## 변경 사항

### 1. package.json — 업로드 커맨드 및 메뉴 등록
- `wizTask.upload` 커맨드 등록 (아이콘: `$(cloud-upload)`)
- `view/title` 메뉴에 wizTask 업로드 버튼 추가
- worked 폴더의 인라인 `wizCopilot.reviewWizard` 버튼 제거
- commandPalette에서 숨김 처리

### 2. src/extension.js — 업로드 커맨드 핸들러
- `wizTask.upload`: `.github/task` 폴더에 `fileManager.upload()` 실행
- 폴더 미존재 시 자동 생성 후 업로드

### 3. src/explorer/models/categoryHandlers.js — worked 폴더 클릭 동작
- worked 폴더 TreeItem에 `command` 속성 추가: `wizCopilot.reviewWizard`
- 클릭 시 리뷰 에디터가 열리고, 좌측 화살표로만 폴더 확장 가능
