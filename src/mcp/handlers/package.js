/**
 * Wiz MCP Server - Package Handlers
 * 패키지 관리, Portal App/Route CRUD, 앱 내 파일 관리, 컨트롤러 목록 (15개 도구)
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const util = require('util');
const exec = util.promisify(cp.exec);
const { APP_TEMPLATES } = require('../helpers');

/**
 * 프로토타입 믹스인용 핸들러 메서드
 * WizMcpServer 인스턴스의 this 컨텍스트로 호출된다.
 */
module.exports = {

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
    },

    async packageCreate({ projectName, namespace, title }) {
        const pn = projectName || this.currentProject;
        const cmd = `wiz project package create --namespace=${namespace} --project=${pn}${title ? ` --title=${title}` : ''}`;
        const { stdout, stderr } = await exec(cmd, { cwd: this.wizRoot });
        return this._jsonResult({ success: true, output: stdout, errors: stderr || null, namespace });
    },

    async packageExport({ projectName, packageName }) {
        const pn = projectName || this.currentProject;
        const packagePath = path.join(this._getSrcPath(this.wizRoot, pn), 'portal', packageName);
        if (!fs.existsSync(packagePath)) throw new Error(`Package '${packageName}' not found`);
        const exportsDir = path.join(this.wizRoot, 'exports');
        if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
        const outputPath = path.join(exportsDir, `${packageName}.wizpkg`);
        await exec(`cd "${packagePath}" && zip -r "${outputPath}" .`);
        return this._jsonResult({ success: true, outputPath });
    },

    async packageListApps({ projectName, packageName, appType = 'all' }) {
        const pn = projectName || this.currentProject;
        const srcPath = this._getSrcPath(this.wizRoot, pn);
        const portalPath = path.join(srcPath, 'portal', packageName);
        if (!fs.existsSync(portalPath)) throw new Error(`Package '${packageName}' not found`);
        let apps = [];
        if (appType === 'all' || appType === 'app') {
            apps.push(...this._scanApps(path.join(portalPath, 'app'), `portal/${packageName}`, srcPath));
        }
        if (appType === 'all' || appType === 'route') {
            apps.push(...this._scanApps(path.join(portalPath, 'route'), `portal/${packageName}/route`, srcPath));
        }
        return this._jsonResult({ packageName, apps, count: apps.length });
    },

    async packageAppInfo(args) { return this._appInfo(args.appPath); },

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
    },

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
    },

    async packageUpdateApp({ appPath, updates }) { return this._updateApp(appPath, updates); },
    async packageDeleteApp({ appPath }) { return this._deleteApp(appPath); },
    async packageListFiles({ appPath }) { return this._listAppFiles(appPath); },
    async packageReadFile({ appPath, fileName, startLine, endLine }) { return this._readAppFile(appPath, fileName, startLine, endLine); },
    async packageWriteFile({ appPath, fileName, content }) { return this._writeAppFile(appPath, fileName, content); },
    async packageDeleteFile({ appPath, fileName }) { return this._deleteAppFile(appPath, fileName); },
    async packageRenameFile({ appPath, oldName, newName }) { return this._renameAppFile(appPath, oldName, newName); },

    async packageListControllers({ projectName, packageName }) {
        const pn = projectName || this.currentProject;
        const controllerDir = path.join(this._getSrcPath(this.wizRoot, pn), 'portal', packageName, 'controller');
        if (!fs.existsSync(controllerDir)) return this._jsonResult({ controllers: [], controllerDir });
        const controllers = fs.readdirSync(controllerDir).filter(f => f.endsWith('.py') && f !== '__init__.py').map(f => {
            const fp = path.join(controllerDir, f);
            return { name: f.replace('.py', ''), file: f, path: fp, size: fs.statSync(fp).size };
        });
        return this._jsonResult({ controllers, controllerDir, packageName });
    },

};
