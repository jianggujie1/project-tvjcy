const { PDFDocument } = PDFLib;

let files = [];
let mergedPdfBytes = null;

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const emptyState = document.getElementById('emptyState');
const toolActions = document.getElementById('toolActions');
const mergeBtn = document.getElementById('mergeBtn');
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
    const pdfFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    addFiles(pdfFiles);
});

// Click to browse
dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone || e.target.closest('.drop-zone-content')) {
        fileInput.click();
    }
});

// Add files
function addFiles(newFiles) {
    for (const file of newFiles) {
        if (file.type === 'application/pdf') {
            files.push({
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
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
            <span class="file-icon">📄</span>
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
    mergedPdfBytes = null;
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

// Merge PDFs
mergeBtn.addEventListener('click', async () => {
    if (files.length < 2) {
        alert('Please add at least 2 PDF files to merge.');
        return;
    }

    loading.style.display = 'block';
    result.style.display = 'none';
    toolActions.style.display = 'none';

    try {
        const mergedPdf = await PDFDocument.create();

        for (const fileData of files) {
            const pdfBytes = await fileData.file.arrayBuffer();
            const pdf = await PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        mergedPdfBytes = await mergedPdf.save();

        loading.style.display = 'none';
        result.style.display = 'block';
    } catch (error) {
        loading.style.display = 'none';
        toolActions.style.display = 'flex';
        alert('Error merging PDFs: ' + error.message);
    }
});

// Download merged PDF
downloadBtn.addEventListener('click', () => {
    if (!mergedPdfBytes) return;

    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.pdf';
    a.click();
    URL.revokeObjectURL(url);
});