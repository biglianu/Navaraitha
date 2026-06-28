document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    initMobileMenu();
    await fetchMyBookings();
}

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

async function fetchMyBookings() {
    const list = document.getElementById('bookingList');
    const loading = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');

    try {
        const user = localStorage.getItem('navaritha_user');
        // Fetch from the new parameterized endpoint /api/bookings/:username
        const res = await fetch(`/api/bookings/${user}`);
        const data = await res.json();

        loading.style.display = 'none';

        if (data.success && data.data && data.data.length > 0) {
            renderBookings(data.data);
        } else {
            errorState.style.display = 'block';
        }
    } catch (err) {
        console.error("Fetch Bookings Error:", err);
        loading.style.display = 'none';
        errorState.style.display = 'block';
    }
}

function renderBookings(bookings) {
    const list = document.getElementById('bookingList');
    list.innerHTML = '';

    bookings.forEach((booking, idx) => {
        const card = document.createElement('div');
        card.className = 'booking-card';
        card.style.animationDelay = `${idx * 0.1}s`;

        // We assume the booking object has listing details or we need to fetch them
        // If the backend is smart, it returns the joined data.
        
        const timestamp = new Date(booking.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
        const cost = booking.cost || '0';
        const owner = booking.owner_name || 'N/A';
        const image = booking.image || '/assets/placeholder-equipment.png';
        const title = booking.heading || 'Equipment';

        card.innerHTML = `
            <img src="${image}" alt="${title}" class="booking-img" onerror="this.src='/assets/placeholder-equipment.png'">
            <div class="booking-details">
                <div class="booking-header">
                    <h3 class="booking-title" data-i18n>${title}</h3>
                    <span class="booking-status confirmed" data-i18n>Confirmed</span>
                </div>
                <div class="booking-info-grid">
                    <div class="info-item">
                        <span class="info-label" data-i18n>Booked On</span>
                        <span class="info-value">${timestamp}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label" data-i18n>Owner</span>
                        <span class="info-value" data-i18n>${owner}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label" data-i18n>Price Paid</span>
                        <span class="info-value">₹${cost}</span>
                    </div>
                </div>
                <div class="booking-footer" style="padding: 12px 18px; background: var(--bg-body); border-radius: 8px; border: 1px solid var(--border-light); display: inline-flex; justify-content: flex-end;">
                    <span style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">
                        <span data-i18n>Period:</span> ${new Date(booking.start_date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })} - ${new Date(booking.end_date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}
