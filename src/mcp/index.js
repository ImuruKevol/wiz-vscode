/**
 * Wiz MCP Server v3.0
 * Model Context Protocol server for AI agent integration
 *
 * AI 에이전트가 Wiz 프로젝트를 탐색, 생성, 수정, 빌드할 수 있도록
 * 4개 카테고리로 구성된 도구 세트를 제공합니다.
 *
 * Tool Categories:
 *   - Workspace (7):  워크스페이스 상태, 프로젝트 목록, 워크스페이스 파일/폴더 관리
 *   - Project  (19): 프로젝트 정보/빌드/전환, 프로젝트 파일/폴더 관리, pip/npm, 앱 검색
 *   - Source   (13): Source App/Route CRUD, 앱 내 파일 관리, 컨트롤러/레이아웃 목록
 *   - Package  (15): 패키지 관리, Portal App/Route CRUD, 앱 내 파일 관리, 컨트롤러 목록
 *
 * Module Structure:
 *   - index.js          : 엔트리 포인트 (클래스 정의, 서버 초기화, 핸들러 라우팅)
 *   - helpers.js         : 경로 해석, 유틸리티, 상태 관리, 빌드/의존성 헬퍼
 *   - definitions.js     : 54개 도구 스키마 정의
 *   - handlers/
 *       workspace.js     : Workspace 핸들러 (7)
 *       project.js       : Project 핸들러 (19)
 *       source.js        : Source 핸들러 (13) + 공용 내부 메서드
 *       package.js       : Package 핸들러 (15)
 */

const { Server } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');

// 모듈별 메서드 로드
const { methods: helperMethods } = require('./helpers');
const definitions = require('./definitions');
const workspaceHandlers = require('./handlers/workspace');
const projectHandlers = require('./handlers/project');
const sourceHandlers = require('./handlers/source');
const packageHandlers = require('./handlers/package');

class WizMcpServer {
    constructor() {
        this.server = new Server(
            { name: 'wiz-mcp-server', version: '3.0.0' },
            { capabilities: { tools: {}, resources: {} } }
        );
        this.wizRoot = process.env.WIZ_WORKSPACE || null;
        this.currentProject = process.env.WIZ_PROJECT || 'main';
        this.wizStatePath = process.env.WIZ_STATE_PATH || null;
        this._loadState();
        this.setupHandlers();
    }

    // ==================== Handler Setup ====================

    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return { tools: this._getToolDefinitions() };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                const handler = this._getToolHandler(name);
                if (!handler) throw new Error(`Unknown tool: ${name}`);
                this._loadState();
                return await handler.call(this, args || {});
            } catch (error) {
                return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
            }
        });

        this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));
        this.server.setRequestHandler(ReadResourceRequestSchema, async () => ({ contents: [] }));
    }

    _getToolHandler(name) {
        const handlers = {
            // Workspace
            wiz_workspace_status: this.workspaceStatus,
            wiz_workspace_list_dir: this.workspaceListDir,
            wiz_workspace_read_file: this.workspaceReadFile,
            wiz_workspace_write_file: this.workspaceWriteFile,
            wiz_workspace_create_dir: this.workspaceCreateDir,
            wiz_workspace_delete: this.workspaceDelete,
            wiz_workspace_rename: this.workspaceRename,
            // Project
            wiz_project_info: this.projectInfo,
            wiz_project_switch: this.projectSwitch,
            wiz_project_build: this.projectBuild,
            wiz_project_export: this.projectExport,
            wiz_project_import: this.projectImport,
            wiz_project_structure: this.projectStructure,
            wiz_project_list_dir: this.projectListDir,
            wiz_project_read_file: this.projectReadFile,
            wiz_project_write_file: this.projectWriteFile,
            wiz_project_create_dir: this.projectCreateDir,
            wiz_project_delete: this.projectDelete,
            wiz_project_rename: this.projectRename,
            wiz_project_search_apps: this.projectSearchApps,
            wiz_project_pip_list: this.projectPipList,
            wiz_project_pip_install: this.projectPipInstall,
            wiz_project_pip_uninstall: this.projectPipUninstall,
            wiz_project_npm_list: this.projectNpmList,
            wiz_project_npm_install: this.projectNpmInstall,
            wiz_project_npm_uninstall: this.projectNpmUninstall,
            // Source
            wiz_source_list_apps: this.sourceListApps,
            wiz_source_app_info: this.sourceAppInfo,
            wiz_source_create_app: this.sourceCreateApp,
            wiz_source_create_route: this.sourceCreateRoute,
            wiz_source_update_app: this.sourceUpdateApp,
            wiz_source_delete_app: this.sourceDeleteApp,
            wiz_source_list_files: this.sourceListFiles,
            wiz_source_read_file: this.sourceReadFile,
            wiz_source_write_file: this.sourceWriteFile,
            wiz_source_delete_file: this.sourceDeleteFile,
            wiz_source_rename_file: this.sourceRenameFile,
            wiz_source_list_controllers: this.sourceListControllers,
            wiz_source_list_layouts: this.sourceListLayouts,
            // Package
            wiz_package_list: this.packageList,
            wiz_package_create: this.packageCreate,
            wiz_package_export: this.packageExport,
            wiz_package_list_apps: this.packageListApps,
            wiz_package_app_info: this.packageAppInfo,
            wiz_package_create_app: this.packageCreateApp,
            wiz_package_create_route: this.packageCreateRoute,
            wiz_package_update_app: this.packageUpdateApp,
            wiz_package_delete_app: this.packageDeleteApp,
            wiz_package_list_files: this.packageListFiles,
            wiz_package_read_file: this.packageReadFile,
            wiz_package_write_file: this.packageWriteFile,
            wiz_package_delete_file: this.packageDeleteFile,
            wiz_package_rename_file: this.packageRenameFile,
            wiz_package_list_controllers: this.packageListControllers,
        };
        return handlers[name];
    }

    // ==================== Server ====================

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Wiz MCP Server v3.0 running on stdio');
    }
}

// 모듈별 메서드를 프로토타입에 믹스인
Object.assign(
    WizMcpServer.prototype,
    helperMethods,
    definitions,
    workspaceHandlers,
    projectHandlers,
    sourceHandlers,
    packageHandlers
);

const server = new WizMcpServer();
server.run().catch(console.error);

module.exports = WizMcpServer;
