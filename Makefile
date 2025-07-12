# Install:
# sudo npm install -g @vscode/vsce
# npm install

all: shared
	vsce package

shared: shared.zip
	wget https://github.com/leonkasovan/vscode-templates/releases/download/v1.0.0/shared.zip

