/**
 * Configuration & Endpoints
 */
const API_ENDPOINTS = {
    CATEGORIES: '/api/categories',
    FILTERED_LISTINGS: '/api/listings'
};

const STORAGE_KEY = 'local_categories';

// Unified State Object
let filterState = {
    categories: [],      
    subcategories: [],   
    priceRange: { min: 0, max: 0 }
};

let isInitialLoad = true;
let allListings = []; // For client-side search

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    initUIEnhancements();
});

async function initApp() {
    await loadCategories();
    // Fetch real listings to populate the grid
    await fetchAndUpdateListings();
}

/**
 * UI ENHANCEMENTS (no API changes)
 */
function initUIEnhancements() {
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('main-navbar');
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 10);
        }
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // Mobile sidebar toggle
    const filterToggleBtn = document.getElementById('filter-toggle-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');

    if (filterToggleBtn && sidebar) {
        filterToggleBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
            if (sidebarOverlay) sidebarOverlay.classList.add('active');
        });
    }
    if (sidebarCloseBtn && sidebar) {
        sidebarCloseBtn.addEventListener('click', closeSidebar);
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = searchInput.value.trim().toLowerCase();
                if (query === '') {
                    renderListings(allListings);
                } else {
                    const filtered = allListings.filter(item =>
                        (item.heading && item.heading.toLowerCase().includes(query)) ||
                        (item.sub_category && item.sub_category.toLowerCase().includes(query)) ||
                        (item.owner && item.owner.toLowerCase().includes(query))
                    );
                    renderListings(filtered);
                }
            }, 250);
        });
    }
}

/**
 * 1. BACKEND COMMUNICATION: FETCH FILTERED LISTINGS
 */
async function fetchAndUpdateListings() {
    const grid = document.getElementById('listing-grid');
    
    // Show skeleton loader
    showSkeletonLoader(grid);
    
    // Construct Query Parameters for the GET request
    const params = new URLSearchParams();
    
    if (filterState.categories.length > 0) {
        params.append('category', filterState.categories.join(','));
    }
    
    if (filterState.subcategories.length > 0) {
        params.append('sub_category', filterState.subcategories.join(','));
    }

    try {
        const response = await fetch(`${API_ENDPOINTS.FILTERED_LISTINGS}?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
            let listings = result.data;
            allListings = listings; 

            // Setup price range bounds based on actual data on the first load
            if (isInitialLoad && allListings.length > 0) {
                setupDynamicPriceRange(allListings);
                isInitialLoad = false;
            }

            // Fetch images for each listing to show the first one
            await Promise.all(listings.map(async (item) => {
                try {
                    const imgRes = await fetch(`/api/images?listing_id=${item.listing_id}`);
                    const imgData = await imgRes.json();
                    if (imgData.success && imgData.images && imgData.images.length > 0) {
                        item.resolved_image = imgData.images[0];
                    } else {
                        item.resolved_image = '/assets/placeholder-equipment.png';
                    }
                } catch (e) {
                    item.resolved_image = '/assets/placeholder-equipment.png';
                }
            }));

            renderListings(listings);
        }
    } catch (error) {
        console.error("Filtered Listings Error:", error);
        grid.innerHTML = `<p class="error" data-i18n>Failed to load equipment from server.</p>`;
    }
}

function showSkeletonLoader(grid) {
    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton-img"></div>
            <div class="skeleton-body">
                <div class="skeleton-line w40"></div>
                <div class="skeleton-line w80"></div>
                <div class="skeleton-line w50"></div>
            </div>
        `;
        grid.appendChild(skeleton);
    }
}

/**
 * 2. CATEGORY LOADING (Cache-First)
 */
async function loadCategories() {
    const container = document.getElementById('filter-container');
    const cachedData = localStorage.getItem(STORAGE_KEY);

    if (cachedData) {
        renderFilterSidebar(JSON.parse(cachedData));
    } else {
        await fetchAndSaveCategories(container);
    }
}

async function fetchAndSaveCategories(container) {
    try {
        const response = await fetch(API_ENDPOINTS.CATEGORIES);
        let dataArray = await response.json();
        
        if (Array.isArray(dataArray)) {


            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataArray));
            renderFilterSidebar(dataArray);
        }
    } catch (error) {
        container.innerHTML = `<p style="color:#ef4444;font-size:0.85rem;padding:8px 0" data-i18n>Failed to load categories.</p>`;
    }
}



/**
 * 3. DYNAMIC SIDEBAR GENERATION
 */
function renderFilterSidebar(dataArray) {
    const container = document.getElementById('filter-container');
    container.innerHTML = ''; 
    dataArray.forEach(catObj => {
        container.appendChild(createAccordion(catObj));
    });
}

