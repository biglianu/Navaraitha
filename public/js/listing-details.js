document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const listingId = urlParams.get('id');

    if (!listingId) {
        showError("Invalid Listing ID. Please go back.");
        return;
    }

    initMobileMenu();
    fetchListingDetails(listingId);
});

function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
}

async function fetchListingDetails(id) {
    try {
        // Since the backend lacks a specific /listings/:id endpoint, 
        // we fetch the latest listings and find the one that matches our ID.
        // This is a client-side workaround to respect "DO NOT MODIFY BACKEND".
        const res = await fetch(`/api/listings`);
        const data = await res.json();

        if (data.success && data.data) {
            const item = data.data.find(l => l.listing_id === id);

            if (item) {
                // Fetch images for this specific listing
                const imgRes = await fetch(`/api/images?listing_id=${id}`);
                const imgData = await imgRes.json();

                if (imgData.success) {
                    item.images = imgData.images;
                } else {
                    item.images = [];
                }

                renderDetails(item);
                document.getElementById('loadingState').style.display = 'none';
                document.getElementById('layoutWrapper').style.display = 'flex';
            } else {
                showError("Listing not found in the latest equipment.");
            }
        } else {
            showError(data.error || "Failed to load listings feed.");
        }
    } catch (err) {
        console.error("Error fetching listing:", err);
        showError("Server error. Please try again later.");
    }
}

function renderDetails(item) {
    document.title = `${item.heading} — Navaritha`;

    document.getElementById('itemCategory').innerHTML = `<span data-i18n>${item.category}</span> • <span data-i18n>${item.sub_category}</span>`;

    const titleEl = document.getElementById('itemTitle');
    titleEl.textContent = item.heading;
    titleEl.setAttribute('data-i18n', '');

    document.getElementById('itemPrice').textContent = item.cost;
    document.getElementById('itemOwner').textContent = item.owner;

    const descEl = document.getElementById('itemDescription');
    descEl.textContent = item.description;
    descEl.setAttribute('data-i18n', '');

    initChat(item.listing_id, item.owner);

    // History
    if (item.history && item.history.trim() !== '') {
        const histEl = document.getElementById('itemHistory');
        histEl.textContent = item.history;
        histEl.setAttribute('data-i18n', '');
    } else {
        document.getElementById('historySection').style.display = 'none';
    }

    // Availability
    const availList = document.getElementById('availabilityList');
    if (item.available_date_ranges && item.available_date_ranges.length > 0) {
        item.available_date_ranges.forEach(range => {
            const start = new Date(range.start).toLocaleString();
            const end = new Date(range.end).toLocaleString();
            const li = document.createElement('li');
            li.textContent = `${start} to ${end}`;
            availList.appendChild(li);
        });
    } else {
        availList.innerHTML = '<li data-i18n>Always Available</li>';
    }

    // Images
    const mainImg = document.getElementById('mainImage');
    const thumbList = document.getElementById('thumbnailList');

    if (item.images && item.images.length > 0) {
        mainImg.src = item.images[0];

        item.images.forEach((imgSrc, idx) => {
            const img = document.createElement('img');
            img.src = imgSrc;
            if (idx === 0) img.classList.add('active');
            img.onclick = () => {
                mainImg.src = imgSrc;
                Array.from(thumbList.children).forEach(c => c.classList.remove('active'));
                img.classList.add('active');
            };
            thumbList.appendChild(img);
        });
    } else {
        mainImg.src = '/assets/placeholder-equipment.png';
    }

    // Booking Panel Setup
    const bookBtn = document.getElementById('bookBtn');
    const layoutWrapper = document.getElementById('layoutWrapper');
    const bookingPanel = document.getElementById('bookingPanel');
    const bookingCloseBtn = document.getElementById('bookingCloseBtn');
    const whatsappBtn = document.getElementById('whatsappBtn');

    // Set WhatsApp link correctly
    const rawOwnerPhone = item.owner_phone || '+910000000000';
    const standardizedPhone = rawOwnerPhone.replace(/[\s\-\+]/g, '');
    whatsappBtn.href = `https://wa.me/${standardizedPhone}`;

    // Handle open/close Booking Panel actions
    const openPanel = () => {
        layoutWrapper.classList.add('booking-active');
    };

    const closePanel = () => {
        layoutWrapper.classList.remove('booking-active');
    };

    bookBtn.addEventListener('click', openPanel);
    bookingCloseBtn.addEventListener('click', closePanel);

    // Dynamic Cost Calculation
    let currentCalculatedCost = item.cost;
    const startDateEl = document.getElementById('bookStartDate');
    const endDateEl = document.getElementById('bookEndDate');
    const costDisplay = document.getElementById('calculatedCostDisplay');

    const updateCost = () => {
        if (!startDateEl.value || !endDateEl.value) {
            costDisplay.textContent = '₹0';
            currentCalculatedCost = item.cost;
            return;
        }
        const sDate = new Date(startDateEl.value);
        const eDate = new Date(endDateEl.value);
        if (sDate >= eDate) {
            costDisplay.textContent = '₹0';
            currentCalculatedCost = item.cost;
            return;
        }
        const hours = Math.abs(eDate - sDate) / 36e5; // hours difference
        currentCalculatedCost = (hours * item.cost).toFixed(2);
        costDisplay.textContent = `₹${currentCalculatedCost}`;
    };

    startDateEl.addEventListener('change', updateCost);
    endDateEl.addEventListener('change', updateCost);

    // Confirm Booking API Call
    const confirmBtn = document.getElementById('confirmBookingBtn');
    confirmBtn.addEventListener('click', async () => {

        if (!startDateEl.value || !endDateEl.value) {
            alert(window.translator && window.translator.currentLang !== 'en' ? "ದಯವಿಟ್ಟು ದಿನಾಂಕಗಳನ್ನು ಆಯ್ಕೆ ಮಾಡಿ" : "Please select start and end dates.");
            return;
        }

        const sDate = new Date(startDateEl.value);
        const eDate = new Date(endDateEl.value);
        if (sDate > eDate) {
            alert(window.translator && window.translator.currentLang !== 'en' ? "ಪ್ರಾರಂಭ ದಿನಾಂಕವು ಅಂತ್ಯ ದಿನಾಂಕಕ್ಕಿಂತ ಮುಂಚೆ ಇರಬೇಕು." : "Start date must be before or equal to end date.");
            return;
        }

        const btnText = confirmBtn.querySelector('.btn-text');
        const btnIcon = confirmBtn.querySelector('.btn-icon');
        const btnSpinner = confirmBtn.querySelector('.btn-spinner');

        // UI Feedback: Loading
        confirmBtn.disabled = true;
        btnText.style.display = 'none';
        if (btnIcon) btnIcon.style.display = 'none';
        btnSpinner.style.display = 'block';

        try {
            const bookingData = {
                listing_id: item.listing_id,
                heading: item.heading,
                image: (item.images && item.images.length > 0) ? item.images[0] : '/assets/placeholder-equipment.png',
                owner_name: item.owner,
                customer_name: localStorage.getItem('navaritha_user') || 'Guest',
                cost: currentCalculatedCost,
                start_date: sDate.toISOString(),
                end_date: eDate.toISOString()
            };
            console.log(bookingData.customer_name);


            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });
            const result = await response.json();

            if (result.success) {
                alert(window.translator && window.translator.currentLang !== 'en' ? "ಬುಕಿಂಗ್ ಯಶಸ್ವಿಯಾಗಿದೆ!" : "Booking successful!");

                // Set permanent Booked state
                confirmBtn.innerHTML = `<span data-i18n>Booking Confirmed</span>`;
                confirmBtn.disabled = true;
                confirmBtn.style.background = "var(--text-muted)";
                confirmBtn.style.cursor = "default";

                // Also update the main trigger button
                const mainBookBtn = document.getElementById('bookBtn');
                if (mainBookBtn) {
                    mainBookBtn.textContent = window.translator && window.translator.currentLang !== 'en' ? "ಬುಕ್ ಮಾಡಲಾಗಿದೆ" : "Booked";
                    mainBookBtn.style.background = "var(--text-muted)";
                    mainBookBtn.disabled = true;
                }

                // Update QR section to show success
                const qrSection = document.querySelector('.qr-section');
                if (qrSection) {
                    qrSection.innerHTML = `
                        <div style="font-size: 3rem; color: var(--primary); margin-bottom: 10px;">✓</div>
                        <h4 data-i18n>Payment Verified</h4>
                        <p class="qr-helper-text" data-i18n>Your booking request has been sent to the owner.</p>
                    `;
                }

                setTimeout(() => closePanel(), 1500);
            } else {
                alert(result.error || "Booking failed.");
            }
        } catch (error) {
            console.error("Booking Error:", error);
            alert("An error occurred during booking.");
        } finally {
            confirmBtn.disabled = false;
            btnText.style.display = 'block';
            if (btnIcon) btnIcon.style.display = 'block';
            btnSpinner.style.display = 'none';
        }
    });
}

