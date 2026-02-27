/**
 * Wiz MCP Server - Helper Methods
 * 경로 해석, 유틸리티, 상태 관리, 빌드/의존성 헬퍼
 */

const fs = require('fs');
const path = require('path');

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

/**
 * 프로토타입 믹스인용 헬퍼 메서드
 * WizMcpServer 인스턴스의 this 컨텍스트로 호출된다.
 */
const methods = {

    // ==================== Path Resolution Helpers ====================

    /** 프로젝트 src 경로 */
    _getSrcPath(workspacePath, projectName) {
        return path.join(workspacePath, 'project', projectName, 'src');
    },

    /** 앱 부모 경로 (src/app 또는 src) */
    _getAppParentPath(srcPath) {
        const appDir = path.join(srcPath, 'app');
        return (fs.existsSync(appDir) && fs.statSync(appDir).isDirectory()) ? appDir : srcPath;
    },

    /** 워크스페이스 루트 기준 절대경로 변환 */
    _resolveWorkspacePath(relativePath) {
        if (!this.wizRoot) throw new Error('Workspace path not set. Call wiz_workspace_status first.');
        if (!relativePath) return this.wizRoot;
        if (path.isAbsolute(relativePath)) return relativePath;
        return path.join(this.wizRoot, relativePath);
    },

    /** 프로젝트 루트 기준 절대경로 변환 */
    _resolveProjectPath(relativePath, projectName) {
        if (!this.wizRoot) throw new Error('Workspace path not set.');
        const pn = projectName || this.currentProject;
        const projectRoot = path.join(this.wizRoot, 'project', pn);
        if (!relativePath) return projectRoot;
        if (path.isAbsolute(relativePath)) return relativePath;
        return path.join(projectRoot, relativePath);
    },

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
    },

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
    },

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
    },

    _jsonResult(data) {
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },

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
    },

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
    },

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
    },

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
    },

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
    },

    _getNpmCwd(workspacePath, projectName, global) {
        if (global) return workspacePath;
        const projectPath = path.join(workspacePath, 'project', projectName);
        return fs.existsSync(path.join(projectPath, 'package.json')) ? projectPath : workspacePath;
    },
};

module.exports = { APP_TEMPLATES, methods };
