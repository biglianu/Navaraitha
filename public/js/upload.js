const STORAGE_KEY = 'local_categories';

document.addEventListener("DOMContentLoaded", () => {
    const categorySelect = document.getElementById("category");
    const subcategorySelect = document.getElementById("subcategory");
    const historyTextarea = document.getElementById("productHistory");
    const dateContainer = document.getElementById("date-range-container");
    const addDateBtn = document.getElementById("addDateBtn");
    const equipmentForm = document.getElementById("equipmentForm");

    let dateRangeCount = 1;
    let uploadedImages = [];

    function initDatetimePlaceholders(container) {
        container.addEventListener('focus', (e) => {
            if (e.target.type === 'datetime-local') {
                const field = e.target.closest('.datetime-field');
                if (field) field.classList.add('is-focused');
            }
        }, true);
        container.addEventListener('blur', (e) => {
            if (e.target.type === 'datetime-local') {
                const field = e.target.closest('.datetime-field');
                if (field) field.classList.remove('is-focused');
            }
        }, true);
        container.addEventListener('change', (e) => {
            if (e.target.type === 'datetime-local') {
                const field = e.target.closest('.datetime-field');
                if (field) {
                    field.classList.toggle('has-value', !!e.target.value);
                    e.target.classList.toggle('has-value', !!e.target.value);
                }
            }
        });
    }
    initDatetimePlaceholders(dateContainer);

    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('main-navbar');
        if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 10);
    });

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    const headingInput = document.getElementById('productHeading');
    const charCounter = document.getElementById('charCountHeading');
    if (headingInput && charCounter) {
        headingInput.addEventListener('input', () => {
            const len = headingInput.value.length;
            charCounter.textContent = `${len} / 60`;
            charCounter.className = 'counter-hint' + (len > 50 ? ' danger' : len > 40 ? ' warn' : '');
        });
    }

    const descTextarea = document.getElementById('description');
    const wordCounter = document.getElementById('wordCountDesc');
    if (descTextarea && wordCounter) {
        descTextarea.addEventListener('input', () => {
            const words = descTextarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
            wordCounter.textContent = `${words} / 5000 words`;
            wordCounter.className = 'counter-hint' + (words > 4500 ? ' danger' : words > 4000 ? ' warn' : '');
        });
    }

    const historyCounter = document.getElementById('historyWordCount');
    if (historyTextarea && historyCounter) {
        historyTextarea.addEventListener('input', () => {
            const words = historyTextarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
            historyCounter.textContent = `${words} / 5000 words`;
            historyCounter.className = 'counter-hint' + (words > 4500 ? ' danger' : words > 4000 ? ' warn' : '');
        });
    }

    const cachedData = localStorage.getItem(STORAGE_KEY);
    if (!cachedData) {
        showToast("Category data not found. Syncing required.", "error");
        setTimeout(() => { window.location.href = "listings.html"; }, 1500);
        return;
    }
    const categoryData = JSON.parse(cachedData);
    const categories = Array.isArray(categoryData) ? categoryData : categoryData.body;

    categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.category_name;
        opt.textContent = cat.category_name;
        categorySelect.appendChild(opt);
    });

    categorySelect.addEventListener("change", (e) => {
        const selectedValue = e.target.value;
        subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
        if (selectedValue) {
            const selectedCat = categories.find(c => c.category_name === selectedValue);
            if (selectedCat && selectedCat.sub_categories) {
                subcategorySelect.disabled = false;
                selectedCat.sub_categories.forEach(sub => {
                    const opt = document.createElement("option");
                    opt.value = sub;
                    opt.textContent = sub;
                    subcategorySelect.appendChild(opt);
                });
            }
        } else {
            subcategorySelect.disabled = true;
        }
    });

    addDateBtn.addEventListener("click", () => {
        if (dateRangeCount < 5) {
            dateRangeCount++;
            const row = document.createElement("div");
            row.className = "date-row";
            row.innerHTML = `
                <span class="date-row-num">${dateRangeCount}</span>
                <div class="datetime-field" data-placeholder="Start Date">
                    <span class="datetime-label">Start Date</span>
                    <input type="datetime-local" name="start_datetime[]" required>
                </div>
                <span class="date-sep">→</span>
                <div class="datetime-field" data-placeholder="End Date">
                    <span class="datetime-label">End Date</span>
                    <input type="datetime-local" name="end_datetime[]" required>
                </div>
                <button type="button" class="date-row-remove" title="Remove">✕</button>
            `;
            row.querySelector('.date-row-remove').addEventListener('click', () => {
                row.style.opacity = '0';
                row.style.transform = 'translateX(-12px)';
                setTimeout(() => {
                    row.remove();
                    dateRangeCount--;
                    renumberDateRows();
                }, 200);
            });
            dateContainer.appendChild(row);
        }
    });

    function renumberDateRows() {
        const rows = dateContainer.querySelectorAll('.date-row');
        rows.forEach((row, i) => {
            const numEl = row.querySelector('.date-row-num');
            if (numEl) numEl.textContent = i + 1;
        });
    }

    historyTextarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            historyTextarea.value += "\n• ";
        }
    });

    const uploadZone = document.getElementById('upload-zone');
    const photoInput = document.getElementById("photoUpload");
    const previewContainer = document.getElementById("imagePreviewContainer");

    if (uploadZone) {
        ['dragenter', 'dragover'].forEach(evt => {
            uploadZone.addEventListener(evt, (e) => {
                e.preventDefault();
                uploadZone.classList.add('drag-active');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            uploadZone.addEventListener(evt, (e) => {
                e.preventDefault();
                uploadZone.classList.remove('drag-active');
            });
        });
        uploadZone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            handleImageFiles(files);
        });
    }

    photoInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files);
        handleImageFiles(files);
    });

    function handleImageFiles(files) {
        if (uploadedImages.length + files.length > 6) {
            showToast("Maximum 6 images allowed.", "error");
            return;
        }
        files.forEach(file => {
            uploadedImages.push(file);
            const reader = new FileReader();
            reader.onload = (ev) => {
                const placeholder = previewContainer.querySelector('.placeholder-text');
                if (placeholder) placeholder.remove();
                const item = document.createElement('div');
                item.className = 'preview-item';
                const idx = uploadedImages.length - 1;
                item.innerHTML = `
                    <img src="${ev.target.result}" class="preview-img" alt="Preview">
                    <button type="button" class="preview-remove" data-index="${idx}" title="Remove">✕</button>
                `;
                item.querySelector('.preview-remove').addEventListener('click', function () {
                    const i = parseInt(this.getAttribute('data-index'));
                    uploadedImages[i] = null;
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.8)';
                    setTimeout(() => item.remove(), 200);
                });
                previewContainer.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }

    equipmentForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');

        submitBtn.disabled = true;
        if (btnText) btnText.textContent = 'Submitting...';
        if (btnSpinner) btnSpinner.style.display = 'inline-flex';

        const formData = new FormData();

        formData.append('heading', document.getElementById('productHeading').value);
        formData.append('owner', localStorage.getItem('navaritha_user') || 'Anonymous');
        formData.append('category', categorySelect.value);
        formData.append('sub_category', subcategorySelect.value);
        formData.append('cost', document.getElementsByName('cost')[0].value);
        formData.append('description', document.getElementById('description').value);
        formData.append('history', historyTextarea.value);

        const startInputs = document.getElementsByName('start_datetime[]');
        const endInputs = document.getElementsByName('end_datetime[]');
        const dateRanges = [];

        for (let i = 0; i < startInputs.length; i++) {
            const startVal = startInputs[i].value;
            const endVal = endInputs[i].value;
            if (startVal && endVal) {
                dateRanges.push({ start: startVal, end: endVal });
            }
        }

        formData.append('available_date_ranges', JSON.stringify(dateRanges));

        const validImages = uploadedImages.filter(f => f !== null);
        validImages.forEach(file => formData.append('images', file));

        try {
            const response = await fetch('/api/create_listing', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                showToast("Listing created successfully!", "success");
                setTimeout(() => { window.location.href = "listings.html"; }, 1200);
            } else {
                showToast("Error: " + result.error, "error");
                resetSubmitBtn();
            }
        } catch (err) {
            showToast("Failed to connect to backend server.", "error");
            resetSubmitBtn();
        }
    });

    function resetSubmitBtn() {
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');
        submitBtn.disabled = false;
        if (btnText) btnText.textContent = 'Submit Listing';
        if (btnSpinner) btnSpinner.style.display = 'none';
    }
});

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}