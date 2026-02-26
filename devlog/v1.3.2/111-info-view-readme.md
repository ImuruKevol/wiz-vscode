# 111. Info 뷰 README 기능 구현 (v1.3.2)

## 개요
Info 뷰 상단에 README 항목을 추가하여 프로젝트 경로의 README.md를 마크다운 프리뷰로 여는 기능 구현.

## 변경 사항

### 1. src/explorer/models/categoryHandlers.js - README 트리 아이템 추가
- `SettingsCategory.getChildren()`에 README 항목을 최상단(0번)으로 추가
- README.md 존재 시: `book` 아이콘, 클릭하면 `wizExplorer.openFile` 커맨드로 마크다운 뷰어 열기
- README.md 미존재 시: 회색 `book` 아이콘 + `(생성)` description, 클릭하면 `wizExplorer.createReadme` 실행

### 2. src/extension.js - createReadme 커맨드 등록
- `wizExplorer.createReadme` 커맨드 추가
- 프로젝트 경로에 `# {projectName}\n\nProject README\n` 기본 내용으로 README.md 생성
- 생성 후 트리뷰 새로고침 및 마크다운 뷰어로 바로 열기

### 3. package.json - 커맨드 등록
- `wizExplorer.createReadme` 커맨드 정의 (icon: book)
- commandPalette에서는 숨김 처리 (`when: false`)