function showError(msg) {
    document.getElementById('loadingState').style.display = 'none';
    const lw = document.getElementById('layoutWrapper');
    if (lw) lw.style.display = 'none';
    const errState = document.getElementById('errorState');
    errState.style.display = 'block';
    document.getElementById('errorMsg').textContent = msg;
}

let socket;

function initChat(listingId, ownerName) {
    const currentUser = localStorage.getItem('navaritha_user');
    console.log(currentUser);
    if (!currentUser || currentUser === ownerName) {
        document.querySelector('.chat-section').style.display = 'none';
        return;
    }

    // Connect to WebSocket via Nginx proxy (which uses /api/)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}/api/`);

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'auth', username: currentUser }));
        loadChatHistory(listingId, currentUser, ownerName);
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message' && data.listing_id === listingId) {
            appendMessage(data.sender, data.message, 'received');
        }
    };

    document.getElementById('sendMsgBtn').onclick = () => sendMessage(listingId, currentUser, ownerName);
}

async function loadChatHistory(listingId, me, owner) {
    const res = await fetch(`/api/chat/${listingId}/${me}/${owner}`);
    const result = await res.json();
    if (result.success) {
        result.data.forEach(msg => {
            appendMessage(msg.sender, msg.message, msg.sender === me ? 'sent' : 'received');
        });
    }
}

function sendMessage(listingId, sender, receiver) {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    const payload = { type: 'message', listing_id: listingId, sender, receiver, message };
    socket.send(JSON.stringify(payload));

    appendMessage(sender, message, 'sent');
    input.value = '';
}

function appendMessage(sender, text, type) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}