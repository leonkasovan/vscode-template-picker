# Create vsix extension
#
# Install:
# sudo npm install -g @vscode/vsce
# npm install

all: publish
	
publish: package
	vsce publish

package: shared.zip
	vsce package

shared.zip:
	wget https://github.com/leonkasovan/vscode-templates/releases/download/v1.0.0/shared.zip

