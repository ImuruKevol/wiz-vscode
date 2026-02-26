# 109. MCP 기능 README 카테고리별 정리 (v1.3.3)

## 개요
README.md의 MCP 도구 목록을 카테고리별로 분류하여 문서 가독성 및 도구 검색 효율을 개선.

## 변경 사항

### 1. README.md - MCP 도구 테이블 재구조화
- 기존: 36개 도구를 단일 테이블에 나열 → 어떤 작업에 어떤 도구를 사용해야 할지 파악 비효율
- 변경: 8개 카테고리로 분류, 각 카테고리별 이모지 헤더 + 개별 테이블로 분리
  - 🔍 Workspace State (1): `wiz_get_workspace_state`
  - 📁 Project Management (5): 프로젝트 조회/전환/내보내기/가져오기
  - 🔨 Build (1): 일반/클린 빌드
  - 🧩 App Management (9): 앱 CRUD + 검색
  - 📦 Package Management (3): 포탈 패키지 관리
  - 🐍 Dependency Management (6): pip/npm 패키지 설치/제거/목록
  - 📂 File System (7): 파일/디렉토리 읽기/쓰기/삭제/이름변경
  - ⚡ App File Shortcuts & Helpers (4): 앱 파일 바로 읽기/쓰기 + 컨트롤러/레이아웃 목록
- 상단에 "36 tools across 8 categories" 요약 표시
- 각 도구 설명 보완 (괄호 내 세부 기능 추가)
