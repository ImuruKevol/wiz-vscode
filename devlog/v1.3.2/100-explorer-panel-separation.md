# 100. 탐색기 패널(뷰) 분리 (v1.3.2)

## 개요
단일 트리 뷰에 합쳐진 모든 카테고리를 별도 VS Code 뷰(패널)로 분리하여 가독성 개선.

## 변경 사항

### 1. CategoryViewProvider 생성 (`src/explorer/categoryViewProvider.js`)
- 단일 카테고리를 별도 뷰로 표시하는 경량 TreeDataProvider
- 메인 FileExplorerProvider의 폴더 확장 로직 재사용
- 메인 프로바이더 변경 시 자동 갱신 (onDidChangeTreeData 연동)
- getParent: 카테고리 루트 경계에서 null 반환

### 2. 뷰 구성 변경 (`package.json`)
- 4개 뷰로 분리: Info, 작업 관리, 인스트럭션, Explorer
- Info/작업 관리/인스트럭션: `visibility: "visible"` 설정
- view/title 액션: 작업 관리(taskAction), 인스트럭션(generateTaskInstruction, importGithubFromGit)
- view/item/context: 파일 작업 when 조건에 3개 뷰 OR 조건 추가

### 3. FileExplorerProvider 축소 (`src/explorer/fileExplorerProvider.js`)
- Settings, Task, Instruction 카테고리를 categories 배열에서 제거
- getParent에서 .github 경로 처리 제거 (별도 뷰에서 처리)
- Source, Portal, Project, Config만 유지

### 4. extension.js 업데이트
- CategoryViewProvider import 및 3개 뷰 프로바이더 생성
- wizInfo, wizTask, wizInstruction 트리 뷰 등록
