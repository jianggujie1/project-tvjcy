const { PDFDocument, degrees } = PDFLib;

let pdfFile = null;
let pdfBytes = null;
let pdfDoc = null;
let totalPages = 0;
let selectedPages = new Set();
let rotations = {}; // pageIndex -> rotation degrees

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const pdfName = document.getElementById('pdfName');
const pdfPages = document.getElementById('pdfPages');
const removeFileBtn = document.getElementById('removeFile');
const pageSelector = document.getElementById('pageSelector');
const pageGrid = document.getElementById('pageGrid');
const rotateLeftBtn = document.getElementById('rotateLeft');
const rotateRightBtn = document.getElementById('rotateRight');
const toolActions = document.getElementById('toolActions');
const applyBtn = document.getElementById('applyBtn');
const clearBtn = document.getElementById('clearBtn');
const result = document.getElementById('result');
const downloadBtn = document.getElementById('downloadBtn');
const loading = document.getElementById('loading');

// File Input
fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        await loadPdf(e.target.files[0]);
    }
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

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        await loadPdf(file);
    }
});

// Click drop zone to browse
dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone || e.target.classList.contains('drop-zone-content')) {
        e.stopPropagation();
        fileInput.click();
    }
});

// Load PDF
async function loadPdf(file) {
    pdfFile = file;
    pdfBytes = await file.arrayBuffer();
    pdfDoc = await PDFDocument.load(pdfBytes);
    totalPages = pdfDoc.getPageCount();

    pdfName.textContent = file.name;
    pdfPages.textContent = `${totalPages} pages`;

    dropZone.style.display = 'none';
    fileInfo.style.display = 'block';
    pageSelector.style.display = 'block';
    toolActions.style.display = 'flex';
    result.style.display = 'none';

    rotations = {};
    renderPageGrid();
}

// Render page grid
function renderPageGrid() {
    pageGrid.innerHTML = '';
    selectedPages.clear();

    for (let i = 0; i < totalPages; i++) {
        const pageEl = document.createElement('div');
        pageEl.className = 'page-thumb';
        pageEl.textContent = i + 1;
        pageEl.dataset.page = i;

        if (rotations[i]) {
            pageEl.style.transform = `rotate(${rotations[i]}deg)`;
            pageEl.classList.add('has-rotation');
        }

        pageEl.addEventListener('click', () => togglePage(i, pageEl));
        pageGrid.appendChild(pageEl);
    }

    updateApplyBtn();
}

// Toggle page selection
function togglePage(page, el) {
    if (selectedPages.has(page)) {
        selectedPages.delete(page);
        el.classList.remove('selected');
    } else {
        selectedPages.add(page);
        el.classList.add('selected');
    }
    updateApplyBtn();
}

// Update apply button
function updateApplyBtn() {
    const hasChanges = Object.keys(rotations).length > 0;
    applyBtn.disabled = !hasChanges;
    applyBtn.textContent = hasChanges ? 'Apply Rotation' : 'Select Pages to Rotate';
}

// Rotate selected pages
function rotateSelected(degrees) {
    selectedPages.forEach(pageIndex => {
        const current = rotations[pageIndex] || 0;
        rotations[pageIndex] = (current + degrees + 360) % 360;
    });

    // Update visual
    const pageEls = pageGrid.querySelectorAll('.page-thumb');
    for (let i = 0; i < totalPages; i++) {
        const el = pageEls[i];
        if (rotations[i]) {
            el.style.transform = `rotate(${rotations[i]}deg)`;
            el.classList.add('has-rotation');
        } else {
            el.style.transform = '';
            el.classList.remove('has-rotation');
        }
    }

    updateApplyBtn();
}

rotateLeftBtn.addEventListener('click', () => rotateSelected(-90));
rotateRightBtn.addEventListener('click', () => rotateSelected(90));

// Apply rotation
applyBtn.addEventListener('click', async () => {
    if (Object.keys(rotations).length === 0) return;

    loading.style.display = 'block';
    toolActions.style.display = 'none';

    try {
        // Reload the PDF
        const pdfBytesCopy = await pdfFile.arrayBuffer();
        const doc = await PDFDocument.load(pdfBytesCopy);

        // Apply rotations
        for (const [pageIndex, rotation] of Object.entries(rotations)) {
            const page = doc.getPage(parseInt(pageIndex));
            page.setRotation(degrees(rotation));
        }

        const outputBytes = await doc.save();
        const blob = new Blob([outputBytes], { type: 'application/pdf' });

        loading.style.display = 'none';
        result.style.display = 'block';

        downloadBtn.onclick = () => {
            downloadBlob(blob, 'rotated.pdf');
        };
    } catch (error) {
        loading.style.display = 'none';
        toolActions.style.display = 'flex';
        alert('Error rotating PDF: ' + error.message);
    }
});

// Clear
clearBtn.addEventListener('click', resetUI);
removeFileBtn.addEventListener('click', resetUI);

// Reset UI
function resetUI() {
    pdfFile = null;
    pdfBytes = null;
    pdfDoc = null;
    totalPages = 0;
    selectedPages.clear();
    rotations = {};
    fileInput.value = '';

    dropZone.style.display = 'block';
    fileInfo.style.display = 'none';
    pageSelector.style.display = 'none';
    toolActions.style.display = 'none';
    result.style.display = 'none';
}

// Download helper
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}