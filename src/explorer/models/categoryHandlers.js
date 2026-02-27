const path = require('path');
const fs = require('fs');
const vscode = require('vscode');
const CategoryItem = require('../treeItems/categoryItem');
const FileTreeItem = require('../treeItems/fileTreeItem');
const AppPatternProcessor = require('../appPatternProcessor');

class SourceCategory extends CategoryItem {
    constructor(provider) {
        super('source', 'source', provider.groupIcon);
        this.provider = provider;
    }

    async getChildren() {
        const srcPath = path.join(this.provider.workspaceRoot, 'src');
        if (!fs.existsSync(srcPath)) return [];
        
        // 1. Get raw items and apply app shortcut first
        const rawItems = this.provider.getFilesAndFolders(srcPath, (item) => item !== 'portal', true);
        const items = this.applyAppShortcut(rawItems);
        
        // 2. Default folders to ensure visible
        const forcedFolders = [
            { label: 'controller', icon: 'symbol-method', context: 'sourceRootFolder' },
            { label: 'model', icon: 'symbol-method', context: 'sourceRootFolder' },
            { label: 'route', icon: 'circuit-board', context: 'routeGroup' }
        ];

        // 3. Inject missing folders and configure icons
        for (const config of forcedFolders) {
            let folder = items.find(item => item.isDirectory && item.label === config.label);
            
            if (!folder) {
                // Determine path: prefer src/app/<name> if src/app exists, else src/<name>
                // We check rawItems for 'app' folder since applyAppShortcut removes it from results
                const appDir = rawItems.find(i => i.label === 'app' && i.isDirectory);
                const basePath = appDir ? appDir.resourceUri.fsPath : srcPath;
                const folderPath = path.join(basePath, config.label);
                
                folder = new FileTreeItem(config.label, folderPath, true, false);
                folder.description = '(create)';
                items.push(folder);
            }

            // Always update icon and context
            folder.iconPath = new vscode.ThemeIcon(config.icon);
            folder.contextValue = config.context;
        }

        // 4. Promote angular/libs and angular/styles to source level
        const angularDir = rawItems.find(i => i.label === 'angular' && i.isDirectory);
        if (angularDir) {
            const angularPath = angularDir.resourceUri.fsPath;
            const promotedFolders = [
                { label: 'libs', icon: 'library' },
                { label: 'styles', icon: 'symbol-color' }
            ];
            
            for (const config of promotedFolders) {
                const folderPath = path.join(angularPath, config.label);
                if (fs.existsSync(folderPath)) {
                    const folder = new FileTreeItem(config.label, folderPath, true, false);
                    folder.iconPath = new vscode.ThemeIcon(config.icon);
                    folder.contextValue = 'sourceRootFolder';
                    items.push(folder);
                }
            }
        }

        // 5. Sort items by priority order
        const priority = ['angular', 'app/page', 'app/component', 'app/layout', 'route', 'model', 'controller', 'assets', 'libs', 'styles'];
        items.sort((a, b) => {
            const idxA = priority.indexOf(a.label);
            const idxB = priority.indexOf(b.label);
            
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            
            // Non-priority items: directories first, then alphabetical
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            return a.label.localeCompare(b.label);
        });

        return items;
    }

    applyAppShortcut(items) {
        const appDir = items.find(item => item.isDirectory && item.label === 'app');
        if (appDir) {
            const appPath = appDir.resourceUri.fsPath;
            const appItems = this.provider.getFilesAndFolders(appPath);
            const processed = AppPatternProcessor.process(appItems, appPath, this.provider.groupIcon);
            return [...processed, ...items.filter(i => i.label !== 'app')];
        }
        return items;
    }
}

class PortalCategory extends CategoryItem {
    constructor(provider) {
        super('packages', 'portal', provider.groupIcon);
        this.provider = provider;
        this.contextValue = 'portalCategory';
    }

