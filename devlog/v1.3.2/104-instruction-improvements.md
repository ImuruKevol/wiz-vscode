# 104. 인스트럭션 관련 개선 (v1.3.2)

## 개요
인스트럭션 뷰의 Git 불러오기 아이콘 변경, 업로드 기능 추가, Git clone 로직을 tmp 폴더 경유 병합 방식으로 변경.

## 변경 사항

### 1. package.json — 아이콘 및 업로드 커맨드
- `wizExplorer.importGithubFromGit` 아이콘: `$(cloud-download)` → `$(repo-clone)` (Git 클론 의미를 명확히)
- `wizInstruction.upload` 커맨드 등록 (아이콘: `$(cloud-upload)`)
- `view/title` 메뉴에 wizInstruction 업로드 버튼 추가

### 2. src/extension.js — 업로드 핸들러
- `wizInstruction.upload`: `.github` 폴더에 `fileManager.upload()` 실행
- 폴더 미존재 시 자동 생성 후 업로드

### 3. src/extension.js — Git Clone 로직 변경
- **변경 전**: 기존 `.github` 삭제 → 직접 clone
- **변경 후**: `os.tmpdir()`에 임시 폴더 생성 → clone → `cp -R repo/* .github/` → `.git` 제거 → tmp 정리
- 기존 파일을 삭제하지 않고, 동일 이름 파일만 덮어쓰기하는 병합 방식
- 경고 메시지도 "교체됩니다" → "병합합니다. 동일 이름의 파일은 덮어씁니다"로 변경
- 오류 발생 시 tmp 폴더 자동 정리
