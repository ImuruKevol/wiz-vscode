# 040. 탐색기 정렬 및 표시 개선 (v1.0.1)

## 개요
Source 및 Packages 카테고리의 항목 표시 순서를 개선하고, angular 하위의 libs/styles 폴더를 source 최상위에 표시하도록 변경했습니다.

## 변경 사항

### 1. Angular 하위 폴더 승격 (Source 카테고리)
- `src/angular/libs`와 `src/angular/styles` 폴더를 source 카테고리 최상위에 표시
- 실제 파일 경로는 유지하면서 UI에서만 상위로 노출
- angular 폴더 내에서는 libs, styles가 보이지 않도록 필터링

**변경 파일:**
- `src/explorer/models/categoryHandlers.js`: SourceCategory에 승격 로직 추가
- `src/explorer/fileExplorerProvider.js`: angular 폴더에서 libs, styles 필터링

### 2. Source 카테고리 정렬 순서
Source 하위 항목들이 다음 순서로 표시됩니다:
1. angular
2. page
3. component
4. layout
5. route
6. model
7. controller
8. assets
9. libs
10. styles

**변경 파일:**
- `src/explorer/models/categoryHandlers.js`: 정렬 로직 추가

### 3. Packages 카테고리 정렬 순서
각 패키지 내 항목들이 다음 순서로 표시됩니다:
1. info
2. app
3. route
4. model
5. controller
6. assets
7. libs
8. styles
9. README.md

**변경 파일:**
- `src/explorer/fileExplorerProvider.js`: 정렬 priority 배열 업데이트
