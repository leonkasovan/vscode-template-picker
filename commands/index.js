const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function registerAllCommands(context, installedViewProvider) {
	const commandsDir = __dirname;

	const files = fs.readdirSync(commandsDir).filter(file =>
		file.endsWith('.js') && file !== 'index.js'
	);

	for (const file of files) {
		const commandModule = require(path.join(commandsDir, file));

		const commandId = commandModule.command;
		const handler = typeof commandModule.handler === 'function'
			? (commandModule.handler.length === 0
				? commandModule.handler
				: commandModule.handler(context, installedViewProvider))
			: () => { };

		const disposable = vscode.commands.registerCommand(commandId, handler);
		context.subscriptions.push(disposable);
	}
}

module.exports = { registerAllCommands };
