// This file is part of the template-picker extension for Visual Studio Code.
// It provides functionality to list top-level directories in ZIP files
// and provide a tree view of installed templates.
// Developed by Dhani Novan (leonkasovan@gmail.com) Jakarta, 30 Mei 2025

const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const vscode = require('vscode');
const JSZip = require('jszip');

class SnippetsProvider {
	constructor(snippetDir) {
		this.snippetDir = snippetDir;
		this._onDidChangeTreeData = new vscode.EventEmitter();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
	}

	async getChildren(element) {
		if (!element) {
			const files = await fs.readdir(this.snippetDir);
			return files.filter(f => f.endsWith('.zip')).map(name => {
				const item = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.Collapsed);
				item.resourceUri = vscode.Uri.file(path.join(this.snippetDir, name));
				item.contextValue = 'zip';
				return item;
			});
		} else if (element.contextValue === 'zip') {
			const zipPath = element.resourceUri.fsPath;
			const buffer = await fs.readFile(zipPath);
			const zip = await JSZip.loadAsync(buffer);
			const items = [];

			for (const name in zip.files) {
				const file = zip.files[name];
				if (!file.dir) {
					items.push({
						label: name,
						command: {
							command: 'snippetExplorer.openSnippet',
							arguments: [{
								label: path.basename(name),
								content: await file.async('string'),
								language: guessLangFromExt(name)
							}]
						}
					});
				}
			}

			return items.map(i => {
				const item = new vscode.TreeItem(i.label, vscode.TreeItemCollapsibleState.None);
				item.command = { ...i.command, title: 'Open Snippet' };
				item.iconPath = new vscode.ThemeIcon('file-code');
				item.contextValue = 'file';
				return item;
			});
		}
		return [];
	}

	getTreeItem(element) {
		return element;
	}
}

function guessLangFromExt(filename) {
	const ext = path.extname(filename).toLowerCase();
	return {
		'.lua': 'lua',
		'.js': 'javascript',
		'.ts': 'typescript',
		'.py': 'python',
		'.cpp': 'cpp',
		'.c': 'c',
		'.cs': 'csharp',
		'.java': 'java',
		'.go': 'go',
		'.html': 'html',
		'.css': 'css',
		'.json': 'json'
	}[ext] || 'plaintext';
}

class InstalledTemplateProvider {
	constructor(templateDir) {
		this.templateDir = templateDir;
		// console.log(`constructor this.templateDir: ${this.templateDir}`);
	}

	// Event emitter to notify VS Code about changes in the tree data.
	// This allows the tree view to refresh automatically.
	_onDidChangeTreeData = new vscode.EventEmitter();
	onDidChangeTreeData = this._onDidChangeTreeData.event;

	/**
	 * Refreshes the tree view.
	 */
	refresh() {
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element) {
		return element;
	}

	async getChildren(element) {
		if (!element) {
			try {
				const files = await fs.readdir(this.templateDir);
				return files
					.filter(file => file.endsWith('.zip'))
					.map(file => {
						const item = new vscode.TreeItem(file, vscode.TreeItemCollapsibleState.Collapsed);
						item.contextValue = 'zipFile';
						item.iconPath = new vscode.ThemeIcon('package');
						item.resourceUri = vscode.Uri.file(path.join(this.templateDir, file));
						return item;
					});
			} catch (err) {
				vscode.window.showErrorMessage(`Error reading templates: ${err.message}`);
				return [];
			}
		}

		// Handle child folders inside zip
		const zipPath = element.resourceUri.fsPath;
		try {
			const data = await fs.readFile(zipPath);
			const zip = await JSZip.loadAsync(data, { createFolders: false });

			const topFolders = new Set();

			// Use for...of to avoid loading unnecessary properties
			for (const [filePath, file] of Object.entries(zip.files)) {
				if (file.dir) {
					const idx = file.name.indexOf('/');
					if (idx > 0 && file.name.indexOf('/', idx + 1) === -1) {
						// Only add top-level folders
						topFolders.add(file.name.slice(0, idx));
					}
				}
			}

			return [...topFolders].sort().map(zipFolder => {
				const item = new vscode.TreeItem(zipFolder, vscode.TreeItemCollapsibleState.None);
				item.contextValue = 'zipFolder';
				item.iconPath = vscode.ThemeIcon.Folder;
				item.tooltip = `Use this template`;
				item.command = {
					command: 'template-picker.useTemplate',
					title: '',
					arguments: [{ zipName: element.label, zipFolder }]
				};
				return item;
			});
		} catch (err) {
			vscode.window.showErrorMessage(`Error reading zip: ${err.message}`);
			return [];
		}
	}
}

function expandVariables(str, variables) {
	return str.replace(/\$\{(\w+)\}/g, (_, name) => variables[name] || '');
}

