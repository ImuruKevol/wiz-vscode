/**
 * Services Module - 비즈니스 로직 통합 모듈
 * 
 * 계층 구조:
 * 
 * project/ (프로젝트 레벨)
 *   ├── ProjectManager  - 프로젝트 수명주기 (전환, 가져오기, 내보내기, 삭제)
 *   ├── BuildManager    - 프로젝트 빌드 관리
 *   └── McpManager      - MCP 서버 관리
 * 
 * app/ (앱 레벨)
 *   ├── SourceManager      - Source 카테고리 앱 (page, component, layout, route)
 *   ├── PackageManager     - Package 카테고리 앱 (portal app, portal route)
 *   └── NavigationManager  - 앱 탐색 및 위치 선택
 * 
 * file/ (파일 레벨)
 *   └── FileManager     - 파일 작업 (생성, 삭제, 복사, 붙여넣기, 이름 변경)
 */

// Project Level Services
const { ProjectManager, BuildManager, McpManager } = require('./project');

// App Level Services
const { SourceManager, PackageManager, NavigationManager } = require('./app');

// File Level Services
const { FileManager } = require('./file');

module.exports = {
    // Project Level
    ProjectManager,
    BuildManager,
    McpManager,
    
    // App Level
    SourceManager,
    PackageManager,
    NavigationManager,
    
    // File Level
    FileManager
};
