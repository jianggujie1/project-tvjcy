// Set pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfFile = null;
let pdfDoc = null;
let totalPages = 0;
let selectedPages = new Set();
let pageImages = []; // { pageIndex, dataUrl }

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const pdfName = document.getElementById('pdfName');
const pdfPages = document.getElementById('pdfPages');
const removeFileBtn = document.getElementById('removeFile');
const pageSelector = document.getElementById('pageSelector');
const pageGrid = document.getElementById('pageGrid');
const selectAllBtn = document.getElementById('selectAll');
const deselectAllBtn = document.getElementById('deselectAll');
const toolActions = document.getElementById('toolActions');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const result = document.getElementById('result');
const resultText = document.getElementById('resultText');
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

// Load PDF and render thumbnails
async function loadPdf(file) {
    pdfFile = file;

    dropZone.style.display = 'none';
    fileInfo.style.display = 'block';
    result.style.display = 'none';

    pdfName.textContent = file.name;

    try {
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        totalPages = pdfDoc.numPages;

        pdfPages.textContent = `${totalPages} pages`;
        pageSelector.style.display = 'block';
        toolActions.style.display = 'flex';
        pageImages = [];
        selectedPages.clear();

        await renderPageThumbnails();

        updateConvertBtn();
    } catch (error) {
        alert('Error loading PDF: ' + error.message);
        resetUI();
    }
}

// Render page thumbnails
async function renderPageThumbnails() {
    pageGrid.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const pageEl = document.createElement('div');
        pageEl.className = 'page-thumb';
        pageEl.dataset.page = i - 1;
        pageEl.addEventListener('click', () => togglePage(i - 1, pageEl));

        // Loading placeholder
        pageEl.textContent = '...';
        pageGrid.appendChild(pageEl);

        // Render thumbnail in background
        renderPageThumbnail(i - 1, pageEl);
    }
}

// Render single page thumbnail
async function renderPageThumbnail(pageIndex, pageEl) {
    try {
        const page = await pdfDoc.getPage(pageIndex + 1);
        const scale = 80 / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
        }).promise;

        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/jpeg', 0.7);
        pageImages[pageIndex] = canvas.toDataURL('image/jpeg', 0.9);

        pageEl.innerHTML = '';
        pageEl.appendChild(img);
    } catch (error) {
        pageEl.textContent = pageIndex + 1;
    }
}

// Toggle page selection
function togglePage(pageIndex, pageEl) {
    if (selectedPages.has(pageIndex)) {
        selectedPages.delete(pageIndex);
        pageEl.classList.remove('selected');
    } else {
        selectedPages.add(pageIndex);
        pageEl.classList.add('selected');
    }
    updateConvertBtn();
}

// Update convert button
function updateConvertBtn() {
    const count = selectedPages.size;
    if (count === 0) {
        convertBtn.textContent = 'Select pages to convert';
        convertBtn.disabled = true;
    } else {
        convertBtn.textContent = `Convert ${count} Page${count !== 1 ? 's' : ''}`;
        convertBtn.disabled = false;
    }
}

// Select/Deselect all
selectAllBtn.addEventListener('click', () => {
    for (let i = 0; i < totalPages; i++) {
        selectedPages.add(i);
    }
    document.querySelectorAll('.page-thumb').forEach(el => el.classList.add('selected'));
    updateConvertBtn();
});

deselectAllBtn.addEventListener('click', () => {
    selectedPages.clear();
    document.querySelectorAll('.page-thumb').forEach(el => el.classList.remove('selected'));
    updateConvertBtn();
});

// Clear / Remove
clearBtn.addEventListener('click', resetUI);
removeFileBtn.addEventListener('click', resetUI);

// Reset UI
function resetUI() {
    pdfFile = null;
    pdfDoc = null;
    totalPages = 0;
    selectedPages.clear();
    pageImages = [];
    fileInput.value = '';

    dropZone.style.display = 'block';
    fileInfo.style.display = 'none';
    pageSelector.style.display = 'none';
    toolActions.style.display = 'none';
    result.style.display = 'none';
}

// Convert to JPG
convertBtn.addEventListener('click', async () => {
    if (selectedPages.size === 0) return;

    loading.style.display = 'block';
    toolActions.style.display = 'none';

    try {
        const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);

        // For single page, download JPG directly
        if (sortedPages.length === 1) {
            const pageIndex = sortedPages[0];
            const page = await pdfDoc.getPage(pageIndex + 1);
            const scale = 2;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: canvas.getContext('2d'),
                viewport: viewport
            }).promise;

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', 0.92);
            });

            loading.style.display = 'none';
            result.style.display = 'block';
            resultText.textContent = '1 image created!';

            downloadBtn.onclick = () => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'page-1.jpg';
                a.click();
                URL.revokeObjectURL(url);
            };
            return;
        }

        // For multiple pages, create ZIP
        const zip = new JSZip();

        for (const pageIndex of sortedPages) {
            const page = await pdfDoc.getPage(pageIndex + 1);
            const scale = 2;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: canvas.getContext('2d'),
                viewport: viewport
            }).promise;

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', 0.92);
            });

            zip.file(`page-${pageIndex + 1}.jpg`, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });

        loading.style.display = 'none';
        result.style.display = 'block';
        resultText.textContent = `${sortedPages.length} images created!`;

        downloadBtn.onclick = () => {
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pdf-pages.zip';
            a.click();
            URL.revokeObjectURL(url);
        };
    } catch (error) {
        loading.style.display = 'none';
        toolActions.style.display = 'flex';
        alert('Error converting PDF: ' + error.message);
    }
});

// Reset - process another
resetBtn.addEventListener('click', resetUI);

// Load JSZip dynamically
const script = document.createElement('script');
script.src = 'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js';
document.head.appendChild(script);