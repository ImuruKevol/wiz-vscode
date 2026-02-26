# 113. 인스트럭션 뷰 액션 버튼 재구성 (v1.3.3)

## 개요
인스트럭션 뷰의 타이틀 액션 버튼을 재구성: git/다운로드/업로드를 하나의 메뉴로 통합하고, 파일/폴더 생성 버튼 추가.

## 변경 사항

### 1. package.json - 인스트럭션 뷰 타이틀 버튼 재구성
- 기존 4개 버튼 (인스트럭션 생성, Git 불러오기, 업로드, 다운로드) → 4개 버튼으로 재구성
  - `$(sparkle)` 인스트럭션 생성 마법사 (유지)
  - `$(new-file)` 새 파일 생성
  - `$(new-folder)` 새 폴더 생성
  - `$(ellipsis)` 인스트럭션 관리 메뉴 (Git/다운로드/업로드 통합)
- 3개 커맨드 신규 등록: `wizInstruction.actionMenu`, `wizInstruction.newFile`, `wizInstruction.newFolder`
- 모두 commandPalette에서 숨김 처리

### 2. src/extension.js - 커맨드 핸들러 추가
- `wizInstruction.actionMenu`: QuickPick으로 Git 불러오기 / 다운로드 / 업로드 중 선택
- `wizInstruction.newFile`: `.github/` 폴더에 새 파일 생성 후 에디터로 열기
- `wizInstruction.newFolder`: `.github/` 폴더에 새 폴더 생성
