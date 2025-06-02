const vscode = require('vscode');

async function showPath(context) {
	vscode.window.showInformationMessage(`Extension path: ${context.extensionPath}`);
}

module.exports = {
	command: 'template-picker.showPath',
	handler: (context) => () => showPath(context)
};
