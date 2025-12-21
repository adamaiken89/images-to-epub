"""UI components for the EPUB generator application."""

import tkinter as tk
import tkinter.font as tkfont
from tkinter import ttk, messagebox


class FolderSelectorUI:
    """Main UI component for folder selection and processing."""

    def __init__(self, root, controller):
        """
        Initialize the UI.

        Args:
            root: Tkinter root window
            controller: Controller instance to handle business logic
        """
        self.root = root
        self.controller = controller
        self.root.title("EPUB Generator - Folder Selector")
        self.root.geometry("800x600")

        self.checkbox_widgets = {}  # {folder_path: (checkbox, var, label, frame, metadata)}
        self.root_checkbox = None  # Root-level checkbox for select all
        self.parent_children_map = {}  # {parent_path: [child_paths]}

        self._setup_ui()
        self._setup_callbacks()

    def _setup_ui(self):
        """Set up all UI components."""
        # Create main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(2, weight=1)

        # Base folder selection
        self._setup_folder_selection(main_frame)

        # Folder tree view
        self._setup_folder_tree(main_frame)

        # Control buttons
        self._setup_control_buttons(main_frame)

        # Status and progress
        self._setup_status_display(main_frame)

    def _setup_folder_selection(self, parent):
        """Set up folder selection UI."""
        ttk.Label(parent, text="Base Folder:").grid(row=0, column=0, sticky=tk.W, pady=5)

        # Create font with underline for folder label (only used when folder is selected)
        default_font = tkfont.nametofont("TkDefaultFont")
        self.underlined_font = tkfont.Font(
            family=default_font.cget("family"),
            size=default_font.cget("size"),
            underline=True
        )

        # Start with normal font (no underline)
        self.folder_label = ttk.Label(parent, text="No folder selected", foreground="gray")
        self.folder_label.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=5)

        # Button frame for Select and Refresh buttons
        button_frame = ttk.Frame(parent)
        button_frame.grid(row=0, column=2, padx=5)

        ttk.Button(button_frame, text="Select Folder", command=self.controller.on_select_base_folder).pack(
            side=tk.LEFT, padx=2
        )

        self.refresh_button = ttk.Button(
            button_frame,
            text="Refresh",
            command=self.controller.on_refresh_folders,
            state="disabled"
        )
        self.refresh_button.pack(side=tk.LEFT, padx=2)

    def _setup_folder_tree(self, parent):
        """Set up scrollable folder tree with checkboxes."""
        tree_frame = ttk.Frame(parent)
        tree_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=10)
        tree_frame.columnconfigure(0, weight=1)
        tree_frame.rowconfigure(0, weight=1)

        # Create canvas with scrollbars
        self.canvas = tk.Canvas(tree_frame, highlightthickness=0)
        v_scrollbar = ttk.Scrollbar(tree_frame, orient="vertical", command=self.canvas.yview)
        h_scrollbar = ttk.Scrollbar(tree_frame, orient="horizontal", command=self.canvas.xview)

        # Scrollable frame inside canvas
        self.scrollable_frame = ttk.Frame(self.canvas)
        canvas_window = self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")

        # Configure scrolling
        def configure_scroll_region(event):
            self.canvas.configure(scrollregion=self.canvas.bbox("all"))

        def configure_canvas_width(event):
            canvas_width = event.width
            self.canvas.itemconfig(canvas_window, width=canvas_width)

        self.scrollable_frame.bind("<Configure>", configure_scroll_region)
        self.canvas.bind("<Configure>", configure_canvas_width)

        # Mouse wheel scrolling (only when over canvas)
        def on_mousewheel(event):
            if event.widget == self.canvas or str(event.widget).startswith(str(self.canvas)):
                self.canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        self.canvas.bind("<Enter>", lambda e: self.canvas.bind_all("<MouseWheel>", on_mousewheel))
        self.canvas.bind("<Leave>", lambda e: self.canvas.unbind_all("<MouseWheel>"))

        # Grid canvas and scrollbars
        self.canvas.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        v_scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        h_scrollbar.grid(row=1, column=0, sticky=(tk.W, tk.E))
        self.canvas.configure(yscrollcommand=v_scrollbar.set, xscrollcommand=h_scrollbar.set)

    def _setup_control_buttons(self, parent):
        """Set up control buttons."""
        button_frame = ttk.Frame(parent)
        button_frame.grid(row=3, column=0, columnspan=3, pady=10)

        self.process_button = ttk.Button(
            button_frame,
            text="Process Selected Folders",
            command=self.controller.on_process_folders,
            state="disabled"
        )
        self.process_button.pack(side=tk.LEFT, padx=5)

    def _setup_status_display(self, parent):
        """Set up status label and progress bar."""
        self.status_label = ttk.Label(
            parent, text="Select a base folder to begin", foreground="gray"
        )
        self.status_label.grid(row=4, column=0, columnspan=3, pady=5)

        self.progress = ttk.Progressbar(parent, mode='indeterminate')
        self.progress.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)

    def _setup_callbacks(self):
        """Set up callbacks for controller to update UI."""
        self.controller.set_ui_callbacks(
            update_folder_label=self.update_folder_label,
            populate_folders=self.populate_folders,
            update_status=self.update_status,
            update_process_button=self.update_process_button,
            update_refresh_button=self.update_refresh_button,
            start_progress=self.start_progress,
            stop_progress=self.stop_progress,
            show_message=self.show_message
        )

    def update_folder_label(self, text, selected=False):
        """Update the folder label text."""
        if selected:
            self.folder_label.config(text=text, foreground="#E8E8E8", font=self.underlined_font)
        else:
            self.folder_label.config(text=text, foreground="gray")

    def populate_folders(self, folders_data, base_dir):
        """
        Populate the folder tree with checkboxes.

        Args:
            folders_data: Dictionary from organize_folders_by_hierarchy
            base_dir: Base directory path
        """
        # Clear existing widgets
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
        self.checkbox_widgets.clear()
        self.parent_children_map.clear()

        # Build parent-child relationships
        self._build_parent_child_map(folders_data)

        # Add root-level checkbox for select all (styled differently)
        root_frame = ttk.Frame(self.scrollable_frame)
        root_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), padx=2, pady=(10, 5))

        # Add subtle background color to distinguish from regular folders
        root_frame.configure(style="RootFrame.TFrame")
        style = ttk.Style()
        style.configure("RootFrame.TFrame", background="#f0f0f0")

        self.root_var = tk.BooleanVar()

        # Create a bold font for "Select All"
        default_font = tkfont.nametofont("TkDefaultFont")
        bold_font = tkfont.Font(
            family=default_font.cget("family"),
            size=default_font.cget("size"),
            weight="bold"
        )

        self.root_checkbox = ttk.Checkbutton(
            root_frame,
            text="   Select All",
            variable=self.root_var,
            command=lambda: self.controller.on_root_checkbox_toggle(self.root_var.get())
        )
        self.root_checkbox.grid(row=0, column=0, sticky=tk.W, padx=(5, 5), pady=3)

        # Apply bold font to the checkbox label
        self.root_checkbox.configure(style="Bold.TCheckbutton")
        style.configure("Bold.TCheckbutton", font=bold_font)

        # Add a separator line below
        separator = ttk.Separator(self.scrollable_frame, orient="horizontal")
        separator.grid(row=1, column=0, sticky=(tk.W, tk.E), padx=2, pady=2)

        # Sort folders by path parts to maintain parent-child hierarchy
        # This ensures children appear immediately after their parents
        sorted_folders = sorted(folders_data.items(), key=lambda x: x[1][0])

        # Build tree structure with actual checkboxes
        # Start at row 2 (row 0 = root checkbox, row 1 = separator)
        row = 2
        for rel_path, (parts, folder_path, metadata) in sorted_folders:
            if not parts:  # Skip root
                continue

            # Calculate indentation based on depth
            depth = len(parts) - 1
            indent = depth * 20  # 20 pixels per level

            # Create frame for this item
            item_frame = ttk.Frame(self.scrollable_frame)
            item_frame.grid(row=row, column=0, sticky=(tk.W, tk.E), padx=2, pady=2)

            # Check if this is a parent folder (has subfolders but no direct images)
            is_parent_folder = metadata['has_subfolders'] and not metadata['has_images']

            # Create label for folder name
            item_text = parts[-1]
            label = ttk.Label(item_frame, text=item_text)

            # Create checkbox for all folders (including parent folders)
            var = tk.BooleanVar()

            if is_parent_folder:
                # Parent folder: checkbox controls all children
                checkbox = ttk.Checkbutton(
                    item_frame,
                    variable=var,
                    command=lambda path=folder_path, var=var: self.controller.on_parent_checkbox_toggle(path, var.get())
                )
            else:
                # Regular folder: checkbox controls just this folder
                checkbox = ttk.Checkbutton(
                    item_frame,
                    variable=var,
                    command=lambda path=folder_path, var=var: self.controller.on_checkbox_toggle(path, var.get())
                )

            checkbox.grid(row=0, column=0, padx=(indent + 5, 5), pady=2)
            label.grid(row=0, column=1, sticky=tk.W, padx=2, pady=2)

            # Make label and frame clickable to toggle checkbox
            def toggle_checkbox(event, cb=checkbox):
                cb.invoke()

            label.bind("<Button-1>", toggle_checkbox)
            item_frame.bind("<Button-1>", toggle_checkbox)

            # Store reference with metadata
            self.checkbox_widgets[folder_path] = (checkbox, var, label, item_frame, metadata)

            row += 1

        # Update canvas scroll region after populating
        self.scrollable_frame.update_idletasks()
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))

    def _build_parent_child_map(self, folders_data):
        """Build a map of parent folders to their child folders."""
        # Create a map of all folders by their path parts
        folders_by_parts = {}
        for rel_path, (parts, folder_path, metadata) in folders_data.items():
            if parts:  # Skip root
                folders_by_parts[tuple(parts)] = (folder_path, metadata)

        # Build parent-child relationships
        for rel_path, (parts, folder_path, metadata) in folders_data.items():
            if not parts or len(parts) == 1:  # Skip root and top-level folders
                continue

            # Find parent
            parent_parts = tuple(parts[:-1])
            if parent_parts in folders_by_parts:
                parent_path, parent_metadata = folders_by_parts[parent_parts]
                if parent_metadata['has_subfolders']:
                    if parent_path not in self.parent_children_map:
                        self.parent_children_map[parent_path] = []
                    self.parent_children_map[parent_path].append(folder_path)

    def update_checkbox_state(self, folder_path, checked):
        """Update checkbox state for a specific folder."""
        if folder_path in self.checkbox_widgets:
            checkbox, var, label, frame, metadata = self.checkbox_widgets[folder_path]
            if checkbox is not None and var is not None:
                var.set(checked)

    def update_root_checkbox(self, checked):
        """Update root checkbox state."""
        if self.root_checkbox and hasattr(self, 'root_var'):
            self.root_var.set(checked)

    def update_all_checkboxes(self, checked):
        """Update all checkboxes to the same state (excluding parent folders)."""
        for folder_path, (checkbox, var, label, frame, metadata) in self.checkbox_widgets.items():
            # Only update if checkbox exists (not a parent folder)
            if checkbox is not None and var is not None:
                var.set(checked)

    def update_status(self, text):
        """Update status label text."""
        self.status_label.config(text=text)

    def update_process_button(self, enabled):
        """Update process button state."""
        self.process_button.config(state="normal" if enabled else "disabled")

    def update_refresh_button(self, enabled):
        """Update refresh button state."""
        self.refresh_button.config(state="normal" if enabled else "disabled")

    def start_progress(self):
        """Start the progress bar."""
        self.progress.start()

    def stop_progress(self):
        """Stop the progress bar."""
        self.progress.stop()

    def show_message(self, title, message, message_type="info"):
        """Show a message dialog."""
        if message_type == "info":
            messagebox.showinfo(title, message)
        elif message_type == "warning":
            messagebox.showwarning(title, message)
        elif message_type == "error":
            messagebox.showerror(title, message)

