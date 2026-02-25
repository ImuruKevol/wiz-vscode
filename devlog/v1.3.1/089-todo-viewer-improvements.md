# 089. TODO 뷰어/에디터 UI 개선 5종 (v1.3.1)

## 개요
TODO 작성 에디터와 TODO 뷰어의 UI/UX를 대폭 개선. 글자수 정렬, 기본뷰어 버튼, 숫자 페이지네이션, 추가 동작 수정, 리뷰 반영 버튼 및 확인 다이얼로그를 일괄 적용.

## 변경 사항

### 1. TODO 작성 에디터 글자수 정렬 수정 (FN-0004)
- `src/editor/editors/todoEditor.js`
- `.header-actions`에 `align-items: center` 추가하여 글자수 카운트 세로 정렬
- `.header` padding `16px 24px` → `10px 24px`로 축소
- `.btn` padding `8px 20px` → `5px 14px`로 축소

### 2. 기본뷰어 버튼 변경 (FN-0005)
- `src/editor/editors/todoViewerEditor.js`
- 아이콘 전용 마크다운 토글 버튼(📝) 제거
- "기본뷰어" 텍스트 버튼(`btn-secondary`)으로 교체
- 클릭 시 VS Code 기본 에디터로 파일 열고 현재 패널 닫기
- `handleOpenInDefaultEditor()` 메서드 추가
- 마크다운 rawview (textarea) 완전 제거
- `.btn-icon`, `.markdown-view` CSS 제거

### 3. 페이지네이션 및 편집 개선 (FN-0006)
- 페이지 정보 영역: `<span>` → `<input>` 으로 변경 (작업번호, 제목 편집 가능)
- `pagesToMarkdown()`에서 `fullHeading` 대신 `p.id + p.title`로 동적 재구성
- 페이지네이션: dot 방식 → 숫자 버튼 방식 (`← 1 2 3 ... →`)
- 최대 10페이지 표시, 양끝 생략 부호(`…`) 지원
- `.page-dot` CSS → `.page-num`, `.page-ellipsis` CSS로 교체
- 키보드 방향키 탐색 시 input 포커스 중에는 무시

### 4. 추가 버튼 동작 수정 (FN-0007)
- 추가 클릭 시 마크다운 raw view 전환 대신 리치 뷰 유지
- 새 페이지 추가 후 즉시 파일 저장 (postMessage save)
- 마지막 페이지로 자동 이동

### 5. 리뷰 반영 버튼 추가 및 확인 다이얼로그 (FN-0008)
- "작업 시작" 왼쪽에 "리뷰 반영" 버튼 추가 (`btn-secondary`)
- `handleReviewWizard()` 메서드 추가 → Copilot Chat으로 '리뷰 정리해줘' 전송
- 작업 시작, 리뷰 반영 모두 `confirm()` 다이얼로그로 확인 후 실행
- 버튼 크기 축소: padding `6px 14px` → `4px 10px`, font-size `12px` → `11px`
