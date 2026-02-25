# 092. RichEditor 개선, TODO 뷰어 기능 보강, MCP 빌드 환경 수정 (v1.3.1)

## 개요
RichEditor 컴포넌트의 버그 수정 및 기능 추가, TODO 뷰어 에디터의 버튼 동작/페이지네이션/디자인 개선, MCP 서버의 파이썬 환경 문제 해결.

## 변경 사항

### 1. RichEditor 기능 개선 (FN-0013)
- **showLink 버튼 제거**: `showLink` 옵션, 링크 삽입 버튼, `_insertLink()` 메서드 모두 제거
- **`\\n` → `\n` 개행 버그 수정**: `htmlToMarkdown`, `_processTable` 함수의 이중 이스케이프(`\\n`) 문제 수정 — 파일이 `fs.readFileSync`로 읽혀 template literal에 주입되므로 단일 `\n`이 올바른 형태
  - 동일 패턴의 `\\x60` → `\x60` (backtick) 수정 포함
  - 18개 라인 수정
- **마크다운 자동 변환 트리거**: `_setupAutoFormat()` 메서드 추가
  - 스페이스 입력 시: `# ` → 제목, `- `/`* ` → 목록, `1. ` → 번호 목록, `> ` → 인용 자동 변환
  - Enter 입력 시: `---`/`***`/`___` → 구분선 자동 변환
  - `_getBlockParent()`, `_handleAutoFormat()`, `_handleEnterAutoFormat()` 보조 메서드

### 2. TODO 작성 탭 중복 열기 방지 (FN-0014)
- `TodoEditor`에 `static _instance` 패턴 적용
- `open()`에서 기존 인스턴스가 있으면 `panel.reveal()` 호출
- `onDispose()`에서 인스턴스 초기화

### 3. TODO 목록 에디터 이미지 업로드 (FN-0015)
- `todoViewerEditor.js`에 `handleImageUpload()` 메서드 추가 (`.github/task/resources/` 기준 저장)
- 웹뷰 RichEditor 옵션 `showImage: true`, `onImageUpload` 콜백 설정
- `uploadImage` 메시지 핸들러, `imageUploaded` 응답 처리 구현

### 4. 버튼 동작 및 페이지네이션 수정 (FN-0016)
- **버튼 동작 수정**: webview `confirm()` → `vscode.postMessage()` + 익스텐션 측 `vscode.window.showWarningMessage({ modal: true })` 방식으로 변경
  - `confirmDelete`, `confirmReview`, `confirmRunTask` 메시지 핸들러 추가
  - webview에서 `deleteConfirmed` 응답 처리
- **페이지네이션 위치 이동**: 별도 행 → ID 입력 필드와 같은 행의 오른쪽 끝(`margin-left: auto`)
- **최대 5개 표시**: `maxVisible` 10 → 5
- **크기/색상 축소**: 글자 11px, 높이 20px, 색상 `#888`(기본) / `#555`(활성)

### 5. TODO 목록 에디터 디자인 개선 (FN-0017)
- 헤더 패딩 확대, 버튼 간격 조정, 레터 스페이싱 추가
- 버튼: 패딩 5px 12px, 위험 버튼 투명 배경 + 보더 방식
- 페이지 정보 영역: 에디터 배경색, 라벨 uppercase + 볼드, 인풋 패딩/radius 확대
- 빈 상태: 아이콘 축소(40px), 패딩 40px, 투명도 조정

### 6. MCP 빌드 파이썬 환경 수정 (FN-0018)
- `_resolveWizExecutable()` 메서드 추가: `.vscode/settings.json`에서 `wizExplorer.build.pythonInterpreterPath` 읽기 → bin 디렉토리에서 `wiz` 실행 파일 탐색 → venv 폴백 → 시스템 PATH 폴백
- `build()` 함수에서 resolved wiz 실행 파일 사용
- `_getPipPath()` 함수에서도 설정된 Python 인터프리터의 pip 우선 사용

## 수정된 파일
- `resources/editor/richEditor.js` — showLink 제거, \\n 버그 수정, 자동 변환
- `src/editor/editors/todoEditor.js` — 싱글톤, showLink 제거
- `src/editor/editors/todoViewerEditor.js` — 이미지 업로드, 버튼 수정, 페이지네이션, 디자인
- `src/extension.js` — 싱글톤 코멘트
- `src/mcp/index.js` — _resolveWizExecutable, _getPipPath 개선
