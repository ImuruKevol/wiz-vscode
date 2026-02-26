# 105. 액션 버튼 위치 조정 (v1.3.3)

## 개요
Wiz 탐색기(wizExplorer) 뷰 타이틀 영역에 있던 액션 버튼(새로고침, 빌드, 프로젝트 선택)을 Info(wizInfo) 뷰 타이틀 영역으로 이동하여 UI 구성을 개선.

## 변경 사항

### 1. package.json - view/title 메뉴 조정
- `wizExplorer.refresh`, `wizExplorer.build`, `wizExplorer.switchProject` 3개 액션 버튼의 `when` 조건을 `view == wizExplorer`에서 `view == wizInfo`로 변경
- Explorer 뷰에는 기본 제공되는 접기(Collapse All) 버튼만 남김
- Info 뷰 타이틀 바에 새로고침, 빌드, 프로젝트 선택 버튼이 표시됨
