# 079. Copilot/Source 메뉴 구성 변경 (v1.3.1)

## 개요
WIZ 사이드바의 뷰 순서를 변경하고, 각 뷰의 카테고리를 정리하여 역할을 명확하게 분리하였다.

## 변경 사항

### 1. 뷰 순서 및 이름 변경
- `package.json`에서 `wizCopilot`(Copilot) 뷰를 `wizExplorer`(Source) 위로 이동
- `wizExplorer` 뷰 이름을 "Files" → "Source"로 변경

### 2. Source 뷰 카테고리 정리
- `SettingsCategory` 이름을 "wiz settings" → "wiz info"로 변경, 아이콘을 `gear` → `info`로 변경
- `CopilotCategory`를 Source 뷰 카테고리 목록에서 제거
- import에서 `CopilotCategory` 제거

### 3. Copilot 뷰 카테고리 정리
- `WizInfoCategory` 클래스 완전 제거 (사용하지 않음)
- `CopilotConfigCategory` 클래스 완전 제거 (사용하지 않음)
- Copilot 뷰에 `CopilotInstructionCategory`, `TaskCategory`만 유지
- `getParent`에서 config 관련 로직 제거
