# 090. TODO 목록 뷰어 전면 개편 (v1.3.2)

## 개요
TODO 목록 뷰어(todoViewerEditor.js)의 렌더링 오류 수정 및 전면 UI/UX 개편. 콘텐츠가 표시되지 않는 치명적 버그 해결, 리치 에디터 기능 적용, 중복 패널 방지, 레이아웃 전면 재설계.

## 변경 사항

### 1. 치명적 렌더링 버그 수정
- `pagesToMarkdown` 함수에서 `'\n'`이 JS 템플릿 리터럴 안에서 실제 줄바꿈으로 변환되어 브라우저 JS 구문 오류 발생
- `'\n'` → `'\\n'`으로 수정하여 올바른 이스케이핑 적용
- 이 버그로 인해 전체 script가 실행되지 않아 콘텐츠 미표시 및 버튼 동작 불능이 발생했음

### 2. 중복 패널 방지 (Singleton 패턴)
- `TodoViewerEditor` 클래스에 `static _instance` 프로퍼티 추가
- `static openOrCreate(context, todoFilePath)` 메서드로 기존 패널 존재 시 `reveal()` 처리
- `onDispose()` 오버라이드로 패널 닫힐 때 인스턴스 해제
- `extension.js`에서 `new TodoViewerEditor().open()` → `TodoViewerEditor.openOrCreate()` 호출로 변경

### 3. 작업번호/제목 행 분리
- 기존: 한 줄에 ID input + Title input
- 변경: 두 행으로 분리, 각 행에 "ID" / "제목" 라벨 표시
- `.page-info` flex-direction: column, `.page-info-row` + `.page-info-label` 추가

### 4. 페이지네이션 화살표 세련화
- 유니코드 `←`/`→` → SVG chevron 아이콘으로 변경
- `<polyline>` 기반 깔끔한 벡터 화살표

### 5. 상하 여백 축소
- `.header` padding: `12px 24px` → `8px 20px`, 폰트사이즈 축소
- `.page-info` padding: `10px 24px` → `6px 20px`
- `.pagination` padding: `8px 24px` → `4px 20px`, gap 축소
- 전체적으로 콤팩트한 레이아웃

### 6. 리치 에디터 기능 적용
- 읽기 전용 `.rich-view` → `contentEditable` 에디터로 전환
- TODO 생성 마법사와 동일한 툴바 추가 (B, I, S, 코드, 목록, 인용, 코드블록, 구분선, Undo/Redo)
- `syncBodyFromEditor()`: 페이지 전환 시 에디터 HTML → Markdown 변환하여 페이지 데이터 저장
- `syncBodyToEditor()`: 페이지 로드 시 Markdown → HTML 변환하여 에디터에 표시
- `htmlToMarkdown()` 컨버터 추가 (todoEditor.js에서 적용)
- 페이지 전환 시 현재 내용 자동 동기화

### 7. 관련 파일
- `src/editor/editors/todoViewerEditor.js` — 전면 개편 (778줄 → 1012줄)
- `src/extension.js` — `openOrCreate()` 호출로 변경