    async getChildren() {
        const portalPath = path.join(this.provider.workspaceRoot, 'src', 'portal');
        if (!fs.existsSync(portalPath)) return [];
        
        const items = this.provider.getFilesAndFolders(portalPath);
        
        // Set contextValue for package folders
        items.forEach(item => {
            if (item.isDirectory) {
                item.contextValue = 'portalPackage';
            }
        });
        
        const appDir = items.find(item => item.isDirectory && item.label === 'app');
        if (appDir) {
            const appPath = appDir.resourceUri.fsPath;
            const appItems = this.provider.getFilesAndFolders(appPath);
            const processed = AppPatternProcessor.process(appItems, appPath, this.provider.groupIcon);
            return [...processed, ...items.filter(i => i.label !== 'app')];
        }
        return items;
    }
}

class ProjectCategory extends CategoryItem {
    constructor(provider) {
        super('project', 'project', provider.groupIcon);
        this.provider = provider;
    }

    async getChildren() {
        return this.provider.getFilesAndFolders(this.provider.workspaceRoot, (item) => item !== 'src' && item !== 'config');
    }
}

class CopilotCategory extends CategoryItem {
    constructor(provider) {
        super('copilot', 'copilot', new vscode.ThemeIcon('copilot'));
        this.provider = provider;
        this.contextValue = 'copilotCategory';
    }

    get resourceUri() {
        if (!this.provider.wizRoot) return undefined;
        return vscode.Uri.file(path.join(this.provider.wizRoot, '.github'));
    }

    set resourceUri(_) {
        // TreeItem 내부 할당 무시 — getter로 동적 반환
    }

    async getChildren() {
        if (!this.provider.wizRoot) return [];
        const githubPath = path.join(this.provider.wizRoot, '.github');
        if (!fs.existsSync(githubPath)) return [];
        return this.provider.getFilesAndFolders(githubPath);
    }
}

class ConfigCategory extends CategoryItem {
    constructor(provider) {
        super('config', 'config', new vscode.ThemeIcon('settings-gear'));
        this.provider = provider;
        this.contextValue = 'configCategory';
    }

    get resourceUri() {
        if (!this.provider.workspaceRoot) return undefined;
        return vscode.Uri.file(path.join(this.provider.workspaceRoot, 'config'));
    }

    set resourceUri(_) {
        // TreeItem 내부 할당 무시 — getter로 동적 반환
    }

    async getChildren() {
        if (!this.provider.workspaceRoot) return [];
        const configPath = path.join(this.provider.workspaceRoot, 'config');
        if (!fs.existsSync(configPath)) return [];
        return this.provider.getFilesAndFolders(configPath);
    }
}

/**
 * Wiz Settings 카테고리
 * 버전 표시, MCP 설정, Python/npm 패키지 관리 등 설정 메뉴를 그룹화
 */
class SettingsCategory extends CategoryItem {
    constructor(provider) {
        super('wiz info', 'wizSettings', new vscode.ThemeIcon('info'));
        this.provider = provider;
        this.contextValue = 'settingsCategory';
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }

