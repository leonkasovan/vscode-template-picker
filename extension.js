// This file is part of the template-picker extension for Visual Studio Code.
// It provides functionality to extract files from a ZIP archive and create a workspace from templates.
// Prepare in MYSYS2 with the following commands:
// pacman -S mingw-w64-ucrt-x86_64-nodejs
// npm install
// npm install -g @vscode/vsce
// vsce package
// vsce publish

// Developed by Dhani Novan (leonkasovan@gmail.com) Jakarta, 30 Mei 2025
const vscode = require('vscode');
const path = require('path');
const templates = require('./moduleTemplate');
const { registerAllCommands } = require('./commands');
const downloader = require('./commands/downloadTemplate');

function activate(context) {
	// Installed panel (from zip files in 'templates' folder)
	const installedViewProvider = new templates.InstalledTemplateProvider(path.join(context.extensionPath, 'templates'));
	vscode.window.registerTreeDataProvider('templatesInstalled', installedViewProvider);

	// Download addtional templates from public GitHub repository
	downloader.downloadTemplate(context, installedViewProvider);

	// Register all commands
	registerAllCommands(context, installedViewProvider);
}

function deactivate() {
	// Optional cleanup logic if needed
}

module.exports = {
	activate,
	deactivate
};
