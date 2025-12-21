"""Main application entry point."""

import tkinter as tk
from src.controller import EPUBGeneratorController

"""Main entry point for the application."""
def main():
    root = tk.Tk()
    EPUBGeneratorController(root)
    root.mainloop()

if __name__ == "__main__":
    main()

