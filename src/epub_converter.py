"""Business logic for EPUB conversion and folder scanning."""

import os
from ebooklib import epub
from PIL import Image
import io
import uuid
from pathlib import Path


def create_epub_from_folder(img_dir, output_dir=None):
    """
    Create an EPUB file from images in a folder.

    Args:
        img_dir: Path to the folder containing images
        output_dir: Directory to save the EPUB file (defaults to ~/Downloads)

    Returns:
        tuple: (success: bool, message: str)
    """
    if output_dir is None:
        output_dir = os.path.expanduser('~/Downloads')

    folder_name = os.path.basename(img_dir)
    output_epub = os.path.join(output_dir, f"{folder_name}.epub")

    # Get all supported image files, sorted by filename
    valid_exts = ('.webp', '.jpg', '.jpeg', '.png')
    try:
        img_files = sorted([f for f in os.listdir(img_dir) if f.lower().endswith(valid_exts)])
    except PermissionError:
        return False, f"Permission denied: {img_dir}"
    except Exception as e:
        return False, f"Error reading folder: {str(e)}"

    if not img_files:
        return False, f"No images found in: {folder_name}"

    try:
        book = epub.EpubBook()
        book.set_identifier(uuid.uuid4().urn)
        book.set_title(folder_name)
        book.set_language('zh')
        book.add_author('Manga')

        # Set the first image as cover
        first_img_path = os.path.join(img_dir, img_files[0])
        with Image.open(first_img_path) as im:
            with io.BytesIO() as output:
                im = im.convert("RGB")
                im.save(output, format="JPEG")
                cover_data = output.getvalue()
        book.set_cover("images/cover.jpg", cover_data)

        spine = ['nav']
        toc = []

        for idx, img_name in enumerate(img_files):
            img_path = os.path.join(img_dir, img_name)
            # Convert webp to jpeg in memory
            with Image.open(img_path) as im:
                with io.BytesIO() as output:
                    im = im.convert("RGB")
                    im.save(output, format="JPEG")
                    img_data = output.getvalue()
            # Add image to epub
            img_id = f"img{idx:03d}.jpg"
            epub_img = epub.EpubItem(uid=img_id, file_name=f"images/{img_id}", media_type="image/jpeg", content=img_data)
            book.add_item(epub_img)
            # Create HTML page for image
            html = f'<html><body><img src="images/{img_id}" style="width:100%;height:auto;"/></body></html>'
            c = epub.EpubHtml(title=f'Page {idx+1}', file_name=f'page_{idx+1}.xhtml', lang='zh')
            c.content = html
            book.add_item(c)
            spine.append(c)
            toc.append(c)

        # Add navigation files
        book.toc = toc
        book.spine = spine
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())

        # Write to file
        epub.write_epub(output_epub, book, {})
        return True, f"EPUB created: {output_epub}"
    except Exception as e:
        return False, f"Error creating EPUB: {str(e)}"


def find_folders_with_images(base_dir):
    """
    Find all subdirectories that contain image files, including parent folders
    that have subfolders with images.

    Args:
        base_dir: Base directory to search

    Returns:
        tuple: (folders_with_images: list, all_folders: dict)
            - folders_with_images: List of folder paths that directly contain images
            - all_folders: Dict mapping folder_path -> {'has_images': bool, 'has_subfolders': bool}
    """
    folders_with_images = []
    all_folders = {}

    if not base_dir or not os.path.exists(base_dir):
        return folders_with_images, all_folders

    valid_exts = ('.webp', '.jpg', '.jpeg', '.png')

    # First pass: find all folders with images directly
    for root_dir, _, files in os.walk(base_dir):
        has_images = any(f.lower().endswith(valid_exts) for f in files)
        if has_images:
            folders_with_images.append(root_dir)
            all_folders[root_dir] = {'has_images': True, 'has_subfolders': False}
        else:
            all_folders[root_dir] = {'has_images': False, 'has_subfolders': False}

    # Second pass: mark parent folders that have subfolders with images
    for folder_path in folders_with_images:
        parent = os.path.dirname(folder_path)
        base_dir_norm = os.path.normpath(base_dir)
        while parent:
            parent_norm = os.path.normpath(parent)
            if parent_norm == base_dir_norm:
                break
            try:
                common = os.path.commonpath([parent_norm, base_dir_norm])
                if common != base_dir_norm:
                    break
            except ValueError:
                break

            if parent_norm in all_folders:
                all_folders[parent_norm]['has_subfolders'] = True
            else:
                all_folders[parent_norm] = {'has_images': False, 'has_subfolders': True}
            parent = os.path.dirname(parent)

    return folders_with_images, all_folders


def organize_folders_by_hierarchy(all_folders, base_dir):
    """
    Organize folders into a hierarchical structure.

    Args:
        all_folders: Dictionary from find_folders_with_images (folder_path -> metadata)
        base_dir: Base directory for calculating relative paths

    Returns:
        dict: Dictionary mapping relative paths to (path_parts, full_path, metadata) tuples
    """
    folder_dict = {}
    for folder_path, metadata in all_folders.items():
        # Only include folders that have images or have subfolders with images
        if metadata['has_images'] or metadata['has_subfolders']:
            rel_path = os.path.relpath(folder_path, base_dir)
            parts = Path(rel_path).parts
            folder_dict[rel_path] = (parts, folder_path, metadata)

    return folder_dict


def get_subfolders_with_images(folder_path, folders_with_images):
    """
    Get all subfolders of a given folder that contain images.

    Args:
        folder_path: Parent folder path
        folders_with_images: List of folders that directly contain images

    Returns:
        list: List of subfolder paths that contain images
    """
    subfolders = []
    folder_path_norm = os.path.normpath(folder_path)

    for img_folder in folders_with_images:
        img_folder_norm = os.path.normpath(img_folder)
        # Check if img_folder is a subfolder of folder_path
        try:
            common = os.path.commonpath([folder_path_norm, img_folder_norm])
            if common == folder_path_norm and img_folder_norm != folder_path_norm:
                subfolders.append(img_folder)
        except ValueError:
            # Paths don't share a common path
            continue

    return subfolders

