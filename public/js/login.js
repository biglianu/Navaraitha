const authContainer = document.getElementById('authContainer');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

// --- TERMS MODAL LOGIC ---
const termsModal = document.getElementById('termsModal');
const openTermsLink = document.getElementById('openTerms');
const closeTermsBtn = document.getElementById('closeTerms');

if (openTermsLink) {
    openTermsLink.onclick = (e) => {
        e.preventDefault();
        termsModal.classList.add('active');
    };
}

if (closeTermsBtn) {
    closeTermsBtn.onclick = () => {
        termsModal.classList.remove('active');
    };
}

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target === termsModal) {
        termsModal.classList.remove('active');
    }
});

// --- UI TOGGLE LOGIC ---
document.getElementById('toSignup').onclick = () => {
    authContainer.classList.remove('show-login');
};

document.getElementById('toLogin').onclick = () => {
    authContainer.classList.add('show-login');
};

// --- UTILITY: API HANDLER ---
async function postData(url, data) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await res.json();
    } else {
        const text = await res.text();
        console.error("Server returned non-JSON:", text);
        throw new Error("Server configuration error (Check Logs)");
    }
}

// Phone number formatting
document.getElementById('regPhone').addEventListener('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
});

// --- SIGN UP ---
signupForm.onsubmit = async (e) => {
    e.preventDefault();

    const phoneInput = document.getElementById('regPhone').value;
    const agreeChecked = document.getElementById('termsAgree').checked;

    if (phoneInput.length !== 10) return alert("Enter 10-digit phone number.");

    // Explicitly check T&C before allowing signup
    if (!agreeChecked) {
        return alert("Please agree to the terms and conditions.");
    }

    const payload = {
        username: document.getElementById('regUser').value,
        mobileno: "+91" + phoneInput,
        password: document.getElementById('regPass').value
    };

    try {
        const data = await postData('/api/users/signup', payload);
        if (data.success || data.message === "User created") {
            alert('Signup successful!');
            document.getElementById('toLogin').click();
        } else {
            alert(data.error || 'Signup failed');
        }
    } catch (err) {
        alert(err.message);
    }
};

// --- LOGIN ---
loginForm.onsubmit = async (e) => {
    e.preventDefault();

    const payload = Object.fromEntries(new FormData(loginForm));

    try {
        const data = await postData('/api/users/login', payload);
        if (data.token) {
            localStorage.setItem('navaritha_token', data.token);
            localStorage.setItem('navaritha_user', payload.username);
            window.location.href = 'listings.html';
        } else {
            alert(data.error || 'Invalid credentials');
        }
    } catch (err) {
        alert("Server connection error: " + err.message);
    }
};