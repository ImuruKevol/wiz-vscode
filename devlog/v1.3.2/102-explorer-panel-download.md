# 102. 탐색기 패널 다운로드 기능 (v1.3.2)

## 개요
작업관리(wizTask)와 인스트럭션(wizInstruction) 뷰에 다운로드 액션 버튼을 추가하여, 해당 폴더를 zip으로 압축 다운로드할 수 있도록 개선.

## 변경 사항

### 1. package.json — 다운로드 커맨드 및 메뉴 등록
- `wizTask.download`, `wizInstruction.download` 커맨드 등록 (아이콘: `$(cloud-download)`)
- `view/title` 메뉴에 wizTask, wizInstruction 각각 다운로드 버튼 추가
- commandPalette에서 숨김 처리 (`when: "false"`)

### 2. src/extension.js — 다운로드 커맨드 핸들러
- `wizTask.download`: `.github/task` 폴더를 `fileManager.download()`로 zip 다운로드
- `wizInstruction.download`: `.github` 폴더를 `fileManager.download()`로 zip 다운로드
- 폴더가 존재하지 않을 경우 경고 메시지 표시

### 3. Info 뷰 고정 높이 (미구현)
- VS Code Tree View API에는 패널 높이를 고정하는 기능이 없음 (플랫폼 제약)
- 사용자가 수동으로 패널 크기를 조정하는 것만 가능