function createAccordion(catData) {
    const div = document.createElement('div');
    div.className = 'filter-category';
    div.innerHTML = `
        <div class="category-header">
            <input type="checkbox" class="parent-checkbox" value="${catData.category_name}">
            <span class="category-name" data-i18n>${catData.category_name}</span>
            <span class="dropdown-arrow">▼</span>
        </div>
        <div class="subcategory-list">
            ${catData.sub_categories.map(sub => `
                <label class="subcategory-item">
                    <input type="checkbox" class="child-checkbox" value="${sub}">
                    <span data-i18n>${sub}</span>
                </label>
            `).join('')}
        </div>
    `;

    const parentBox = div.querySelector('.parent-checkbox');
    const childBoxes = div.querySelectorAll('.child-checkbox');
    const header = div.querySelector('.category-header');

    header.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') div.classList.toggle('expanded');
    });

    parentBox.addEventListener('change', function() {
        const isChecked = this.checked;
        childBoxes.forEach(child => child.checked = isChecked);
        syncFilterStateAndRequest();
    });

    childBoxes.forEach(child => {
        child.addEventListener('change', () => {
            syncParentCheckbox(parentBox, childBoxes);
            syncFilterStateAndRequest();
        });
    });

    return div;
}

/**
 * 4. FILTER SYNCHRONIZATION
 */
function syncFilterStateAndRequest() {
    const parents = document.querySelectorAll('.parent-checkbox');
    const children = document.querySelectorAll('.child-checkbox');

    filterState.categories = Array.from(parents).filter(p => p.checked).map(p => p.value);
    filterState.subcategories = Array.from(children).filter(c => c.checked).map(c => c.value);

    fetchAndUpdateListings();
}

function syncParentCheckbox(parent, children) {
    const checkedCount = Array.from(children).filter(c => c.checked).length;
    if (checkedCount === 0) { parent.checked = false; parent.indeterminate = false; }
    else if (checkedCount === children.length) { parent.checked = true; parent.indeterminate = false; }
    else { parent.checked = false; parent.indeterminate = true; }
}

/**
 * 5. PRICE RANGE DYNAMICS
 */
function setupDynamicPriceRange(listings) {
    // Use 'cost' field as defined in your MongoDB documents
    const rawMax = Math.max(...listings.map(l => l.cost || 0), 100);
    const roundedMax = Math.ceil(rawMax / 10) * 10;
    
    const minS = document.getElementById('min-slider');
    const maxS = document.getElementById('max-slider');
    minS.max = roundedMax;
    maxS.max = roundedMax;
    maxS.value = 0;
    maxS.value = roundedMax;

    initSliderInteractions(roundedMax);
}

function initSliderInteractions(maxBound) {
    const minS = document.getElementById('min-slider');
    const maxS = document.getElementById('max-slider');
    const minL = document.getElementById('min-price-label');
    const maxL = document.getElementById('max-price-label');
    const track = document.querySelector('.slider-track');

    const updateSlider = () => {
        minL.textContent = `₹${minS.value}`;
        maxL.textContent = `₹${maxS.value}`;
        
        const p1 = (minS.value / maxBound) * 100;
        const p2 = (maxS.value / maxBound) * 100;
        track.style.background = `linear-gradient(to right, #d6e0d0 ${p1}%, var(--primary) ${p1}%, var(--primary) ${p2}%, #d6e0d0 ${p2}%)`;

        filterState.priceRange.min = parseInt(minS.value);
        filterState.priceRange.max = parseInt(maxS.value);
    };

    minS.addEventListener('input', updateSlider);
    maxS.addEventListener('input', updateSlider);
    
    // Automatic request on slider release to prevent API flooding
    minS.addEventListener('change', fetchAndUpdateListings);
    maxS.addEventListener('change', fetchAndUpdateListings);
    
    updateSlider();
}

/**
 * 6. RENDERING REAL LISTINGS
 */
function renderListings(listings) {
    const grid = document.getElementById('listing-grid');
    grid.innerHTML = '';

    if (listings.length === 0) {
        grid.innerHTML = '<p class="no-results" data-i18n>No equipment found matching these filters.</p>';
        return;
    }

    listings.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'listing-card';
        card.style.animationDelay = `${index * 0.06}s`;
        
        // Use the explicit image URL resolved from the images API
        const imageSrc = item.resolved_image || '/assets/placeholder-equipment.png';

        card.innerHTML = `
            <div class="card-image">
                <img src="${imageSrc}" alt="${item.heading}" loading="lazy" onerror="this.src='/assets/placeholder-equipment.png'">
            </div>
            <div class="card-content">
                <span class="card-category" data-i18n>${item.sub_category}</span>
                <h3 class="card-title" data-i18n>${item.heading}</h3>
                <p class="card-price">₹${item.cost} <span data-i18n>/ hr</span></p>
                <div class="card-footer">
                    <span class="owner"><span data-i18n>By</span> <span data-i18n>${item.owner}</span></span>
                    <button class="view-btn" onclick="window.location.href='listing-details.html?id=${item.listing_id}'" data-i18n>View Details</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}