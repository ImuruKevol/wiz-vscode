/**
 * Package Manager
 * Packages 카테고리의 Package 및 Portal App 관리
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const { WizPathUtils, WizFileUtils, APP_TEMPLATES, ZipUtils, UploadWebview } = require('../../core');

class PackageManager {
    /**
     * @param {Object} options
     * @param {string} options.workspaceRoot - 프로젝트 워크스페이스 루트 경로
     * @param {string} options.wizRoot - Wiz 루트 경로
     * @param {string} options.currentProject - 현재 프로젝트명
     * @param {Function} [options.onRefresh] - 새로고침 콜백
     * @param {vscode.OutputChannel} [options.outputChannel] - 빌드 출력 채널
     */
    constructor(options = {}) {
        this.workspaceRoot = options.workspaceRoot;
        this.wizRoot = options.wizRoot;
        this.currentProject = options.currentProject;
        this.onRefresh = options.onRefresh;
        this.outputChannel = options.outputChannel;
    }

    /**
     * ANSI 색상 코드 제거
     * @private
     */
    _stripAnsi(str) {
        return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
    }

    /**
     * 출력 채널에 로그
     * @private
     */
    _log(message) {
        if (this.outputChannel) {
            this.outputChannel.appendLine(message);
            this.outputChannel.show(true);
        }
    }

    // ==================== Package 관련 ====================

    /**
     * Package 입력 프롬프트 실행
     * @param {Object} [options] - 추가 옵션
     * @param {string} [options.titlePrefix='새'] - 제목 접두사
     * @returns {Promise<Object|null>} 입력된 패키지 설정 또는 null (취소 시)
     */
    async promptPackageInputs(options = {}) {
        const { titlePrefix = '새' } = options;
        const portalPath = path.join(this.workspaceRoot, 'src', 'portal');

        // 1. Namespace 입력
        const namespace = await vscode.window.showInputBox({
            title: `${titlePrefix} 패키지 생성`,
            prompt: '패키지 이름을 입력하세요 (영문 소문자와 숫자만 허용)',
            placeHolder: 'mypackage',
            validateInput: (value) => {
                if (!value) return '패키지 이름은 필수입니다.';
                if (!/^[a-z][a-z0-9]*$/.test(value)) {
                    return '영문 소문자로 시작하고 영문 소문자와 숫자만 허용됩니다.';
                }
                const packagePath = path.join(portalPath, value);
                if (fs.existsSync(packagePath)) {
                    return '이미 존재하는 패키지 이름입니다.';
                }
                return null;
            }
        });
        if (!namespace) return null;

        // 2. Title 입력 (선택)
        const title = await vscode.window.showInputBox({
            title: '패키지 타이틀 (선택사항)',
            prompt: '패키지의 표시 이름을 입력하세요. 비워두면 namespace를 사용합니다.',
            placeHolder: namespace.toUpperCase()
        });

        return {
            namespace,
            title: title || namespace,
            targetPath: path.join(portalPath, namespace),
            portalJson: {
                package: namespace,
                title: title || namespace,
                version: '1.0.0',
                use_app: true,
                use_widget: true,
                use_route: true,
                use_libs: true,
                use_styles: true,
                use_assets: true,
                use_controller: true,
                use_model: true
            }
        };
    }

    /**
     * wiz CLI를 사용하여 새 패키지 생성
     * @param {string} namespace - 패키지 이름
     * @param {string} [title] - 패키지 타이틀
     * @returns {Promise<boolean>} 성공 여부
     */
    async createPackage(namespace, title) {
        if (!namespace) {
            // 입력 프롬프트 실행
            const inputs = await this.promptPackageInputs();
            if (!inputs) return false;
            namespace = inputs.namespace;
            title = inputs.title;
        }

        return new Promise((resolve) => {
            this._log(`[${new Date().toLocaleTimeString()}] Creating package: ${namespace}...`);

            const args = [
                'project', 'package', 'create',
                `--namespace=${namespace}`,
                `--project=${this.currentProject}`,
                ...(title ? [`--title=${title}`] : [])
            ];

            const createProcess = cp.spawn('wiz', args, {
                cwd: this.wizRoot,
                shell: true,
                env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
            });

            createProcess.stdout.on('data', (data) => {
                this._log(this._stripAnsi(data.toString()));
            });

            createProcess.stderr.on('data', (data) => {
                this._log(this._stripAnsi(data.toString()));
            });

            createProcess.on('close', (code) => {
                if (code === 0) {
                    vscode.window.showInformationMessage(`패키지 '${namespace}'가 생성되었습니다.`);
                    this.onRefresh?.();
                    resolve(true);
                } else {
                    vscode.window.showErrorMessage(`패키지 생성 실패 (code: ${code})`);
                    resolve(false);
                }
                this._log(`[${new Date().toLocaleTimeString()}] Package creation finished with code ${code}`);
            });

            createProcess.on('error', (err) => {
                vscode.window.showErrorMessage(`패키지 생성 오류: ${err.message}`);
                this._log(`[${new Date().toLocaleTimeString()}] Package creation error: ${err.message}`);
                resolve(false);
            });
        });
    }

    /**
     * 패키지를 .wizpkg 파일로 내보내기
     * @param {string} packagePath - 패키지 폴더 경로
     * @returns {Promise<boolean>} 성공 여부
     */
    async exportPackage(packagePath) {
        if (!packagePath) {
            vscode.window.showErrorMessage('패키지를 선택해주세요.');
            return false;
        }

        const packageName = path.basename(packagePath);
        const archiver = require('archiver');
        
        // wiz 루트의 exports 폴더에 파일 생성
        const exportsDir = path.join(this.wizRoot, 'exports');
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir, { recursive: true });
        }
        const outputPath = path.join(exportsDir, `${packageName}.wizpkg`);

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `패키지 '${packageName}' 내보내는 중...`,
                cancellable: false
            }, async () => {
                return new Promise((resolve, reject) => {
                    const output = fs.createWriteStream(outputPath);
                    const archive = archiver('zip', { zlib: { level: 9 } });

                    output.on('close', () => resolve());
                    archive.on('error', (err) => reject(err));

                    archive.pipe(output);
                    archive.glob('**/*', { 
                        cwd: packagePath,
                        ignore: ['.git/**', 'node_modules/**']
                    }, { prefix: packageName });
                    archive.finalize();
                });
            });
            
            vscode.window.showInformationMessage(`패키지 '${packageName}'가 '${outputPath}'에 내보내졌습니다.`);
            return true;
        } catch (err) {
            vscode.window.showErrorMessage(`패키지 내보내기 실패: ${err.message}`);
            return false;
        }
    }

    /**
     * 업로드된 파일로 Package 생성
     * @param {string} sourceDir - 압축 해제된 소스 디렉토리
     * @returns {Promise<Object|null>} 생성 결과 또는 null (취소 시)
     */
    async createPackageFromUpload(sourceDir) {
        const inputs = await this.promptPackageInputs({ titlePrefix: '' });
        if (!inputs) return null;

        return {
            targetPath: inputs.targetPath,
            portalJson: inputs.portalJson,
            namespace: inputs.namespace
        };
    }

    /**
     * 패키지 파일 복사 및 생성 완료
     * @param {string} sourceDir - 소스 디렉토리
     * @param {string} targetPath - 대상 경로
     * @param {Object} portalJson - portal.json 내용
     * @returns {boolean} 성공 여부
     */
    finalizePackageCreation(sourceDir, targetPath, portalJson) {
        try {
            // 폴더 생성 및 파일 복사 (portal.json 제외)
            ZipUtils.copyFolderContents(sourceDir, targetPath, ['portal.json']);
            
            // 새 portal.json 생성
            WizFileUtils.safeWriteJson(path.join(targetPath, 'portal.json'), portalJson);
            
            this.onRefresh?.();
            vscode.window.showInformationMessage(`패키지가 성공적으로 업로드되었습니다: ${path.basename(targetPath)}`);
            return true;
        } catch (e) {
            vscode.window.showErrorMessage(`패키지 생성 실패: ${e.message}`);
            return false;
        }
    }

    /**
     * Package 업로드 Webview 표시 및 처리
     * @returns {Promise<void>}
     */
    async showPackageUploadWebview() {
        const panel = vscode.window.createWebviewPanel(
            'wizPackageUpload',
            'Package 업로드',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        
        panel.webview.html = UploadWebview.getUploadHtml({
            title: 'Package 업로드 (.wizpkg)',
            acceptExtension: '.wizpkg',
            description: '.wizpkg 파일만 지원'
        });

        return new Promise((resolve) => {
            panel.webview.onDidReceiveMessage(async (message) => {
                if (message.command === 'uploadFile') {
                    panel.dispose();
                    
                    let extractResult;
                    try {
                        extractResult = await ZipUtils.extractFromBase64(message.fileData, '.wizpkg');
                    } catch (err) {
                        vscode.window.showErrorMessage(err.message);
                        resolve();
                        return;
                    }
                    
                    const { sourceDir, cleanup } = extractResult;
                    
                    const result = await this.createPackageFromUpload(sourceDir);
                    
                    if (!result) {
                        cleanup();
                        resolve();
                        return;
                    }
                    
                    this.finalizePackageCreation(sourceDir, result.targetPath, result.portalJson);
                    cleanup();
                    resolve();
                }
            });

            panel.onDidDispose(() => resolve());
        });
    }

    // ==================== Portal App 관련 ====================

    /**
     * Portal App 입력 프롬프트 실행
     * @param {string} appFolderPath - app 폴더 경로
     * @param {Object} [options] - 추가 옵션
     * @param {string} [options.titlePrefix='새'] - 제목 접두사
     * @returns {Promise<Object|null>} 입력된 앱 설정 또는 null (취소 시)
     */
    async promptPortalAppInputs(appFolderPath, options = {}) {
        const { titlePrefix = '새' } = options;

        // 1. Namespace 입력
        const namespace = await vscode.window.showInputBox({
            title: `${titlePrefix} Portal App 생성`,
            prompt: 'Namespace를 입력하세요',
            placeHolder: 'myapp',
            validateInput: (value) => {
                if (!value) return 'Namespace는 필수입니다.';
                if (!/^[a-z][a-z0-9_]*$/.test(value)) {
                    return '영문 소문자로 시작하고, 소문자/숫자/밑줄만 허용됩니다.';
                }
                const appPath = path.join(appFolderPath, value);
                if (fs.existsSync(appPath)) {
                    return '이미 존재하는 앱입니다.';
                }
                return null;
            }
        });
        if (!namespace) return null;

        // 2. Title 입력 (선택)
        const title = await vscode.window.showInputBox({
            title: 'Title (선택사항)',
            prompt: '앱의 표시 이름을 입력하세요. 비워두면 namespace를 사용합니다.',
            placeHolder: namespace
        });

        // 3. Category 입력 (선택)
        const category = await vscode.window.showInputBox({
            title: 'Category (선택사항)',
            prompt: '카테고리를 입력하세요.',
            placeHolder: 'editor',
            value: 'editor'
        });

        // 4. Controller 선택 (선택)
        const packagePath = path.dirname(appFolderPath);
        const packageName = path.basename(packagePath);
        const controllerDir = path.join(packagePath, 'controller');
        const controllers = WizPathUtils.loadControllers(controllerDir);
        let controller = '';

        if (controllers.length > 0) {
            const controllerItems = [
                { label: '$(dash) 없음', value: '' },
                ...controllers.map(c => ({ label: `$(symbol-method) ${c}`, value: c }))
            ];
            const selectedController = await vscode.window.showQuickPick(controllerItems, {
                title: 'Controller 선택 (선택사항)',
                placeHolder: '사용할 Controller를 선택하세요'
            });
            if (selectedController) {
                controller = selectedController.value;
            }
        }

        const appID = namespace;
        return {
            namespace,
            title: title || namespace,
            category: category || 'editor',
            controller,
            packageName,
            appID,
            targetPath: path.join(appFolderPath, appID),
            appJson: {
                id: appID,
                mode: 'portal',
                title: title || namespace,
                namespace: namespace,
                category: category || 'editor',
                viewuri: '',
                controller: controller,
                template: `wiz-portal-${packageName}-${namespace.replace(/\./g, '-')}`
            }
        };
    }

    /**
     * Portal App 생성
     * @param {string} appFolderPath - app 폴더 경로
     * @returns {Promise<boolean>} 성공 여부
     */
    async createPortalApp(appFolderPath) {
        const inputs = await this.promptPortalAppInputs(appFolderPath);
        if (!inputs) return false;

        try {
            fs.mkdirSync(inputs.targetPath, { recursive: true });

            WizFileUtils.safeWriteJson(path.join(inputs.targetPath, 'app.json'), inputs.appJson);
            WizFileUtils.safeWriteFile(path.join(inputs.targetPath, 'view.html'), APP_TEMPLATES['view.html']);
            WizFileUtils.safeWriteFile(path.join(inputs.targetPath, 'view.ts'), APP_TEMPLATES['view.ts']);
            WizFileUtils.safeWriteFile(path.join(inputs.targetPath, 'view.scss'), APP_TEMPLATES['view.scss']);

            vscode.window.showInformationMessage(`Portal App '${inputs.appID}' 생성 완료`);
            
            this.onRefresh?.();
            return true;
        } catch (e) {
            vscode.window.showErrorMessage(`앱 생성 실패: ${e.message}`);
            return false;
        }
    }

    /**
     * Portal Route 생성
     * @param {string} routeFolderPath - route 폴더 경로
     * @returns {Promise<boolean>} 성공 여부
     */
    async createPortalRoute(routeFolderPath) {
        // 1. ID 입력
        const id = await vscode.window.showInputBox({
            title: '새 Portal Route 생성',
            prompt: 'ID (폴더명)를 입력하세요',
            placeHolder: 'myroute',
            validateInput: (value) => {
                if (!value) return 'ID는 필수입니다.';
                if (!/^[a-z][a-z0-9]*$/.test(value)) {
                    return '영문 소문자로 시작하고, 소문자/숫자만 허용됩니다.';
                }
                const routePath = path.join(routeFolderPath, value);
                if (fs.existsSync(routePath)) {
                    return '이미 존재하는 라우트입니다.';
                }
                return null;
            }
        });
        if (!id) return false;

        // 2. Title 입력 (선택)
        const title = await vscode.window.showInputBox({
            title: 'Title (선택사항)',
            prompt: '라우트의 표시 이름을 입력하세요.',
            placeHolder: id
        });

        // 3. Route Path 입력
        const routePath = await vscode.window.showInputBox({
            title: 'Route Path',
            prompt: 'API 경로를 입력하세요.',
            placeHolder: '/api/example'
        });

        const newRoutePath = path.join(routeFolderPath, id);

        try {
            fs.mkdirSync(newRoutePath, { recursive: true });

            const appJson = {
                id: id,
                title: title || id,
                route: routePath || '',
                category: '',
                viewuri: '',
                controller: ''
            };

            WizFileUtils.safeWriteJson(path.join(newRoutePath, 'app.json'), appJson);
            WizFileUtils.safeWriteFile(path.join(newRoutePath, 'controller.py'), '');

            vscode.window.showInformationMessage(`Portal Route '${id}' 생성 완료`);
            
            this.onRefresh?.();
            return true;
        } catch (e) {
            vscode.window.showErrorMessage(`라우트 생성 실패: ${e.message}`);
            return false;
        }
    }

    /**
     * 업로드된 파일로 Portal App 생성
     * @param {string} sourceDir - 압축 해제된 소스 디렉토리
     * @param {string} appFolderPath - app 폴더 경로
     * @returns {Promise<Object|null>} 생성 결과 또는 null (취소 시)
     */
    async createPortalAppFromUpload(sourceDir, appFolderPath) {
        const inputs = await this.promptPortalAppInputs(appFolderPath, { titlePrefix: '' });
        if (!inputs) return null;

        return {
            targetPath: inputs.targetPath,
            appJson: inputs.appJson,
            appID: inputs.appID
        };
    }

    /**
     * Portal App 파일 복사 및 생성 완료
     * @param {string} sourceDir - 소스 디렉토리
     * @param {string} targetPath - 대상 경로
     * @param {Object} appJson - app.json 내용
     * @returns {boolean} 성공 여부
     */
    finalizePortalAppCreation(sourceDir, targetPath, appJson) {
        try {
            // 폴더 생성 및 파일 복사 (app.json 제외)
            ZipUtils.copyFolderContents(sourceDir, targetPath, ['app.json']);
            
            // 새 app.json 생성
            WizFileUtils.safeWriteJson(path.join(targetPath, 'app.json'), appJson);
            
            this.onRefresh?.();
            vscode.window.showInformationMessage(`Portal App이 성공적으로 업로드되었습니다: ${path.basename(targetPath)}`);
            return true;
        } catch (e) {
            vscode.window.showErrorMessage(`앱 생성 실패: ${e.message}`);
            return false;
        }
    }

    /**
     * Portal App 업로드 Webview 표시 및 처리
     * @param {string} appFolderPath - app 폴더 경로
     * @returns {Promise<void>}
     */
    async showPortalAppUploadWebview(appFolderPath) {
        const panel = vscode.window.createWebviewPanel(
            'wizAppUpload',
            'Portal App 업로드',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        
        panel.webview.html = UploadWebview.getUploadHtml({
            title: 'Portal App 업로드 (.wizapp)',
            acceptExtension: '.wizapp',
            description: '.wizapp 파일만 지원'
        });

        return new Promise((resolve) => {
            panel.webview.onDidReceiveMessage(async (message) => {
                if (message.command === 'uploadFile') {
                    panel.dispose();
                    
                    let extractResult;
                    try {
                        extractResult = await ZipUtils.extractFromBase64(message.fileData, '.wizapp');
                    } catch (err) {
                        vscode.window.showErrorMessage(err.message);
                        resolve();
                        return;
                    }
                    
                    const { sourceDir, cleanup } = extractResult;
                    
                    const result = await this.createPortalAppFromUpload(sourceDir, appFolderPath);
                    
                    if (!result) {
                        cleanup();
                        resolve();
                        return;
                    }
                    
                    this.finalizePortalAppCreation(sourceDir, result.targetPath, result.appJson);
                    cleanup();
                    resolve();
                }
            });

            panel.onDidDispose(() => resolve());
        });
    }
}

module.exports = PackageManager;
