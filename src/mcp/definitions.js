/**
 * Wiz MCP Server - Tool Definitions
 * 54개 도구의 스키마 및 설명 정의
 */

/**
 * 프로토타입 믹스인용 메서드
 * WizMcpServer 인스턴스의 this 컨텍스트로 호출된다.
 */
module.exports = {

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
                        appPath: { type: 'string', description: 'App folder path. Supported formats: "page.home" (bare name, auto-resolved), "app/page.home", "src/app/page.home", "route/my-api" (absolute paths also accepted)' }
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
                        appPath: { type: 'string', description: 'App folder path (e.g., "page.home", "app/page.home", "src/app/page.home", "route/my-api")' },
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
                        appPath: { type: 'string', description: 'App folder path to delete (e.g., "page.home", "app/page.home", "route/my-api")' }
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
                        appPath: { type: 'string', description: 'App folder path (e.g., "page.home", "app/page.home", "route/my-api")' }
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
                        appPath: { type: 'string', description: 'App folder path (e.g., "page.home", "app/page.home", "route/my-api")' },
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
                        appPath: { type: 'string', description: 'App folder path (e.g., "page.home", "app/page.home", "route/my-api")' },
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
                        appPath: { type: 'string', description: 'App folder path (e.g., "page.home", "app/page.home", "route/my-api")' },
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
                        appPath: { type: 'string', description: 'App folder path (e.g., "page.home", "app/page.home", "route/my-api")' },
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
                        appPath: { type: 'string', description: 'Portal app folder path (e.g., "login" (bare name, auto-resolved in portal), "portal/season/app/login", "src/portal/season/app/login")' }
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
                        appPath: { type: 'string', description: 'Portal app folder path (e.g., "portal/season/app/login", "src/portal/season/app/login", "login")' },
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
                        appPath: { type: 'string', description: 'Portal app folder path to delete (e.g., "portal/season/app/login", "login")' }
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
                        appPath: { type: 'string', description: 'Portal app folder path (e.g., "portal/season/app/login", "login")' }
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
                        appPath: { type: 'string', description: 'Portal app folder path (e.g., "portal/season/app/login", "login")' },
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
                        appPath: { type: 'string', description: 'Portal app folder path (e.g., "portal/season/app/login", "login")' },
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
                        appPath: { type: 'string', description: 'Portal app folder path (e.g., "portal/season/app/login", "login")' },
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
                        appPath: { type: 'string', description: 'Portal app folder path (e.g., "portal/season/app/login", "login")' },
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

};