    async getChildren() {
        const items = [];
        const version = this.provider.extensionVersion || 'unknown';
        const projectName = this.provider.currentProjectName || 'main';
        const isWiz = this.provider.isWizProject === true;

        // 비-WIZ 프로젝트: README + version만 표시
        if (!isWiz) {
            // README (워크스페이스 루트 기준)
            const readmePath = this.provider.workspaceRoot
                ? path.join(this.provider.workspaceRoot, 'README.md')
                : null;
            const readmeExists = readmePath && fs.existsSync(readmePath);
            const readmeItem = new vscode.TreeItem('README', vscode.TreeItemCollapsibleState.None);
            readmeItem.iconPath = new vscode.ThemeIcon(readmeExists ? 'book' : 'book');
            if (readmeExists) {
                readmeItem.command = {
                    command: 'wizExplorer.openFile',
                    title: 'Open README',
                    arguments: [{ resourceUri: vscode.Uri.file(readmePath) }]
                };
            } else {
                readmeItem.description = '(생성)';
                readmeItem.iconPath = new vscode.ThemeIcon('book', new vscode.ThemeColor('disabledForeground'));
                readmeItem.command = {
                    command: 'wizExplorer.createReadme',
                    title: 'Create README'
                };
            }
            readmeItem.contextValue = 'settingsItem';
            items.push(readmeItem);

            // 버전 정보
            const latestVersion = this.provider.latestVersion;
            const hasUpdate = latestVersion && this._compareVersions(latestVersion, version) > 0;
            const versionLabel = hasUpdate
                ? `version: v${version} → v${latestVersion}`
                : `version: v${version}`;
            const versionItem = new vscode.TreeItem(versionLabel, vscode.TreeItemCollapsibleState.None);
            versionItem.iconPath = new vscode.ThemeIcon(hasUpdate ? 'cloud-download' : 'info');
            versionItem.tooltip = hasUpdate
                ? `새 버전 v${latestVersion} 사용 가능 (현재 v${version}). 클릭하여 업데이트`
                : `Wiz VSCode Extension v${version} (최신)`;
            if (hasUpdate) {
                versionItem.description = '⬆ update';
                versionItem.command = {
                    command: 'wizExplorer.updateExtension',
                    title: 'Update Extension'
                };
            }
            versionItem.contextValue = 'settingsItem';
            items.push(versionItem);

            return items;
        }

        // 0. README
        const readmePath = this.provider.workspaceRoot
            ? path.join(this.provider.workspaceRoot, 'README.md')
            : null;
        const readmeExists = readmePath && fs.existsSync(readmePath);
        const readmeItem = new vscode.TreeItem(
            readmeExists ? 'README' : 'README',
            vscode.TreeItemCollapsibleState.None
        );
        readmeItem.iconPath = new vscode.ThemeIcon(readmeExists ? 'book' : 'book');
        if (readmeExists) {
            readmeItem.command = {
                command: 'wizExplorer.openFile',
                title: 'Open README',
                arguments: [{ resourceUri: vscode.Uri.file(readmePath) }]
            };
            readmeItem.contextValue = 'settingsItem';
        } else {
            readmeItem.description = '(생성)';
            readmeItem.iconPath = new vscode.ThemeIcon('book', new vscode.ThemeColor('disabledForeground'));
            readmeItem.command = {
                command: 'wizExplorer.createReadme',
                title: 'Create README'
            };
            readmeItem.contextValue = 'settingsItem';
        }
        items.push(readmeItem);

        // 1. Current Project (copy on click)
        const projectItem = new vscode.TreeItem(`project: ${projectName}`, vscode.TreeItemCollapsibleState.None);
        projectItem.iconPath = new vscode.ThemeIcon('symbol-string');
        projectItem.command = {
            command: 'wizExplorer.copyProjectName',
            title: 'Copy Current Project Name'
        };
        projectItem.contextValue = 'settingsItem';
        items.push(projectItem);

        // 1. Version
        const latestVersion = this.provider.latestVersion;
        const hasUpdate = latestVersion && this._compareVersions(latestVersion, version) > 0;
        const versionLabel = hasUpdate
            ? `version: v${version} → v${latestVersion}`
            : `version: v${version}`;
        const versionItem = new vscode.TreeItem(versionLabel, vscode.TreeItemCollapsibleState.None);
        versionItem.iconPath = new vscode.ThemeIcon(hasUpdate ? 'cloud-download' : 'info');
        versionItem.tooltip = hasUpdate
            ? `새 버전 v${latestVersion} 사용 가능 (현재 v${version}). 클릭하여 업데이트`
            : `Wiz VSCode Extension v${version} (최신)`;
        if (hasUpdate) {
            versionItem.description = '⬆ update';
            versionItem.command = {
                command: 'wizExplorer.updateExtension',
                title: 'Update Extension'
            };
        }
        versionItem.contextValue = 'settingsItem';
        items.push(versionItem);

        // 2. MCP Configuration
        const mcpConfigExists = this.provider.mcpConfigExists;
        const mcpConfigItem = new vscode.TreeItem(
            mcpConfigExists ? 'mcp configuration' : 'mcp configuration (create)',
            vscode.TreeItemCollapsibleState.None
        );
        mcpConfigItem.iconPath = new vscode.ThemeIcon(mcpConfigExists ? 'settings-gear' : 'add');
        mcpConfigItem.command = {
            command: 'wizExplorer.mcpConfigMenu',
            title: 'MCP Configuration'
        };
        mcpConfigItem.contextValue = 'settingsItem';
        items.push(mcpConfigItem);

        // 3. Clean Build
        const cleanBuildItem = new vscode.TreeItem('clean build', vscode.TreeItemCollapsibleState.None);
        cleanBuildItem.iconPath = new vscode.ThemeIcon('trash');
        cleanBuildItem.command = {
            command: 'wizExplorer.cleanBuild',
            title: 'Clean Build'
        };
        cleanBuildItem.contextValue = 'settingsItem';
        items.push(cleanBuildItem);

        // 5. Python Environment
        const pythonEnvItem = new vscode.TreeItem('python env', vscode.TreeItemCollapsibleState.None);
        pythonEnvItem.iconPath = new vscode.ThemeIcon('symbol-misc');
        pythonEnvItem.command = {
            command: 'wizExplorer.selectBuildPythonInterpreter',
            title: 'Select Python Environment'
        };
        pythonEnvItem.contextValue = 'settingsItem';
        items.push(pythonEnvItem);

        // 5. Python Packages (pip)
        const pipItem = new vscode.TreeItem('python packages', vscode.TreeItemCollapsibleState.None);
        pipItem.iconPath = new vscode.ThemeIcon('package');
        pipItem.command = {
            command: 'wizExplorer.openPipManager',
            title: 'pip Package Manager'
        };
        pipItem.contextValue = 'settingsItem';
        items.push(pipItem);

        // 6. npm Packages
        const npmItem = new vscode.TreeItem('npm packages', vscode.TreeItemCollapsibleState.None);
        npmItem.iconPath = new vscode.ThemeIcon('package');
        npmItem.command = {
            command: 'wizExplorer.openNpmManager',
            title: 'npm Package Manager'
        };
        npmItem.contextValue = 'settingsItem';
        items.push(npmItem);

        return items;
    }

