/**
 * App Creator
 * 앱 생성 로직을 담당하는 클래스
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const WizPathUtils = require('./pathUtils');
const WizFileUtils = require('./fileUtils');
const { APP_TEMPLATES } = require('./constants');

class AppCreator {
    /**
     * @param {Object} options - 옵션
     * @param {string} options.workspaceRoot - 워크스페이스 루트 경로
     * @param {Function} [options.onRefresh] - 새로고침 콜백
     */
    constructor(options = {}) {
        this.workspaceRoot = options.workspaceRoot;
        this.onRefresh = options.onRefresh;
    }

    /**
     * Standard App 입력 프롬프트 실행
     * @param {string} groupType - 앱 타입 (page, component, layout)
     * @param {string} parentPath - 부모 경로
     * @param {Object} [options] - 추가 옵션
     * @param {string} [options.titlePrefix='새'] - 제목 접두사
     * @returns {Promise<Object|null>} 입력된 앱 설정 또는 null (취소 시)
     */
    async promptStandardAppInputs(groupType, parentPath, options = {}) {
        const { titlePrefix = '새' } = options;
        const capitalizedType = groupType.charAt(0).toUpperCase() + groupType.slice(1);

        // 1. Namespace 입력
        const namespace = await vscode.window.showInputBox({
            title: `${titlePrefix} ${capitalizedType} 생성`,
            prompt: 'Namespace를 입력하세요',
            placeHolder: 'myapp',
            validateInput: (value) => {
                if (!value) return 'Namespace는 필수입니다.';
                if (!/^[a-z][a-z0-9_]*$/.test(value)) {
                    return '영문 소문자로 시작하고, 소문자/숫자/밑줄만 허용됩니다.';
                }
                const appID = `${groupType}.${value}`;
                const appPath = path.join(parentPath, appID);
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
            placeHolder: namespace
        });

        // 4. Controller 선택 (선택)
        const controllerDir = path.join(this.workspaceRoot, 'src', 'controller');
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

        // 5. Page 전용: Layout 선택 및 ViewURI 입력
        let layout = '';
        let viewuri = '';

        if (groupType === 'page') {
            // Layout 선택
            const layouts = WizPathUtils.loadLayouts(parentPath);
            if (layouts.length > 0) {
                const layoutItems = [
                    { label: '$(dash) 없음', value: '' },
                    ...layouts.map(l => ({ label: `$(layout) ${l}`, value: l }))
                ];
                const selectedLayout = await vscode.window.showQuickPick(layoutItems, {
                    title: 'Layout 선택 (선택사항)',
                    placeHolder: '사용할 Layout을 선택하세요'
                });
                if (selectedLayout) {
                    layout = selectedLayout.value;
                }
            }

            // ViewURI (Angular Routing) 입력
            viewuri = await vscode.window.showInputBox({
                title: 'Angular Routing (선택사항)',
                prompt: 'ViewURI를 입력하세요.',
                placeHolder: '/example'
            }) || '';
        }

        const appID = `${groupType}.${namespace}`;
        return {
            namespace,
            title: title || namespace,
            category: category || namespace,
            controller,
            layout,
            viewuri,
            appID,
            targetPath: path.join(parentPath, appID),
            appJson: {
                id: appID,
                mode: groupType,
                title: title || namespace,
                namespace: namespace,
                category: category || namespace,
                viewuri: viewuri,
                preview: '',
                controller: controller,
                layout: layout
            }
        };
    }

    /**
     * Portal App 입력 프롬프트 실행
     * @param {string} parentPath - 부모 경로 (app 폴더)
     * @param {Object} [options] - 추가 옵션
     * @param {string} [options.titlePrefix='새'] - 제목 접두사
     * @returns {Promise<Object|null>} 입력된 앱 설정 또는 null (취소 시)
     */
    async promptPortalAppInputs(parentPath, options = {}) {
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
                const appPath = path.join(parentPath, value);
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
        const packagePath = path.dirname(parentPath);
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
            targetPath: path.join(parentPath, appID),
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
     * Standard App 생성 (입력부터 파일 생성까지)
     * @param {string} groupType - 앱 타입 (page, component, layout)
     * @param {string} parentPath - 부모 경로
     * @returns {Promise<boolean>} 성공 여부
     */
    async createStandardApp(groupType, parentPath) {
        const inputs = await this.promptStandardAppInputs(groupType, parentPath);
        if (!inputs) return false;

        try {
            fs.mkdirSync(inputs.targetPath, { recursive: true });

            WizFileUtils.safeWriteJson(path.join(inputs.targetPath, 'app.json'), inputs.appJson);
            WizFileUtils.safeWriteFile(path.join(inputs.targetPath, 'view.html'), APP_TEMPLATES['view.html']);
            WizFileUtils.safeWriteFile(path.join(inputs.targetPath, 'view.ts'), APP_TEMPLATES['view.ts']);

            const capitalizedType = groupType.charAt(0).toUpperCase() + groupType.slice(1);
            vscode.window.showInformationMessage(`${capitalizedType} '${inputs.appID}' 생성 완료`);
            
            this.onRefresh?.();
            return true;
        } catch (e) {
            vscode.window.showErrorMessage(`앱 생성 실패: ${e.message}`);
            return false;
        }
    }

    /**
     * Portal App 생성 (입력부터 파일 생성까지)
     * @param {string} parentPath - 부모 경로 (app 폴더)
     * @returns {Promise<boolean>} 성공 여부
     */
    async createPortalApp(parentPath) {
        const inputs = await this.promptPortalAppInputs(parentPath);
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
     * Route 생성 (입력부터 파일 생성까지)
     * @param {string} parentPath - 부모 경로
     * @param {boolean} [isPortalRoute=false] - Portal Route 여부
     * @returns {Promise<boolean>} 성공 여부
     */
    async createRoute(parentPath, isPortalRoute = false) {
        const routeType = isPortalRoute ? 'Portal Route' : 'Route';

        // 1. ID 입력
        const id = await vscode.window.showInputBox({
            title: `새 ${routeType} 생성`,
            prompt: 'ID (폴더명)를 입력하세요',
            placeHolder: 'myroute',
            validateInput: (value) => {
                if (!value) return 'ID는 필수입니다.';
                if (!/^[a-z][a-z0-9]*$/.test(value)) {
                    return '영문 소문자로 시작하고, 소문자/숫자만 허용됩니다.';
                }
                const routePath = path.join(parentPath, value);
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

        // 라우트 생성
        const newRoutePath = path.join(parentPath, id);

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

            vscode.window.showInformationMessage(`${routeType} '${id}' 생성 완료`);
            
            this.onRefresh?.();
            return true;
        } catch (e) {
            vscode.window.showErrorMessage(`라우트 생성 실패: ${e.message}`);
            return false;
        }
    }

    /**
     * 업로드된 파일로 Standard App 생성
     * @param {string} sourceDir - 압축 해제된 소스 디렉토리
     * @param {string} parentPath - 부모 경로
     * @returns {Promise<Object|null>} 생성 결과 또는 null (취소 시)
     */
    async createStandardAppFromUpload(sourceDir, parentPath) {
        // 0. App 타입 선택
        const appTypeSelection = await vscode.window.showQuickPick(
            ['page', 'component', 'layout'],
            { title: 'App 타입 선택', placeHolder: '생성할 앱 타입을 선택하세요' }
        );
        if (!appTypeSelection) return null;

        const groupType = appTypeSelection;
        const inputs = await this.promptStandardAppInputs(groupType, parentPath, { titlePrefix: '' });
        if (!inputs) return null;

        return {
            targetPath: inputs.targetPath,
            appJson: inputs.appJson,
            appID: inputs.appID
        };
    }

    /**
     * 업로드된 파일로 Portal App 생성
     * @param {string} sourceDir - 압축 해제된 소스 디렉토리
     * @param {string} parentPath - 부모 경로 (app 폴더)
     * @returns {Promise<Object|null>} 생성 결과 또는 null (취소 시)
     */
    async createPortalAppFromUpload(sourceDir, parentPath) {
        const inputs = await this.promptPortalAppInputs(parentPath, { titlePrefix: '' });
        if (!inputs) return null;

        return {
            targetPath: inputs.targetPath,
            appJson: inputs.appJson,
            appID: inputs.appID
        };
    }

    /**
     * 앱 파일 복사 및 생성 완료
     * @param {string} sourceDir - 소스 디렉토리
     * @param {string} targetPath - 대상 경로
     * @param {Object} appJson - app.json 내용
     * @returns {boolean} 성공 여부
     */
    finalizeAppCreation(sourceDir, targetPath, appJson) {
        try {
            const ZipUtils = require('./zipUtils');
            
            // 폴더 생성 및 파일 복사 (app.json 제외)
            ZipUtils.copyFolderContents(sourceDir, targetPath, ['app.json']);
            
            // 새 app.json 생성
            WizFileUtils.safeWriteJson(path.join(targetPath, 'app.json'), appJson);
            
            this.onRefresh?.();
            vscode.window.showInformationMessage(`App이 성공적으로 업로드되었습니다: ${path.basename(targetPath)}`);
            return true;
        } catch (e) {
            vscode.window.showErrorMessage(`앱 생성 실패: ${e.message}`);
            return false;
        }
    }
}

module.exports = AppCreator;
