class Translator {
    constructor() {
        this.currentLang = localStorage.getItem('preferredLanguage') || 'en';
        // Persistent cache for translations across reloads
        try {
            this.cache = JSON.parse(localStorage.getItem('translationCache') || '{}');
        } catch (e) {
            this.cache = {};
        }
        this.observer = null;
        this.isTranslating = false;
        this.pendingRequests = new Set();
    }

    async init() {
        this.bindSwitcher();
        await this.translatePage();
        this.updateSwitcherUI();
        this.startObserver();
    }

    bindSwitcher() {
        const switcherBtn = document.getElementById('langSwitcherBtn');
        const switcherMenu = document.getElementById('langSwitcherMenu');
        if (!switcherBtn || !switcherMenu) return;

        switcherBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            switcherMenu.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            switcherMenu.classList.remove('active');
        });

        switcherMenu.querySelectorAll('.lang-option').forEach(option => {
            option.addEventListener('click', async (e) => {
                e.preventDefault();
                const lang = e.target.closest('.lang-option').dataset.lang;
                if (lang !== this.currentLang) {
                    await this.setLanguage(lang);
                }
            });
        });
    }

    updateSwitcherUI() {
        const switcherMenu = document.getElementById('langSwitcherMenu');
        if (!switcherMenu) return;
        switcherMenu.querySelectorAll('.lang-option').forEach(option => {
            option.classList.toggle('active', option.dataset.lang === this.currentLang);
        });
    }

    async setLanguage(langCode) {
        this.currentLang = langCode;
        localStorage.setItem('preferredLanguage', langCode);
        this.updateSwitcherUI();
        // Clear non-current lang cache if it gets too big (optional)
        await this.translatePage();
    }

    startObserver() {
        if (this.observer) this.observer.disconnect();

        this.observer = new MutationObserver(async (mutations) => {
            if (this.currentLang === 'en') return;
            
            let hasNewI18n = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            if (node.hasAttribute('data-i18n') || node.hasAttribute('data-i18n-placeholder')) {
                                hasNewI18n = true;
                                break;
                            }
                            if (node.querySelector('[data-i18n], [data-i18n-placeholder]')) {
                                hasNewI18n = true;
                                break;
                            }
                        }
                    }
                }
                if (hasNewI18n) break;
            }

            if (hasNewI18n) {
                // Debounce translation calls
                clearTimeout(this.observerTimeout);
                this.observerTimeout = setTimeout(() => this.translatePage(), 50);
            }
        });

        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    async translatePage() {
        if (this.isTranslating) return;
        this.isTranslating = true;

        try {
            const elements = document.querySelectorAll('[data-i18n], [data-i18n-placeholder]');
            const textsToTranslate = new Set();

            elements.forEach(el => {
                if (el.hasAttribute('data-i18n')) {
                    // Store original text as key if not already there
                    if (!el.hasAttribute('data-i18n-key')) {
                        el.setAttribute('data-i18n-key', el.textContent.trim());
                    }
                    const key = el.getAttribute('data-i18n-key');
                    if (key && this.currentLang !== 'en') textsToTranslate.add(key);
                }
                if (el.hasAttribute('data-i18n-placeholder')) {
                    if (!el.hasAttribute('data-i18n-placeholder-key')) {
                        el.setAttribute('data-i18n-placeholder-key', el.getAttribute('placeholder') || '');
                    }
                    const key = el.getAttribute('data-i18n-placeholder-key');
                    if (key && this.currentLang !== 'en') textsToTranslate.add(key);
                }
            });

            if (this.currentLang === 'en') {
                // Revert to original keys
                elements.forEach(el => {
                    if (el.hasAttribute('data-i18n-key')) {
                        el.textContent = el.getAttribute('data-i18n-key');
                    }
                    if (el.hasAttribute('data-i18n-placeholder-key')) {
                        el.setAttribute('placeholder', el.getAttribute('data-i18n-placeholder-key'));
                    }
                });
                this.isTranslating = false;
                return;
            }

            const translations = await this.getTranslations(Array.from(textsToTranslate), this.currentLang);

            elements.forEach(el => {
                if (el.hasAttribute('data-i18n')) {
                    const key = el.getAttribute('data-i18n-key');
                    if (translations[key]) el.textContent = translations[key];
                }
                if (el.hasAttribute('data-i18n-placeholder')) {
                    const key = el.getAttribute('data-i18n-placeholder-key');
                    if (translations[key]) el.setAttribute('placeholder', translations[key]);
                }
            });
        } finally {
            this.isTranslating = false;
        }
    }

    async getTranslations(texts, targetLang) {
        if (!this.cache[targetLang]) this.cache[targetLang] = {};
        
        const result = {};
        const missing = [];

        texts.forEach(text => {
            if (this.cache[targetLang][text]) {
                result[text] = this.cache[targetLang][text];
            } else if (text.trim() && isNaN(text)) {
                missing.push(text);
            } else {
                result[text] = text;
            }
        });

        if (missing.length > 0) {
            // Batch requests or execute them in parallel carefully
            const translatedArr = await Promise.all(missing.map(async (text) => {
                try {
                    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
                    const res = await fetch(url);
                    const data = await res.json();
                    let trans = "";
                    if (data && data[0]) {
                        data[0].forEach(part => { if (part[0]) trans += part[0]; });
                    }
                    return trans || text;
                } catch (e) {
                    return text;
                }
            }));

            missing.forEach((text, i) => {
                const trans = translatedArr[i];
                this.cache[targetLang][text] = trans;
                result[text] = trans;
            });

            // Persist cache
            localStorage.setItem('translationCache', JSON.stringify(this.cache));
        }

        return result;
    }

    async translateResponse(data) {
        if (this.currentLang === 'en') return data;
        const texts = new Set();
        this.extractTexts(data, texts);
        const arr = Array.from(texts);
        if (arr.length === 0) return data;
        const translations = await this.getTranslations(arr, this.currentLang);
        return this.applyTranslations(data, translations);
    }

    extractTexts(obj, textSet) {
        if (typeof obj === 'string') {
            const t = obj.trim();
            if (t && isNaN(t) && !t.startsWith('/') && !t.startsWith('http') && t.length < 1000) {
                textSet.add(t);
            }
        } else if (Array.isArray(obj)) {
            obj.forEach(i => this.extractTexts(i, textSet));
        } else if (obj && typeof obj === 'object') {
            const skip = ['listing_id', 'id', '_id', 'media_path', 'created_at', 'updated_at', 'image', 'images', 'token'];
            Object.entries(obj).forEach(([k, v]) => {
                if (!skip.includes(k)) this.extractTexts(v, textSet);
            });
        }
    }

    applyTranslations(obj, translations) {
        if (typeof obj === 'string') {
            return translations[obj.trim()] || obj;
        } else if (Array.isArray(obj)) {
            return obj.map(i => this.applyTranslations(i, translations));
        } else if (obj && typeof obj === 'object') {
            const newObj = {};
            const skip = ['listing_id', 'id', '_id', 'media_path', 'created_at', 'updated_at', 'image', 'images', 'token'];
            Object.entries(obj).forEach(([k, v]) => {
                if (skip.includes(k)) newObj[k] = v;
                else newObj[k] = this.applyTranslations(v, translations);
            });
            return newObj;
        }
        return obj;
    }
}

// Global Interception
(function() {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        const url = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');
        
        const isApi = url.includes('/api/');
        const isTrans = url.includes('translate.googleapis.com');
        
        if (isApi && !isTrans && response.ok) {
            try {
                // Clone the response so we don't consume the main body stream
                const clonedRes = response.clone();
                const originalJson = response.json.bind(response);
                
                response.json = async function () {
                    try {
                        const data = await clonedRes.json();
                        if (window.translator && window.translator.currentLang !== 'en') {
                            return await window.translator.translateResponse(data);
                        }
                        return data;
                    } catch (e) {
                        return originalJson();
                    }
                };
            } catch (e) {
                console.error("Translation Intercept Error:", e);
            }
        }
        return response;
    };
})();

window.translator = new Translator();
document.addEventListener('DOMContentLoaded', () => window.translator.init());

