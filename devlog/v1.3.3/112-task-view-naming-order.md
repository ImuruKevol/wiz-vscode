# 112. 작업관리 하위 구조 순서 및 명칭 변경 (v1.3.3)

## 개요
작업관리 뷰의 하위 항목 표시 이름과 정렬 순서를 변경하여 가독성 개선.

## 변경 사항

### 1. src/explorer/models/categoryHandlers.js - TaskCategory.getChildren() 수정
- 표시명 매핑: `todo.md` → "TODO", `worked` → "검토필요", `reviewed` → "완료됨"
- 실제 파일/디렉토리명은 변경하지 않고 TreeItem의 label만 변경
- 정렬 순서: TODO → 검토필요 → 완료됨 → 나머지(알파벳순)
- 폴더 항목(검토필요, 완료됨)의 `>` 화살표는 유지
