// This file is part of the template-picker extension for Visual Studio Code.
// Developed by Dhani Novan (leonkasovan@gmail.com) Jakarta, 30 Mei 2025

async function refreshTemplate(context, installedViewProvider) {
	installedViewProvider.refresh();
}

module.exports = {
	command: 'template-picker.refreshTemplate',
	handler: (context, installedViewProvider) => () => refreshTemplate(context, installedViewProvider)
};
