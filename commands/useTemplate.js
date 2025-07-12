// This file is part of the template-picker extension for Visual Studio Code.
// It provides functionality to extract files from a ZIP archive and create a workspace from templates.
// Developed by Dhani Novan (leonkasovan@gmail.com) Jakarta, 30 Mei 2025

const vscode = require('vscode');
const fs = require('fs').promises;
const path = require('path');
const moduleTemplate = require('../moduleTemplate');
const os = require('os');

function expandVariables(str, variables) {
	return str.replace(/\$\{(\w+)\}/g, (_, name) => variables[name] || '');
}
  
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
	await moduleTemplate.extractFirstDirectoryFromZip(path.join(templatesDir, item.zipName), item.zipFolder, destDir)
		.then(async () => {
			// check file in destination directory, if there is a file named _command.txt, run command on it
			const commandFile = path.join(destDir, '_command.txt');
			if (await fs.stat(commandFile).then(() => true).catch(() => false)) {
				const content = await fs.readFile(commandFile, 'utf8');
				const vars = {
					extensionPath: context.extensionPath,
					platform: os.platform(),
					arch: os.arch(),
					lib_ext: os.platform() === 'win32' ? 'dll' : 'so',
				};

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
								path.join(destDir, cmd.targetDir, path.basename(cmd.srcPath)) :
								path.join(destDir, path.basename(cmd.srcPath));

							if (cmd.type === 'file') {
								await fs.mkdir(path.dirname(targetPath), { recursive: true });	// ensure target path is exists
								await moduleTemplate.extractFileFromZip(cmd.zipPath, cmd.srcPath, targetPath);
								// console.log(`Extracted file: ${cmd.srcPath} to ${targetPath}`);
							} else if (cmd.type === 'dir') {
								await fs.mkdir(targetPath, { recursive: true });	// ensure target path is exists
								await moduleTemplate.extractDirectoryFromZip(cmd.zipPath, cmd.srcPath, targetPath);
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
			} else {
				console.log('${commandFile}	does not exist, skipping execution.');
			}
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
