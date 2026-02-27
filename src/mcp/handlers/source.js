/**
 * Wiz MCP Server - Source Handlers
 * Source App/Route CRUD, 앱 내 파일 관리, 컨트롤러/레이아웃 목록 (13개 도구)
 * + Source/Package 공용 내부 메서드 (_appInfo, _updateApp, _deleteApp 등)
 */

const fs = require('fs');
const path = require('path');
const { APP_TEMPLATES } = require('../helpers');

/**
 * 프로토타입 믹스인용 핸들러 메서드
 * WizMcpServer 인스턴스의 this 컨텍스트로 호출된다.
 */
module.exports = {

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
    },

    // ==================== Shared Internal Methods ====================
    // Source와 Package 핸들러에서 공용으로 사용

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
    },

    async sourceAppInfo(args) { return this._appInfo(args.appPath); },

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
    },

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
    },

    /** Shared: update app.json */
    async _updateApp(appPath, updates) {
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        const appJsonPath = path.join(absPath, 'app.json');
        if (!fs.existsSync(appJsonPath)) throw new Error(`app.json not found at ${absPath}`);
        const newData = { ...JSON.parse(fs.readFileSync(appJsonPath, 'utf8')), ...updates };
        fs.writeFileSync(appJsonPath, JSON.stringify(newData, null, 4));
        return this._jsonResult({ success: true, appJson: newData });
    },

    async sourceUpdateApp({ appPath, updates }) { return this._updateApp(appPath, updates); },

    /** Shared: delete app folder */
    async _deleteApp(appPath) {
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        if (!fs.existsSync(absPath)) throw new Error(`App folder not found: ${absPath}`);
        fs.rmSync(absPath, { recursive: true, force: true });
        return this._jsonResult({ success: true, deletedPath: absPath });
    },

    async sourceDeleteApp({ appPath }) { return this._deleteApp(appPath); },

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
    },

    async sourceListFiles({ appPath }) { return this._listAppFiles(appPath); },

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
    },

    async sourceReadFile({ appPath, fileName, startLine, endLine }) { return this._readAppFile(appPath, fileName, startLine, endLine); },

    /** Shared: write file in app folder */
    async _writeAppFile(appPath, fileName, content) {
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        if (!fs.existsSync(absPath)) throw new Error(`App folder does not exist: ${absPath}`);
        const filePath = path.join(absPath, fileName);
        fs.writeFileSync(filePath, content, 'utf8');
        return this._jsonResult({ success: true, filePath });
    },

    async sourceWriteFile({ appPath, fileName, content }) { return this._writeAppFile(appPath, fileName, content); },

    /** Shared: delete file in app folder */
    async _deleteAppFile(appPath, fileName) {
        if (fileName === 'app.json') throw new Error('Cannot delete app.json. Use delete_app to remove the entire app.');
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        const filePath = path.join(absPath, fileName);
        if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
        fs.rmSync(filePath, { force: true });
        return this._jsonResult({ success: true, deletedFile: filePath });
    },

    async sourceDeleteFile({ appPath, fileName }) { return this._deleteAppFile(appPath, fileName); },

    /** Shared: rename file in app folder */
    async _renameAppFile(appPath, oldName, newName) {
        const absPath = this._resolveAppPath(appPath, this.wizRoot, this.currentProject);
        const oldFile = path.join(absPath, oldName);
        const newFile = path.join(absPath, newName);
        if (!fs.existsSync(oldFile)) throw new Error(`File not found: ${oldFile}`);
        if (fs.existsSync(newFile)) throw new Error(`Destination already exists: ${newFile}`);
        fs.renameSync(oldFile, newFile);
        return this._jsonResult({ success: true, oldPath: oldFile, newPath: newFile });
    },

    async sourceRenameFile({ appPath, oldName, newName }) { return this._renameAppFile(appPath, oldName, newName); },

    async sourceListControllers({ projectName }) {
        const pn = projectName || this.currentProject;
        const controllerDir = path.join(this._getSrcPath(this.wizRoot, pn), 'controller');
        if (!fs.existsSync(controllerDir)) return this._jsonResult({ controllers: [], controllerDir });
        const controllers = fs.readdirSync(controllerDir).filter(f => f.endsWith('.py') && f !== '__init__.py').map(f => {
            const fp = path.join(controllerDir, f);
            return { name: f.replace('.py', ''), file: f, path: fp, size: fs.statSync(fp).size };
        });
        return this._jsonResult({ controllers, controllerDir });
    },

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
    },

};