    /**
     * 시맨틱 버전 비교
     * @param {string} a
     * @param {string} b
     * @returns {number} a > b: 양수, a < b: 음수, 같으면 0
     */
    _compareVersions(a, b) {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const na = pa[i] || 0;
            const nb = pb[i] || 0;
            if (na !== nb) return na - nb;
        }
        return 0;
    }
}

/**
 * 인스트럭션 카테고리 — .github 경로의 폴더/파일을 표시 (task 제외)
 */
class InstructionCategory extends CategoryItem {
    constructor(provider) {
        super('인스트럭션', 'copilotInstruction', new vscode.ThemeIcon('book'));
        this.provider = provider;
        this.contextValue = 'copilotCategory';
    }

    get resourceUri() {
        if (!this.provider.wizRoot) return undefined;
        return vscode.Uri.file(path.join(this.provider.wizRoot, '.github'));
    }

    set resourceUri(_) {
        // TreeItem 내부 할당 무시 — getter로 동적 반환
    }

    async getChildren() {
        if (!this.provider.wizRoot) return [];
        const githubPath = path.join(this.provider.wizRoot, '.github');
        if (!fs.existsSync(githubPath)) return [];
        return this.provider.getFilesAndFolders(githubPath, (item) => item !== 'task');
    }
}

/**
 * 작업 관리 카테고리 — .github/task 폴더를 표시
 */
class TaskCategory extends CategoryItem {
    constructor(provider) {
        super('작업 관리', 'copilotTask', new vscode.ThemeIcon('tasklist'));
        this.provider = provider;
        this.contextValue = 'taskCategory';
    }

    get resourceUri() {
        if (!this.provider.wizRoot) return undefined;
        return vscode.Uri.file(path.join(this.provider.wizRoot, '.github', 'task'));
    }

    set resourceUri(_) {
        // TreeItem 내부 할당 무시 — getter로 동적 반환
    }

