# Wiz VSCode Extension

A comprehensive VS Code extension for managing [Wiz Framework](https://github.com/season-framework/wiz) projects with an enhanced file explorer, specialized editors, and intelligent project navigation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.60+-blue.svg)](https://code.visualstudio.com/)

## ✨ Features

### 🗂️ Smart Project Explorer
- **Three-Level Structure**: Source, Packages (Portal), and Project categories
- **App Type Recognition**: Automatic detection of Page, Component, Layout, and Route apps
- **Virtual Folders**: Display standard folders even when they don't exist yet
- **Auto-Highlighting**: Automatically reveals active file in the tree view

### ✏️ Specialized Editors
- **App Info Editor**: Webview-based visual editor for `app.json` configuration
- **Route Editor**: Dedicated interface for route-specific settings
- **Portal App Editor**: Namespace-synced editor for portal applications
- **Portal Package Editor**: Manage `portal.json` with auto-completed fields

### 🎯 Developer Experience
- **Keyboard Shortcuts**: Quick navigation with Alt+1-6 (Info, UI, Component, SCSS, API, Socket)
- **Drag & Drop**: Move files and folders effortlessly
- **Multi-Select**: Work with multiple items simultaneously
- **Title Display**: Show user-friendly app titles instead of IDs

### 🚀 Project Management
- **Git Integration**: Clone projects directly from repositories
- **Project Switching**: Quick switch between multiple projects
- **Project Deletion**: Safe removal with confirmation dialogs

---

## 📦 Installation

### From Source (Development)

1. **Clone the repository**:
```bash
git clone https://github.com/your-org/wiz-vscode.git
cd wiz-vscode
```

2. **Install dependencies**:
```bash
npm install
```

3. **Run in Extension Development Host**:
- Press `F5` in VS Code
- A new VS Code window will open with the extension loaded

### From VSIX Package

```bash
code --install-extension wiz-vscode-0.0.1.vsix
```

---

## 🎓 Usage

### Opening a Wiz Project

1. Open a Wiz Framework project folder in VS Code
2. Click the **WIZ** icon in the Activity Bar
3. Navigate through the categorized tree structure:
   - **Source**: Contains `src/` apps (page, component, layout, route)
   - **Packages**: Portal packages from `src/portal/`
   - **Project**: Root-level files and directories

### Creating New Apps

**Standard App (Page/Component/Layout)**:
1. Right-click on an app group (e.g., `app/page`)
2. Select "New App"
3. Fill in the form (Title, Namespace, Category, etc.)
4. Files are automatically generated

**Route App**:
1. Right-click on `route` folder (Source or Portal)
2. Select "New Route"
3. Configure route settings
4. `app.json` and `controller.py` are created

**Portal App**:
1. Navigate to a portal package's `app` folder
2. Right-click → "New Portal App"
3. Namespace, folder name, and ID are automatically synced

### Editing App Configuration

1. Click on an app folder in the tree
2. The Info editor (Webview) opens automatically
3. Modify fields and click "Save"
4. Changes are written to `app.json`

### Keyboard Shortcuts

When editing a Wiz app (`wiz://` scheme active):
- `Alt+1`: Open Info tab
- `Alt+2`: Open UI/Controller tab
- `Alt+3`: Open Component tab
- `Alt+4`: Open SCSS tab
- `Alt+5`: Open API tab
- `Alt+6`: Open Socket tab

### Managing Projects

1. Click the **Project Switcher** icon in the explorer toolbar
2. Options:
   - **Import Project**: Clone from Git URL into `project/<name>`
   - **Delete Project**: Remove a project with confirmation
   - **Switch**: Change active project

---

## 🏗️ Architecture

### Core Modules (`src/core/`)

| Module | Purpose |
|--------|---------|
| `constants.js` | Centralized constants (App types, icons, file mappings) |
| `pathUtils.js` | URI parsing, app folder detection, path resolution |
| `fileUtils.js` | File I/O operations, JSON handling |
| `uriFactory.js` | Factory for generating `wiz://` virtual URIs |
| `webviewTemplates.js` | HTML templates for Webview editors |

### Editor System (`src/editor/`)

**Facade Pattern**: `appEditorProvider.js` manages all editor instances.

**Editor Hierarchy**:
```
EditorBase (Abstract)
├── AppEditor (Standard apps)
│   ├── RouteEditor (Routes)
│   └── PortalAppEditor (Portal apps)
├── PortalEditor (portal.json)
└── Create Editors (App creation dialogs)
```

### Explorer (`src/explorer/`)

- **FileExplorerProvider**: Main tree data provider
- **CategoryHandlers**: Source, Portal, Project category logic
- **AppPatternProcessor**: Groups apps by type (page, component, layout)
- **WizDragAndDropController**: Handles file/folder movement

### Virtual File System

- **Scheme**: `wiz://<authority>/<base64-path>?label=<display-name>`
- **Provider**: `wizFileSystemProvider.js` maps virtual URIs to real files
- **Purpose**: Clean editor tabs without exposing complex paths

---

## 🛠️ Development Guide

### Project Structure

```
wiz-vscode/
├── src/
│   ├── core/                  # Core utilities and constants
│   ├── editor/                # Webview editors and providers
│   │   └── editors/          # Individual editor implementations
│   ├── explorer/             # Tree view components
│   │   ├── models/           # Category handlers
│   │   └── treeItems/        # Tree item classes
│   └── extension.js          # Extension entry point
├── resources/                # Icons and assets
├── devlog/                   # Development logs (001-033)
├── package.json              # Extension manifest
└── DEVLOG.md                 # Comprehensive development history
```

### Key Design Patterns

1. **Facade Pattern**: `AppEditorProvider` centralizes editor management
2. **Factory Pattern**: `WizUriFactory` creates virtual URIs consistently
3. **Template Method**: `EditorBase` defines lifecycle, subclasses override specifics
4. **Strategy Pattern**: Different category handlers for Source/Portal/Project

### Adding a New Editor

1. Create a new class in `src/editor/editors/` extending `EditorBase`
2. Implement `generateHtml()` and `handleMessage()`
3. Register in `AppEditorProvider`
4. Add command to `package.json` and `extension.js`

### Testing Changes

```bash
# Run extension in debug mode
Press F5 in VS Code

# Check for errors
Open Developer Tools in Extension Host window
```

### Code Style

- **ES6 Modules**: Use `require()` (CommonJS for VS Code compatibility)
- **Naming**: camelCase for functions/variables, PascalCase for classes
- **Comments**: JSDoc for public methods
- **Error Handling**: Try-catch with user-friendly messages

---

## 📊 Development Status

### ✅ Completed (v0.1.0)

- [x] Tree View with Source/Portal/Project categories
- [x] App/Route/Portal App editors
- [x] App creation workflows
- [x] Drag & drop file operations
- [x] Keyboard shortcuts (Alt+1-6)
- [x] Auto-reveal active file
- [x] Project import/delete
- [x] Title-based app display

### 🚧 In Progress

- [ ] Package creation wizard
- [ ] Search functionality
- [ ] Git status indicators

### 🔮 Planned Features

See [DEVLOG.md](./DEVLOG.md#향후-개선-사항) for the complete roadmap, including:
- Wiz CLI integration (build, run, deploy)
- MCP (Model Context Protocol) server
- Live preview
- Debugger support
- Performance optimizations

---

## 📝 Changelog

Detailed development logs are maintained in [devlog/](./devlog/) directory.

**Recent Updates**:
- **033**: App title display improvement ([details](./devlog/033-app-title-display.md))
- **032**: Project deletion feature ([details](./devlog/032-project-deletion.md))
- **031**: Project import from Git ([details](./devlog/031-project-import.md))
- **030**: Auto-reveal in explorer ([details](./devlog/030-auto-reveal.md))
- **029**: Portal app path labels ([details](./devlog/029-portal-app-path-label.md))

[View Full Development History →](./DEVLOG.md)

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions/updates
- `chore:` Maintenance tasks

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built for the [Wiz Framework](https://github.com/season-framework/wiz)
- Inspired by VS Code's extension API capabilities
- Community feedback and contributions

---

## 🔗 Resources

- **Wiz Framework**: [https://github.com/season-framework/wiz](https://github.com/season-framework/wiz)
- **VS Code Extension API**: [https://code.visualstudio.com/api](https://code.visualstudio.com/api)
- **Issue Tracker**: [GitHub Issues](https://github.com/your-org/wiz-vscode/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/wiz-vscode/discussions)

---

<p align="center">Made with ❤️ for the Wiz Framework community</p>

