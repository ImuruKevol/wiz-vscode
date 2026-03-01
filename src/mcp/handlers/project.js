/**
 * Wiz MCP Server - Project Handlers
 * 프로젝트 정보/빌드/전환, 파일/폴더 관리, pip/npm, 앱 검색 (19개 도구)
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const util = require('util');
const exec = util.promisify(cp.exec);

/**
 * 프로토타입 믹스인용 핸들러 메서드
 * WizMcpServer 인스턴스의 this 컨텍스트로 호출된다.
 */
module.exports = {

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
    },

    async projectSwitch({ projectName }) {
        const projectPath = path.join(this.wizRoot, 'project', projectName);
        if (!fs.existsSync(projectPath)) throw new Error(`Project '${projectName}' does not exist`);
        this.currentProject = projectName;
        this._saveState();
        return this._jsonResult({ success: true, currentProject: projectName });
    },

    async projectBuild({ projectName, clean = false }) {
        const pn = projectName || this.currentProject;
        const ws = this.wizRoot;
        const args = ['project', 'build', '--project', pn];
        if (clean) args.push('--clean');
        const wizExecutable = this._resolveWizExecutable(ws);
        const { stdout, stderr } = await exec(`"${wizExecutable}" ${args.join(' ')}`, { cwd: ws });
        return this._jsonResult({ success: true, output: stdout, errors: stderr || null });
    },

    async projectExport({ projectName }) {
        const pn = projectName || this.currentProject;
        const ws = this.wizRoot;
        const exportsPath = path.join(ws, 'exports');
        if (!fs.existsSync(exportsPath)) fs.mkdirSync(exportsPath, { recursive: true });
        const outputPath = path.join(exportsPath, pn);
        await exec(`wiz project export --project=${pn} --output="${outputPath}"`, { cwd: ws });
        return this._jsonResult({ success: true, outputPath: `${outputPath}.wizproject` });
    },

    async projectImport({ filePath, projectName }) {
        const ws = this.wizRoot;
        const targetPath = path.join(ws, 'project', projectName);
        if (fs.existsSync(targetPath)) throw new Error(`Project '${projectName}' already exists`);
        fs.mkdirSync(targetPath, { recursive: true });
        const absFilePath = path.isAbsolute(filePath) ? filePath : path.join(ws, filePath);
        await exec(`unzip -o "${absFilePath}" -d "${targetPath}"`);
        return this._jsonResult({ success: true, projectPath: targetPath });
    },

    async projectStructure({ projectName, maxDepth = 4, subPath }) {
        const pn = projectName || this.currentProject;
        const srcPath = this._getSrcPath(this.wizRoot, pn);
        const startPath = subPath ? path.join(srcPath, subPath) : srcPath;
        if (!fs.existsSync(startPath)) throw new Error(`Path does not exist: ${startPath}`);
        return this._jsonResult({ basePath: startPath, tree: this._buildTree(startPath, { maxDepth, includeFiles: true }) });
    },

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
    },

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
    },

    async projectWriteFile({ projectName, relativePath, content }) {
        const absPath = this._resolveProjectPath(relativePath, projectName || this.currentProject);
        const dir = path.dirname(absPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(absPath, content, 'utf8');
        return this._jsonResult({ success: true, filePath: absPath, size: Buffer.byteLength(content, 'utf8') });
    },

    async projectCreateDir({ projectName, relativePath }) {
        const absPath = this._resolveProjectPath(relativePath, projectName || this.currentProject);
        if (fs.existsSync(absPath)) throw new Error(`Path already exists: ${absPath}`);
        fs.mkdirSync(absPath, { recursive: true });
        return this._jsonResult({ success: true, path: absPath });
    },

    async projectDelete({ projectName, relativePath }) {
        const absPath = this._resolveProjectPath(relativePath, projectName || this.currentProject);
        if (!fs.existsSync(absPath)) throw new Error(`Path does not exist: ${absPath}`);
        const wasDir = fs.statSync(absPath).isDirectory();
        fs.rmSync(absPath, { recursive: true, force: true });
        return this._jsonResult({ success: true, deletedPath: absPath, wasDirectory: wasDir });
    },

    async projectRename({ projectName, oldRelativePath, newRelativePath }) {
        const oldAbs = this._resolveProjectPath(oldRelativePath, projectName || this.currentProject);
        const newAbs = this._resolveProjectPath(newRelativePath, projectName || this.currentProject);
        if (!fs.existsSync(oldAbs)) throw new Error(`Source does not exist: ${oldAbs}`);
        if (fs.existsSync(newAbs)) throw new Error(`Destination already exists: ${newAbs}`);
        const destDir = path.dirname(newAbs);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.renameSync(oldAbs, newAbs);
        return this._jsonResult({ success: true, oldPath: oldAbs, newPath: newAbs });
    },

    async projectSearchApps({ projectName, query }) {
        const allResult = await this.sourceListApps({ projectName, appType: 'all' });
        const sourceApps = JSON.parse(allResult.content[0].text).apps;
        // Also scan portal packages
        const pn = projectName || this.currentProject;
        const portalPath = path.join(this._getSrcPath(this.wizRoot, pn), 'portal');
        let portalApps = [];
        if (fs.existsSync(portalPath)) {
            const srcPath = this._getSrcPath(this.wizRoot, pn);
            for (const pkg of fs.readdirSync(portalPath, { withFileTypes: true }).filter(e => e.isDirectory())) {
                portalApps.push(...this._scanApps(path.join(portalPath, pkg.name, 'app'), `portal/${pkg.name}`, srcPath));
                portalApps.push(...this._scanApps(path.join(portalPath, pkg.name, 'route'), `portal/${pkg.name}/route`, srcPath));
            }
        }
        const allApps = [...sourceApps, ...portalApps];
        const q = query.toLowerCase();
        const matched = allApps.filter(app => {
            return [app.name, app.title, app.namespace, app.id, app.category, app.mode].filter(Boolean).some(s => s.toLowerCase().includes(q));
        });
        return this._jsonResult({ query, results: matched, count: matched.length });
    },

    // pip / npm

    async projectPipList({ outdated = false }) {
        const pip = this._getPipPath(this.wizRoot);
        const args = outdated ? 'list --outdated --format=json' : 'list --format=json';
        const { stdout } = await exec(`${pip} ${args}`, { cwd: this.wizRoot });
        const packages = JSON.parse(stdout);
        return this._jsonResult({ packages, count: packages.length, pip, outdated });
    },

    async projectPipInstall({ packages, upgrade = false }) {
        if (!packages || !packages.length) throw new Error('No packages specified');
        const pip = this._getPipPath(this.wizRoot);
        const { stdout, stderr } = await exec(`${pip} install${upgrade ? ' --upgrade' : ''} ${packages.map(p => `"${p}"`).join(' ')}`, { cwd: this.wizRoot });
        return this._jsonResult({ success: true, packages, output: stdout, warnings: stderr || null });
    },

    async projectPipUninstall({ packages }) {
        if (!packages || !packages.length) throw new Error('No packages specified');
        const pip = this._getPipPath(this.wizRoot);
        const { stdout, stderr } = await exec(`${pip} uninstall -y ${packages.map(p => `"${p}"`).join(' ')}`, { cwd: this.wizRoot });
        return this._jsonResult({ success: true, packages, output: stdout, warnings: stderr || null });
    },

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
    },

    async projectNpmInstall({ projectName, packages, dev = false, global = false }) {
        if (!packages || !packages.length) throw new Error('No packages specified');
        const pn = projectName || this.currentProject;
        const cwd = this._getNpmCwd(this.wizRoot, pn, global);
        if (!fs.existsSync(path.join(cwd, 'package.json'))) await exec('npm init -y', { cwd });
        const { stdout, stderr } = await exec(`npm install${dev ? ' --save-dev' : ''} ${packages.map(p => `"${p}"`).join(' ')}`, { cwd });
        return this._jsonResult({ success: true, packages, dev, output: stdout, warnings: stderr || null, cwd });
    },

    async projectNpmUninstall({ projectName, packages, global = false }) {
        if (!packages || !packages.length) throw new Error('No packages specified');
        const pn = projectName || this.currentProject;
        const cwd = this._getNpmCwd(this.wizRoot, pn, global);
        const { stdout, stderr } = await exec(`npm uninstall ${packages.map(p => `"${p}"`).join(' ')}`, { cwd });
        return this._jsonResult({ success: true, packages, output: stdout, warnings: stderr || null, cwd });
    },

};
