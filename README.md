# Wiz VSCode Extension

A comprehensive VS Code extension for managing [Wiz Framework](https://github.com/season-framework/wiz) projects with an enhanced file explorer, specialized editors, and intelligent project navigation.

[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/season-framework/wiz-vscode)
[![Wiz](https://img.shields.io/badge/wiz-%3E%3D2.5.0-blue.svg)](https://github.com/season-framework/wiz)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.60+-purple.svg)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📋 Requirements

- **VS Code**: 1.60.0 or higher
- **Wiz Framework**: 2.5.0 or higher
- **Node.js**: 14.x or higher

---

## ✨ Features

### 🗂️ Smart Project Explorer
- **Four-Level Structure**: Source, Packages (Portal), Exports, and Project categories
- **App Type Recognition**: Automatic detection of Page, Component, Layout, and Route apps
- **Virtual Folders**: Display standard folders even when they don't exist yet
- **Auto-Highlighting**: Automatically reveals active file in the tree view
- **Drag & Drop**: Move files and folders effortlessly
- **Multi-Select**: Work with multiple items simultaneously

### ✏️ Specialized Editors
- **App Info Editor**: Webview-based visual editor for `app.json` configuration
- **Route Editor**: Dedicated interface for route-specific settings
- **Portal App Editor**: Namespace-synced editor for portal applications
- **Portal Package Editor**: Manage `portal.json` with auto-completed fields
- **View Type Selection**: Choose between HTML and Pug templates

### ⌨️ Command Palette Integration
Quick access to all major features via `Ctrl+Shift+P`:

| Command | Description |
|---------|-------------|
| `Wiz: Build Project` | Build with type selection (Normal/Clean) |
| `Wiz: Normal Build` | Direct normal build |
| `Wiz: Clean Build` | Direct clean build |
| `Wiz: Show Build Output` | Display build output channel |
| `Wiz: Switch Project` | Quick project switching |
| `Wiz: Export Current Project` | Export to `.wizproject` file |
| `Wiz: Import Project` | Import from `.wizproject` file |
| `Wiz: Go to App` | Search and navigate to any app |
| `Wiz: Create New Page/Component/Layout/Route` | Create apps with Source/Package selection |
| `Wiz: Create New Package` | Create new Portal package |
| `Wiz: Refresh Explorer` | Refresh the tree view |

### 🎯 Keyboard Shortcuts
When editing a Wiz app (`wiz://` scheme active):
- `Alt+1`: Open Info tab
- `Alt+2`: Open UI/Controller tab
- `Alt+3`: Open Component tab
- `Alt+4`: Open SCSS tab
- `Alt+5`: Open API tab
- `Alt+6`: Open Socket tab

### 🚀 Project Management
- **Git Integration**: Clone projects directly from repositories
- **Project Switching**: Quick switch between multiple projects
- **Project Export**: Export projects as `.wizproject` archives
- **Project Import**: Import `.wizproject` files
- **Project Deletion**: Safe removal with confirmation dialogs
- **Package Management**: Create and export Portal packages

### 🔄 Build Integration
- **Auto-Build Trigger**: Automatic build on file save
- **Build Output Channel**: Real-time build log viewing
- **Normal/Clean Build**: Choose build type as needed

---

## 📦 Installation

### From Source (Development)

1. **Clone the repository**:
```bash
git clone https://github.com/season-framework/wiz-vscode.git
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
code --install-extension wiz-vscode-1.0.0.vsix
```

---

## 🎓 Usage

### Opening a Wiz Project

1. Open a Wiz Framework project folder in VS Code
2. Click the **WIZ** icon in the Activity Bar
3. Navigate through the categorized tree structure:
   - **Source**: Contains `src/` apps (page, component, layout, route)
   - **Packages**: Portal packages from `src/portal/`
   - **Exports**: Exported packages and projects
   - **Project**: Root-level files and directories

### Creating New Apps

**From Command Palette** (Recommended):
1. Press `Ctrl+Shift+P`
2. Type `Wiz: Create New Page` (or Component/Layout/Route)
3. Select location: **Source** or **Package**
4. If Package selected, choose the target package
5. Fill in the namespace and optional fields

**From Context Menu**:
1. Right-click on an app group in the tree
2. Select "New App" or "New Route"
3. Fill in the form

### Managing Projects

**Switch Project**:
1. Press `Ctrl+Shift+P` → `Wiz: Switch Project`
2. Or click the Project Switcher icon in the explorer toolbar

**Export Project**:
1. Press `Ctrl+Shift+P` → `Wiz: Export Current Project`
2. Project is saved to `exports/` folder as `.wizproject`

**Import Project**:
1. Press `Ctrl+Shift+P` → `Wiz: Import Project`
2. Select a `.wizproject` file
3. Enter project name and confirm

### Building

**Manual Build**:
- `Wiz: Normal Build` - Standard incremental build
- `Wiz: Clean Build` - Full rebuild from scratch

**Auto Build**:
- Triggered automatically when saving any file in the project

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
- **CategoryHandlers**: Source, Portal, Project, Exports category logic
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
├── devlog/                   # Development logs (001-038)
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

---

## 📊 Version History

### v1.0.0 (Current)

**Core Features**:
- ✅ Tree View with Source/Portal/Exports/Project categories
- ✅ App/Route/Portal App editors with View Type selection
- ✅ App creation workflows (Source and Package locations)
- ✅ Drag & drop file operations
- ✅ Keyboard shortcuts (Alt+1-6)
- ✅ Auto-reveal active file

**Project Management**:
- ✅ Project import/export (.wizproject format)
- ✅ Project switching and deletion
- ✅ Git-based project cloning
- ✅ Package creation and export (.wizpkg format)

**Build Integration**:
- ✅ Auto-build on file save
- ✅ Normal/Clean build options
- ✅ Build output channel

**Command Palette**:
- ✅ 20+ commands accessible via Ctrl+Shift+P
- ✅ App search and navigation (Go to App)
- ✅ Direct build commands

---

## 📝 Changelog

Detailed development logs are maintained in [devlog/](./devlog/) directory.

**Recent Updates**:
- **038**: Command palette improvements and bug fixes
- **037**: Command palette feature addition
- **036**: Project export/import functionality
- **035**: View Type selection (HTML/Pug)
- **034**: Package management and build trigger

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
- `chore:` Maintenance tasks

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Resources

- **Wiz Framework**: [https://github.com/season-framework/wiz](https://github.com/season-framework/wiz)
- **VS Code Extension API**: [https://code.visualstudio.com/api](https://code.visualstudio.com/api)
- **Issue Tracker**: [GitHub Issues](https://github.com/season-framework/wiz-vscode/issues)

---

<p align="center">Made with ❤️ for the Wiz Framework community</p>