/**
* Extract everything under a specific directory inside a zip file.
* @param {string} zipPath - The zip file path (e.g. "templates/lua.zip") 
* @param {string} dirname - The top-level directory to extract (e.g. "[lua]basic")
* @param {string} outputDir - Output Directory
*/
async function extractFirstDirectoryFromZip(zipPath, dirname, outputDir, vars = {}) {
	const data = await fs.readFile(zipPath);
	const zip = await JSZip.loadAsync(data);

	const prefix = dirname.endsWith('/') ? dirname : dirname + '/';

	for (const entryName of Object.keys(zip.files)) {
		if (entryName.startsWith(prefix)) {
			const entry = zip.files[entryName];

			if (!entry.dir) {
				const relativePath = entryName.slice(prefix.length); // strip prefix
				const targetPath = path.join(outputDir, relativePath);

				await fs.mkdir(path.dirname(targetPath), { recursive: true });
				const content = await entry.async('nodebuffer');
				await fs.writeFile(targetPath, content);
			}
		}
	}

	// check file in destination directory, if there is a file named _command.txt, run command on it
	const commandFile = path.join(outputDir, '_command.txt');
	if (await fs.stat(commandFile).then(() => true).catch(() => false)) {
		const content = await fs.readFile(commandFile, 'utf8');

		// Split into lines and parse each line
		const commands = content
			.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0 && !line.startsWith('#')) // ignore empty and comment lines
			.map(line => {
				const parts = line.split(/\s+/);
				const [command, type, zipPath, srcPath, targetDir] = parts;
				return {
					command,        // 'unzip'
					type,           // 'file' or 'dir'
					zipPath,        // path to zip file (may include variables)
					srcPath,        // path inside zip (for dir) or destination (for file)
					targetDir: parts.length === 5 ? parts[4] : null
				};
			});

		const resolvedCommands = commands.map(cmd => ({
			...cmd,
			zipPath: expandVariables(cmd.zipPath, vars),
			srcPath: expandVariables(cmd.srcPath, vars),
			targetDir: cmd.targetDir ? expandVariables(cmd.targetDir, vars) : null
		}));

		// Change the for loop to be async and await each operation
		for (const cmd of resolvedCommands) {
			try {
				if (cmd.command === 'unzip') {
					const targetPath = cmd.targetDir ?
						path.join(outputDir, cmd.targetDir, path.basename(cmd.srcPath)) :
						path.join(outputDir, path.basename(cmd.srcPath));

					if (cmd.type === 'file') {
						await fs.mkdir(path.dirname(targetPath), { recursive: true });	// ensure target path is exists
						await extractFileFromZip(cmd.zipPath, cmd.srcPath, targetPath);
						// console.log(`Extracted file: ${cmd.srcPath} to ${targetPath}`);
					} else if (cmd.type === 'dir') {
						await fs.mkdir(targetPath, { recursive: true });	// ensure target path is exists
						await extractDirectoryFromZip(cmd.zipPath, cmd.srcPath, targetPath);
						// console.log(`Extracted directory: ${cmd.srcPath} to ${targetPath}`);
					}
				}
			} catch (err) {
				console.log(`Error extracting: ${err.message}`);
			}
		}

		// Wait for command file deletion
		await fs.unlink(commandFile)
			.then(() => console.log(`Deleted command file: ${commandFile}`))
			.catch(err => console.log(`Error deleting command file: ${err.message}`));
	}
}

// Example usage:
// const zipFile = 'shared.zip';
// const zipDir = 'src/cimgui';
// const outputDir = path.join(os.homedir(), 'Project', 'MyNewProject', 'cimgui');
// extractDirectoryFromZip(zipFile, zipDir, outputDir)
// 	.catch(console.error);
async function extractDirectoryFromZip(zipFilePath, zipDirPrefix, outputDir) {
	try {
		const zipBuffer = fsSync.readFileSync(zipFilePath);
		const zip = await JSZip.loadAsync(zipBuffer);

		// Get matching entries
		if (!zipDirPrefix.endsWith('/')) zipDirPrefix += '/';
		const entries = Object.entries(zip.files)
			.filter(([name, file]) => name.startsWith(zipDirPrefix) && !file.dir)
			.map(([name, file]) => ({ name, file }));

		// Process files one by one
		for (const { name, file } of entries) {
			try {
				const relativePath = name.slice(zipDirPrefix.length);
				const destPath = path.join(outputDir, relativePath);
				const dirPath = path.dirname(destPath);
				await fs.mkdir(dirPath, { recursive: true });

				let content;
				try {
					content = await file.async('nodebuffer');
				} catch (extractError) {
					throw new Error(`Extraction failed: ${extractError.message}`);
				}
				if (!content) {
					throw new Error('No content extracted');
				}
				await fsSync.writeFileSync(destPath, content);
			} catch (error) {
				console.error(`[moduleTemplate.js] Failed to extract ${name}:`, error.message);
				continue; // Skip to next file on error
			}
		}
		return true;
	} catch (error) {
		console.error('[moduleTemplate.js] Fatal error:', error.message);
		throw error;
	}
}

// Example usage
// const zipFilePath = 'shared.zip';
// const fileInZip = 'bin/linux/x64/imgui.so';
// const outputPath = path.join(os.homedir(), 'Project', 'MyNewProject', 'imgui.so');
// extractFileFromZip(zipFilePath, fileInZip, outputPath)
// 	.catch(console.error);
async function extractFileFromZip(zipFilePath, internalPath, outputPath) {
	try {
		const data = await fs.readFile(zipFilePath);
		const zip = await JSZip.loadAsync(data);
		const file = zip.file(internalPath);
		if (!file) {
			throw new Error(`File "${internalPath}" not found in ${zipFilePath}`);
		}
		const content = await file.async('nodebuffer');
		await fs.mkdir(path.dirname(outputPath), { recursive: true });
		await fs.writeFile(outputPath, content);
	} catch (err) {
		console.error('Error in extractFileFromZip:', err);
		throw err;
	}
}

module.exports = { InstalledTemplateProvider, extractFirstDirectoryFromZip, extractDirectoryFromZip, extractFileFromZip, SnippetsProvider };