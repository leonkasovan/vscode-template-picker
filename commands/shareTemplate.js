// This file is part of the template-picker extension for Visual Studio Code.
// This file provides functionality to upload files to a public GitHub repository.
// It checks if a file with the same name already exists in the repository,
// and if so, it increments the filename until an available name is found.
// It uses the GitHub API to upload files and requires a personal access token for authentication.
// Developed by Dhani Novan (leonkasovan@gmail.com) Jakarta, 30 Mei 2025

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

async function fileExistsInRepo(owner, repo, repoPath, token) {
	const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}`;

	const response = await fetch(apiUrl, {
		headers: {
			'Authorization': `Bearer ${token}`,
			'User-Agent': 'node.js',
			'Accept': 'application/vnd.github.v3+json'
		}
	});

	return response.ok;
}

function incrementFilename(filename) {
	const ext = path.extname(filename);         // e.g., '.zip'
	const base = path.basename(filename, ext);  // e.g., 'lua' or 'lua1'

	const match = base.match(/^(.*?)(\d+)$/);
	if (match) {
		const prefix = match[1];
		const number = parseInt(match[2], 10) + 1;
		return `${prefix}${number}${ext}`;
	} else {
		return `${base}1${ext}`;
	}
}

async function findAvailableFilename(owner, repo, desiredPath, token) {
	let attempt = desiredPath;
	while (await fileExistsInRepo(owner, repo, attempt, token)) {
		attempt = incrementFilename(attempt);
	}
	return attempt;
}

async function uploadFileToPublicRepo(owner, repo, desiredRepoPath, localFilePath, token, commitMessage) {
	const repoPath = await findAvailableFilename(owner, repo, desiredRepoPath, token);

	const contentBuffer = await fs.promises.readFile(localFilePath);
	const contentBase64 = contentBuffer.toString('base64');
	const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}`;

	const response = await fetch(apiUrl, {
		method: 'PUT',
		headers: {
			'Authorization': `Bearer ${token}`,
			'User-Agent': 'node.js',
			'Accept': 'application/vnd.github.v3+json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			message: `${commitMessage} (${desiredRepoPath})`,
			content: contentBase64
		})
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Upload failed: ${response.status} ${response.statusText}\n${errText}`);
	}

	// const result = await response.json();
	if (desiredRepoPath !== repoPath) {
		return `File ${desiredRepoPath} uploaded as ${repoPath} successfully`;
	} else {
		return `File ${desiredRepoPath} uploaded successfully`;
	}
}

const owner = 'leonkasovan';
const repo = 'vscode-templates';

function decrypt(encoded) {
	const text = atob(encoded); // Decode Base64
	let result = '';
	for (let i = 0; i < text.length; i++) {
		const charCode = text.charCodeAt(i) ^ owner.charCodeAt(i % owner.length);
		result += String.fromCharCode(charCode);
	}
	return result;
}

async function shareTemplate(context, item) {
	if (!item || !item.label) {
		console.error('Invalid item provided to shareTemplate');
		return;
	}
	vscode.window.showInformationMessage(`Uploading template: ${item.label} to ${owner}/${repo} repository ...`);
	const templatesDir = path.join(context.extensionPath, 'templates');
	uploadFileToPublicRepo(owner, repo, item.label, path.join(templatesDir, item.label), decrypt('CwwbBh4DLB8XFTFdVC5cICI8LCdROSUCPioeADIsJjgkM1Q2KB8MQgMmDgA4Eis5LgsdOTFVXSAtDB0xDycHDzheWDcNHlhTBhpHFhovIyU0ITY+Ij1TPxwOXSVf'), 'Upload via vscode extension')
		.then(msg => vscode.window.showInformationMessage(msg))
		.catch(err => console.error('Error uploading file:', err));
}

module.exports = {
	command: 'template-picker.shareTemplate',
	handler: (context) => (item) => shareTemplate(context, item)
};
