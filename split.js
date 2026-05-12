const { PDFDocument } = PDFLib;

let pdfFile = null;
let pdfBytes = null;
let pdfDoc = null;
let totalPages = 0;
let selectedPages = new Set();
let currentMode = 'pages';

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const pdfName = document.getElementById('pdfName');
const pdfPages = document.getElementById('pdfPages');
const removeFileBtn = document.getElementById('removeFile');
const splitModes = document.getElementById('splitModes');
const modeBtns = document.querySelectorAll('.mode-btn');
const pageSelector = document.getElementById('pageSelector');
const pageGrid = document.getElementById('pageGrid');
const selectAllBtn = document.getElementById('selectAll');
const deselectAllBtn = document.getElementById('deselectAll');
const rangeSection = document.getElementById('rangeSection');
const rangeInput = document.getElementById('rangeInput');
const toolActions = document.getElementById('toolActions');
const splitBtn = document.getElementById('splitBtn');
const clearBtn = document.getElementById('clearBtn');
const result = document.getElementById('result');
const resultText = document.getElementById('resultText');
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

// Click drop zone to browse (prevent double dialog)
dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone || e.target.classList.contains('drop-zone-content')) {
        e.stopPropagation();
        fileInput.click();
    }
});

// Mode switching
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;

        if (currentMode === 'pages') {
            pageSelector.style.display = 'block';
            rangeSection.style.display = 'none';
        } else {
            pageSelector.style.display = 'none';
            rangeSection.style.display = 'block';
        }
        updateSplitBtn();
    });
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
    splitModes.style.display = 'flex';
    pageSelector.style.display = 'block';
    rangeSection.style.display = 'none';
    toolActions.style.display = 'flex';
    result.style.display = 'none';

    renderPageGrid();
}

// Render page grid
function renderPageGrid() {
    pageGrid.innerHTML = '';
    selectedPages.clear();

    for (let i = 1; i <= totalPages; i++) {
        const pageEl = document.createElement('div');
        pageEl.className = 'page-thumb';
        pageEl.textContent = i;
        pageEl.addEventListener('click', () => togglePage(i, pageEl));
        pageGrid.appendChild(pageEl);
    }

    updateSplitBtn();
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
    updateSplitBtn();
}

// Update split button
function updateSplitBtn() {
    let count = 0;
    if (currentMode === 'pages') {
        count = selectedPages.size;
    } else {
        count = parseRangeCount();
    }

    if (count === 0) {
        splitBtn.textContent = 'Extract Pages';
        splitBtn.disabled = true;
    } else {
        splitBtn.textContent = `Extract ${count} Page${count !== 1 ? 's' : ''}`;
        splitBtn.disabled = false;
    }
}

// Parse range to get count
function parseRangeCount() {
    const text = rangeInput.value.trim();
    if (!text) return 0;

    const pages = new Set();
    const parts = text.split(',');

    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= totalPages) {
                for (let i = start; i <= end; i++) {
                    pages.add(i);
                }
            }
        } else {
            const num = parseInt(trimmed);
            if (!isNaN(num) && num >= 1 && num <= totalPages) {
                pages.add(num);
            }
        }
    }

    return pages.size;
}

// Range input change
rangeInput.addEventListener('input', updateSplitBtn);

// Select/Deselect all
selectAllBtn.addEventListener('click', () => {
    for (let i = 1; i <= totalPages; i++) {
        selectedPages.add(i);
    }
    document.querySelectorAll('.page-thumb').forEach(el => el.classList.add('selected'));
    updateSplitBtn();
});

deselectAllBtn.addEventListener('click', () => {
    selectedPages.clear();
    document.querySelectorAll('.page-thumb').forEach(el => el.classList.remove('selected'));
    updateSplitBtn();
});

// Remove file
removeFileBtn.addEventListener('click', resetUI);

// Clear
clearBtn.addEventListener('click', resetUI);

// Reset UI
function resetUI() {
    pdfFile = null;
    pdfBytes = null;
    pdfDoc = null;
    totalPages = 0;
    selectedPages.clear();
    currentMode = 'pages';
    fileInput.value = '';
    rangeInput.value = '';

    modeBtns.forEach(b => b.classList.remove('active'));
    modeBtns[0].classList.add('active');

    dropZone.style.display = 'block';
    fileInfo.style.display = 'none';
    splitModes.style.display = 'none';
    pageSelector.style.display = 'none';
    rangeSection.style.display = 'none';
    toolActions.style.display = 'none';
    result.style.display = 'none';
}

// Split PDF
splitBtn.addEventListener('click', async () => {
    let pagesToExtract = [];

    if (currentMode === 'pages') {
        pagesToExtract = Array.from(selectedPages).sort((a, b) => a - b);
    } else {
        const text = rangeInput.value.trim();
        if (!text) {
            alert('Please enter page ranges');
            return;
        }

        const pages = new Set();
        const parts = text.split(',');

        for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed.includes('-')) {
                const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= totalPages) {
                    for (let i = start; i <= end; i++) {
                        pages.add(i);
                    }
                }
            } else {
                const num = parseInt(trimmed);
                if (!isNaN(num) && num >= 1 && num <= totalPages) {
                    pages.add(num);
                }
            }
        }

        pagesToExtract = Array.from(pages).sort((a, b) => a - b);

        if (pagesToExtract.length === 0) {
            alert('Invalid page ranges');
            return;
        }
    }

    if (pagesToExtract.length === 0) {
        alert('Please select at least one page');
        return;
    }

    loading.style.display = 'block';
    toolActions.style.display = 'none';
    result.style.display = 'none';

    try {
        const tempDoc = await PDFDocument.create();

        for (const pageNum of pagesToExtract) {
            const [page] = await tempDoc.copyPages(pdfDoc, [pageNum - 1]);
            tempDoc.addPage(page);
        }

        const pdfBytesOut = await tempDoc.save();
        const blob = new Blob([pdfBytesOut], { type: 'application/pdf' });

        loading.style.display = 'none';
        result.style.display = 'block';

        if (pagesToExtract.length === 1) {
            resultText.textContent = '1 page extracted!';
            downloadBtn.onclick = () => downloadBlob(blob, `page-${pagesToExtract[0]}.pdf`);
        } else {
            resultText.textContent = `${pagesToExtract.length} pages extracted!`;
            downloadBtn.onclick = () => downloadBlob(blob, 'extracted-pages.pdf');
        }
    } catch (error) {
        loading.style.display = 'none';
        toolActions.style.display = 'flex';
        alert('Error splitting PDF: ' + error.message);
    }
});

// Download helper
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}