// This file is part of the template-picker extension for Visual Studio Code.
// It provides functionality to extract files from a ZIP archive and create a workspace from templates.
// Developed by Dhani Novan (leonkasovan@gmail.com) Jakarta, 30 Mei 2025

const vscode = require('vscode');
const fs = require('fs').promises;
const path = require('path');
const JSZip = require('jszip');
const moduleTemplate = require('../moduleTemplate');

const contentToZipMap = new Map(); // Global map: content string => zip file name

/**
 * List top-level directories in each zip file in the "templates" directory.
 * @returns {Promise<string[]>} Array of unique directory names like "[lua]basic", "[cpp]simple"
 */
async function listTemplates(templatesDir) {
	const files = await fs.readdir(templatesDir);
	const dirSet = new Set();

	for (const file of files) {
		if (path.extname(file) === '.zip') {
			const zipPath = path.join(templatesDir, file);
			const data = await fs.readFile(zipPath);
			const zip = await JSZip.loadAsync(data);

			Object.keys(zip.files).forEach(entryName => {
				// Skip directories
				if (entryName.endsWith('/')) {
					const parts = entryName.split('/');
					if (parts.length >= 2) {
						const dir = parts[0];
						dirSet.add(dir);
						contentToZipMap.set(dir, file); // Map "[lua]basic" => "lua.zip"
						// console.log(`${entryName} "${dir}" ${file}`);
					}
				}
			});
		}
	}

	return Array.from(dirSet);
}

/**
 * Returns an array of unique top-level prefixes or untagged items,
 * or, if a filter tag(s) is provided, returns unique tags/content
 * for items that match the filter.
 *
 * When a filter is provided, returns the next tag (in square brackets)
 * or the untagged content after the filter sequence.
 *
 * @param source - The array of source strings.
 * @param filter - Optional. A tag string or array of tag strings.
 * @returns The filtered and mapped output array.
 */
function extractUniquePrefixes(source, filter) {
	// Parse filter if it's a string of concatenated tags
	let filters = undefined;
	if (filter) {
		if (Array.isArray(filter)) {
			filters = filter;
		}
		else {
			filters = filter.match(/\[[^\]]+\]/g) || [];
		}
		const result = [];
		const seen = new Set();
		// Pattern to match the filter tags at the start
		const filterPattern = '^' + filters.map(f => f.replace(/[[\]]/g, m => '\\' + m)).join('');
		const regex = new RegExp(filterPattern);
		for (const line of source) {
			const match = line.match(regex);
			if (match) {
				// Remainder after the filter tags
				const rest = line.slice(match[0].length);
				// Try to extract the next tag, or use remaining as untagged content
				const tagMatch = rest.match(/^\[([^\]]+)\]/);
				if (tagMatch) {
					const tag = `[${tagMatch[1]}]`;
					if (!seen.has(tag)) {
						seen.add(tag);
						result.push(tag);
					}
				}
				else {
					// No more tags, just content
					if (rest && !seen.has(rest)) {
						seen.add(rest);
						result.push(rest);
					}
				}
			}
		}
		return result;
	}
	else {
		// original behavior: collect unique top-level prefixes and untagged lines
		const prefixSet = new Set();
		const untagged = [];
		for (const line of source) {
			const prefixMatch = line.match(/^(\[[^\]]+\])+/);
			if (prefixMatch) {
				const firstPrefixMatch = line.match(/^\[[^\]]+\]/);
				if (firstPrefixMatch) {
					prefixSet.add(firstPrefixMatch[0]);
				}
			}
			else {
				untagged.push(line);
			}
		}
		return Array.from(prefixSet).concat(untagged);
	}
}

async function createWorkspaceFromTemplate(context) {
	let filter = "";
	let entries = [];
	let selected = null;
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
	const templates = await listTemplates(templatesDir);
	if (templates.length === 0) {
		vscode.window.showInformationMessage('No templates found.');
		return;
	}

	do {
		entries = extractUniquePrefixes(templates, filter);
		selected = await vscode.window.showQuickPick(entries, {
			placeHolder: 'Select template to create a workspace from'
		});

		if (selected && selected.startsWith('[')) {
			filter = filter + selected;
		}
	} while (selected && selected.startsWith('[')); // if selected is a tag, continue to next prompt
	if (!selected || selected.length === 0) return;

	let projectName = await vscode.window.showInputBox({
		prompt: 'Enter project name',
		value: 'MyProject'
	});
	if (!projectName || projectName.length === 0) return;

	let destDir = path.join(projectDir, projectName);
	let dirname = `${filter}${selected}`;
	let zipname = contentToZipMap.get(dirname);
	if (!zipname) {
		vscode.window.showErrorMessage(`No zip file found for template "${dirname}"`);
		return;
	}
	moduleTemplate.extractDirFromZip(path.join(templatesDir, zipname), dirname, destDir)
		.then(() => vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(destDir), false))
		.catch(console.error);
}

module.exports = {
	command: 'template-picker.createWorkspaceFromTemplate',
	handler: (context) => () => createWorkspaceFromTemplate(context)
};
