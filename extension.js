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

	const snippetsDir = path.join(context.extensionPath, 'snippets');
	const snippetProvider = new templates.SnippetsProvider(snippetsDir);
	vscode.window.registerTreeDataProvider('snippetExplorer', snippetProvider);

	// Download addtional templates from public GitHub repository
	downloader.downloadTemplate(context, installedViewProvider);

	// Register all commands
	registerAllCommands(context, installedViewProvider);

	// Register open snippet command
	// const openSnippetCmd = vscode.commands.registerCommand('snippetExplorer.openSnippet', async (zipItem) => {
	// 	const doc = await vscode.workspace.openTextDocument({ content: zipItem.content, language: zipItem.language || 'plaintext' });
	// 	await vscode.window.showTextDocument(doc, { preview: true });
	// });
	// context.subscriptions.push(openSnippetCmd);
	// Register snippet scheme provider
	const snippetScheme = 'snippet';
	const snippetDocProvider = new class {
		constructor() {
			this._onDidChange = new vscode.EventEmitter();
			this.onDidChange = this._onDidChange.event;
			this.content = '';
		}

		provideTextDocumentContent(uri) {
			return this.content;
		}

		updateContent(newContent, language = 'plaintext') {
			this.content = newContent;
			this.language = language;
			this._onDidChange.fire(vscode.Uri.parse(`${snippetScheme}:/Snippet`));
		}
	};

	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider(snippetScheme, snippetDocProvider)
	);

	const openSnippetCmd = vscode.commands.registerCommand('snippetExplorer.openSnippet', async (zipItem) => {
		const uri = vscode.Uri.parse(`${snippetScheme}:/Snippet`);
		snippetDocProvider.updateContent(zipItem.content, zipItem.language);

		const doc = await vscode.workspace.openTextDocument(uri);
		// Set language mode if specified
		if (zipItem.language) {
			await vscode.languages.setTextDocumentLanguage(doc, zipItem.language);
		}
		await vscode.window.showTextDocument(doc, {
			preview: true,
			viewColumn: vscode.ViewColumn.One
		});
	});
	context.subscriptions.push(openSnippetCmd);

}

function deactivate() {
	// Optional cleanup logic if needed
}

module.exports = {
	activate,
	deactivate
};
