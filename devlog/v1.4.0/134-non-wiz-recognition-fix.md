# 134. 비-WIZ 프로젝트 인식 로직 재점검 (v1.4.0)

## 개요
비-WIZ 프로젝트에서 여전히 WIZ 기준 항목이 표시되는 문제의 근본 원인을 분석하고, `isWizProject` 플래그의 기본값과 전파 타이밍을 수정.

## 변경 사항

### 1. isWizProject 기본값 변경 (true → false)
- **파일**: `src/explorer/fileExplorerProvider.js`
- `FileExplorerProvider` 생성자에서 `isWizProject`의 기본값을 `true`에서 `false`로 변경
- 이유: `updateProjectRoot()` 호출 전에 트리 뷰가 렌더링될 경우, 기본값 `true`로 인해 WIZ 콘텐츠가 일시적으로 표시되는 타이밍 이슈 해소
- `updateProjectRoot()`에서 WIZ 프로젝트로 확인된 경우에만 `true`로 설정

### 2. isWizProject 조건 검사 강화
- **파일**: `src/explorer/models/categoryHandlers.js`
- `SettingsCategory.getChildren()`의 조건을 `isWizProject !== false` → `isWizProject === true`로 변경
- `undefined`, `null` 등 비정상 값에서 WIZ로 잘못 판단되는 방어적 코딩 적용

### 3. 초기 컨텍스트 설정 추가
- **파일**: `src/extension.js`
- 트리 뷰 생성 전에 `setContext('wiz.isWizProject', false)` 호출
- VS Code의 `when` 절 UI 요소(build, switchProject 버튼)가 초기 로드 시 비-WIZ 상태로 시작하도록 보장
