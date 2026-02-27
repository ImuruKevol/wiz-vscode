# FN-20260227-0007: MCP 구조 리팩토링 및 에이전트 최적화

아래 분류에 맞춰서 MCP 기능을 재구성해줘. 추가할게 있으면 추가하고, 불필요 또는 중복되서 없앨게 있으면 없애줘. 에이전트 관점에서 에이전트가 wiz 편집을 잘 할 수 있는 구조로 mcp 구성을 해주는데, wiz-copilot-instructions 레퍼런스를 참고해서 이 가이드라인에 맞춰서 wiz를 사용 할 수 있는 구조를 파악해서 mcp에 최적화해줘. 다 적용하고 나서는 변경된 MCP를 README에 업데이트 해줘. 아래에 있는건 그냥 카테고리 구분을 위해서 설명해놓은 구조니까 여기에 맞춰서 필요사항을 업데이트 하면되.

## Workspace
- 워크스페이스 상태
- 프로젝트 리스트 보기
- 워크스페이스 파일/폴더 관리 (read, write, create, delete, rename): `wiz-root-path` 경로
- wiz config 관리: `wiz-root-path`/config 경로
 
## Project
- 프로젝트 빌드
- 현재 활성화 되어있는 프로젝트 확인 
- pip / npm 관리
- 프로젝트 파일/폴더 관리 (read, write, create, delete, rename): `wiz-root-path`/project/`project-name` 경로
- project config 관리: `wiz-root-path`/project/`project-name`/config 경로
- App 검색

## Source
- Source App 관리 (read, write, create, delete, rename): 현재 app.json 만 하는데, 앱 경로 내에 파일명으로 파일을 컨트롤 할 수 있게 변경해줘
- Source Route 관리 (read, write, create, delete, rename): 현재 app.json 만 하는데, 앱 경로 내에 파일명으로 파일을 컨트롤 할 수 있게 변경해줘

## Package
- Package App 관리 (read, write, create, delete, rename): 현재 app.json 만 하는데, 앱 경로 내에 파일명으로 파일을 컨트롤 할 수 있게 변경해줘
- Package Route 관리 (read, write, create, delete, rename): 현재 app.json 만 하는데, 앱 경로 내에 파일명으로 파일을 컨트롤 할 수 있게 변경해줘

