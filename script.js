document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // CONFIGURATION - EDIT THIS SECTION
    // ===================================================================

    const CODES = {
        // Code: { slides: [array of slide numbers], message: "Unlock message" }
        'WELCOME': { slides: [1, 2, 3], message: 'Welcome to the real talk!' },
        'GAIA':    { slides: [4, 5], message: 'Meet our spy in the sky, Gaia!' },
        'GALAXY':  { slides: [7, 8, 9, 10], message: 'A tour of the Milky Way.' },
        'HERCULES':{ slides: [14, 15, 16, 17, 18], message: 'Finding misbehaving stars!' }, 
        'CRIME':   { slides: [22, 25, 29, 32], message: 'Solving the Hercules mystery.' },
        'GHOST':   { slides: [33, 35, 46, 58], message: 'We found ghost spirals!' },
        'SPLASH':  { slides: [60, 61, 62], message: 'Something hit us!' },
        'SINDY':   { slides: [69, 70, 79, 80], message: 'Unlocking my secret weapon: AI!' },
        'VERDICT': { slides: [83, 84, 85], message: 'The culprit has been identified!' },
        'THEEND':  { slides: [86, 87, 91], message: 'That\'s all, folks! Thanks for coming!' },
    };

    const CODE_ORDER = Object.keys(CODES);

    const UI_STRINGS = {
        en: {
            appTitle: 'The "Real" Thesis Defense',
            inputPlaceholder: 'Enter secret code...',
            unlockButton: 'Unlock',
            slideLinkText: 'Slide Explanation',
            codeSuccess: (msg) => `Success! ${msg}`,
            codeError: 'Oops! Wrong code. Try again.',
            forgetButton: 'Forget Codes',
            forgetConfirm: 'Are you sure you want to lock all slides again?',
            loadingLinks: 'Checking for content...' // New string for UX
        },
        ca: {
            appTitle: 'La Defensa "Real" de la Tesi',
            inputPlaceholder: 'Introdueix el codi secret...',
            unlockButton: 'Desbloca',
            slideLinkText: 'Explicació de la Diapo',
            codeSuccess: (msg) => `Èxit! ${msg}`,
            codeError: 'Ups! Codi incorrecte. Prova de nou.',
            forgetButton: 'Oblida els Codis',
            forgetConfirm: 'Estàs segur que vols tornar a bloquejar totes les diapositives?',
            loadingLinks: 'Verificant el contingut...' // New string for UX
        }
    };
    
    // ===================================================================
    // APPLICATION LOGIC - DO NOT EDIT BELOW THIS LINE
    // ===================================================================

    let state = {
        unlockedSlides: [],
        language: 'en'
    };

    const dom = {
        app: document.getElementById('app'),
        langButtons: document.querySelectorAll('.btn-lang'),
        appTitle: document.getElementById('app-title'),
        codeInput: document.getElementById('code-input'),
        unlockButton: document.getElementById('unlock-button'),
        slideLinksContainer: document.getElementById('slide-links-container'),
        slideModal: document.getElementById('slide-modal'),
        modalBody: document.getElementById('modal-body'),
        closeButton: document.querySelector('.close-button'),
        forgetButton: document.getElementById('forget-button')
    };

    function saveState() {
        localStorage.setItem('phdCompanionState', JSON.stringify(state));
    }

    function loadState() {
        const savedState = localStorage.getItem('phdCompanionState');
        if (savedState) {
            state = { ...state, ...JSON.parse(savedState) };
        }
    }
    
    function updateUIStrings() {
        const strings = UI_STRINGS[state.language];
        dom.appTitle.textContent = strings.appTitle;
        dom.codeInput.placeholder = strings.inputPlaceholder;
        dom.unlockButton.textContent = strings.unlockButton;
        dom.forgetButton.textContent = strings.forgetButton;
        dom.langButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === state.language);
        });
    }

    // MODIFIED: This function is now async and checks for file existence.
    async function renderSlideLinks() {
        // Provide immediate feedback to the user that something is happening.
        dom.slideLinksContainer.innerHTML = `<p class="loading-text">${UI_STRINGS[state.language].loadingLinks}</p>`;
        
        const sortedSlides = [...new Set(state.unlockedSlides)].sort((a, b) => a - b);
        
        if (sortedSlides.length === 0) {
            dom.slideLinksContainer.innerHTML = '';
            return;
        }

        // Create an array of promises, one for each slide file check.
        const checkPromises = sortedSlides.map(slideNum => {
            const path = `content/${state.language}/slide${slideNum}.html`;
            // Use a HEAD request for efficiency - we only need to know if it exists.
            return fetch(path, { method: 'HEAD' })
                .then(response => ({
                    slideNum: slideNum,
                    exists: response.ok // .ok is true for status codes 200-299
                }))
                .catch(() => ({
                    slideNum: slideNum,
                    exists: false // If fetch fails (e.g., network error), treat as not existing.
                }));
        });

        // Wait for all the checks to complete.
        const results = await Promise.all(checkPromises);

        // Clear the loading message.
        dom.slideLinksContainer.innerHTML = '';

        // Filter for only the slides that have content and create the links.
        results.forEach(result => {
            if (result.exists) {
                const link = document.createElement('a');
                link.href = '#';
                link.className = 'slide-link';
                link.dataset.slideId = result.slideNum;
                link.textContent = `${UI_STRINGS[state.language].slideLinkText} ${result.slideNum}`;
                dom.slideLinksContainer.appendChild(link);
            }
        });
    }

    function handleUnlock() {
        const code = dom.codeInput.value.trim().toUpperCase();
        const codeIndex = CODE_ORDER.indexOf(code);

        if (codeIndex > -1) {
            const unlockedInfo = CODES[code];
            let slidesToUnlock = [];
            for (let i = 0; i <= codeIndex; i++) {
                const currentCodeKey = CODE_ORDER[i];
                slidesToUnlock.push(...CODES[currentCodeKey].slides);
            }
            state.unlockedSlides = [...new Set(slidesToUnlock)];
            alert(UI_STRINGS[state.language].codeSuccess(unlockedInfo.message));
            dom.codeInput.value = '';
            saveState();
            renderSlideLinks(); // This is now an async function, but we can "fire and forget"
        } else {
            alert(UI_STRINGS[state.language].codeError);
        }
    }

    function handleForget() {
        if (confirm(UI_STRINGS[state.language].forgetConfirm)) {
            state.unlockedSlides = [];
            saveState();
            renderSlideLinks();
            // No alert needed here as the visual change is confirmation enough
        }
    }

    async function showModalForSlide(slideId) {
        const path = `content/${state.language}/slide${slideId}.html`;
        try {
            // We use GET here to fetch the actual content
            const response = await fetch(path);
            if (!response.ok) throw new Error('Content not found');
            const content = await response.text();
            dom.modalBody.innerHTML = content;
            dom.slideModal.classList.remove('hidden');
        } catch (error) {
            // This catch block is now just a fallback for unexpected server errors,
            // as we've already verified the file exists.
            console.error('Error fetching slide content:', error);
            dom.modalBody.innerHTML = `<p>Sorry, an unexpected error occurred while loading the content.</p>`;
            dom.slideModal.classList.remove('hidden');
        }
    }
    
    function setLanguage(lang) {
        state.language = lang;
        saveState();
        updateUIStrings();
        renderSlideLinks();
    }

    // Event Listeners
    dom.langButtons.forEach(button => {
        button.addEventListener('click', () => setLanguage(button.dataset.lang));
    });

    dom.unlockButton.addEventListener('click', handleUnlock);
    dom.codeInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleUnlock();
    });

    dom.slideLinksContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('slide-link')) {
            e.preventDefault();
            showModalForSlide(e.target.dataset.slideId);
        }
    });

    dom.closeButton.addEventListener('click', () => dom.slideModal.classList.add('hidden'));
    dom.slideModal.addEventListener('click', (e) => {
        if (e.target === dom.slideModal) {
            dom.slideModal.classList.add('hidden');
        }
    });
    
    dom.forgetButton.addEventListener('click', handleForget);

    // Initialization
    function init() {
        loadState();
        updateUIStrings();
        renderSlideLinks();
    }

    init();
});