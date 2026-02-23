# 077. WIZ Copilot 탐색기 메뉴 구현 (v1.3.1)

## 개요
WIZ 탐색기 사이드바에 Copilot 전용 Tree View를 추가하여 `.github` 및 `config` 경로에 빠르게 접근할 수 있도록 하였다.

## 변경 사항

### 1. CopilotExplorerProvider 신규 생성
- `src/explorer/copilotExplorerProvider.js` 생성
- 메인 FileExplorerProvider의 상태를 공유하는 경량 TreeDataProvider
- 3개 카테고리: WizInfoCategory, CopilotInstructionCategory, CopilotConfigCategory
- WizInfoCategory는 기존 SettingsCategory와 동일 항목을 "wiz info" 이름으로 제공

### 2. package.json 등록
- `wizCopilot` 뷰를 `wiz-explorer` 컨테이너에 추가
- `onView:wizCopilot` 활성화 이벤트 추가
- `wizCopilot.refresh` 커맨드 등록
- view/title에 Copilot 전용 refresh 버튼 추가
- view/item/context 메뉴에 `view == wizCopilot` 조건 추가 (파일 생성/삭제/복사/붙여넣기/이름변경/다운로드/업로드)

### 3. extension.js 통합
- CopilotExplorerProvider import 및 인스턴스 생성
- `wizCopilot` TreeView 등록
- `onDidChangeTreeData` 리스너로 메인 탐색기 갱신 시 Copilot 탐색기도 자동 동기화
- `wizCopilot.refresh` 커맨드 핸들러 등록
