/**
 * Wiz MCP Server
 * Model Context Protocol server for AI agent integration
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
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

class WizMcpServer {
    constructor() {
        this.server = new Server(
            {
                name: 'wiz-mcp-server',
                version: '1.0.0'
            },
            {
                capabilities: {
                    tools: {},
                    resources: {}
                }
            }
        );

        this.wizRoot = null;
        this.currentProject = 'main';

        this.setupHandlers();
    }

    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    // Project Management
                    {
                        name: 'wiz_list_projects',
                        description: 'List all available Wiz projects in the workspace',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workspacePath: {
                                    type: 'string',
                                    description: 'Path to the Wiz workspace root'
                                }
                            },
                            required: ['workspacePath']
                        }
                    },
                    {
                        name: 'wiz_switch_project',
                        description: 'Switch to a different Wiz project',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workspacePath: {
                                    type: 'string',
                                    description: 'Path to the Wiz workspace root'
                                },
                                projectName: {
                                    type: 'string',
                                    description: 'Name of the project to switch to'
                                }
                            },
                            required: ['workspacePath', 'projectName']
                        }
                    },
                    {
                        name: 'wiz_export_project',
                        description: 'Export a Wiz project as .wizproject archive',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workspacePath: {
                                    type: 'string',
                                    description: 'Path to the Wiz workspace root'
                                },
                                projectName: {
                                    type: 'string',
                                    description: 'Name of the project to export'
                                }
                            },
                            required: ['workspacePath', 'projectName']
                        }
                    },
                    {
                        name: 'wiz_import_project',
                        description: 'Import a .wizproject file into the workspace',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workspacePath: {
                                    type: 'string',
                                    description: 'Path to the Wiz workspace root'
                                },
                                filePath: {
                                    type: 'string',
                                    description: 'Path to the .wizproject file'
                                },
                                projectName: {
                                    type: 'string',
                                    description: 'Name for the imported project'
                                }
                            },
                            required: ['workspacePath', 'filePath', 'projectName']
                        }
                    },

                    // Build
                    {
                        name: 'wiz_build',
                        description: 'Build a Wiz project',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workspacePath: {
                                    type: 'string',
                                    description: 'Path to the Wiz workspace root'
                                },
                                projectName: {
                                    type: 'string',
                                    description: 'Name of the project to build'
                                },
                                clean: {
                                    type: 'boolean',
                                    description: 'Whether to perform a clean build',
                                    default: false
                                }
                            },
                            required: ['workspacePath', 'projectName']
                        }
                    },

                    // App Management
                    {
                        name: 'wiz_list_apps',
                        description: 'List all apps in a Wiz project',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workspacePath: {
                                    type: 'string',
                                    description: 'Path to the Wiz workspace root'
                                },
                                projectName: {
                                    type: 'string',
                                    description: 'Name of the project'
                                },
                                appType: {
                                    type: 'string',
                                    enum: ['all', 'page', 'component', 'layout', 'route'],
                                    description: 'Type of apps to list',
                                    default: 'all'
                                }
                            },
                            required: ['workspacePath', 'projectName']
                        }
                    },
                    {
                        name: 'wiz_get_app_info',
                        description: 'Get detailed information about a specific app',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                appPath: {
                                    type: 'string',
                                    description: 'Full path to the app folder'
                                }
                            },
                            required: ['appPath']
                        }
                    },
                    {
                        name: 'wiz_create_app',
                        description: 'Create a new Wiz app (page, component, or layout)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workspacePath: {
                                    type: 'string',
                                    description: 'Path to the Wiz workspace root'
                                },
                                projectName: {
                                    type: 'string',
                                    description: 'Name of the project'
                                },
                                appType: {
                                    type: 'string',
                                    enum: ['page', 'component', 'layout'],
                                    description: 'Type of app to create'
                                },
                                namespace: {
                                    type: 'string',
                                    description: 'Namespace for the app (lowercase letters, numbers, underscores)'
                                },
                                title: {
                                    type: 'string',
                                    description: 'Display title for the app'
                                },
                                category: {
                                    type: 'string',
                                    description: 'Category for the app'
                                }
                            },
                            required: ['workspacePath', 'projectName', 'appType', 'namespace']
                        }
                    },
                    {
                        name: 'wiz_create_route',
                        description: 'Create a new Wiz route',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workspacePath: {
                                    type: 'string',
                                    description: 'Path to the Wiz workspace root'
                                },
                                projectName: {
                                    type: 'string',
                                    description: 'Name of the project'
                                },
                                id: {
                                    type: 'string',
                                    description: 'Route ID (folder name)'
                                },
                                title: {
                                    type: 'string',
                                    description: 'Display title for the route'
                                },
                                routePath: {
                                    type: 'string',
                                    description: 'API route path (e.g., /api/example)'
                                }
                            },
                            required: ['workspacePath', 'projectName', 'id']
                        }
                    },
                    {
                        name: 'wiz_update_app',
                        description: 'Update app.json configuration for an app',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                appPath: {
                                    type: 'string',
                                    description: 'Full path to the app folder'
                                },
                                updates: {
                                    type: 'object',
                                    description: 'Key-value pairs to update in app.json'
                                }
                            },
                            required: ['appPath', 'updates']
                        }
                    },
                    {
                        name: 'wiz_delete_app',
                        description: 'Delete an app folder',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                appPath: {
                                    type: 'string',
                                    description: 'Full path to the app folder to delete'
                                }
                            },
                            required: ['appPath']
                        }
                    },

                    // Package Management
                    {
                        name: 'wiz_list_packages',
                        description: 'List all portal packages in a project',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workspacePath: {
                                    type: 'string',
                                    description: 'Path to the Wiz workspace root'
                                },
                                projectName: {
                                    type: 'string',
                                    description: 'Name of the project'
                                }
                            },
                            required: ['workspacePath', 'projectName']
                        }
                    },
                    {
                        name: 'wiz_create_package',
                        description: 'Create a new portal package',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workspacePath: {
                                    type: 'string',
                                    description: 'Path to the Wiz workspace root'
                                },
                                projectName: {
                                    type: 'string',
                                    description: 'Name of the project'
                                },
                                namespace: {
                                    type: 'string',
                                    description: 'Package namespace (lowercase letters and numbers)'
                                },
                                title: {
                                    type: 'string',
                                    description: 'Display title for the package'
                                }
                            },
                            required: ['workspacePath', 'projectName', 'namespace']
                        }
                    },
                    {
                        name: 'wiz_export_package',
                        description: 'Export a portal package as .wizpkg archive',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workspacePath: {
                                    type: 'string',
                                    description: 'Path to the Wiz workspace root'
                                },
                                projectName: {
                                    type: 'string',
                                    description: 'Name of the project'
                                },
                                packageName: {
                                    type: 'string',
                                    description: 'Name of the package to export'
                                }
                            },
                            required: ['workspacePath', 'projectName', 'packageName']
                        }
                    },

                    // File Operations
                    {
                        name: 'wiz_read_app_file',
                        description: 'Read a specific file from an app (view.html, view.ts, etc.)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                appPath: {
                                    type: 'string',
                                    description: 'Full path to the app folder'
                                },
                                fileName: {
                                    type: 'string',
                                    description: 'Name of the file to read (e.g., view.html, view.ts, api.py)'
                                }
                            },
                            required: ['appPath', 'fileName']
                        }
                    },
                    {
                        name: 'wiz_write_app_file',
                        description: 'Write content to an app file',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                appPath: {
                                    type: 'string',
                                    description: 'Full path to the app folder'
                                },
                                fileName: {
                                    type: 'string',
                                    description: 'Name of the file to write'
                                },
                                content: {
                                    type: 'string',
                                    description: 'Content to write to the file'
                                }
                            },
                            required: ['appPath', 'fileName', 'content']
                        }
                    }
                ]
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'wiz_list_projects':
                        return await this.listProjects(args);
                    case 'wiz_switch_project':
                        return await this.switchProject(args);
                    case 'wiz_export_project':
                        return await this.exportProject(args);
                    case 'wiz_import_project':
                        return await this.importProject(args);
                    case 'wiz_build':
                        return await this.build(args);
                    case 'wiz_list_apps':
                        return await this.listApps(args);
                    case 'wiz_get_app_info':
                        return await this.getAppInfo(args);
                    case 'wiz_create_app':
                        return await this.createApp(args);
                    case 'wiz_create_route':
                        return await this.createRoute(args);
                    case 'wiz_update_app':
                        return await this.updateApp(args);
                    case 'wiz_delete_app':
                        return await this.deleteApp(args);
                    case 'wiz_list_packages':
                        return await this.listPackages(args);
                    case 'wiz_create_package':
                        return await this.createPackage(args);
                    case 'wiz_export_package':
                        return await this.exportPackage(args);
                    case 'wiz_read_app_file':
                        return await this.readAppFile(args);
                    case 'wiz_write_app_file':
                        return await this.writeAppFile(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${error.message}` }],
                    isError: true
                };
            }
        });

        // List resources
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            return { resources: [] };
        });

        // Read resource
        this.server.setRequestHandler(ReadResourceRequestSchema, async () => {
            return { contents: [] };
        });
    }

    // ==================== Tool Implementations ====================

    async listProjects({ workspacePath }) {
        const projectPath = path.join(workspacePath, 'project');
        if (!fs.existsSync(projectPath)) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ projects: [], message: 'No project folder found' }) }]
            };
        }

        const projects = fs.readdirSync(projectPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);

        return {
            content: [{ type: 'text', text: JSON.stringify({ projects, currentProject: this.currentProject }) }]
        };
    }

    async switchProject({ workspacePath, projectName }) {
        const projectPath = path.join(workspacePath, 'project', projectName);
        if (!fs.existsSync(projectPath)) {
            throw new Error(`Project '${projectName}' does not exist`);
        }

        this.currentProject = projectName;
        this.wizRoot = workspacePath;

        return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, currentProject: projectName }) }]
        };
    }

    async exportProject({ workspacePath, projectName }) {
        const exportsPath = path.join(workspacePath, 'exports');
        if (!fs.existsSync(exportsPath)) {
            fs.mkdirSync(exportsPath, { recursive: true });
        }

        const outputPath = path.join(exportsPath, projectName);
        const command = `wiz project export --project=${projectName} --output="${outputPath}"`;
        
        await exec(command, { cwd: workspacePath });

        return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, outputPath: `${outputPath}.wizproject` }) }]
        };
    }

    async importProject({ workspacePath, filePath, projectName }) {
        const projectBasePath = path.join(workspacePath, 'project');
        const targetPath = path.join(projectBasePath, projectName);

        if (fs.existsSync(targetPath)) {
            throw new Error(`Project '${projectName}' already exists`);
        }

        fs.mkdirSync(targetPath, { recursive: true });
        await exec(`unzip -o "${filePath}" -d "${targetPath}"`);

        return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, projectPath: targetPath }) }]
        };
    }

    async build({ workspacePath, projectName, clean = false }) {
        const args = ['project', 'build', '--project', projectName];
        if (clean) args.push('--clean');

        const { stdout, stderr } = await exec(`wiz ${args.join(' ')}`, { cwd: workspacePath });

        return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, output: stdout, errors: stderr }) }]
        };
    }

    async listApps({ workspacePath, projectName, appType = 'all' }) {
        const srcPath = path.join(workspacePath, 'project', projectName, 'src');
        const apps = [];

        const scanDirectory = (dirPath, category) => {
            if (!fs.existsSync(dirPath)) return;

            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const appJsonPath = path.join(dirPath, entry.name, 'app.json');
                    if (fs.existsSync(appJsonPath)) {
                        try {
                            const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                            apps.push({
                                name: entry.name,
                                path: path.join(dirPath, entry.name),
                                category,
                                ...appJson
                            });
                        } catch (e) { /* skip invalid json */ }
                    }
                }
            }
        };

        // Scan based on appType
        const typesToScan = appType === 'all' 
            ? ['page', 'component', 'layout', 'route']
            : [appType];

        // Check src/app folder first
        const appDir = path.join(srcPath, 'app');
        if (fs.existsSync(appDir)) {
            for (const type of typesToScan) {
                if (type !== 'route') {
                    // Standard apps have prefix like page.xxx
                    const entries = fs.readdirSync(appDir, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory() && entry.name.startsWith(`${type}.`)) {
                            const appJsonPath = path.join(appDir, entry.name, 'app.json');
                            if (fs.existsSync(appJsonPath)) {
                                try {
                                    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                                    apps.push({
                                        name: entry.name,
                                        path: path.join(appDir, entry.name),
                                        category: type,
                                        ...appJson
                                    });
                                } catch (e) { /* skip */ }
                            }
                        }
                    }
                }
            }
        }

        // Scan route folder
        if (typesToScan.includes('route')) {
            scanDirectory(path.join(srcPath, 'route'), 'route');
        }

        // Scan portal packages
        const portalPath = path.join(srcPath, 'portal');
        if (fs.existsSync(portalPath)) {
            const packages = fs.readdirSync(portalPath, { withFileTypes: true });
            for (const pkg of packages) {
                if (pkg.isDirectory()) {
                    scanDirectory(path.join(portalPath, pkg.name, 'app'), `portal/${pkg.name}`);
                    if (typesToScan.includes('route')) {
                        scanDirectory(path.join(portalPath, pkg.name, 'route'), `portal/${pkg.name}/route`);
                    }
                }
            }
        }

        return {
            content: [{ type: 'text', text: JSON.stringify({ apps, count: apps.length }) }]
        };
    }

    async getAppInfo({ appPath }) {
        const appJsonPath = path.join(appPath, 'app.json');
        if (!fs.existsSync(appJsonPath)) {
            throw new Error('app.json not found');
        }

        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        
        // List files in the app folder
        const files = fs.readdirSync(appPath);

        return {
            content: [{ type: 'text', text: JSON.stringify({ ...appJson, files, path: appPath }) }]
        };
    }

    async createApp({ workspacePath, projectName, appType, namespace, title, category }) {
        const srcPath = path.join(workspacePath, 'project', projectName, 'src');
        
        // Determine parent path
        let parentPath = path.join(srcPath, 'app');
        if (!fs.existsSync(parentPath)) {
            parentPath = srcPath;
        }

        const appID = `${appType}.${namespace}`;
        const newAppPath = path.join(parentPath, appID);

        if (fs.existsSync(newAppPath)) {
            throw new Error(`App '${appID}' already exists`);
        }

        fs.mkdirSync(newAppPath, { recursive: true });

        const appJson = {
            id: appID,
            mode: appType,
            title: title || namespace,
            namespace: namespace,
            category: category || namespace,
            viewuri: '',
            preview: '',
            controller: '',
            layout: ''
        };

        fs.writeFileSync(path.join(newAppPath, 'app.json'), JSON.stringify(appJson, null, 4));
        fs.writeFileSync(path.join(newAppPath, 'view.html'), '');
        fs.writeFileSync(path.join(newAppPath, 'view.ts'), '');

        return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, appPath: newAppPath, appJson }) }]
        };
    }

    async createRoute({ workspacePath, projectName, id, title, routePath }) {
        const srcPath = path.join(workspacePath, 'project', projectName, 'src');
        const routeDir = path.join(srcPath, 'route');
        
        if (!fs.existsSync(routeDir)) {
            fs.mkdirSync(routeDir, { recursive: true });
        }

        const newRoutePath = path.join(routeDir, id);

        if (fs.existsSync(newRoutePath)) {
            throw new Error(`Route '${id}' already exists`);
        }

        fs.mkdirSync(newRoutePath, { recursive: true });

        const appJson = {
            id: id,
            title: title || id,
            route: routePath || '',
            category: '',
            viewuri: '',
            controller: ''
        };

        fs.writeFileSync(path.join(newRoutePath, 'app.json'), JSON.stringify(appJson, null, 4));
        fs.writeFileSync(path.join(newRoutePath, 'controller.py'), '');

        return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, routePath: newRoutePath, appJson }) }]
        };
    }

    async updateApp({ appPath, updates }) {
        const appJsonPath = path.join(appPath, 'app.json');
        if (!fs.existsSync(appJsonPath)) {
            throw new Error('app.json not found');
        }

        const currentData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        const newData = { ...currentData, ...updates };

        fs.writeFileSync(appJsonPath, JSON.stringify(newData, null, 4));

        return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, appJson: newData }) }]
        };
    }

    async deleteApp({ appPath }) {
        if (!fs.existsSync(appPath)) {
            throw new Error('App folder not found');
        }

        fs.rmSync(appPath, { recursive: true, force: true });

        return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, deletedPath: appPath }) }]
        };
    }

    async listPackages({ workspacePath, projectName }) {
        const portalPath = path.join(workspacePath, 'project', projectName, 'src', 'portal');
        
        if (!fs.existsSync(portalPath)) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ packages: [] }) }]
            };
        }

        const packages = fs.readdirSync(portalPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => {
                const portalJsonPath = path.join(portalPath, entry.name, 'portal.json');
                let info = { name: entry.name };
                if (fs.existsSync(portalJsonPath)) {
                    try {
                        info = { ...info, ...JSON.parse(fs.readFileSync(portalJsonPath, 'utf8')) };
                    } catch (e) { /* skip */ }
                }
                return info;
            });

        return {
            content: [{ type: 'text', text: JSON.stringify({ packages }) }]
        };
    }

    async createPackage({ workspacePath, projectName, namespace, title }) {
        const command = `wiz project package create --namespace=${namespace} --project=${projectName}${title ? ` --title=${title}` : ''}`;
        
        const { stdout, stderr } = await exec(command, { cwd: workspacePath });

        return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, output: stdout, namespace }) }]
        };
    }

    async exportPackage({ workspacePath, projectName, packageName }) {
        const packagePath = path.join(workspacePath, 'project', projectName, 'src', 'portal', packageName);
        
        if (!fs.existsSync(packagePath)) {
            throw new Error(`Package '${packageName}' not found`);
        }

        const exportsDir = path.join(workspacePath, 'exports');
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir, { recursive: true });
        }

        const outputPath = path.join(exportsDir, `${packageName}.wizpkg`);
        
        await exec(`cd "${packagePath}" && zip -r "${outputPath}" .`);

        return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, outputPath }) }]
        };
    }

    async readAppFile({ appPath, fileName }) {
        const filePath = path.join(appPath, fileName);
        
        if (!fs.existsSync(filePath)) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ exists: false, content: null }) }]
            };
        }

        const content = fs.readFileSync(filePath, 'utf8');

        return {
            content: [{ type: 'text', text: JSON.stringify({ exists: true, content, fileName }) }]
        };
    }

    async writeAppFile({ appPath, fileName, content }) {
        const filePath = path.join(appPath, fileName);
        
        fs.writeFileSync(filePath, content);

        return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, filePath }) }]
        };
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Wiz MCP Server running on stdio');
    }
}

// Start server
const server = new WizMcpServer();
server.run().catch(console.error);

module.exports = WizMcpServer;
