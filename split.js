const { PDFDocument } = PDFLib;

let pdfFile = null;
let pdfBytes = null;
let pdfDoc = null;
let totalPages = 0;
let selectedPages = new Set();

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const splitConfig = document.getElementById('splitConfig');
const pdfName = document.getElementById('pdfName');
const pdfPages = document.getElementById('pdfPages');
const removeFileBtn = document.getElementById('removeFile');
const pageGrid = document.getElementById('pageGrid');
const selectAllBtn = document.getElementById('selectAll');
const deselectAllBtn = document.getElementById('deselectAll');
const modeBtns = document.querySelectorAll('.mode-btn');
const pagesMode = document.getElementById('pagesMode');
const rangesMode = document.getElementById('rangesMode');
const rangeInput = document.getElementById('rangeInput');
const splitBtn = document.getElementById('splitBtn');
const result = document.getElementById('result');
const extractedCount = document.getElementById('extractedCount');
const downloadBtn = document.getElementById('downloadBtn');
const loading = document.getElementById('loading');

// Mode switching
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        if (mode === 'pages') {
            pagesMode.style.display = 'block';
            rangesMode.style.display = 'none';
        } else {
            pagesMode.style.display = 'none';
            rangesMode.style.display = 'block';
        }
    });
});

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
    splitConfig.style.display = 'block';
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
        pageEl.dataset.page = i;
        pageEl.addEventListener('click', () => togglePage(i, pageEl));
        pageGrid.appendChild(pageEl);
    }
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
    splitBtn.textContent = `Extract ${selectedPages.size} Page${selectedPages.size !== 1 ? 's' : ''}`;
}

// Select/Deselect all
selectAllBtn.addEventListener('click', () => {
    for (let i = 1; i <= totalPages; i++) {
        selectedPages.add(i);
    }
    document.querySelectorAll('.page-thumb').forEach(el => el.classList.add('selected'));
    splitBtn.textContent = `Extract ${totalPages} Pages`;
});

deselectAllBtn.addEventListener('click', () => {
    selectedPages.clear();
    document.querySelectorAll('.page-thumb').forEach(el => el.classList.remove('selected'));
    splitBtn.textContent = 'Extract Selected Pages';
});

// Remove file
removeFileBtn.addEventListener('click', () => {
    pdfFile = null;
    pdfBytes = null;
    pdfDoc = null;
    totalPages = 0;
    selectedPages.clear();
    dropZone.style.display = 'block';
    splitConfig.style.display = 'none';
});

// Split PDF
splitBtn.addEventListener('click', async () => {
    const activeMode = document.querySelector('.mode-btn.active').dataset.mode;
    let pagesToExtract = [];

    if (activeMode === 'pages') {
        pagesToExtract = Array.from(selectedPages).sort((a, b) => a - b);
    } else {
        // Parse ranges
        const rangeText = rangeInput.value.trim();
        if (!rangeText) {
            alert('Please enter page ranges');
            return;
        }
        pagesToExtract = parseRanges(rangeText);
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
    splitConfig.style.display = 'none';
    result.style.display = 'none';

    try {
        const zip = new JSZip();
        const tempDoc = await PDFDocument.create();

        for (const pageNum of pagesToExtract) {
            const [page] = await tempDoc.copyPages(pdfDoc, [pageNum - 1]);
            tempDoc.addPage(page);
        }

        const pdfOut = await tempDoc.save();
        const blob = new Blob([pdfOut], { type: 'application/pdf' });

        // If single page, download directly
        if (pagesToExtract.length === 1) {
            loading.style.display = 'none';
            result.style.display = 'block';
            extractedCount.textContent = '1';
            downloadBtn.onclick = () => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `page-${pagesToExtract[0]}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            };
        } else {
            // Multiple pages - create ZIP
            zip.file('extracted-pages.pdf', pdfOut);
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            loading.style.display = 'none';
            result.style.display = 'block';
            extractedCount.textContent = pagesToExtract.length;
            downloadBtn.onclick = () => {
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'extracted-pages.zip';
                a.click();
                URL.revokeObjectURL(url);
            };
        }
    } catch (error) {
        loading.style.display = 'none';
        splitConfig.style.display = 'block';
        alert('Error splitting PDF: ' + error.message);
    }
});

// Parse page ranges like "1-3, 5, 7-10"
function parseRanges(text) {
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

    return Array.from(pages).sort((a, b) => a - b);
}

// Load JSZip for ZIP creation
const script = document.createElement('script');
script.src = 'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js';
document.head.appendChild(script);