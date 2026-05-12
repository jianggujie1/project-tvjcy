// Set pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const { PDFDocument, degrees } = PDFLib;

let pdfFile = null;
let pdfDoc = null;
let totalPages = 0;
let rotations = {}; // pageIndex -> rotation degrees
let pageImages = []; // pageIndex -> dataUrl for thumbnail

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
const resetBtn = document.getElementById('resetBtn');
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
    pdfName.textContent = file.name;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        totalPages = pdfjsDoc.numPages;
        pdfPages.textContent = `${totalPages} pages`;

        dropZone.style.display = 'none';
        fileInfo.style.display = 'block';
        pageSelector.style.display = 'block';
        toolActions.style.display = 'flex';
        result.style.display = 'none';

        rotations = {};
        pageImages = [];

        await renderPageGrid(pdfjsDoc);

        updateApplyBtn();
    } catch (error) {
        alert('Error loading PDF: ' + error.message);
        resetUI();
    }
}

// Render page grid with thumbnails
async function renderPageGrid(pdfjsDoc) {
    pageGrid.innerHTML = '';

    for (let i = 0; i < totalPages; i++) {
        const pageEl = document.createElement('div');
        pageEl.className = 'page-thumb';
        pageEl.dataset.page = i;
        pageEl.style.cursor = 'pointer';

        // Add selection state on click
        pageEl.addEventListener('click', () => togglePage(i, pageEl));
        pageGrid.appendChild(pageEl);

        // Render thumbnail in background
        renderPageThumbnail(pdfjsDoc, i, pageEl);
    }
}

// Render single page thumbnail
async function renderPageThumbnail(pdfjsDoc, pageIndex, pageEl) {
    try {
        const page = await pdfjsDoc.getPage(pageIndex + 1);
        const scale = 100 / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
        }).promise;

        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/jpeg', 0.85);
        pageImages[pageIndex] = canvas.toDataURL('image/jpeg', 0.85);

        pageEl.innerHTML = '';
        pageEl.appendChild(img);

        // Add page number overlay
        const numOverlay = document.createElement('span');
        numOverlay.className = 'page-number';
        numOverlay.textContent = pageIndex + 1;
        pageEl.appendChild(numOverlay);

    } catch (error) {
        pageEl.innerHTML = `<span class="page-number">${pageIndex + 1}</span>`;
    }
}

// Toggle page selection
function togglePage(pageIndex, pageEl) {
    if (pageEl.classList.contains('selected')) {
        pageEl.classList.remove('selected');
    } else {
        pageEl.classList.add('selected');
    }
    updateApplyBtn();
}

// Update apply button
function updateApplyBtn() {
    const selectedCount = pageGrid.querySelectorAll('.page-thumb.selected').length;
    if (selectedCount === 0) {
        applyBtn.textContent = 'Select pages to rotate';
        applyBtn.disabled = true;
    } else {
        applyBtn.textContent = `Rotate ${selectedCount} page${selectedCount !== 1 ? 's' : ''}`;
        applyBtn.disabled = false;
    }
}

// Rotate selected pages
function rotateSelected(deg) {
    const selectedEls = pageGrid.querySelectorAll('.page-thumb.selected');

    if (selectedEls.length === 0) {
        alert('Please select pages first');
        return;
    }

    selectedEls.forEach(el => {
        const pageIndex = parseInt(el.dataset.page);
        const current = rotations[pageIndex] || 0;
        rotations[pageIndex] = (current + deg + 360) % 360;

        // Apply visual rotation
        el.style.transform = `rotate(${rotations[pageIndex]}deg)`;
        if (rotations[pageIndex] !== 0) {
            el.classList.add('has-rotation');
        } else {
            el.classList.remove('has-rotation');
        }
    });

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
        const pdfBytesCopy = await pdfFile.arrayBuffer();
        const doc = await PDFDocument.load(pdfBytesCopy);

        for (const [pageIndex, rotation] of Object.entries(rotations)) {
            const page = doc.getPage(parseInt(pageIndex));
            page.setRotation(degrees(rotation));
        }

        const outputBytes = await doc.save();
        const blob = new Blob([outputBytes], { type: 'application/pdf' });

        loading.style.display = 'none';
        result.style.display = 'block';

        downloadBtn.onclick = () => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'rotated.pdf';
            a.click();
            URL.revokeObjectURL(url);
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
    pdfDoc = null;
    totalPages = 0;
    rotations = {};
    pageImages = [];
    fileInput.value = '';

    dropZone.style.display = 'block';
    fileInfo.style.display = 'none';
    pageSelector.style.display = 'none';
    toolActions.style.display = 'none';
    result.style.display = 'none';
}

// Reset - process another
resetBtn.addEventListener('click', resetUI);