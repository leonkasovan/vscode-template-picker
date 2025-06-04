// This file is part of the template-picker extension for Visual Studio Code.
// It provides functionality to extract files from a ZIP archive and create a workspace from templates.
// Developed by Dhani Novan (leonkasovan@gmail.com) Jakarta, 30 Mei 2025
const vscode = require('vscode');
const path = require('path');
const templates = require('./moduleTemplate');
const { registerAllCommands } = require('./commands');
  
function activate(context) {
	// Installed panel (from zip files in 'templates' folder)
	const installedViewProvider = new templates.InstalledTemplateProvider(path.join(context.extensionPath, 'templates'));
	vscode.window.registerTreeDataProvider('templatesInstalled', installedViewProvider);

	registerAllCommands(context, installedViewProvider);
}

function deactivate() {
	// Optional cleanup logic if needed
}

module.exports = {
	activate,
	deactivate
};
