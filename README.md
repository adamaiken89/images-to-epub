# webp_to_epub

This project converts a folder of `.webp` images into an EPUB file using Python.

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

3. **A folder selection dialog will appear.**
   - Select the folder containing your `.webp` / `.jpg` images.
   - The script will generate an EPUB file in your Downloads folder, named after the selected folder.

## Notes

- The script requires a GUI for the folder selection dialog (Tkinter).
- If you want to run the script without a GUI, you can modify it to hardcode the image directory or accept a command-line argument.

## Output

- The generated EPUB file will be named `<selected_folder>.epub` and saved in your Downloads folder.

---

If you encounter any issues, please ensure all dependencies are installed and your Python version is compatible.
