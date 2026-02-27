# 128. 뷰 액션 새로고침 버튼 추가 (v1.3.3)

## 개요
기존에 INFO 뷰에만 있던 새로고침 버튼을 작업관리(wizTask), 인스트럭션(wizInstruction), 메인 탐색기(wizExplorer) 뷰에도 추가.

## 변경 사항

### 1. package.json view/title 메뉴 추가
- **wizExplorer** 뷰: `wizExplorer.refresh` 버튼 추가 (`navigation@1`)
- **wizTask** 뷰: `wizCopilot.refresh` 버튼 추가 (`navigation@2`, 기존 버튼 번호 재조정)
- **wizInstruction** 뷰: `wizCopilot.refresh` 버튼 추가 (`navigation@2`, 기존 버튼 번호 재조정)

### 2. 새로고침 동작 방식
- 모든 뷰의 새로고침은 `fileExplorerProvider.refresh()`를 호출
- `CategoryViewProvider`가 메인 프로바이더의 `onDidChangeTreeData`를 구독하고 있어 자동으로 모든 하위 뷰 갱신

## 관련 파일
- `package.json`: view/title 메뉴 설정