    async getChildren() {
        if (!this.provider.wizRoot) return [];
        const taskPath = path.join(this.provider.wizRoot, '.github', 'task');

        // 폴더가 없어도 가상 항목(메모, TODO) 표시
        if (!fs.existsSync(taskPath)) {
            const items = [];

            const memoPath = path.join(taskPath, 'memo.md');
            const memoItem = new vscode.TreeItem('메모', vscode.TreeItemCollapsibleState.None);
            memoItem.iconPath = new vscode.ThemeIcon('note', new vscode.ThemeColor('disabledForeground'));
            memoItem.description = '(생성)';
            memoItem.contextValue = 'memoFile';
            memoItem.resourceUri = vscode.Uri.file(memoPath);
            memoItem.command = {
                command: 'wizExplorer.openFile',
                title: 'Open Memo',
                arguments: [{ resourceUri: vscode.Uri.file(memoPath), isDirectory: false }]
            };
            items.push(memoItem);

            const todoPath = path.join(taskPath, 'todo.md');
            const todoItem = new vscode.TreeItem('TODO', vscode.TreeItemCollapsibleState.None);
            todoItem.iconPath = new vscode.ThemeIcon('checklist', new vscode.ThemeColor('disabledForeground'));
            todoItem.description = '(생성)';
            todoItem.contextValue = 'todoFile';
            todoItem.resourceUri = vscode.Uri.file(todoPath);
            todoItem.command = {
                command: 'wizExplorer.openFile',
                title: 'Open TODO',
                arguments: [{ resourceUri: vscode.Uri.file(todoPath), isDirectory: false }]
            };
            items.push(todoItem);

            return items;
        }

        const rawItems = this.provider.getFilesAndFolders(taskPath);

        // 표시명 매핑 및 특수 처리
        const displayNameMap = { 'memo.md': '메모', 'todo.md': 'TODO', 'worked': '검토필요', 'reviewed': '완료됨' };
        const sortOrder = { 'memo.md': 0, 'todo.md': 1, 'worked': 2, 'reviewed': 3 };

        // memo.md가 없으면 가상 항목 추가
        const hasMemo = rawItems.some(item => item.label === 'memo.md');
        if (!hasMemo) {
            const memoPath = path.join(taskPath, 'memo.md');
            const memoItem = new vscode.TreeItem('메모', vscode.TreeItemCollapsibleState.None);
            memoItem.iconPath = new vscode.ThemeIcon('note', new vscode.ThemeColor('disabledForeground'));
            memoItem.description = '(생성)';
            memoItem.contextValue = 'memoFile';
            memoItem.resourceUri = vscode.Uri.file(memoPath);
            memoItem.command = {
                command: 'wizExplorer.openFile',
                title: 'Open Memo',
                arguments: [{ resourceUri: vscode.Uri.file(memoPath), isDirectory: false }]
            };
            memoItem._sortKey = 'memo.md';
            rawItems.push(memoItem);
        }

        for (const item of rawItems) {
            const originalName = item.label;
            // 표시명 변경 (파일/디렉토리 실제 이름은 유지)
            if (displayNameMap[originalName]) {
                item.label = displayNameMap[originalName];
            }
            if (!item.isDirectory && originalName === 'todo.md') {
                item.contextValue = 'todoFile';
            }
            if (!item.isDirectory && originalName === 'memo.md') {
                item.contextValue = 'memoFile';
            }
            if (item.isDirectory && originalName === 'worked') {
                item.contextValue = 'workedFolder';
                // 클릭 시 리뷰 에디터 열기 (화살표로만 폴더 확장)
                item.command = {
                    command: 'wizCopilot.reviewWizard',
                    title: 'Open Review Editor'
                };
                // 하위 파일 개수 표시
                const workedFullPath = path.join(taskPath, 'worked');
                try {
                    const count = fs.readdirSync(workedFullPath).filter(f => f.endsWith('.md')).length;
                    if (count > 0) {
                        item.description = `${count}`;
                    }
                } catch (e) { /* ignore */ }
            }
        }

        // 정렬: 메모 → TODO → 검토필요 → 완료됨 → 나머지(알파벳순)
        rawItems.sort((a, b) => {
            const aKey = Object.keys(displayNameMap).find(k => displayNameMap[k] === a.label) || a._sortKey;
            const bKey = Object.keys(displayNameMap).find(k => displayNameMap[k] === b.label) || b._sortKey;
            const aOrder = aKey !== undefined ? (sortOrder[aKey] ?? 100) : 100;
            const bOrder = bKey !== undefined ? (sortOrder[bKey] ?? 100) : 100;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return String(a.label).localeCompare(String(b.label));
        });

        return rawItems;
    }
}

module.exports = { SourceCategory, PortalCategory, ProjectCategory, CopilotCategory, ConfigCategory, SettingsCategory, InstructionCategory, TaskCategory };
