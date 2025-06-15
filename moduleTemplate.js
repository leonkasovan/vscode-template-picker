// This file is part of the template-picker extension for Visual Studio Code.
// It provides functionality to list top-level directories in ZIP files
// and provide a tree view of installed templates.
// Developed by Dhani Novan (leonkasovan@gmail.com) Jakarta, 30 Mei 2025

const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const vscode = require('vscode');
const JSZip = require('jszip');

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
			return fs.readdir(this.templateDir)
				.then(files => {
					return files
						.filter(file => file.endsWith('.zip'))
						.map(file => {
							const item = new vscode.TreeItem(file, vscode.TreeItemCollapsibleState.Collapsed);
							item.contextValue = 'zipFile';
							item.iconPath = new vscode.ThemeIcon('package');
							item.resourceUri = vscode.Uri.file(path.join(this.templateDir, file));
							// We don't need to set the command here, as it has been set in package.json and item.label = file
							// item.command = {
							// 	command: 'template-picker.shareTemplate',
							// 	title: 'Share Template'
							// };
							return item;
						});
				})
				.catch(err => {
					vscode.window.showErrorMessage(`Error reading templates: ${err.message}`);
					return [];
				});
		}

		const zipPath = element.resourceUri.fsPath;
		try {
			const data = await fs.readFile(zipPath);
			const zip = await JSZip.loadAsync(data);
			const topFolders = new Set();

			for (const filePath in zip.files) {
				const entry = zip.files[filePath];
				if (entry.dir) {
					const segments = entry.name.split('/');
					if (segments.length === 2 && segments[0]) {
						topFolders.add(segments[0]);
					}
				}
			}

			return Array.from(topFolders).map(zipFolder => {
				const item = new vscode.TreeItem(zipFolder, vscode.TreeItemCollapsibleState.None);
				const zipName = element.label;
				item.contextValue = 'zipFolder';
				// item.iconPath = new vscode.ThemeIcon('folder');
				item.iconPath = vscode.ThemeIcon.Folder;
				item.tooltip = `Use this template`;
				item.command = {
					command: 'template-picker.useTemplate',
					title: '',
					arguments: [{ zipName, zipFolder}]
				};
				return item;
			});

		} catch (err) {
			vscode.window.showErrorMessage(`Error reading zip: ${err.message}`);
			return [];
		}
	}
}

/**
* Extract everything under a specific directory inside a zip file.
* @param {string} zipPath - The zip file path (e.g. "templates/lua.zip") 
* @param {string} dirname - The top-level directory to extract (e.g. "[lua]basic")
* @param {string} outputDir - Output Directory
*/
async function extractFirstDirectoryFromZip(zipPath, dirname, outputDir) {
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
        for (const {name, file} of entries) {
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
  
module.exports = { InstalledTemplateProvider, extractFirstDirectoryFromZip, extractDirectoryFromZip, extractFileFromZip };