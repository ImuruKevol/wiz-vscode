# 087. TODO 에디터 UI 레이아웃 개선 (v1.3.1)

## 개요
TODO 작성 에디터의 UI를 개선하여 제목 필드를 제거하고, 글자수·버튼을 헤더 오른쪽으로 이동시켰다. 프롬프트 문구도 변경하였다.

## 변경 사항

### 1. 헤더 레이아웃 변경
- `src/editor/editors/todoEditor.js`: 기존 하단 Footer를 제거하고, 글자수·취소·TODO 생성 버튼을 헤더 오른쪽(`header-actions`)으로 이동
- 제목 입력 필드(`title-input-row`) 및 관련 CSS 완전 제거

### 2. 프롬프트 문구 변경
- 기존: `TODO 작성해줘\n\n{내용}` → 변경: `아래 내용을 분석해서 TODO 작성해줘.\n\n{내용}`

### 3. 코드 정리
- `titleInput` 관련 참조, 상태 저장(`setState`), 이벤트 리스너 모두 제거
- Footer CSS 및 title-input-row CSS 제거
