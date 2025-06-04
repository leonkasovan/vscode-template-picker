// This file is part of the template-picker extension for Visual Studio Code.
// Developed by Dhani Novan (leonkasovan@gmail.com) Jakarta, 30 Mei 2025
const path = require('path');
const fs = require('fs');
const vscode = require('vscode');

async function openTemplateFolder(context) {
	const templatesDir = path.join(context.extensionPath, 'templates');
	if (!fs.existsSync(templatesDir)) {
		vscode.window.showErrorMessage(`Folder not found: ${templatesDir}`);
		return;
	}

	vscode.env.openExternal(vscode.Uri.file(templatesDir));
}

module.exports = {
	command: 'template-picker.openTemplateFolder',
	handler: (context) => () => openTemplateFolder(context)
};