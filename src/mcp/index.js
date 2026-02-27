/**
 * Wiz MCP Server v3.0
 * Model Context Protocol server for AI agent integration
 *
 * AI 에이전트가 Wiz 프로젝트를 탐색, 생성, 수정, 빌드할 수 있도록
 * 4개 카테고리로 구성된 도구 세트를 제공합니다.
 *
 * Tool Categories:
 *   - Workspace (7):  워크스페이스 상태, 프로젝트 목록, 워크스페이스 파일/폴더 관리
 *   - Project  (18): 프로젝트 정보/빌드/전환, 프로젝트 파일/폴더 관리, pip/npm, 앱 검색
 *   - Source   (13): Source App/Route CRUD, 앱 내 파일 관리, 컨트롤러/레이아웃 목록
 *   - Package  (14): 패키지 관리, Portal App/Route CRUD, 앱 내 파일 관리, 컨트롤러 목록
 */

const { Server } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const util = require('util');
const exec = util.promisify(cp.exec);

// App 기본 템플릿
const APP_TEMPLATES = {
    'view.html': '<div>Hello, World!</div>',
    'view.ts': `import { OnInit, Input } from '@angular/core';

export class Component implements OnInit {
    @Input() title: any;

    public async ngOnInit() {
    }
}`,
    'view.scss': ''
};

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

    // ==================== Path Resolution Helpers ====================

    /** 프로젝트 src 경로 */
    _getSrcPath(workspacePath, projectName) {
        return path.join(workspacePath, 'project', projectName, 'src');
    }

    /** 앱 부모 경로 (src/app 또는 src) */
    _getAppParentPath(srcPath) {
        const appDir = path.join(srcPath, 'app');
        return (fs.existsSync(appDir) && fs.statSync(appDir).isDirectory()) ? appDir : srcPath;
    }

    /** 워크스페이스 루트 기준 절대경로 변환 */
    _resolveWorkspacePath(relativePath) {
        if (!this.wizRoot) throw new Error('Workspace path not set. Call wiz_workspace_status first.');
        if (!relativePath) return this.wizRoot;
        if (path.isAbsolute(relativePath)) return relativePath;
        return path.join(this.wizRoot, relativePath);
    }

    /** 프로젝트 루트 기준 절대경로 변환 */
    _resolveProjectPath(relativePath, projectName) {
        if (!this.wizRoot) throw new Error('Workspace path not set.');
        const pn = projectName || this.currentProject;
        const projectRoot = path.join(this.wizRoot, 'project', pn);
        if (!relativePath) return projectRoot;
        if (path.isAbsolute(relativePath)) return relativePath;
        return path.join(projectRoot, relativePath);
    }

    /** appPath 해석: 상대경로 → 프로젝트 src 기준 절대경로 */
    _resolveAppPath(appPath, workspacePath, projectName) {
        if (!appPath) return appPath;
        if (path.isAbsolute(appPath)) return appPath;
        const ws = workspacePath || this.wizRoot;
        const pn = projectName || this.currentProject;
        const projectRoot = path.join(ws, 'project', pn);
        if (appPath.startsWith('src/') || appPath.startsWith('src\\')) {
            return path.join(projectRoot, appPath);
        }
        const directPath = path.join(projectRoot, appPath);
        if (fs.existsSync(directPath)) return directPath;
        return path.join(projectRoot, 'src', appPath);
    }

    // ==================== Utility Helpers ====================

    _buildTree(dirPath, options = {}) {
        const { maxDepth = 5, currentDepth = 0, includeFiles = true } = options;
        if (currentDepth >= maxDepth) return { '...': 'max depth reached' };
        const result = {};
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true })
                .sort((a, b) => {
                    if (a.isDirectory() && !b.isDirectory()) return -1;
                    if (!a.isDirectory() && b.isDirectory()) return 1;
                    return a.name.localeCompare(b.name);
                });
            for (const entry of entries) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__pycache__') continue;
                if (entry.isDirectory()) {
                    result[entry.name + '/'] = this._buildTree(path.join(dirPath, entry.name), { maxDepth, currentDepth: currentDepth + 1, includeFiles });
                } else if (includeFiles) {
                    result[entry.name] = fs.statSync(path.join(dirPath, entry.name)).size;
                }
            }
        } catch (e) { /* skip */ }
        return result;
    }

    _scanApps(dirPath, category) {
        const apps = [];
        if (!fs.existsSync(dirPath)) return apps;
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const appJsonPath = path.join(dirPath, entry.name, 'app.json');
                    if (fs.existsSync(appJsonPath)) {
                        try {
                            const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                            const files = fs.readdirSync(path.join(dirPath, entry.name));
                            apps.push({ name: entry.name, path: path.join(dirPath, entry.name), category, files, ...appJson });
                        } catch (e) { /* skip */ }
                    }
                }
            }
        } catch (e) { /* skip */ }
        return apps;
    }

    _jsonResult(data) {
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }

    // ==================== State Management ====================

    _getStatePath() {
        const candidates = [];
        if (this.wizStatePath) candidates.push(this.wizStatePath);
        if (this.wizRoot) candidates.push(path.join(this.wizRoot, '.vscode', '.wiz-state.json'));
        if (process.env.WIZ_WORKSPACE) candidates.push(path.join(process.env.WIZ_WORKSPACE, '.vscode', '.wiz-state.json'));
        try {
            let current = process.cwd();
            const visited = new Set();
            while (current && !visited.has(current)) {
                visited.add(current);
                candidates.push(path.join(current, '.vscode', '.wiz-state.json'));
                const parent = path.dirname(current);
                if (!parent || parent === current) break;
                current = parent;
            }
        } catch (e) { /* skip */ }
        for (const c of candidates) { if (c && fs.existsSync(c)) return c; }
        if (this.wizRoot) return path.join(this.wizRoot, '.vscode', '.wiz-state.json');
        if (process.env.WIZ_WORKSPACE) return path.join(process.env.WIZ_WORKSPACE, '.vscode', '.wiz-state.json');
        try { return path.join(process.cwd(), '.vscode', '.wiz-state.json'); } catch (e) { return null; }
    }

    _loadState() {
        try {
            const statePath = this._getStatePath();
            if (statePath && fs.existsSync(statePath)) {
                const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
                this.wizStatePath = statePath;
                if (raw.sessions) {
                    let latest = null, latestTime = -1;
                    for (const [, session] of Object.entries(raw.sessions)) {
                        if ((session.lastUsed || 0) > latestTime) { latestTime = session.lastUsed || 0; latest = session; }
                    }
                    if (latest) {
                        if (latest.currentProject) this.currentProject = latest.currentProject;
                        if (latest.workspacePath) this.wizRoot = latest.workspacePath;
                    }
                } else {
                    if (raw.currentProject) this.currentProject = raw.currentProject;
                    if (raw.workspacePath) this.wizRoot = raw.workspacePath;
                }
            }
        } catch (e) { /* skip */ }
    }

    _saveState() {
        try {
            const statePath = this._getStatePath();
            if (!statePath) return;
            const dir = path.dirname(statePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            let stateData = { sessions: {} };
            if (fs.existsSync(statePath)) {
                try { const raw = JSON.parse(fs.readFileSync(statePath, 'utf8')); if (raw.sessions) stateData = raw; } catch (e) { /* use empty */ }
            }
            let latestId = null, latestTime = -1;
            for (const [id, session] of Object.entries(stateData.sessions)) {
                if ((session.lastUsed || 0) > latestTime) { latestTime = session.lastUsed || 0; latestId = id; }
            }
            const targetId = latestId || '_mcp';
            stateData.sessions[targetId] = { ...stateData.sessions[targetId], workspacePath: this.wizRoot, currentProject: this.currentProject, lastUsed: Date.now() };
            fs.writeFileSync(statePath, JSON.stringify(stateData, null, 2), 'utf8');
        } catch (e) { /* skip */ }
    }

    // ==================== Build/Dependency Helpers ====================

    _resolveWizExecutable(workspacePath) {
        let interpreterPath = '';
        try {
            const settingsPath = path.join(workspacePath, '.vscode', 'settings.json');
            if (fs.existsSync(settingsPath)) {
                const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                interpreterPath = (settings['wizExplorer.build.pythonInterpreterPath'] || '').trim();
            }
        } catch (e) { /* skip */ }
        if (interpreterPath) interpreterPath = interpreterPath.replace(/\$\{workspaceFolder\}/g, workspacePath);
        if (interpreterPath && fs.existsSync(interpreterPath)) {
            const binDir = path.dirname(interpreterPath);
            const isWin = process.platform === 'win32';
            for (const c of (isWin ? ['wiz.exe', 'wiz.cmd', 'wiz.bat'] : ['wiz'])) {
                const p = path.join(binDir, c);
                if (fs.existsSync(p)) return p;
            }
        }
        const isWin = process.platform === 'win32';
        for (const venv of ['venv', '.venv', 'env', '.env']) {
            const binDir = isWin ? path.join(workspacePath, venv, 'Scripts') : path.join(workspacePath, venv, 'bin');
            const wizPath = path.join(binDir, isWin ? 'wiz.exe' : 'wiz');
            if (fs.existsSync(wizPath)) return wizPath;
        }
        return 'wiz';
    }

    _getPipPath(workspacePath) {
        try {
            const settingsPath = path.join(workspacePath, '.vscode', 'settings.json');
            if (fs.existsSync(settingsPath)) {
                const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                let ip = (settings['wizExplorer.build.pythonInterpreterPath'] || '').trim();
                if (ip) {
                    ip = ip.replace(/\$\{workspaceFolder\}/g, workspacePath);
                    if (fs.existsSync(ip)) {
                        const binDir = path.dirname(ip);
                        if (fs.existsSync(path.join(binDir, 'pip3'))) return path.join(binDir, 'pip3');
                        if (fs.existsSync(path.join(binDir, 'pip'))) return path.join(binDir, 'pip');
                    }
                }
            }
        } catch (e) { /* skip */ }
        for (const p of [
            path.join(workspacePath, 'venv', 'bin', 'pip'),
            path.join(workspacePath, '.venv', 'bin', 'pip'),
            path.join(workspacePath, 'env', 'bin', 'pip'),
        ]) { if (fs.existsSync(p)) return p; }
        return 'pip3';
    }

    _getNpmCwd(workspacePath, projectName, global) {
        if (global) return workspacePath;
        const projectPath = path.join(workspacePath, 'project', projectName);
        return fs.existsSync(path.join(projectPath, 'package.json')) ? projectPath : workspacePath;
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

    // ==================== Tool Definitions ====================

    _getToolDefinitions() {
        return [
            // ==================== Workspace ====================
            {
                name: 'wiz_workspace_status',
                description: 'Get current workspace state: workspacePath, active projectName, and list of all projects. Call this first to understand the current context. The state auto-syncs with VS Code Explorer.',
                inputSchema: { type: 'object', properties: {}, required: [] }
            },
            {
                name: 'wiz_workspace_list_dir',
                description: 'List contents of a directory relative to the Wiz workspace root (wiz-root-path). Use "" or omit path to list workspace root. Config files are at "config/". Returns file names, types, and sizes.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        relativePath: { type: 'string', description: 'Path relative to workspace root (e.g., "config", "plugin/workspace"). Empty = workspace root.' }
                    }
                }
            },
            {
                name: 'wiz_workspace_read_file',
                description: 'Read a file relative to the Wiz workspace root. For workspace config files, use path like "config/database.py". Supports optional line range for large files.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        relativePath: { type: 'string', description: 'File path relative to workspace root (e.g., "config/boot.py")' },
                        startLine: { type: 'number', description: 'Start line (1-based). Omit for beginning.' },
                        endLine: { type: 'number', description: 'End line (1-based, inclusive). Omit for end.' }
                    },
                    required: ['relativePath']
                }
            },
            {
                name: 'wiz_workspace_write_file',
                description: 'Write content to a file relative to the Wiz workspace root. Creates parent directories if needed. For workspace config, use "config/{name}.py".',
                inputSchema: {
                    type: 'object',
                    properties: {
                        relativePath: { type: 'string', description: 'File path relative to workspace root' },
                        content: { type: 'string', description: 'Content to write' }
                    },
                    required: ['relativePath', 'content']
                }
            },
            {
                name: 'wiz_workspace_create_dir',
                description: 'Create a directory relative to the Wiz workspace root (with parents as needed).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        relativePath: { type: 'string', description: 'Directory path relative to workspace root' }
                    },
                    required: ['relativePath']
                }
            },
            {
                name: 'wiz_workspace_delete',
                description: 'Delete a file or directory relative to the Wiz workspace root. Irreversible.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        relativePath: { type: 'string', description: 'Path relative to workspace root to delete' }
                    },
                    required: ['relativePath']
                }
            },
            {
                name: 'wiz_workspace_rename',
                description: 'Rename or move a file/directory relative to the Wiz workspace root.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        oldRelativePath: { type: 'string', description: 'Current path relative to workspace root' },
                        newRelativePath: { type: 'string', description: 'New path relative to workspace root' }
                    },
                    required: ['oldRelativePath', 'newRelativePath']
                }
            },

            // ==================== Project ====================
            {
                name: 'wiz_project_info',
                description: 'Get comprehensive project information: app counts by type, package list, directory structure overview, and paths. Call this to understand the project before making changes.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' }
                    }
                }
            },
            {
                name: 'wiz_project_switch',
                description: 'Switch the active project context. The change is synced with VS Code Explorer.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Name of the project to switch to' }
                    },
                    required: ['projectName']
                }
            },
            {
                name: 'wiz_project_build',
                description: 'Build the current Wiz project. Use clean=true only when build errors persist or explicitly requested. Normal build (clean=false) is recommended for regular changes.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        clean: { type: 'boolean', description: 'Clean build (removes previous artifacts first)', default: false }
                    }
                }
            },
            {
                name: 'wiz_project_export',
                description: 'Export a Wiz project as .wizproject archive file to exports/ directory.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' }
                    }
                }
            },
            {
                name: 'wiz_project_import',
                description: 'Import a .wizproject file into the workspace as a new project.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'Path to .wizproject file' },
                        projectName: { type: 'string', description: 'Name for the imported project' }
                    },
                    required: ['filePath', 'projectName']
                }
            },
            {
                name: 'wiz_project_structure',
                description: 'Get directory tree of the project src/ folder. Use subPath to start from a sub-directory (e.g., "portal/mypackage").',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        maxDepth: { type: 'number', description: 'Max depth (default: 4)', default: 4 },
                        subPath: { type: 'string', description: 'Sub-path within src/ to start from' }
                    }
                }
            },
            {
                name: 'wiz_project_list_dir',
                description: 'List contents of a directory relative to the project root ({workspace}/project/{name}/). Use "src/app" for app directory, "config" for project config. Returns file names, types, and sizes.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        relativePath: { type: 'string', description: 'Path relative to project root (e.g., "src/app", "config"). Empty = project root.' }
                    }
                }
            },
            {
                name: 'wiz_project_read_file',
                description: 'Read a file relative to the project root. For project config: "config/database.py", "config/season.py". For source: "src/controller/base.py". Supports line range.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        relativePath: { type: 'string', description: 'File path relative to project root' },
                        startLine: { type: 'number', description: 'Start line (1-based)' },
                        endLine: { type: 'number', description: 'End line (1-based, inclusive)' }
                    },
                    required: ['relativePath']
                }
            },
            {
                name: 'wiz_project_write_file',
                description: 'Write content to a file relative to the project root. Creates parent directories if needed. For project config: "config/database.py".',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        relativePath: { type: 'string', description: 'File path relative to project root' },
                        content: { type: 'string', description: 'Content to write' }
                    },
                    required: ['relativePath', 'content']
                }
            },
            {
                name: 'wiz_project_create_dir',
                description: 'Create a directory relative to the project root.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        relativePath: { type: 'string', description: 'Directory path relative to project root' }
                    },
                    required: ['relativePath']
                }
            },
            {
                name: 'wiz_project_delete',
                description: 'Delete a file or directory relative to the project root. Irreversible.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        relativePath: { type: 'string', description: 'Path relative to project root to delete' }
                    },
                    required: ['relativePath']
                }
            },
            {
                name: 'wiz_project_rename',
                description: 'Rename or move a file/directory relative to the project root.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        oldRelativePath: { type: 'string', description: 'Current path relative to project root' },
                        newRelativePath: { type: 'string', description: 'New path relative to project root' }
                    },
                    required: ['oldRelativePath', 'newRelativePath']
                }
            },
            {
                name: 'wiz_project_search_apps',
                description: 'Search apps across all sources and packages by keyword. Matches against name, title, namespace, id, and category.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        query: { type: 'string', description: 'Search keyword (case-insensitive)' }
                    },
                    required: ['query']
                }
            },
            {
                name: 'wiz_project_pip_list',
                description: 'List installed Python pip packages in the workspace virtual environment.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        outdated: { type: 'boolean', description: 'List only outdated packages', default: false }
                    }
                }
            },
            {
                name: 'wiz_project_pip_install',
                description: 'Install Python pip package(s). Supports version specifiers (e.g., "flask>=2.0").',
                inputSchema: {
                    type: 'object',
                    properties: {
                        packages: { type: 'array', items: { type: 'string' }, description: 'Package names to install' },
                        upgrade: { type: 'boolean', description: 'Upgrade to latest version', default: false }
                    },
                    required: ['packages']
                }
            },
            {
                name: 'wiz_project_pip_uninstall',
                description: 'Uninstall Python pip package(s).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        packages: { type: 'array', items: { type: 'string' }, description: 'Package names to uninstall' }
                    },
                    required: ['packages']
                }
            },
            {
                name: 'wiz_project_npm_list',
                description: 'List installed npm packages in the project.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        global: { type: 'boolean', description: 'List workspace-level packages', default: false },
                        outdated: { type: 'boolean', description: 'List only outdated packages', default: false }
                    }
                }
            },
            {
                name: 'wiz_project_npm_install',
                description: 'Install npm package(s). Supports version specifiers (e.g., "lodash@4.17.21").',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        packages: { type: 'array', items: { type: 'string' }, description: 'Package names to install' },
                        dev: { type: 'boolean', description: 'Install as devDependencies', default: false },
                        global: { type: 'boolean', description: 'Install to workspace root', default: false }
                    },
                    required: ['packages']
                }
            },
            {
                name: 'wiz_project_npm_uninstall',
                description: 'Uninstall npm package(s).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        packages: { type: 'array', items: { type: 'string' }, description: 'Package names to uninstall' },
                        global: { type: 'boolean', description: 'Uninstall from workspace root', default: false }
                    },
                    required: ['packages']
                }
            },

            // ==================== Source ====================
            {
                name: 'wiz_source_list_apps',
                description: 'List Source apps and routes. Apps are in src/app/ (page.*, component.*, layout.*) or src/{type}/. Routes are in src/route/. Returns metadata and file list for each.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        appType: { type: 'string', enum: ['all', 'page', 'component', 'layout', 'route'], description: 'Filter by type (default: all)', default: 'all' }
                    }
                }
            },
            {
                name: 'wiz_source_app_info',
                description: 'Get detailed info about a Source app/route: app.json config and all files in the folder.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'App folder path (absolute or relative like "src/app/page.home", "app/page.home")' }
                    },
                    required: ['appPath']
                }
            },
            {
                name: 'wiz_source_create_app',
                description: 'Create a new Source app (page, component, or layout). Creates the folder in src/app/ with app.json, view.html, view.ts.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        appType: { type: 'string', enum: ['page', 'component', 'layout'], description: 'App type' },
                        namespace: { type: 'string', description: 'Namespace (lowercase, letters/numbers/underscores/dots). Folder: {appType}.{namespace}' },
                        title: { type: 'string', description: 'Display title (defaults to namespace)' },
                        category: { type: 'string', description: 'Category grouping' },
                        controller: { type: 'string', description: 'Python controller name (without .py)' },
                        layout: { type: 'string', description: 'Layout app ID (page only, e.g., "layout.main")' },
                        viewuri: { type: 'string', description: 'Angular routing URI (page only, e.g., "/home")' }
                    },
                    required: ['appType', 'namespace']
                }
            },
            {
                name: 'wiz_source_create_route',
                description: 'Create a new Source route (API endpoint) in src/route/ with app.json and controller.py.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        id: { type: 'string', description: 'Route ID (folder name)' },
                        title: { type: 'string', description: 'Display title (defaults to id)' },
                        routePath: { type: 'string', description: 'API route path (e.g., /api/users)' }
                    },
                    required: ['id']
                }
            },
            {
                name: 'wiz_source_update_app',
                description: 'Update app.json of a Source app/route. Merges provided key-value pairs into existing config.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'App folder path' },
                        updates: { type: 'object', description: 'Key-value pairs to merge into app.json' }
                    },
                    required: ['appPath', 'updates']
                }
            },
            {
                name: 'wiz_source_delete_app',
                description: 'Delete a Source app/route folder and all contents. Irreversible.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'App folder path to delete' }
                    },
                    required: ['appPath']
                }
            },
            {
                name: 'wiz_source_list_files',
                description: 'List all files within a Source app/route folder with their sizes.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'App folder path' }
                    },
                    required: ['appPath']
                }
            },
            {
                name: 'wiz_source_read_file',
                description: 'Read a specific file within a Source app/route folder by filename. Common files: app.json, view.html, view.pug, view.ts, view.scss, controller.py, api.py, socket.py.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'App folder path' },
                        fileName: { type: 'string', description: 'File name to read (e.g., "view.html", "api.py")' },
                        startLine: { type: 'number', description: 'Start line (1-based)' },
                        endLine: { type: 'number', description: 'End line (1-based, inclusive)' }
                    },
                    required: ['appPath', 'fileName']
                }
            },
            {
                name: 'wiz_source_write_file',
                description: 'Write content to a file within a Source app/route folder. Creates the file if it does not exist.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'App folder path' },
                        fileName: { type: 'string', description: 'File name to write (e.g., "view.html", "api.py")' },
                        content: { type: 'string', description: 'Content to write' }
                    },
                    required: ['appPath', 'fileName', 'content']
                }
            },
            {
                name: 'wiz_source_delete_file',
                description: 'Delete a specific file within a Source app/route folder. Cannot delete app.json (use wiz_source_delete_app instead).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'App folder path' },
                        fileName: { type: 'string', description: 'File name to delete' }
                    },
                    required: ['appPath', 'fileName']
                }
            },
            {
                name: 'wiz_source_rename_file',
                description: 'Rename a file within a Source app/route folder.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'App folder path' },
                        oldName: { type: 'string', description: 'Current file name' },
                        newName: { type: 'string', description: 'New file name' }
                    },
                    required: ['appPath', 'oldName', 'newName']
                }
            },
            {
                name: 'wiz_source_list_controllers',
                description: 'List available Python controllers in src/controller/. Controllers handle authentication and pre-processing.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' }
                    }
                }
            },
            {
                name: 'wiz_source_list_layouts',
                description: 'List available layout apps (layout.*). Used when creating page apps to set the layout.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' }
                    }
                }
            },

            // ==================== Package ====================
            {
                name: 'wiz_package_list',
                description: 'List all portal packages. Packages are at src/portal/ and contain app/, route/, controller/, model/, libs/, styles/, assets/ sub-folders.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' }
                    }
                }
            },
            {
                name: 'wiz_package_create',
                description: 'Create a new portal package at src/portal/{namespace}/ with standard sub-folders.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        namespace: { type: 'string', description: 'Package namespace (lowercase letters/numbers, starts with letter)' },
                        title: { type: 'string', description: 'Display title' }
                    },
                    required: ['namespace']
                }
            },
            {
                name: 'wiz_package_export',
                description: 'Export a portal package as .wizpkg archive file.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        packageName: { type: 'string', description: 'Package name to export' }
                    },
                    required: ['packageName']
                }
            },
            {
                name: 'wiz_package_list_apps',
                description: 'List apps and routes within a specific portal package. Apps are in src/portal/{package}/app/, routes in src/portal/{package}/route/.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        packageName: { type: 'string', description: 'Package name' },
                        appType: { type: 'string', enum: ['all', 'app', 'route'], description: 'Filter (default: all)', default: 'all' }
                    },
                    required: ['packageName']
                }
            },
            {
                name: 'wiz_package_app_info',
                description: 'Get detailed info about a Portal app/route: app.json config and all files.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'Portal app folder path (absolute or relative like "src/portal/season/app/login")' }
                    },
                    required: ['appPath']
                }
            },
            {
                name: 'wiz_package_create_app',
                description: 'Create a Portal App in src/portal/{package}/app/{namespace}. Folder name = namespace. Creates app.json, view.html, view.ts, view.scss.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        packageName: { type: 'string', description: 'Portal package name' },
                        namespace: { type: 'string', description: 'App namespace (becomes folder name)' },
                        title: { type: 'string', description: 'Display title (defaults to namespace)' },
                        category: { type: 'string', description: 'Category (defaults to "editor")' },
                        controller: { type: 'string', description: 'Python controller name (without .py)' }
                    },
                    required: ['packageName', 'namespace']
                }
            },
            {
                name: 'wiz_package_create_route',
                description: 'Create a Portal Route in src/portal/{package}/route/{id}. Creates app.json and controller.py. Remember to set "use_route": true in portal.json.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        packageName: { type: 'string', description: 'Portal package name' },
                        id: { type: 'string', description: 'Route ID (folder name)' },
                        title: { type: 'string', description: 'Display title (defaults to id)' },
                        routePath: { type: 'string', description: 'API route path (e.g., /api/portal/example)' }
                    },
                    required: ['packageName', 'id']
                }
            },
            {
                name: 'wiz_package_update_app',
                description: 'Update app.json of a Portal app/route. Merges provided key-value pairs.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'Portal app folder path' },
                        updates: { type: 'object', description: 'Key-value pairs to merge into app.json' }
                    },
                    required: ['appPath', 'updates']
                }
            },
            {
                name: 'wiz_package_delete_app',
                description: 'Delete a Portal app/route folder and all contents. Irreversible.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'Portal app folder path to delete' }
                    },
                    required: ['appPath']
                }
            },
            {
                name: 'wiz_package_list_files',
                description: 'List all files within a Portal app/route folder with their sizes.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'Portal app folder path' }
                    },
                    required: ['appPath']
                }
            },
            {
                name: 'wiz_package_read_file',
                description: 'Read a specific file within a Portal app/route folder by filename.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'Portal app folder path' },
                        fileName: { type: 'string', description: 'File name to read' },
                        startLine: { type: 'number', description: 'Start line (1-based)' },
                        endLine: { type: 'number', description: 'End line (1-based, inclusive)' }
                    },
                    required: ['appPath', 'fileName']
                }
            },
            {
                name: 'wiz_package_write_file',
                description: 'Write content to a file within a Portal app/route folder. Creates the file if not exists.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'Portal app folder path' },
                        fileName: { type: 'string', description: 'File name to write' },
                        content: { type: 'string', description: 'Content to write' }
                    },
                    required: ['appPath', 'fileName', 'content']
                }
            },
            {
                name: 'wiz_package_delete_file',
                description: 'Delete a specific file within a Portal app/route folder. Cannot delete app.json.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'Portal app folder path' },
                        fileName: { type: 'string', description: 'File name to delete' }
                    },
                    required: ['appPath', 'fileName']
                }
            },
            {
                name: 'wiz_package_rename_file',
                description: 'Rename a file within a Portal app/route folder.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        appPath: { type: 'string', description: 'Portal app folder path' },
                        oldName: { type: 'string', description: 'Current file name' },
                        newName: { type: 'string', description: 'New file name' }
                    },
                    required: ['appPath', 'oldName', 'newName']
                }
            },
            {
                name: 'wiz_package_list_controllers',
                description: 'List available Python controllers in a portal package (src/portal/{package}/controller/).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Project name (auto-detected if omitted)' },
                        packageName: { type: 'string', description: 'Portal package name' }
                    },
                    required: ['packageName']
                }
            },
        ];
    }

    // ==================== Workspace Handlers ====================

    async workspaceStatus() {
        this._loadState();
        const projectPath = this.wizRoot ? path.join(this.wizRoot, 'project') : null;
        let projects = [];
        if (projectPath && fs.existsSync(projectPath)) {
            projects = fs.readdirSync(projectPath, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
        }
        return this._jsonResult({
            workspacePath: this.wizRoot,
            currentProject: this.currentProject,
            projects,
            paths: {
                workspace: this.wizRoot,
                config: this.wizRoot ? path.join(this.wizRoot, 'config') : null,
                project: this.wizRoot ? path.join(this.wizRoot, 'project', this.currentProject) : null,
                projectSrc: this.wizRoot ? this._getSrcPath(this.wizRoot, this.currentProject) : null
            }
        });
    }

    async workspaceListDir({ relativePath }) {
        const absPath = this._resolveWorkspacePath(relativePath || '');
        if (!fs.existsSync(absPath)) throw new Error(`Directory does not exist: ${absPath}`);
        if (!fs.statSync(absPath).isDirectory()) throw new Error(`Not a directory: ${absPath}`);
        const entries = fs.readdirSync(absPath, { withFileTypes: true });
        const items = entries.map(entry => {
            const fp = path.join(absPath, entry.name);
            const stat = fs.statSync(fp);
            return { name: entry.name, type: entry.isDirectory() ? 'directory' : 'file', size: stat.size, modified: stat.mtime.toISOString() };
        });
        return this._jsonResult({ path: absPath, relativePath: relativePath || '', items, count: items.length });
    }

    async workspaceReadFile({ relativePath, startLine, endLine }) {
        const absPath = this._resolveWorkspacePath(relativePath);
        if (!fs.existsSync(absPath)) throw new Error(`File does not exist: ${absPath}`);
        if (fs.statSync(absPath).isDirectory()) throw new Error(`Path is a directory: ${absPath}`);
        const content = fs.readFileSync(absPath, 'utf8');
        if (startLine || endLine) {
            const lines = content.split('\n');
            const s = (startLine || 1) - 1, e = endLine || lines.length;
            return this._jsonResult({ filePath: absPath, content: lines.slice(s, e).join('\n'), totalLines: lines.length, range: { start: s + 1, end: Math.min(e, lines.length) } });
        }
        return this._jsonResult({ filePath: absPath, content, size: Buffer.byteLength(content, 'utf8'), totalLines: content.split('\n').length });
    }

    async workspaceWriteFile({ relativePath, content }) {
        const absPath = this._resolveWorkspacePath(relativePath);
        const dir = path.dirname(absPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(absPath, content, 'utf8');
        return this._jsonResult({ success: true, filePath: absPath, size: Buffer.byteLength(content, 'utf8') });
    }

    async workspaceCreateDir({ relativePath }) {
        const absPath = this._resolveWorkspacePath(relativePath);
        if (fs.existsSync(absPath)) throw new Error(`Path already exists: ${absPath}`);
        fs.mkdirSync(absPath, { recursive: true });
        return this._jsonResult({ success: true, path: absPath });
    }

    async workspaceDelete({ relativePath }) {
        const absPath = this._resolveWorkspacePath(relativePath);
        if (!fs.existsSync(absPath)) throw new Error(`Path does not exist: ${absPath}`);
        const wasDir = fs.statSync(absPath).isDirectory();
        fs.rmSync(absPath, { recursive: true, force: true });
        return this._jsonResult({ success: true, deletedPath: absPath, wasDirectory: wasDir });
    }

    async workspaceRename({ oldRelativePath, newRelativePath }) {
        const oldAbs = this._resolveWorkspacePath(oldRelativePath);
        const newAbs = this._resolveWorkspacePath(newRelativePath);
        if (!fs.existsSync(oldAbs)) throw new Error(`Source does not exist: ${oldAbs}`);
        if (fs.existsSync(newAbs)) throw new Error(`Destination already exists: ${newAbs}`);
        const destDir = path.dirname(newAbs);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.renameSync(oldAbs, newAbs);
        return this._jsonResult({ success: true, oldPath: oldAbs, newPath: newAbs });
    }

    // ==================== Project Handlers ====================

    async projectInfo({ projectName }) {
        const pn = projectName || this.currentProject;
        const ws = this.wizRoot;
        const srcPath = this._getSrcPath(ws, pn);
        const projectPath = path.join(ws, 'project', pn);
        if (!fs.existsSync(projectPath)) throw new Error(`Project '${pn}' does not exist at ${projectPath}`);

        const allProjects = (() => {
            const pp = path.join(ws, 'project');
            return fs.existsSync(pp) ? fs.readdirSync(pp, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name) : [];
        })();

        const appCounts = { page: 0, component: 0, layout: 0, route: 0, portalApp: 0, portalRoute: 0 };
        if (fs.existsSync(srcPath)) {
            const appDir = path.join(srcPath, 'app');
            if (fs.existsSync(appDir)) {
                try {
                    for (const e of fs.readdirSync(appDir, { withFileTypes: true })) {
                        if (e.isDirectory()) {
                            if (e.name.startsWith('page.')) appCounts.page++;
                            else if (e.name.startsWith('component.')) appCounts.component++;
                            else if (e.name.startsWith('layout.')) appCounts.layout++;
                        }
                    }
                } catch (e) { /* skip */ }
            }
            for (const type of ['page', 'component', 'layout']) {
                const td = path.join(srcPath, type);
                if (fs.existsSync(td)) { try { appCounts[type] += fs.readdirSync(td, { withFileTypes: true }).filter(e => e.isDirectory()).length; } catch (e) { /* skip */ } }
            }
            const routeDir = path.join(srcPath, 'route');
            if (fs.existsSync(routeDir)) { try { appCounts.route = fs.readdirSync(routeDir, { withFileTypes: true }).filter(e => e.isDirectory()).length; } catch (e) { /* skip */ } }
            const portalPath = path.join(srcPath, 'portal');
            if (fs.existsSync(portalPath)) {
                try {
                    for (const pkg of fs.readdirSync(portalPath, { withFileTypes: true }).filter(e => e.isDirectory())) {
                        const pa = path.join(portalPath, pkg.name, 'app');
                        const pr = path.join(portalPath, pkg.name, 'route');
                        if (fs.existsSync(pa)) appCounts.portalApp += fs.readdirSync(pa, { withFileTypes: true }).filter(e => e.isDirectory()).length;
                        if (fs.existsSync(pr)) appCounts.portalRoute += fs.readdirSync(pr, { withFileTypes: true }).filter(e => e.isDirectory()).length;
                    }
                } catch (e) { /* skip */ }
            }
        }

        const packages = [];
        const portalPath = path.join(srcPath, 'portal');
        if (fs.existsSync(portalPath)) {
            try {
                for (const e of fs.readdirSync(portalPath, { withFileTypes: true })) {
                    if (e.isDirectory()) {
                        let info = { name: e.name };
                        const pjPath = path.join(portalPath, e.name, 'portal.json');
                        if (fs.existsSync(pjPath)) { try { info = { ...info, ...JSON.parse(fs.readFileSync(pjPath, 'utf8')) }; } catch (e) { /* skip */ } }
                        packages.push(info);
                    }
                }
            } catch (e) { /* skip */ }
        }

        return this._jsonResult({
            project: pn, allProjects,
            paths: { workspace: ws, project: projectPath, src: srcPath, config: path.join(projectPath, 'config') },
            appCounts, packages,
            fileTypes: {
                standard: 'app.json (config), view.html/view.pug (template), view.ts (Angular), view.scss (styles), controller.py (backend), api.py (API), socket.py (WebSocket)',
                route: 'app.json (config), controller.py (handler)'
            }
        });
    }

    async projectSwitch({ projectName }) {
        const projectPath = path.join(this.wizRoot, 'project', projectName);
        if (!fs.existsSync(projectPath)) throw new Error(`Project '${projectName}' does not exist`);
        this.currentProject = projectName;
        this._saveState();
        return this._jsonResult({ success: true, currentProject: projectName });
    }

    async projectBuild({ projectName, clean = false }) {
        const pn = projectName || this.currentProject;
        const ws = this.wizRoot;
        const args = ['project', 'build', '--project', pn];
        if (clean) args.push('--clean');
        const wizExecutable = this._resolveWizExecutable(ws);
        const { stdout, stderr } = await exec(`"${wizExecutable}" ${args.join(' ')}`, { cwd: ws });
        return this._jsonResult({ success: true, output: stdout, errors: stderr || null });
    }

    async projectExport({ projectName }) {
        const pn = projectName || this.currentProject;
        const ws = this.wizRoot;
        const exportsPath = path.join(ws, 'exports');
        if (!fs.existsSync(exportsPath)) fs.mkdirSync(exportsPath, { recursive: true });
        const outputPath = path.join(exportsPath, pn);
        await exec(`wiz project export --project=${pn} --output="${outputPath}"`, { cwd: ws });
        return this._jsonResult({ success: true, outputPath: `${outputPath}.wizproject` });
    }

    async projectImport({ filePath, projectName }) {
        const ws = this.wizRoot;
        const targetPath = path.join(ws, 'project', projectName);
        if (fs.existsSync(targetPath)) throw new Error(`Project '${projectName}' already exists`);
        fs.mkdirSync(targetPath, { recursive: true });
        const absFilePath = path.isAbsolute(filePath) ? filePath : path.join(ws, filePath);
        await exec(`unzip -o "${absFilePath}" -d "${targetPath}"`);
        return this._jsonResult({ success: true, projectPath: targetPath });
    }

    async projectStructure({ projectName, maxDepth = 4, subPath }) {
        const pn = projectName || this.currentProject;
        const srcPath = this._getSrcPath(this.wizRoot, pn);
        const startPath = subPath ? path.join(srcPath, subPath) : srcPath;
        if (!fs.existsSync(startPath)) throw new Error(`Path does not exist: ${startPath}`);
        return this._jsonResult({ basePath: startPath, tree: this._buildTree(startPath, { maxDepth, includeFiles: true }) });
    }

    async projectListDir({ projectName, relativePath }) {
        const absPath = this._resolveProjectPath(relativePath || '', projectName || this.currentProject);
        if (!fs.existsSync(absPath)) throw new Error(`Directory does not exist: ${absPath}`);
        if (!fs.statSync(absPath).isDirectory()) throw new Error(`Not a directory: ${absPath}`);
        const entries = fs.readdirSync(absPath, { withFileTypes: true });
        const items = entries.map(entry => {
            const fp = path.join(absPath, entry.name);
            const stat = fs.statSync(fp);
            return { name: entry.name, type: entry.isDirectory() ? 'directory' : 'file', size: stat.size, modified: stat.mtime.toISOString() };
        });
        return this._jsonResult({ path: absPath, relativePath: relativePath || '', items, count: items.length });
    }

    async projectReadFile({ projectName, relativePath, startLine, endLine }) {
        const absPath = this._resolveProjectPath(relativePath, projectName || this.currentProject);
        if (!fs.existsSync(absPath)) throw new Error(`File does not exist: ${absPath}`);
        if (fs.statSync(absPath).isDirectory()) throw new Error(`Path is a directory: ${absPath}`);
        const content = fs.readFileSync(absPath, 'utf8');
        if (startLine || endLine) {
            const lines = content.split('\n');
            const s = (startLine || 1) - 1, e = endLine || lines.length;
            return this._jsonResult({ filePath: absPath, content: lines.slice(s, e).join('\n'), totalLines: lines.length, range: { start: s + 1, end: Math.min(e, lines.length) } });
        }
        return this._jsonResult({ filePath: absPath, content, size: Buffer.byteLength(content, 'utf8'), totalLines: content.split('\n').length });
    }

    async projectWriteFile({ projectName, relativePath, content }) {
        const absPath = this._resolveProjectPath(relativePath, projectName || this.currentProject);
        const dir = path.dirname(absPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(absPath, content, 'utf8');
        return this._jsonResult({ success: true, filePath: absPath, size: Buffer.byteLength(content, 'utf8') });
    }

    async projectCreateDir({ projectName, relativePath }) {
        const absPath = this._resolveProjectPath(relativePath, projectName || this.currentProject);
        if (fs.existsSync(absPath)) throw new Error(`Path already exists: ${absPath}`);
        fs.mkdirSync(absPath, { recursive: true });
        return this._jsonResult({ success: true, path: absPath });
    }

    async projectDelete({ projectName, relativePath }) {
        const absPath = this._resolveProjectPath(relativePath, projectName || this.currentProject);
        if (!fs.existsSync(absPath)) throw new Error(`Path does not exist: ${absPath}`);
        const wasDir = fs.statSync(absPath).isDirectory();
        fs.rmSync(absPath, { recursive: true, force: true });
        return this._jsonResult({ success: true, deletedPath: absPath, wasDirectory: wasDir });
    }

    async projectRename({ projectName, oldRelativePath, newRelativePath }) {
        const oldAbs = this._resolveProjectPath(oldRelativePath, projectName || this.currentProject);
        const newAbs = this._resolveProjectPath(newRelativePath, projectName || this.currentProject);
        if (!fs.existsSync(oldAbs)) throw new Error(`Source does not exist: ${oldAbs}`);
        if (fs.existsSync(newAbs)) throw new Error(`Destination already exists: ${newAbs}`);
        const destDir = path.dirname(newAbs);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.renameSync(oldAbs, newAbs);
        return this._jsonResult({ success: true, oldPath: oldAbs, newPath: newAbs });
    }

    async projectSearchApps({ projectName, query }) {
        const allResult = await this.sourceListApps({ projectName, appType: 'all' });
        const sourceApps = JSON.parse(allResult.content[0].text).apps;
        // Also scan portal packages
        const pn = projectName || this.currentProject;
        const portalPath = path.join(this._getSrcPath(this.wizRoot, pn), 'portal');
        let portalApps = [];
        if (fs.existsSync(portalPath)) {
            for (const pkg of fs.readdirSync(portalPath, { withFileTypes: true }).filter(e => e.isDirectory())) {
                portalApps.push(...this._scanApps(path.join(portalPath, pkg.name, 'app'), `portal/${pkg.name}`));
                portalApps.push(...this._scanApps(path.join(portalPath, pkg.name, 'route'), `portal/${pkg.name}/route`));
            }
        }
        const allApps = [...sourceApps, ...portalApps];
        const q = query.toLowerCase();
        const matched = allApps.filter(app => {
            return [app.name, app.title, app.namespace, app.id, app.category, app.mode].filter(Boolean).some(s => s.toLowerCase().includes(q));
        });
        return this._jsonResult({ query, results: matched, count: matched.length });
    }

    // pip / npm
    async projectPipList({ outdated = false }) {
        const pip = this._getPipPath(this.wizRoot);
        const args = outdated ? 'list --outdated --format=json' : 'list --format=json';
        const { stdout } = await exec(`${pip} ${args}`, { cwd: this.wizRoot });
        const packages = JSON.parse(stdout);
        return this._jsonResult({ packages, count: packages.length, pip, outdated });
    }

    async projectPipInstall({ packages, upgrade = false }) {
        if (!packages || !packages.length) throw new Error('No packages specified');
        const pip = this._getPipPath(this.wizRoot);
        const { stdout, stderr } = await exec(`${pip} install${upgrade ? ' --upgrade' : ''} ${packages.map(p => `"${p}"`).join(' ')}`, { cwd: this.wizRoot });
        return this._jsonResult({ success: true, packages, output: stdout, warnings: stderr || null });
    }

    async projectPipUninstall({ packages }) {
        if (!packages || !packages.length) throw new Error('No packages specified');
        const pip = this._getPipPath(this.wizRoot);
        const { stdout, stderr } = await exec(`${pip} uninstall -y ${packages.map(p => `"${p}"`).join(' ')}`, { cwd: this.wizRoot });
        return this._jsonResult({ success: true, packages, output: stdout, warnings: stderr || null });
    }

    async projectNpmList({ projectName, global = false, outdated = false }) {
        const pn = projectName || this.currentProject;
        const cwd = this._getNpmCwd(this.wizRoot, pn, global);
        if (outdated) {
            try {
                const { stdout } = await exec('npm outdated --json', { cwd });
                return this._jsonResult({ packages: JSON.parse(stdout || '{}'), cwd, outdated: true });
            } catch (e) {
                if (e.stdout) return this._jsonResult({ packages: JSON.parse(e.stdout || '{}'), cwd, outdated: true });
                throw e;
            }
        }
        const { stdout } = await exec('npm list --json --depth=0', { cwd });
        const result = JSON.parse(stdout);
        const packages = Object.entries(result.dependencies || {}).map(([name, info]) => ({ name, version: info.version || 'unknown' }));
        return this._jsonResult({ packages, count: packages.length, cwd });
    }

    async projectNpmInstall({ projectName, packages, dev = false, global = false }) {
        if (!packages || !packages.length) throw new Error('No packages specified');
        const pn = projectName || this.currentProject;
        const cwd = this._getNpmCwd(this.wizRoot, pn, global);
        if (!fs.existsSync(path.join(cwd, 'package.json'))) await exec('npm init -y', { cwd });
        const { stdout, stderr } = await exec(`npm install${dev ? ' --save-dev' : ''} ${packages.map(p => `"${p}"`).join(' ')}`, { cwd });
        return this._jsonResult({ success: true, packages, dev, output: stdout, warnings: stderr || null, cwd });
    }

    async projectNpmUninstall({ projectName, packages, global = false }) {
        if (!packages || !packages.length) throw new Error('No packages specified');
        const pn = projectName || this.currentProject;
        const cwd = this._getNpmCwd(this.wizRoot, pn, global);
        const { stdout, stderr } = await exec(`npm uninstall ${packages.map(p => `"${p}"`).join(' ')}`, { cwd });
        return this._jsonResult({ success: true, packages, output: stdout, warnings: stderr || null, cwd });
    }

    // ==================== Source Handlers ====================

    async sourceListApps({ projectName, appType = 'all' }) {
        const pn = projectName || this.currentProject;
        const srcPath = this._getSrcPath(this.wizRoot, pn);
        let allApps = [];
        const types = appType === 'all' ? ['page', 'component', 'layout', 'route'] : [appType];

        // src/app/ (prefixed)
        const appDir = path.join(srcPath, 'app');
        if (fs.existsSync(appDir)) {
            for (const type of types.filter(t => t !== 'route')) {
                const apps = this._scanApps(appDir, type).filter(a => a.name.startsWith(`${type}.`));
                allApps.push(...apps);
            }
            const seen = new Set();
            allApps = allApps.filter(app => { if (seen.has(app.path)) return false; seen.add(app.path); return true; });
        }
        // src/{type}/ directories
        for (const type of types.filter(t => t !== 'route')) {
            const typeDir = path.join(srcPath, type);
            if (fs.existsSync(typeDir)) allApps.push(...this._scanApps(typeDir, type));
        }
        // src/route/
        if (types.includes('route')) allApps.push(...this._scanApps(path.join(srcPath, 'route'), 'route'));

        return this._jsonResult({ apps: allApps, count: allApps.length });
    }

    /** Shared: get app info (works for both source and package) */
    async _appInfo(appPath) {
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        const appJsonPath = path.join(absPath, 'app.json');
        if (!fs.existsSync(appJsonPath)) throw new Error(`app.json not found at ${absPath}`);
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        const files = fs.readdirSync(absPath).map(f => {
            const stat = fs.statSync(path.join(absPath, f));
            return { name: f, size: stat.size, isDirectory: stat.isDirectory() };
        });
        return this._jsonResult({ ...appJson, path: absPath, files });
    }

    async sourceAppInfo(args) { return this._appInfo(args.appPath); }

    async sourceCreateApp({ projectName, appType, namespace, title, category, controller, layout, viewuri }) {
        const pn = projectName || this.currentProject;
        const srcPath = this._getSrcPath(this.wizRoot, pn);
        const parentPath = this._getAppParentPath(srcPath);
        const appID = `${appType}.${namespace}`;
        const newAppPath = path.join(parentPath, appID);
        if (fs.existsSync(newAppPath)) throw new Error(`App '${appID}' already exists at ${newAppPath}`);
        fs.mkdirSync(newAppPath, { recursive: true });
        const appJson = { id: appID, mode: appType, title: title || namespace, namespace, category: category || namespace, viewuri: viewuri || '', preview: '', controller: controller || '', layout: layout || '' };
        fs.writeFileSync(path.join(newAppPath, 'app.json'), JSON.stringify(appJson, null, 4));
        fs.writeFileSync(path.join(newAppPath, 'view.html'), APP_TEMPLATES['view.html']);
        fs.writeFileSync(path.join(newAppPath, 'view.ts'), APP_TEMPLATES['view.ts']);
        return this._jsonResult({ success: true, appPath: newAppPath, appJson });
    }

    async sourceCreateRoute({ projectName, id, title, routePath }) {
        const pn = projectName || this.currentProject;
        const routeDir = path.join(this._getSrcPath(this.wizRoot, pn), 'route');
        if (!fs.existsSync(routeDir)) fs.mkdirSync(routeDir, { recursive: true });
        const newRoutePath = path.join(routeDir, id);
        if (fs.existsSync(newRoutePath)) throw new Error(`Route '${id}' already exists`);
        fs.mkdirSync(newRoutePath, { recursive: true });
        const appJson = { id, title: title || id, route: routePath || '', category: '', viewuri: '', controller: '' };
        fs.writeFileSync(path.join(newRoutePath, 'app.json'), JSON.stringify(appJson, null, 4));
        fs.writeFileSync(path.join(newRoutePath, 'controller.py'), '');
        return this._jsonResult({ success: true, routePath: newRoutePath, appJson });
    }

    /** Shared: update app.json */
    async _updateApp(appPath, updates) {
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        const appJsonPath = path.join(absPath, 'app.json');
        if (!fs.existsSync(appJsonPath)) throw new Error(`app.json not found at ${absPath}`);
        const newData = { ...JSON.parse(fs.readFileSync(appJsonPath, 'utf8')), ...updates };
        fs.writeFileSync(appJsonPath, JSON.stringify(newData, null, 4));
        return this._jsonResult({ success: true, appJson: newData });
    }

    async sourceUpdateApp({ appPath, updates }) { return this._updateApp(appPath, updates); }

    /** Shared: delete app folder */
    async _deleteApp(appPath) {
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        if (!fs.existsSync(absPath)) throw new Error(`App folder not found: ${absPath}`);
        fs.rmSync(absPath, { recursive: true, force: true });
        return this._jsonResult({ success: true, deletedPath: absPath });
    }

    async sourceDeleteApp({ appPath }) { return this._deleteApp(appPath); }

    /** Shared: list files in app folder */
    async _listAppFiles(appPath) {
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        if (!fs.existsSync(absPath)) throw new Error(`App folder not found: ${absPath}`);
        const files = fs.readdirSync(absPath).map(f => {
            const fp = path.join(absPath, f);
            const stat = fs.statSync(fp);
            return { name: f, size: stat.size, isDirectory: stat.isDirectory() };
        });
        return this._jsonResult({ appPath: absPath, files, count: files.length });
    }

    async sourceListFiles({ appPath }) { return this._listAppFiles(appPath); }

    /** Shared: read file in app folder */
    async _readAppFile(appPath, fileName, startLine, endLine) {
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        const filePath = path.join(absPath, fileName);
        if (!fs.existsSync(filePath)) return this._jsonResult({ exists: false, content: null, fileName });
        const content = fs.readFileSync(filePath, 'utf8');
        if (startLine || endLine) {
            const lines = content.split('\n');
            const s = (startLine || 1) - 1, e = endLine || lines.length;
            return this._jsonResult({ exists: true, fileName, filePath, content: lines.slice(s, e).join('\n'), totalLines: lines.length, range: { start: s + 1, end: Math.min(e, lines.length) } });
        }
        return this._jsonResult({ exists: true, content, fileName, filePath });
    }

    async sourceReadFile({ appPath, fileName, startLine, endLine }) { return this._readAppFile(appPath, fileName, startLine, endLine); }

    /** Shared: write file in app folder */
    async _writeAppFile(appPath, fileName, content) {
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        if (!fs.existsSync(absPath)) throw new Error(`App folder does not exist: ${absPath}`);
        const filePath = path.join(absPath, fileName);
        fs.writeFileSync(filePath, content, 'utf8');
        return this._jsonResult({ success: true, filePath });
    }

    async sourceWriteFile({ appPath, fileName, content }) { return this._writeAppFile(appPath, fileName, content); }

    /** Shared: delete file in app folder */
    async _deleteAppFile(appPath, fileName) {
        if (fileName === 'app.json') throw new Error('Cannot delete app.json. Use delete_app to remove the entire app.');
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        const filePath = path.join(absPath, fileName);
        if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
        fs.rmSync(filePath, { force: true });
        return this._jsonResult({ success: true, deletedFile: filePath });
    }

    async sourceDeleteFile({ appPath, fileName }) { return this._deleteAppFile(appPath, fileName); }

    /** Shared: rename file in app folder */
    async _renameAppFile(appPath, oldName, newName) {
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        const oldFile = path.join(absPath, oldName);
        const newFile = path.join(absPath, newName);
        if (!fs.existsSync(oldFile)) throw new Error(`File not found: ${oldFile}`);
        if (fs.existsSync(newFile)) throw new Error(`Destination already exists: ${newFile}`);
        fs.renameSync(oldFile, newFile);
        return this._jsonResult({ success: true, oldPath: oldFile, newPath: newFile });
    }

    async sourceRenameFile({ appPath, oldName, newName }) { return this._renameAppFile(appPath, oldName, newName); }

    async sourceListControllers({ projectName }) {
        const pn = projectName || this.currentProject;
        const controllerDir = path.join(this._getSrcPath(this.wizRoot, pn), 'controller');
        if (!fs.existsSync(controllerDir)) return this._jsonResult({ controllers: [], controllerDir });
        const controllers = fs.readdirSync(controllerDir).filter(f => f.endsWith('.py') && f !== '__init__.py').map(f => {
            const fp = path.join(controllerDir, f);
            return { name: f.replace('.py', ''), file: f, path: fp, size: fs.statSync(fp).size };
        });
        return this._jsonResult({ controllers, controllerDir });
    }

    async sourceListLayouts({ projectName }) {
        const pn = projectName || this.currentProject;
        const srcPath = this._getSrcPath(this.wizRoot, pn);
        const layouts = [];
        for (const dir of [path.join(srcPath, 'app'), path.join(srcPath, 'layout')]) {
            if (!fs.existsSync(dir)) continue;
            try {
                for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                    if (entry.isDirectory() && entry.name.startsWith('layout.')) {
                        let info = { name: entry.name, path: path.join(dir, entry.name) };
                        const aj = path.join(dir, entry.name, 'app.json');
                        if (fs.existsSync(aj)) { try { info = { ...info, ...JSON.parse(fs.readFileSync(aj, 'utf8')) }; } catch (e) { /* skip */ } }
                        layouts.push(info);
                    }
                }
            } catch (e) { /* skip */ }
        }
        return this._jsonResult({ layouts });
    }

    // ==================== Package Handlers ====================

    async packageList({ projectName }) {
        const pn = projectName || this.currentProject;
        const portalPath = path.join(this._getSrcPath(this.wizRoot, pn), 'portal');
        if (!fs.existsSync(portalPath)) return this._jsonResult({ packages: [] });
        const packages = fs.readdirSync(portalPath, { withFileTypes: true }).filter(e => e.isDirectory()).map(entry => {
            let info = { name: entry.name, path: path.join(portalPath, entry.name) };
            const pjPath = path.join(portalPath, entry.name, 'portal.json');
            if (fs.existsSync(pjPath)) { try { info = { ...info, ...JSON.parse(fs.readFileSync(pjPath, 'utf8')) }; } catch (e) { /* skip */ } }
            try { info.subFolders = fs.readdirSync(path.join(portalPath, entry.name), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name); } catch (e) { info.subFolders = []; }
            return info;
        });
        return this._jsonResult({ packages });
    }

    async packageCreate({ projectName, namespace, title }) {
        const pn = projectName || this.currentProject;
        const cmd = `wiz project package create --namespace=${namespace} --project=${pn}${title ? ` --title=${title}` : ''}`;
        const { stdout, stderr } = await exec(cmd, { cwd: this.wizRoot });
        return this._jsonResult({ success: true, output: stdout, errors: stderr || null, namespace });
    }

    async packageExport({ projectName, packageName }) {
        const pn = projectName || this.currentProject;
        const packagePath = path.join(this._getSrcPath(this.wizRoot, pn), 'portal', packageName);
        if (!fs.existsSync(packagePath)) throw new Error(`Package '${packageName}' not found`);
        const exportsDir = path.join(this.wizRoot, 'exports');
        if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
        const outputPath = path.join(exportsDir, `${packageName}.wizpkg`);
        await exec(`cd "${packagePath}" && zip -r "${outputPath}" .`);
        return this._jsonResult({ success: true, outputPath });
    }

    async packageListApps({ projectName, packageName, appType = 'all' }) {
        const pn = projectName || this.currentProject;
        const portalPath = path.join(this._getSrcPath(this.wizRoot, pn), 'portal', packageName);
        if (!fs.existsSync(portalPath)) throw new Error(`Package '${packageName}' not found`);
        let apps = [];
        if (appType === 'all' || appType === 'app') {
            apps.push(...this._scanApps(path.join(portalPath, 'app'), `portal/${packageName}`));
        }
        if (appType === 'all' || appType === 'route') {
            apps.push(...this._scanApps(path.join(portalPath, 'route'), `portal/${packageName}/route`));
        }
        return this._jsonResult({ packageName, apps, count: apps.length });
    }

    async packageAppInfo(args) { return this._appInfo(args.appPath); }

    async packageCreateApp({ projectName, packageName, namespace, title, category, controller }) {
        const pn = projectName || this.currentProject;
        const srcPath = this._getSrcPath(this.wizRoot, pn);
        const pkgPath = path.join(srcPath, 'portal', packageName);
        if (!fs.existsSync(pkgPath)) throw new Error(`Package '${packageName}' does not exist`);
        const appFolderPath = path.join(pkgPath, 'app');
        if (!fs.existsSync(appFolderPath)) fs.mkdirSync(appFolderPath, { recursive: true });
        const newAppPath = path.join(appFolderPath, namespace);
        if (fs.existsSync(newAppPath)) throw new Error(`Portal app '${namespace}' already exists in package '${packageName}'`);
        fs.mkdirSync(newAppPath, { recursive: true });
        const appJson = { id: namespace, mode: 'portal', title: title || namespace, namespace, category: category || 'editor', viewuri: '', controller: controller || '', template: `wiz-portal-${packageName}-${namespace.replace(/\./g, '-')}` };
        fs.writeFileSync(path.join(newAppPath, 'app.json'), JSON.stringify(appJson, null, 4));
        fs.writeFileSync(path.join(newAppPath, 'view.html'), APP_TEMPLATES['view.html']);
        fs.writeFileSync(path.join(newAppPath, 'view.ts'), APP_TEMPLATES['view.ts']);
        fs.writeFileSync(path.join(newAppPath, 'view.scss'), APP_TEMPLATES['view.scss']);
        return this._jsonResult({ success: true, appPath: newAppPath, appJson });
    }

    async packageCreateRoute({ projectName, packageName, id, title, routePath }) {
        const pn = projectName || this.currentProject;
        const srcPath = this._getSrcPath(this.wizRoot, pn);
        const pkgPath = path.join(srcPath, 'portal', packageName);
        if (!fs.existsSync(pkgPath)) throw new Error(`Package '${packageName}' does not exist`);
        const routeFolderPath = path.join(pkgPath, 'route');
        if (!fs.existsSync(routeFolderPath)) fs.mkdirSync(routeFolderPath, { recursive: true });
        const newRoutePath = path.join(routeFolderPath, id);
        if (fs.existsSync(newRoutePath)) throw new Error(`Portal route '${id}' already exists in package '${packageName}'`);
        fs.mkdirSync(newRoutePath, { recursive: true });
        const appJson = { id, title: title || id, route: routePath || '', category: '', viewuri: '', controller: '' };
        fs.writeFileSync(path.join(newRoutePath, 'app.json'), JSON.stringify(appJson, null, 4));
        fs.writeFileSync(path.join(newRoutePath, 'controller.py'), '');
        return this._jsonResult({ success: true, routePath: newRoutePath, appJson });
    }

    async packageUpdateApp({ appPath, updates }) { return this._updateApp(appPath, updates); }
    async packageDeleteApp({ appPath }) { return this._deleteApp(appPath); }
    async packageListFiles({ appPath }) { return this._listAppFiles(appPath); }
    async packageReadFile({ appPath, fileName, startLine, endLine }) { return this._readAppFile(appPath, fileName, startLine, endLine); }
    async packageWriteFile({ appPath, fileName, content }) { return this._writeAppFile(appPath, fileName, content); }
    async packageDeleteFile({ appPath, fileName }) { return this._deleteAppFile(appPath, fileName); }
    async packageRenameFile({ appPath, oldName, newName }) { return this._renameAppFile(appPath, oldName, newName); }

    async packageListControllers({ projectName, packageName }) {
        const pn = projectName || this.currentProject;
        const controllerDir = path.join(this._getSrcPath(this.wizRoot, pn), 'portal', packageName, 'controller');
        if (!fs.existsSync(controllerDir)) return this._jsonResult({ controllers: [], controllerDir });
        const controllers = fs.readdirSync(controllerDir).filter(f => f.endsWith('.py') && f !== '__init__.py').map(f => {
            const fp = path.join(controllerDir, f);
            return { name: f.replace('.py', ''), file: f, path: fp, size: fs.statSync(fp).size };
        });
        return this._jsonResult({ controllers, controllerDir, packageName });
    }

    // ==================== Server ====================

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Wiz MCP Server v3.0 running on stdio');
    }
}

const server = new WizMcpServer();
server.run().catch(console.error);

module.exports = WizMcpServer;