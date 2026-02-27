# 124. Rich Editor 개선 (v1.3.3)

## 개요
RichEditor 컴포넌트에 목록 depth 조절, 소스코드 보기, 붙여넣기 서식 정리 기능 추가.

## 변경 사항

### 1. 목록 들여쓰기/내어쓰기 (`resources/editor/richEditor.js`)
- Tab 키로 목록 항목 들여쓰기 (하위 레벨로 이동)
- Shift+Tab으로 목록 항목 내어쓰기 (상위 레벨로 이동)
- 툴바에 → (들여쓰기), ← (내어쓰기) 버튼 추가
- `_indentListItem()`: 이전 `<li>` 내부에 중첩 리스트 생성
- `_outdentListItem()`: 부모 리스트에서 상위 레벨로 이동, 뒤따르는 형제 항목 자동 재배치
- `_getParentTag()`: DOM 트리에서 특정 태그 부모 탐색 유틸리티

### 2. 소스코드 보기 기능
- 툴바 우측 끝에 `</>` 소스코드 보기 버튼 추가 (`margin-left: auto`)
- 토글 방식: 리치 에디터 ↔ 마크다운 텍스트 편집
- 소스 모드에서 마크다운 직접 편집 가능
- `_toggleSourceMode()`: HTML→Markdown, Markdown→HTML 양방향 변환
- `getHtml()`, `setHtml()`, `setEditable()` 소스 모드 호환 처리

### 3. 붙여넣기 서식 정리
- `_setupPasteHandler()`: 통합 붙여넣기 핸들러 (이미지 + HTML 서식 정리)
- `_sanitizePastedHtml()`: 허용된 태그만 유지하는 HTML 정제
  - 허용 태그: P, DIV, BR, H1-H3, STRONG, B, EM, I, S, DEL, CODE, PRE, BLOCKQUOTE, UL, OL, LI, A, IMG, HR, TABLE 계열
  - 허용 속성: A의 href, IMG의 src/alt만 유지
  - 폰트, 배경색, 클래스, 스타일 등 모든 비허용 속성 제거
- 기존 이미지 붙여넣기 핸들러를 `_setupImageDragDrop()`에서 분리하여 통합

### 4. 중첩 리스트 Markdown 변환 개선
- `htmlToMarkdown`: `<li>` 내부의 중첩 `<ul>`/`<ol>`을 감지하여 들여쓴 마크다운 생성
- `markdownToHtml`: 들여쓴 마크다운 리스트를 중첩 `<ul>`/`<ol>` HTML로 변환
- `_processMarkdownLists()`: 마크다운 리스트 라인을 수집하여 중첩 구조 생성
- `_buildNestedList()`: 재귀적으로 중첩 리스트 HTML 빌드
