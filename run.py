import os
from ebooklib import epub
from PIL import Image
import io
import uuid
import tkinter as tk
from tkinter import filedialog

# Allow to select directory interactively
root = tk.Tk()
root.withdraw()  # Hide the main window
img_dir = filedialog.askdirectory(initialdir='~/Downloads',
                                  title='Please select a directory')
folder_name = os.path.basename(img_dir)
output_epub = os.path.join(os.path.expanduser('~/Downloads'), f"{folder_name}.epub")

# Get all .webp files, sorted by filename
img_files = sorted([f for f in os.listdir(img_dir) if f.lower().endswith('.webp')])
if not img_files:
    img_files = sorted([f for f in os.listdir(img_dir) if f.lower().endswith('.jpg')])

if not img_files:
    img_files = sorted([f for f in os.listdir(img_dir) if f.lower().endswith('.png')])

if not img_files:
    img_files = sorted([f for f in os.listdir(img_dir) if f.lower().endswith('.jpeg')])

book = epub.EpubBook()
book.set_identifier(uuid.uuid4().urn)
book.set_title(folder_name)
book.set_language('zh')
book.add_author('Manga')
# Set the first image as cover
if img_files:
    first_img_path = os.path.join(img_dir, img_files[0])
    with Image.open(first_img_path) as im:
        with io.BytesIO() as output:
            im = im.convert("RGB")
            im.save(output, format="JPEG")
            cover_data = output.getvalue()
    cover_id = "cover.jpg"
    epub_cover = epub.EpubItem(uid=cover_id, file_name=f"images/{cover_id}", media_type="image/jpeg", content=cover_data)
    book.add_item(epub_cover)
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

print(f"EPUB created at: {output_epub}")
