const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

async function getGitHubZipFiles(owner, repo, repoPath = '') {
	const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}`;

	const res = await fetch(apiUrl, {
		headers: {
			'User-Agent': 'node.js',
			'Accept': 'application/vnd.github.v3+json'
		}
	});

	if (!res.ok) {
		throw new Error(`Failed to fetch directory contents: ${res.status} ${res.statusText}`);
	}

	const files = await res.json();
	return files.filter(f => f.type === 'file' && f.name.endsWith('.zip'));
}

async function downloadFile(url, savePath) {
	const res = await fetch(url, {
		headers: { 'User-Agent': 'node.js' }
	});

	if (!res.ok) {
		throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
	}

	const buffer = await res.arrayBuffer();
	await fs.promises.writeFile(savePath, Buffer.from(buffer));
	// vscode.window.showInformationMessage(`Template ${savePath} downloaded successfully.`);
}


async function downloadTemplate(context, installedViewProvider) {
	const templatesDir = path.join(context.extensionPath, 'templates');
	const owner = 'leonkasovan';
	const repo = 'vscode-templates';
	const zipFiles = await getGitHubZipFiles(owner, repo);
	let nDownloaded = 0;

	for (const file of zipFiles) {
		const localPath = path.join(templatesDir, file.name);
		try {
			await fs.promises.access(localPath);
			console.log(`Skipped (already exists): ${file.name}`);
		} catch {
			await downloadFile(file.download_url, localPath);
			nDownloaded++;
		}
	}

	if (nDownloaded > 0) {
		vscode.window.showInformationMessage(`Downloaded ${nDownloaded} new template(s).`);
		installedViewProvider.refresh();
	} else {
		vscode.window.showInformationMessage('No new templates to download.');
	}
}

module.exports = {
	command: 'template-picker.downloadTemplate',
	handler: (context, installedViewProvider) => () => downloadTemplate(context, installedViewProvider)
};