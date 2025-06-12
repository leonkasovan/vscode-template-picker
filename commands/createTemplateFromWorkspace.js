const vscode = require('vscode');
const JSZip = require('jszip');
const fs = require('fs').promises;
const path = require('path');

/**
 * Recursively adds files to the zip from a directory.
 * @param {JSZip} zip
 * @param {string} dirPath
 */
async function addFilesToZip(zip, dirPath) {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);

		if (entry.isDirectory()) {
			const folder = zip.folder(entry.name);
			await addFilesToZip(folder, fullPath);
		} else if (entry.isFile()) {
			const fileData = await fs.readFile(fullPath);
			zip.file(entry.name, fileData);
		}
	}
}

/**
 * Compresses the current workspace into a ZIP file using JSZip.
 */
async function compressWorkspace(context) {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage('No workspace is open.');
		return;
	}

	const workspacePath = workspaceFolders[0].uri.fsPath;
	const zip = new JSZip();
	const folderName = path.basename(workspacePath);
	const rootFolder = zip.folder(folderName);

	try {
		await addFilesToZip(rootFolder, workspacePath);
		const content = await zip.generateAsync({ type: 'nodebuffer' });

		const outputPath = path.join(context.extensionPath, 'templates', `${folderName}.zip`);
		await fs.writeFile(outputPath, content);
		vscode.commands.executeCommand('template-picker.installedTemplateProvider.refresh');
		vscode.window.showInformationMessage(`Workspace saved as template ${outputPath}`);

		//promt user to open the templates folder
		const openFolder = await vscode.window.showInformationMessage(
			'Do you want to open the templates folder?',
			{ modal: true },
			'Open'
		);
		if (openFolder === 'Open') {
			vscode.env.openExternal(vscode.Uri.file(path.join(context.extensionPath, 'templates')));
		}
	} catch (err) {
		vscode.window.showErrorMessage(`Error compressing workspace: ${err.message}`);
	}
}

module.exports = {
	command: 'template-picker.createTemplateFromWorkspace',
	handler: (context) => () => compressWorkspace(context)
};
