# 098. 탐색기 패널 통합 (v1.3.2)

## 개요
기존 2개 트리 뷰(wizExplorer + wizCopilot)를 단일 트리 뷰(wizExplorer)로 통합하여 탐색기 패널 구성을 개선.

## 변경 사항

### 1. 카테고리 핸들러 추가 (`src/explorer/models/categoryHandlers.js`)
- `InstructionCategory` 클래스 추가: `.github` 경로의 파일/폴더 표시 (task 제외), contextValue='copilotCategory'
- `TaskCategory` 클래스 추가: `.github/task` 폴더 표시, todo.md에 'todoFile', worked에 'workedFolder' contextValue 부여
- 기존 CopilotExplorerProvider의 로직을 CategoryItem 패턴으로 이전

### 2. FileExplorerProvider 수정 (`src/explorer/fileExplorerProvider.js`)
- 카테고리 순서 변경: Settings → Task → Instruction → Source → Portal → Project → Config
- `InstructionCategory`, `TaskCategory` import 및 categories 배열에 추가
- `getParent()` 메서드에 `.github` 경로 핸들링 추가 (section 0): `.github` → copilotInstruction, `.github/task` → copilotTask

### 3. package.json 수정
- `wizCopilot` 뷰 엔트리 제거 (단일 `wizExplorer` 뷰만 유지)
- `onView:wizCopilot` 활성화 이벤트 제거
- 뷰 이름 "Source" → "Explorer"로 변경
- view/title 메뉴에서 중복 `wizCopilot.refresh` 엔트리 제거
- inline 메뉴 `when` 조건: `view == wizCopilot` → `view == wizExplorer`로 변경
- context 메뉴 `when` 조건: `(view == wizExplorer || view == wizCopilot)` → `view == wizExplorer`로 간소화

### 4. extension.js 수정
- `CopilotExplorerProvider` import 및 인스턴스 생성 제거
- `copilotTreeView` 생성 및 등록 코드 제거
- `copilotExplorerProvider.refresh()` 호출을 `fileExplorerProvider.refresh()`로 대체
- `wizCopilot.refresh` 커맨드 핸들러를 `fileExplorerProvider.refresh()`로 변경

### 5. 최종 카테고리 구조
| 순서 | 카테고리 | 설명 |
|------|---------|------|
| 1 | wiz info (Settings) | 프로젝트 정보 |
| 2 | 작업 관리 (Task) | .github/task 파일 |
| 3 | 인스트럭션 (Instruction) | .github 인스트럭션 파일 |
| 4 | Source | 앱/라우트 소스 |
| 5 | Packages/Portal | 포털 패키지 |
| 6 | Project | 프로젝트 관리 |
| 7 | Config | 설정 파일 |
