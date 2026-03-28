"""Controller for the EPUB generator application."""

import os
import threading
from src.epub_converter import (
    create_epub_from_folder,
    find_folders_with_images,
    organize_folders_by_hierarchy,
    get_subfolders_with_images,
    pad_image_filenames
)
from src.ui import FolderSelectorUI


class EPUBGeneratorController:
    """Controller that orchestrates business logic and UI."""

    def __init__(self, root):
        """
        Initialize the controller.

        Args:
            root: Tkinter root window
        """
        self.root = root
        # Set base_dir to Downloads folder on startup
        self.base_dir = os.path.expanduser('~/Downloads')
        self.selected_folders = set()
        self.folders_with_images = []  # Folders that directly contain images
        self.ui_callbacks = {}

        # Initialize UI
        self.ui = FolderSelectorUI(root, self)

        # Load folders after UI is initialized and callbacks are set up
        # Use after() to ensure UI is fully ready
        self.root.after(100, self._load_folders)

    def set_ui_callbacks(self, **callbacks):
        """Set UI callback functions."""
        self.ui_callbacks.update(callbacks)

    def on_select_base_folder(self):
        """Handle base folder selection."""
        from tkinter import filedialog
        folder = filedialog.askdirectory(initialdir='~/Downloads', title='Select base folder')

        if folder:
            self.base_dir = folder
            self._load_folders()

    def on_refresh_folders(self):
        """Handle refresh folders action - reload folders from current directory."""
        if self.base_dir:
            self._load_folders()
        else:
            self.ui_callbacks['show_message']("No Folder Selected", "Please select a folder first.", "warning")

    def _load_folders(self):
        """Load and display folders from the current base directory."""
        if not self.base_dir:
            return

        self.ui_callbacks['update_folder_label'](self.base_dir, selected=True)
        self.ui_callbacks['update_refresh_button'](True)

        # Find and organize folders
        folders_with_images, all_folders = find_folders_with_images(self.base_dir)
        self.folders_with_images = folders_with_images
        folders_data = organize_folders_by_hierarchy(all_folders, self.base_dir)

        # Clear current selections when refreshing
        self.selected_folders.clear()

        # Update UI
        self.ui.populate_folders(folders_data, self.base_dir)
        total_folders = len([f for f in all_folders.values() if f['has_images'] or f['has_subfolders']])
        self.ui_callbacks['update_status'](
            f"Found {total_folders} folders. Click folders or checkboxes to select/deselect them individually."
        )
        self._update_selection_status()

    def on_checkbox_toggle(self, folder_path, checked):
        """Handle checkbox toggle."""
        if checked:
            self.selected_folders.add(folder_path)
        else:
            self.selected_folders.discard(folder_path)

        # Update parent checkbox states
        self._update_parent_checkbox_states()
        self._update_selection_status()

    def _update_parent_checkbox_states(self):
        """Update parent folder checkboxes based on their children's selection state."""
        for parent_path, children in self.ui.parent_children_map.items():
            if not children:
                continue

            # Check if all children are selected
            all_children_selected = all(child in self.selected_folders for child in children)

            # Update parent checkbox
            if parent_path in self.ui.checkbox_widgets:
                self.ui.update_checkbox_state(parent_path, all_children_selected)

    def on_root_checkbox_toggle(self, checked):
        """Handle root checkbox toggle (select/deselect all folders)."""
        for folder_path in self.ui.checkbox_widgets.keys():
            if checked:
                self.selected_folders.add(folder_path)
            else:
                self.selected_folders.discard(folder_path)
            self.ui.update_checkbox_state(folder_path, checked)

        self._update_selection_status()

    def on_parent_checkbox_toggle(self, parent_path, checked):
        """Handle parent folder checkbox toggle (select/deselect all children)."""
        # Get all children of this parent
        children = self.ui.parent_children_map.get(parent_path, [])

        # Only select/deselect children, not the parent itself
        for child_path in children:
            if checked:
                self.selected_folders.add(child_path)
            else:
                self.selected_folders.discard(child_path)
            self.ui.update_checkbox_state(child_path, checked)

        # Update root checkbox state based on all selections
        self._update_root_checkbox_state()
        self._update_selection_status()

    def on_process_folders(self):
        """Handle process folders action."""
        if not self.selected_folders:
            self.ui_callbacks['show_message']("No Selection", "Please select at least one folder.", "warning")
            return

        self.ui_callbacks['update_process_button'](False)
        self.ui_callbacks['update_pad_button'](False)
        self.ui_callbacks['start_progress']()

        # Process in a separate thread to keep UI responsive
        thread = threading.Thread(target=self._process_folders_thread)
        thread.daemon = True
        thread.start()

    def _process_folders_thread(self):
        """Process folders in a separate thread."""
        results = []
        # Expand parent folders to their subfolders with images
        folders_to_process = []
        for folder_path in self.selected_folders:
            # Check if this folder directly has images
            if folder_path in self.folders_with_images:
                folders_to_process.append(folder_path)
            else:
                # It's a parent folder, get all subfolders with images
                subfolders = get_subfolders_with_images(folder_path, self.folders_with_images)
                folders_to_process.extend(subfolders)

        total = len(folders_to_process)

        for idx, folder_path in enumerate(folders_to_process, 1):
            folder_name = os.path.basename(folder_path)
            self.root.after(0, lambda f=folder_name, i=idx, t=total:
                          self.ui_callbacks['update_status'](f"Processing {f} ({i}/{t})..."))

            success, message = create_epub_from_folder(folder_path)
            results.append((folder_path, success, message))

        # Update UI on main thread
        self.root.after(0, self._processing_complete, results)

    def _processing_complete(self, results):
        """Handle completion of processing."""
        self.ui_callbacks['stop_progress']()

        success_count = sum(1 for _, success, _ in results if success)
        fail_count = len(results) - success_count

        # Build result message
        result_text = f"Processing complete!\n\n"
        result_text += f"Success: {success_count}\n"
        result_text += f"Failed: {fail_count}\n\n"

        if fail_count > 0:
            result_text += "Failed folders:\n"
            for folder_path, success, message in results:
                if not success:
                    folder_name = os.path.basename(folder_path)
                    result_text += f"  - {folder_name}: {message}\n"

        self.ui_callbacks['show_message']("Processing Complete", result_text)
        self.ui_callbacks['update_status'](
            f"Completed: {success_count} successful, {fail_count} failed"
        )
        has_selection = len(self.selected_folders) > 0
        self.ui_callbacks['update_process_button'](has_selection)
        self.ui_callbacks['update_pad_button'](has_selection)

    def on_pad_filenames(self):
        """Handle pad filenames action."""
        if not self.selected_folders:
            self.ui_callbacks['show_message']("No Selection", "Please select at least one folder.", "warning")
            return

        self.ui_callbacks['update_process_button'](False)
        self.ui_callbacks['update_pad_button'](False)
        self.ui_callbacks['start_progress']()

        thread = threading.Thread(target=self._pad_filenames_thread)
        thread.daemon = True
        thread.start()

    def _pad_filenames_thread(self):
        """Pad filenames in a separate thread."""
        results = []
        folders_to_process = []
        for folder_path in self.selected_folders:
            if folder_path in self.folders_with_images:
                folders_to_process.append(folder_path)
            else:
                subfolders = get_subfolders_with_images(folder_path, self.folders_with_images)
                folders_to_process.extend(subfolders)

        total = len(folders_to_process)

        for idx, folder_path in enumerate(folders_to_process, 1):
            folder_name = os.path.basename(folder_path)
            self.root.after(0, lambda f=folder_name, i=idx, t=total:
                          self.ui_callbacks['update_status'](f"Padding {f} ({i}/{t})..."))

            success, message = pad_image_filenames(folder_path)
            results.append((folder_path, success, message))

        self.root.after(0, self._padding_complete, results)

    def _padding_complete(self, results):
        """Handle completion of filename padding."""
        self.ui_callbacks['stop_progress']()

        success_count = sum(1 for _, success, _ in results if success)
        fail_count = len(results) - success_count

        result_text = f"Padding complete!\n\n"
        result_text += f"Success: {success_count}\n"
        result_text += f"Failed: {fail_count}\n\n"

        if fail_count > 0:
            result_text += "Failed folders:\n"
            for folder_path, success, message in results:
                if not success:
                    folder_name = os.path.basename(folder_path)
                    result_text += f"  - {folder_name}: {message}\n"

        self.ui_callbacks['show_message']("Padding Complete", result_text)
        self.ui_callbacks['update_status'](
            f"Padding done: {success_count} successful, {fail_count} failed"
        )
        has_selection = len(self.selected_folders) > 0
        self.ui_callbacks['update_process_button'](has_selection)
        self.ui_callbacks['update_pad_button'](has_selection)

    def _update_selection_status(self):
        """Update selection status in UI."""
        if self.selected_folders:
            self.ui_callbacks['update_process_button'](True)
            self.ui_callbacks['update_pad_button'](True)
            self.ui_callbacks['update_status'](
                f"{len(self.selected_folders)} folder(s) selected - Click folders or checkboxes to select/deselect"
            )
        else:
            self.ui_callbacks['update_process_button'](False)
            self.ui_callbacks['update_pad_button'](False)
            self.ui_callbacks['update_status']("No folders selected - Click folders or checkboxes to select")

        # Update root checkbox state
        self._update_root_checkbox_state()

    def _update_root_checkbox_state(self):
        """Update root checkbox to reflect current selection state."""
        # Check if all folders are selected
        all_folders = set(self.ui.checkbox_widgets.keys())
        all_selected = all_folders.issubset(self.selected_folders) and len(all_folders) > 0

        if hasattr(self.ui, 'root_var'):
            self.ui.update_root_checkbox(all_selected)

