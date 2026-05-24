"""UI components for the EPUB generator application."""

import os
import tkinter as tk
import tkinter.font as tkfont
from tkinter import ttk, messagebox
from pathlib import Path


class FolderSelectorUI:
    """Main UI component for folder selection and processing."""

    def __init__(self, root, controller):
        self.root = root
        self.controller = controller
        self.root.title("EPUB Generator - Folder Selector")
        self.root.geometry("800x600")

        self.checkbox_widgets = {}       # {folder_path: (checkbox, var, label, frame, metadata)}
        self.zip_checkbox_widgets = {}   # {zip_path: (checkbox, var, label, frame)}
        self.root_checkbox = None
        self.parent_children_map = {}    # {parent_path: [child_folder_paths]}
        self.parent_zip_children_map = {}  # {parent_path: [child_zip_paths]}

        self._setup_ui()
        self._setup_callbacks()

    # ── UI setup ─────────────────────────────────────────────────────

    def _setup_ui(self):
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(2, weight=1)

        self._setup_folder_selection(main_frame)
        self._setup_folder_tree(main_frame)
        self._setup_control_buttons(main_frame)
        self._setup_status_display(main_frame)

    def _setup_folder_selection(self, parent):
        ttk.Label(parent, text="Base Folder:").grid(row=0, column=0, sticky=tk.W, pady=5)

        default_font = tkfont.nametofont("TkDefaultFont")
        self.underlined_font = tkfont.Font(
            family=default_font.cget("family"),
            size=default_font.cget("size"),
            underline=True
        )

        self.folder_label = ttk.Label(parent, text="No folder selected", foreground="gray")
        self.folder_label.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=5)

        button_frame = ttk.Frame(parent)
        button_frame.grid(row=0, column=2, padx=5)

        ttk.Button(button_frame, text="Select Folder", command=self.controller.on_select_base_folder).pack(
            side=tk.LEFT, padx=2
        )

        self.refresh_button = ttk.Button(
            button_frame, text="Refresh",
            command=self.controller.on_refresh_folders, state="disabled"
        )
        self.refresh_button.pack(side=tk.LEFT, padx=2)

    def _setup_folder_tree(self, parent):
        tree_frame = ttk.Frame(parent)
        tree_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=10)
        tree_frame.columnconfigure(0, weight=1)
        tree_frame.rowconfigure(0, weight=1)

        self.canvas = tk.Canvas(tree_frame, highlightthickness=0)
        v_scrollbar = ttk.Scrollbar(tree_frame, orient="vertical", command=self.canvas.yview)
        h_scrollbar = ttk.Scrollbar(tree_frame, orient="horizontal", command=self.canvas.xview)

        self.scrollable_frame = ttk.Frame(self.canvas)
        canvas_window = self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")

        def configure_scroll_region(event):
            self.canvas.configure(scrollregion=self.canvas.bbox("all"))

        def configure_canvas_width(event):
            self.canvas.itemconfig(canvas_window, width=event.width)

        self.scrollable_frame.bind("<Configure>", configure_scroll_region)
        self.canvas.bind("<Configure>", configure_canvas_width)

        def on_mousewheel(event):
            if event.widget == self.canvas or str(event.widget).startswith(str(self.canvas)):
                self.canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        self.canvas.bind("<Enter>", lambda e: self.canvas.bind_all("<MouseWheel>", on_mousewheel))
        self.canvas.bind("<Leave>", lambda e: self.canvas.unbind_all("<MouseWheel>"))

        self.canvas.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        v_scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        h_scrollbar.grid(row=1, column=0, sticky=(tk.W, tk.E))
        self.canvas.configure(yscrollcommand=v_scrollbar.set, xscrollcommand=h_scrollbar.set)

    def _setup_control_buttons(self, parent):
        button_frame = ttk.Frame(parent)
        button_frame.grid(row=3, column=0, columnspan=3, pady=10)

        self.unzip_button = ttk.Button(
            button_frame, text="Unzip Selected",
            command=self.controller.on_unzip_files, state="disabled"
        )
        self.unzip_button.pack(side=tk.LEFT, padx=5)

        self.pad_button = ttk.Button(
            button_frame, text="Pad Filenames",
            command=self.controller.on_pad_filenames, state="disabled"
        )
        self.pad_button.pack(side=tk.LEFT, padx=5)

        self.process_button = ttk.Button(
            button_frame, text="Process Selected Folders",
            command=self.controller.on_process_folders, state="disabled"
        )
        self.process_button.pack(side=tk.LEFT, padx=5)

    def _setup_status_display(self, parent):
        self.status_label = ttk.Label(parent, text="Select a base folder to begin", foreground="gray")
        self.status_label.grid(row=4, column=0, columnspan=3, pady=5)

        self.progress = ttk.Progressbar(parent, mode='indeterminate')
        self.progress.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)

    def _setup_callbacks(self):
        self.controller.set_ui_callbacks(
            update_folder_label=self.update_folder_label,
            populate_folders=self.populate_folders,
            update_status=self.update_status,
            update_process_button=self.update_process_button,
            update_pad_button=self.update_pad_button,
            update_unzip_button=self.update_unzip_button,
            update_refresh_button=self.update_refresh_button,
            start_progress=self.start_progress,
            stop_progress=self.stop_progress,
            show_message=self.show_message
        )

    # ── Populate tree ────────────────────────────────────────────────

    def populate_folders(self, folders_data, base_dir, zip_files=None):
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
        self.checkbox_widgets.clear()
        self.zip_checkbox_widgets.clear()
        self.parent_children_map.clear()
        self.parent_zip_children_map.clear()

        self._build_parent_child_map(folders_data)

        # Build a combined list of (parts, path, metadata) for interleaved rendering.
        # Folder entries come from folders_data; zip entries are synthesised.
        all_entries = []
        for rel_path, (parts, folder_path, metadata) in folders_data.items():
            if not parts:
                continue
            all_entries.append((parts, folder_path, metadata))

        zip_files = zip_files or []
        for zip_path in zip_files:
            rel = os.path.relpath(zip_path, base_dir)
            parts = Path(rel).parts
            all_entries.append((parts, zip_path, {'is_zip': True}))

        all_entries.sort(key=lambda x: x[0])

        # Build zip parent-child map and resolve parent-folder status
        folders_by_parts = {}
        for rel_path, (parts, folder_path, metadata) in folders_data.items():
            if parts:
                folders_by_parts[tuple(parts)] = (folder_path, metadata)

        for zip_path in zip_files:
            rel = os.path.relpath(zip_path, base_dir)
            parts = Path(rel).parts
            if len(parts) > 1:
                parent_parts = tuple(parts[:-1])
                if parent_parts in folders_by_parts:
                    parent_path, parent_meta = folders_by_parts[parent_parts]
                    is_parent = (
                        (parent_meta.get('has_subfolders') or parent_meta.get('has_zips'))
                        and not parent_meta.get('has_images')
                    )
                    if is_parent:
                        self.parent_zip_children_map.setdefault(parent_path, []).append(zip_path)

        # ── Root "Select All" checkbox ───────────────────────────────
        root_frame = ttk.Frame(self.scrollable_frame)
        root_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), padx=2, pady=(10, 5))

        style = ttk.Style()
        style.configure("RootFrame.TFrame", background="#f0f0f0")
        root_frame.configure(style="RootFrame.TFrame")

        self.root_var = tk.BooleanVar()

        default_font = tkfont.nametofont("TkDefaultFont")
        bold_font = tkfont.Font(
            family=default_font.cget("family"),
            size=default_font.cget("size"),
            weight="bold"
        )

        self.root_checkbox = ttk.Checkbutton(
            root_frame, text="   Select All", variable=self.root_var,
            command=lambda: self.controller.on_root_checkbox_toggle(self.root_var.get())
        )
        self.root_checkbox.grid(row=0, column=0, sticky=tk.W, padx=(5, 5), pady=3)
        style.configure("Bold.TCheckbutton", font=bold_font)
        self.root_checkbox.configure(style="Bold.TCheckbutton")

        separator = ttk.Separator(self.scrollable_frame, orient="horizontal")
        separator.grid(row=1, column=0, sticky=(tk.W, tk.E), padx=2, pady=2)

        # ── Render entries ───────────────────────────────────────────
        row = 2
        for parts, item_path, metadata in all_entries:
            depth = len(parts) - 1
            indent = depth * 20

            item_frame = ttk.Frame(self.scrollable_frame)
            item_frame.grid(row=row, column=0, sticky=(tk.W, tk.E), padx=2, pady=2)

            if metadata.get('is_zip'):
                self._render_zip_entry(item_frame, item_path, parts, indent)
            else:
                self._render_folder_entry(item_frame, item_path, parts, indent, metadata)

            row += 1

        self.scrollable_frame.update_idletasks()
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))

    def _render_folder_entry(self, item_frame, folder_path, parts, indent, metadata):
        is_parent_folder = (
            (metadata.get('has_subfolders') or metadata.get('has_zips'))
            and not metadata.get('has_images')
        )

        item_text = parts[-1]
        label = ttk.Label(item_frame, text=item_text)
        var = tk.BooleanVar()

        if is_parent_folder:
            checkbox = ttk.Checkbutton(
                item_frame, variable=var,
                command=lambda p=folder_path, v=var: self.controller.on_parent_checkbox_toggle(p, v.get())
            )
        else:
            checkbox = ttk.Checkbutton(
                item_frame, variable=var,
                command=lambda p=folder_path, v=var: self.controller.on_checkbox_toggle(p, v.get())
            )

        checkbox.grid(row=0, column=0, padx=(indent + 5, 5), pady=2)
        label.grid(row=0, column=1, sticky=tk.W, padx=2, pady=2)

        def toggle_checkbox(event, cb=checkbox):
            cb.invoke()
        label.bind("<Button-1>", toggle_checkbox)
        item_frame.bind("<Button-1>", toggle_checkbox)

        self.checkbox_widgets[folder_path] = (checkbox, var, label, item_frame, metadata)

    def _render_zip_entry(self, item_frame, zip_path, parts, indent):
        item_text = "\U0001F4E6 " + parts[-1]  # 📦 prefix
        label = ttk.Label(item_frame, text=item_text, foreground="#888888")
        var = tk.BooleanVar()

        checkbox = ttk.Checkbutton(
            item_frame, variable=var,
            command=lambda p=zip_path, v=var: self.controller.on_zip_checkbox_toggle(p, v.get())
        )

        checkbox.grid(row=0, column=0, padx=(indent + 5, 5), pady=2)
        label.grid(row=0, column=1, sticky=tk.W, padx=2, pady=2)

        def toggle_checkbox(event, cb=checkbox):
            cb.invoke()
        label.bind("<Button-1>", toggle_checkbox)
        item_frame.bind("<Button-1>", toggle_checkbox)

        self.zip_checkbox_widgets[zip_path] = (checkbox, var, label, item_frame)

    # ── Build parent-child maps ──────────────────────────────────────

    def _build_parent_child_map(self, folders_data):
        folders_by_parts = {}
        for rel_path, (parts, folder_path, metadata) in folders_data.items():
            if parts:
                folders_by_parts[tuple(parts)] = (folder_path, metadata)

        for rel_path, (parts, folder_path, metadata) in folders_data.items():
            if not parts or len(parts) == 1:
                continue
            parent_parts = tuple(parts[:-1])
            if parent_parts in folders_by_parts:
                parent_path, parent_metadata = folders_by_parts[parent_parts]
                if parent_metadata.get('has_subfolders') or parent_metadata.get('has_zips'):
                    self.parent_children_map.setdefault(parent_path, []).append(folder_path)

    # ── State updates ────────────────────────────────────────────────

    def update_checkbox_state(self, folder_path, checked):
        if folder_path in self.checkbox_widgets:
            _, var, _, _, _ = self.checkbox_widgets[folder_path]
            if var is not None:
                var.set(checked)

    def update_zip_checkbox_state(self, zip_path, checked):
        if zip_path in self.zip_checkbox_widgets:
            _, var, _, _ = self.zip_checkbox_widgets[zip_path]
            if var is not None:
                var.set(checked)

    def update_root_checkbox(self, checked):
        if self.root_checkbox and hasattr(self, 'root_var'):
            self.root_var.set(checked)

    def update_all_checkboxes(self, checked):
        for _, (_, var, _, _, _) in self.checkbox_widgets.items():
            if var is not None:
                var.set(checked)

    def update_folder_label(self, text, selected=False):
        if selected:
            self.folder_label.config(text=text, foreground="#E8E8E8", font=self.underlined_font)
        else:
            self.folder_label.config(text=text, foreground="gray")

    def update_status(self, text):
        self.status_label.config(text=text)

    def update_process_button(self, enabled):
        self.process_button.config(state="normal" if enabled else "disabled")

    def update_pad_button(self, enabled):
        self.pad_button.config(state="normal" if enabled else "disabled")

    def update_unzip_button(self, enabled):
        self.unzip_button.config(state="normal" if enabled else "disabled")

    def update_refresh_button(self, enabled):
        self.refresh_button.config(state="normal" if enabled else "disabled")

    def start_progress(self):
        self.progress.start()

    def stop_progress(self):
        self.progress.stop()

    def show_message(self, title, message, message_type="info"):
        if message_type == "info":
            messagebox.showinfo(title, message)
        elif message_type == "warning":
            messagebox.showwarning(title, message)
        elif message_type == "error":
            messagebox.showerror(title, message)
