# Template Picker

Create new workspace from selected template.
It will help you quickly scaffold new projects in Visual Studio Code using ready-made templates.  
Even you can make your own templates and share it for others.

## Included Templates
![glfw](images/glfw.png)
![opengl](images/opengl.png)
![love2d](images/love2d.png)
![python](images/python.png)
![sdl](images/sdl.png)
![sfml](images/sfml.jpg)  
and more to come ...

## Usage
In sidebar just pick a template to use  
![feature 1](images/feature-1.png)  
  
Ctrl+Shift+P and type Template Picker  
![feature 2](images/feature-2.png)  

## Features
- Browse and manage installed project templates from the Templates activity bar.
- Download new templates from a remote repository (GitHub).
- Create a new workspace from a selected template.
- Create new template from current workspace.
- Share or delete installed templates.
- Refresh the list of installed templates.

## Requirements
- Visual Studio Code v1.90.0 or newer.
- Internet connection required to download templates from GitHub (optional).

## Extension Settings

This extension contributes the following settings:

- `template-picker.projectDirectory`: Default directory where new projects will be created. Leave empty to prompt every time.

## Commands

- **Template Picker: Download Template**  
  Download new templates from the remote repository.
- **Template Picker: Refresh Template**  
  Refresh the list of installed templates.
- **Template Picker: Use Template**  
  Create a new project from a selected template.
- **Template Picker: Share Template**  
  Share a template.
- **Template Picker: Delete Template**  
  Delete a template.
- **Template Picker: Create Workspace from Template**  
  Create a new workspace from a template.
- **Template Picker: Create New Template From Current Workspace**  
  Create new template from current workspace.

## Creating Custom Templates
Create workspace then rename the folder name using tags 
```
[language][library1_used][library2_used]This is my template using library1 and library2 

Example:
[cpp][sdl2][imgui]Basic usage of imgui
[love]Template for animation
[go][glfw][opengl] Basic shader
```
Zip the folder and copy the zip to template folder.  
![Action Button](images/feature-3.png)  
![template folder](images/feature-4.png)

## Release Notes

### 1.1.0

- Add: Create new template from current workspace.

### 1.0.0

- Initial release with template management, download, and workspace creation features.

---

**Enjoy using Template Picker!**