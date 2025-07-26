// This file is part of the template-picker extension for Visual Studio Code.
// It provides functionality to extract files from a ZIP archive and create a workspace from templates.
// Developed by Dhani Novan (leonkasovan@gmail.com) Jakarta, 30 Mei 2025

const vscode = require('vscode');
const fs = require('fs').promises;
const path = require('path');
const moduleTemplate = require('../moduleTemplate');
const os = require('os');

async function useTemplate(context, item) {
	const config = vscode.workspace.getConfiguration('template-picker');
	let projectDir = config.get('projectDirectory', '');

	if (!projectDir) {
		let projectDirUri = await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectFiles: false,
			openLabel: 'Select Project Directory'
		});
		if (!projectDirUri || projectDirUri.length === 0) {
			return;
		}
		projectDir = projectDirUri[0].fsPath;
		config.update('projectDirectory', projectDir, vscode.ConfigurationTarget.Global);
	}

	const templatesDir = path.join(context.extensionPath, 'templates');
	let projectName = await vscode.window.showInputBox({
		prompt: 'Enter project name',
		value: 'MyProject'
	});
	if (!projectName || projectName.length === 0) return;

	let destDir = path.join(projectDir, projectName);
	const vars = {
		extensionPath: context.extensionPath,
		platform: os.platform(),
		arch: os.arch(),
		lib_ext: os.platform() === 'win32' ? 'dll' : 'so',
	};

	await moduleTemplate.extractFirstDirectoryFromZip(path.join(templatesDir, item.zipName), item.zipFolder, destDir, vars)
		.then(async () => {
			vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(destDir), false);
		})
		.catch(console.error);
	// console.log('OS Platform:', os.platform());
	// console.log('Architecture:', os.arch());
}

module.exports = {
	command: 'template-picker.useTemplate',
	handler: (context) => (item) => useTemplate(context, item)
};
