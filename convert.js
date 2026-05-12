const { PDFDocument } = PDFLib;

let files = [];

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const emptyState = document.getElementById('emptyState');
const toolActions = document.getElementById('toolActions');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const result = document.getElementById('result');
const downloadBtn = document.getElementById('downloadBtn');
const loading = document.getElementById('loading');

// File Input
fileInput.addEventListener('change', (e) => {
    addFiles(Array.from(e.target.files));
    fileInput.value = '';
});

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const imageFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addFiles(imageFiles);
});

// Click drop zone to browse
dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone || e.target.classList.contains('drop-zone-content')) {
        e.stopPropagation();
        fileInput.click();
    }
});

// Add files
function addFiles(newFiles) {
    for (const file of newFiles) {
        if (file.type.startsWith('image/')) {
            files.push({
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                type: file.type,
                file: file
            });
        }
    }
    renderFileList();
}

// Render file list
function renderFileList() {
    if (files.length === 0) {
        emptyState.style.display = 'block';
        toolActions.style.display = 'none';
        result.style.display = 'none';
        fileList.innerHTML = '';
        fileList.appendChild(emptyState);
        return;
    }

    emptyState.style.display = 'none';
    toolActions.style.display = 'flex';
    result.style.display = 'none';

    fileList.innerHTML = files.map((f, index) => `
        <div class="file-item" draggable="true" data-index="${index}">
            <span class="drag-handle">⋮⋮</span>
            <span class="file-icon">🖼</span>
            <div class="file-info">
                <div class="file-name">${f.name}</div>
                <div class="file-size">${formatSize(f.size)}</div>
            </div>
            <button class="file-remove" onclick="removeFile(${index})">×</button>
        </div>
    `).join('');

    // Add drag events
    const fileItems = fileList.querySelectorAll('.file-item');
    fileItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
    });
}

// Format file size
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Remove file
function removeFile(index) {
    files.splice(index, 1);
    renderFileList();
}

// Clear all
clearBtn.addEventListener('click', () => {
    files = [];
    renderFileList();
});

// Drag & Drop reorder
let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = parseInt(e.target.dataset.index);
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.target.closest('.file-item')?.classList.add('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const dropIndex = parseInt(e.target.closest('.file-item').dataset.index);
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
        const [movedItem] = files.splice(draggedIndex, 1);
        files.splice(dropIndex, 0, movedItem);
        renderFileList();
    }
    draggedIndex = null;
}

// Convert to PDF
convertBtn.addEventListener('click', async () => {
    if (files.length === 0) return;

    loading.style.display = 'block';
    toolActions.style.display = 'none';

    try {
        const pdfDoc = await PDFDocument.create();

        for (const fileData of files) {
            let image;

            if (fileData.type === 'image/jpeg' || fileData.type === 'image/jpg') {
                image = await pdfDoc.embedJpg(await fileData.file.arrayBuffer());
            } else if (fileData.type === 'image/png') {
                image = await pdfDoc.embedPng(await fileData.file.arrayBuffer());
            }

            if (image) {
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height
                });
            }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });

        loading.style.display = 'none';
        result.style.display = 'block';

        downloadBtn.onclick = () => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'converted.pdf';
            a.click();
            URL.revokeObjectURL(url);
        };
    } catch (error) {
        loading.style.display = 'none';
        toolActions.style.display = 'flex';
        alert('Error creating PDF: ' + error.message);
    }
});