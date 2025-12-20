# Images to EPUB Converter

This project converts folders of images (`.webp`, `.jpg`, `.jpeg`, `.png`) into EPUB files using Python. It features a graphical user interface that allows you to select multiple folders and process them individually.

## Features

- **Graphical User Interface**: Easy-to-use GUI with directory tree view
- **Multiple Folder Selection**: Select and process multiple folders at once
- **Directory Tree View**: Browse and select folders containing images
- **Individual Processing**: Each selected folder generates its own EPUB file
- **Progress Tracking**: See real-time progress and completion status
- **Dark Mode Support**: UI adapts to dark mode with readable text colors

## Requirements

- Python 3.8+
- [Homebrew](https://brew.sh/) (for macOS, to install Tkinter if needed)

## Setup

1. **Clone or download this repository.**
2. **Open a terminal in the project directory.**
3. **Create a Python virtual environment:**

   ```sh
   python3 -m venv epubenv
   ```

4. **Activate the virtual environment:**

   ```sh
   source epubenv/bin/activate
   ```

5. **Install dependencies:**

   ```sh
   pip install -r requirements.txt
   ```

6. **(macOS only, if you see Tkinter errors):**

   ```sh
   brew install python-tk
   ```

## Usage

1. **Create and Activate the virtual environment (if not already active):**

   ```sh
   python3 -m venv epubenv && source epubenv/bin/activate
   ```

2. **Run the script:**

   ```sh
   python run.py
   ```

3. **Using the GUI:**
   - Click **"Select Folder"** to choose a base directory
   - The directory tree will show all subfolders that contain image files
   - Click on folders in the tree to select/deselect them (selected folders show a ☑ checkbox)
   - Use **"Select All"** or **"Deselect All"** for bulk operations
   - Click **"Process Selected Folders"** to generate EPUB files
   - Each selected folder will be processed individually to create its own EPUB file

## Supported Image Formats

- `.webp`
- `.jpg` / `.jpeg`
- `.png`

## Output

- Each processed folder generates an EPUB file named `<folder_name>.epub`
- EPUB files are saved in your Downloads folder (`~/Downloads`)
- The first image in each folder is used as the cover image

## Notes

- The script requires a GUI (Tkinter) - it cannot run without a graphical interface
- Only folders containing image files will be displayed in the tree
- Images are automatically converted to JPEG format in the EPUB
- Processing runs in a background thread to keep the UI responsive

---

If you encounter any issues, please ensure all dependencies are installed and your Python version is compatible.
