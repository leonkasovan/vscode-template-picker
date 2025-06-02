// This file is part of the template-picker extension for Visual Studio Code.
// Developed by Dhani Novan (leonkasovan@gmail.com) Jakarta, 30 Mei 2025

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

async function deleteTemplate(context, item, installedViewProvider) {
	if (!item || !item.label) {
		console.error('Invalid item provided to shareTemplate');
		return;
	}
	const templatePath = path.join(context.extensionPath, 'templates', item.label);
	if (fs.existsSync(templatePath)) {
		try {
			await fs.promises.unlink(templatePath);
			// refresh the installed templates view
			installedViewProvider.refresh();
			vscode.window.showInformationMessage(`Template ${item.label} deleted successfully.`);
		} catch (err) {
			console.error('Error deleting template:', err);
			vscode.window.showErrorMessage(`Failed to delete template ${item.label}: ${err.message}`);
		}
	}
}

module.exports = {
	command: 'template-picker.deleteTemplate',
	handler: (context, installedViewProvider) => (item) => deleteTemplate(context, item, installedViewProvider)
};
