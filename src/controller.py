"""Controller for the EPUB generator application."""

import os
import threading
from src.epub_converter import (
    create_epub_from_folder,
    find_folders_with_images,
    find_zip_files,
    organize_folders_by_hierarchy,
    get_subfolders_with_images,
    pad_image_filenames,
    unzip_file
)
from src.ui import FolderSelectorUI


class EPUBGeneratorController:
    """Controller that orchestrates business logic and UI."""

    def __init__(self, root):
        self.root = root
        self.base_dir = os.path.expanduser('~/Downloads')
        self.selected_folders = set()
        self.selected_zips = set()
        self.folders_with_images = []
        self.zip_files = []
        self.ui_callbacks = {}

        self.ui = FolderSelectorUI(root, self)
        self.root.after(100, self._load_folders)

    def set_ui_callbacks(self, **callbacks):
        """Set UI callback functions."""
        self.ui_callbacks.update(callbacks)

    # ── Folder selection ─────────────────────────────────────────────

    def on_select_base_folder(self):
        from tkinter import filedialog
        folder = filedialog.askdirectory(initialdir='~/Downloads', title='Select base folder')
        if folder:
            self.base_dir = folder
            self._load_folders()

    def on_refresh_folders(self):
        if self.base_dir:
            self._load_folders()
        else:
            self.ui_callbacks['show_message']("No Folder Selected", "Please select a folder first.", "warning")

    def _load_folders(self):
        if not self.base_dir:
            return

        self.ui_callbacks['update_folder_label'](self.base_dir, selected=True)
        self.ui_callbacks['update_refresh_button'](True)

        folders_with_images, all_folders = find_folders_with_images(self.base_dir)
        self.folders_with_images = folders_with_images

        self.zip_files = find_zip_files(self.base_dir)

        folders_data = organize_folders_by_hierarchy(all_folders, self.base_dir)

        self.selected_folders.clear()
        self.selected_zips.clear()

        self.ui.populate_folders(folders_data, self.base_dir, self.zip_files)

        total_folders = len([f for f in all_folders.values()
                             if f['has_images'] or f['has_subfolders'] or f.get('has_zips')])
        self.ui_callbacks['update_status'](
            f"Found {total_folders} folders, {len(self.zip_files)} zip(s). "
            "Click items or checkboxes to select/deselect."
        )
        self._update_selection_status()

    # ── Checkbox toggles ─────────────────────────────────────────────

    def on_checkbox_toggle(self, folder_path, checked):
        if checked:
            self.selected_folders.add(folder_path)
        else:
            self.selected_folders.discard(folder_path)
        self._update_parent_checkbox_states()
        self._update_selection_status()

    def on_zip_checkbox_toggle(self, zip_path, checked):
        if checked:
            self.selected_zips.add(zip_path)
        else:
            self.selected_zips.discard(zip_path)
        self._update_parent_checkbox_states()
        self._update_selection_status()

    def _update_parent_checkbox_states(self):
        all_parents = set(self.ui.parent_children_map.keys()) | set(self.ui.parent_zip_children_map.keys())
        for parent_path in all_parents:
            folder_children = self.ui.parent_children_map.get(parent_path, [])
            zip_children = self.ui.parent_zip_children_map.get(parent_path, [])
            if not folder_children and not zip_children:
                continue
            all_selected = (
                all(c in self.selected_folders for c in folder_children)
                and all(z in self.selected_zips for z in zip_children)
            )
            if parent_path in self.ui.checkbox_widgets:
                self.ui.update_checkbox_state(parent_path, all_selected)

    def on_root_checkbox_toggle(self, checked):
        for folder_path in self.ui.checkbox_widgets.keys():
            if checked:
                self.selected_folders.add(folder_path)
            else:
                self.selected_folders.discard(folder_path)
            self.ui.update_checkbox_state(folder_path, checked)

        for zip_path in self.ui.zip_checkbox_widgets.keys():
            if checked:
                self.selected_zips.add(zip_path)
            else:
                self.selected_zips.discard(zip_path)
            self.ui.update_zip_checkbox_state(zip_path, checked)

        self._update_selection_status()

    def on_parent_checkbox_toggle(self, parent_path, checked):
        for child_path in self.ui.parent_children_map.get(parent_path, []):
            if checked:
                self.selected_folders.add(child_path)
            else:
                self.selected_folders.discard(child_path)
            self.ui.update_checkbox_state(child_path, checked)

        for zip_path in self.ui.parent_zip_children_map.get(parent_path, []):
            if checked:
                self.selected_zips.add(zip_path)
            else:
                self.selected_zips.discard(zip_path)
            self.ui.update_zip_checkbox_state(zip_path, checked)

        self._update_root_checkbox_state()
        self._update_selection_status()

    # ── Process (EPUB) ───────────────────────────────────────────────

    def on_process_folders(self):
        if not self.selected_folders:
            self.ui_callbacks['show_message']("No Selection", "Please select at least one folder.", "warning")
            return
        self._disable_all_action_buttons()
        self.ui_callbacks['start_progress']()
        thread = threading.Thread(target=self._process_folders_thread)
        thread.daemon = True
        thread.start()

    def _process_folders_thread(self):
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
                            self.ui_callbacks['update_status'](f"Processing {f} ({i}/{t})..."))
            success, message = create_epub_from_folder(folder_path)
            results.append((folder_path, success, message))
        self.root.after(0, self._processing_complete, results)

    def _processing_complete(self, results):
        self.ui_callbacks['stop_progress']()
        success_count = sum(1 for _, s, _ in results if s)
        fail_count = len(results) - success_count
        result_text = f"Processing complete!\n\nSuccess: {success_count}\nFailed: {fail_count}\n\n"
        if fail_count > 0:
            result_text += "Failed folders:\n"
            for fp, s, m in results:
                if not s:
                    result_text += f"  - {os.path.basename(fp)}: {m}\n"
        self.ui_callbacks['show_message']("Processing Complete", result_text)
        self.ui_callbacks['update_status'](f"Completed: {success_count} successful, {fail_count} failed")
        self._restore_action_buttons()

    # ── Pad filenames ────────────────────────────────────────────────

    def on_pad_filenames(self):
        if not self.selected_folders:
            self.ui_callbacks['show_message']("No Selection", "Please select at least one folder.", "warning")
            return
        self._disable_all_action_buttons()
        self.ui_callbacks['start_progress']()
        thread = threading.Thread(target=self._pad_filenames_thread)
        thread.daemon = True
        thread.start()

    def _pad_filenames_thread(self):
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
        self.ui_callbacks['stop_progress']()
        success_count = sum(1 for _, s, _ in results if s)
        fail_count = len(results) - success_count
        result_text = f"Padding complete!\n\nSuccess: {success_count}\nFailed: {fail_count}\n\n"
        if fail_count > 0:
            result_text += "Failed folders:\n"
            for fp, s, m in results:
                if not s:
                    result_text += f"  - {os.path.basename(fp)}: {m}\n"
        self.ui_callbacks['show_message']("Padding Complete", result_text)
        self.ui_callbacks['update_status'](f"Padding done: {success_count} successful, {fail_count} failed")
        self._restore_action_buttons()

    # ── Unzip ────────────────────────────────────────────────────────

    def on_unzip_files(self):
        if not self.selected_zips:
            self.ui_callbacks['show_message']("No Selection", "Please select at least one zip file.", "warning")
            return
        self._disable_all_action_buttons()
        self.ui_callbacks['start_progress']()
        thread = threading.Thread(target=self._unzip_files_thread)
        thread.daemon = True
        thread.start()

    def _unzip_files_thread(self):
        results = []
        zips = list(self.selected_zips)
        total = len(zips)
        for idx, zip_path in enumerate(zips, 1):
            zip_name = os.path.basename(zip_path)
            self.root.after(0, lambda f=zip_name, i=idx, t=total:
                            self.ui_callbacks['update_status'](f"Unzipping {f} ({i}/{t})..."))
            success, message = unzip_file(zip_path)
            results.append((zip_path, success, message))
        self.root.after(0, self._unzip_complete, results)

    def _unzip_complete(self, results):
        self.ui_callbacks['stop_progress']()
        success_count = sum(1 for _, s, _ in results if s)
        fail_count = len(results) - success_count
        result_text = f"Unzip complete!\n\nSuccess: {success_count}\nFailed: {fail_count}\n\n"
        if fail_count > 0:
            result_text += "Failed files:\n"
            for fp, s, m in results:
                if not s:
                    result_text += f"  - {os.path.basename(fp)}: {m}\n"
        self.ui_callbacks['show_message']("Unzip Complete", result_text)
        self._load_folders()

    # ── Button state helpers ─────────────────────────────────────────

    def _disable_all_action_buttons(self):
        self.ui_callbacks['update_process_button'](False)
        self.ui_callbacks['update_pad_button'](False)
        self.ui_callbacks['update_unzip_button'](False)

    def _restore_action_buttons(self):
        has_folders = len(self.selected_folders) > 0
        has_zips = len(self.selected_zips) > 0
        self.ui_callbacks['update_process_button'](has_folders)
        self.ui_callbacks['update_pad_button'](has_folders)
        self.ui_callbacks['update_unzip_button'](has_zips)

    def _update_selection_status(self):
        nf = len(self.selected_folders)
        nz = len(self.selected_zips)
        self.ui_callbacks['update_process_button'](nf > 0)
        self.ui_callbacks['update_pad_button'](nf > 0)
        self.ui_callbacks['update_unzip_button'](nz > 0)

        parts = []
        if nf:
            parts.append(f"{nf} folder(s)")
        if nz:
            parts.append(f"{nz} zip(s)")
        if parts:
            self.ui_callbacks['update_status'](
                f"{', '.join(parts)} selected - Click items or checkboxes to select/deselect"
            )
        else:
            self.ui_callbacks['update_status']("No items selected - Click items or checkboxes to select")

        self._update_root_checkbox_state()

    def _update_root_checkbox_state(self):
        all_folder_paths = set(self.ui.checkbox_widgets.keys())
        all_zip_paths = set(self.ui.zip_checkbox_widgets.keys())
        all_items = all_folder_paths | all_zip_paths
        all_selected_items = self.selected_folders | self.selected_zips
        all_selected = all_items.issubset(all_selected_items) and len(all_items) > 0
        if hasattr(self.ui, 'root_var'):
            self.ui.update_root_checkbox(all_selected)
