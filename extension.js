// This file is part of the template-picker extension for Visual Studio Code.
// It provides functionality to extract files from a ZIP archive and create a workspace from templates.
// Developed by Dhani Novan (leonkasovan@gmail.com) Jakarta, 30 Mei 2025
const vscode = require('vscode');
const path = require('path');
const templates = require('./moduleTemplate');
const { registerAllCommands } = require('./commands');
  
function activate(context) {
	console.log('Template Picker extension is now active!');
	vscode.window.showInformationMessage('Template Picker extension is now active!');
	// Search panel (dummy)
	// const searchViewProvider = new SimpleTreeDataProvider([
	// 	'Template A',
	// 	'Template B'
	// ]);
	// vscode.window.registerTreeDataProvider('templatesSearch', searchViewProvider);

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
