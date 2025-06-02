const vscode = require('vscode');

function showDate() {
	const now = new Date().toLocaleString();
	vscode.window.showInformationMessage(`Current date and time: ${now}`);
}

module.exports = {
	command: 'template-picker.showDate',
	handler: showDate,
};
