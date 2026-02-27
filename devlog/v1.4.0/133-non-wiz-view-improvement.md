# 133. 비-WIZ 프로젝트 뷰 개선 (v1.4.0)

## 개요
비-WIZ 프로젝트(project/ 폴더가 없는 일반 프로젝트)에서 Info 뷰와 Main Explorer 뷰의 표시 항목을 개선하여, 불필요한 WIZ 전용 항목을 제거하고 적절한 안내 메시지를 표시하도록 수정.

## 변경 사항

### 1. Info 뷰(SettingsCategory) 비-WIZ 분기 개선
- **파일**: `src/explorer/models/categoryHandlers.js`
- 기존: "WIZ 프로젝트가 아닙니다" 경고 + 기본 버전 정보만 표시
- 변경: README + version 두 항목만 표시 (경고 메시지 제거)
- README 경로를 `workspaceRoot` 기준으로 설정 (비-WIZ에서는 워크스페이스 루트 폴더)
- README가 없으면 "(생성)" 버튼 표시, 있으면 클릭하여 열기 가능
- 버전 정보에 업데이트 확인 로직 추가 (WIZ 프로젝트와 동일한 UX)

### 2. Main Explorer 뷰(wizExplorer) 비-WIZ 분기 개선
- **파일**: `src/explorer/fileExplorerProvider.js`
- 폴더를 찾을 수 없는 경우: WIZ 프로젝트에서만 "다른 프로젝트 선택..." 항목 표시, 비-WIZ에서는 제거
- 비-WIZ 프로젝트 메시지를 "WIZ 프로젝트가 아닙니다" → "WIZ 구조의 프로젝트가 아닙니다"로 변경하여 더 명확한 안내 제공
