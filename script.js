document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // CONFIGURATION - EDIT THIS SECTION
    // ===================================================================

    const CODES = {
        // Codi inicial per donar la benvinguda i explicar com funciona la web.
        'BENVINGUT': { slides: [0], message: 'Comencem l\'aventura! Aquí tens les instruccions.' },
        'RIU':       { slides: [1], message: 'La metàfora del riu, desbloquejada!' },
        'GAIA':      { slides: [2], message: 'El nostre Google Maps galàctic.' },
        'GALAXIA':     { slides: [3], message: 'Com es la nostra galaxia?' },
    
        // ===== EINES DE DINÀMICA =====
        'BARRA': { slides: [4], message: 'La cullereta que ho remena tot.' },
        'ESPIRAL':    { slides: [6], message: 'Entendre els espirals és un bon embolic.' },
        'TOBOGAN':   { slides: [8], message: 'Tothom al tobogan còsmic!' },
    
        // ===== PRIMER ARTICLE =====
        'BULTOS':  { slides: [12], message: 'El misteri de la confusió A o B.' },
        'ESQUELET': { slides: [14], message: 'Com vam construir un esquelet de la galàxia.' },
        'GRADIENT': { slides: [18], message: 'Pintant l\'esquelet per revelar la veritat.' },
        'FALLA': { slides: [20], message: 'El veredicte: els models clàssics fallen.' },
    
        // ===== SEGON ARTICLE =====
        'OMBRA':    { slides: [22], message: 'La història d\'una idea loca que va funcionar!' },
        'FANTASMA':  { slides: [26], message: 'Les ombres fantasma de la matèria fosca.' },
    
        // ===== TERCER ARTICLE (PLANTEJAMENT) =====
        'XOC':       { slides: [31], message: 'Onades galàctiques després del xoc.' },
        'CAOS':      { slides: [33], message: 'Fins i tot el cas més simple és un caos.' },
        'SINDY':    { slides: [34], message: 'El nostre primer intent... no va anar gaire bé.' },
    
        // ===== TERCER ARTICLE (RESOLUCIÓ) =====
        'FORMULA':   { slides: [35], message: 'Les equacions que ha trobat la màquina.' },
        'DADES':    { slides: [38], message: 'Tornem a les dades reals. El cercle es tanca.' },

        // ===== CONCLUSIONS =====
        'FINAL':     { slides: [41], message: 'Això és tot! Gràcies per jugar.' },
        'PREGUNTES':  { slides: [43], message: 'Gràcies! Aquí teniu una mica d\'entreteniment.' },
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
            loadingLinks: 'Checking for content...',
            prevButton: '← Previous',
            nextButton: 'Next →'
        },
        ca: {
            appTitle: 'La Defensa "Real" de la Tesi',
            inputPlaceholder: 'Introdueix el codi secret...',
            unlockButton: 'Desbloca',
            slideLinkText: 'Explicació de la Diapo',
            // He ajustat els missatges perquè el prefix "Èxit!" s'apliqui a la traducció catalana
            codeSuccess: (msg) => `Èxit! ${msg}`,
            codeError: 'Ups! Codi incorrecte. Prova de nou.',
            forgetButton: 'Oblida els Codis',
            forgetConfirm: 'Estàs segur que vols tornar a bloquejar totes les diapositives?',
            loadingLinks: 'Verificant el contingut...',
            prevButton: '← Anterior',
            nextButton: 'Següent →'
        }
    };
    
    // ===================================================================
    // APPLICATION LOGIC - DO NOT EDIT BELOW THIS LINE
    // ===================================================================

    // Funció d'ajuda per calcular la distància de Levenshtein (per a la tolerància a errors)
    function levenshtein(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        }
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }

    // CANVI PRINCIPAL: L'estat inicial estableix el català com a llengua per defecte.
    // Aquest valor només se sobreescriurà si l'usuari ja tenia un altre idioma guardat d'una visita anterior.
    let state = {
        unlockedSlides: [],
        language: 'ca',
        currentSlideIndex: -1
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
        forgetButton: document.getElementById('forget-button'),
        prevSlideButton: document.getElementById('prev-slide-button'),
        nextSlideButton: document.getElementById('next-slide-button')
    };

    function saveState() {
        localStorage.setItem('phdCompanionState', JSON.stringify(state));
    }

    function loadState() {
        const savedState = localStorage.getItem('phdCompanionState');
        if (savedState) {
            // Fusionem l'estat guardat amb el nostre estat per defecte.
            // Si l'usuari tenia 'en' guardat, aquest sobreescriurà el 'ca' per defecte.
            // Si és un visitant nou, l'estat per defecte ('ca') es mantindrà.
            state = { ...state, ...JSON.parse(savedState) };
        }
    }
    
    function updateUIStrings() {
        const strings = UI_STRINGS[state.language];
        document.documentElement.lang = state.language; // Actualitza l'atribut lang de l'HTML
        dom.appTitle.textContent = strings.appTitle;
        dom.codeInput.placeholder = strings.inputPlaceholder;
        dom.unlockButton.textContent = strings.unlockButton;
        dom.forgetButton.textContent = strings.forgetButton;
        dom.prevSlideButton.textContent = strings.prevButton;
        dom.nextSlideButton.textContent = strings.nextButton;
        dom.langButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === state.language);
        });
    }

    // Aquesta funció i la resta no necessiten canvis
    async function renderSlideLinks() {
        dom.slideLinksContainer.innerHTML = `<p class="loading-text">${UI_STRINGS[state.language].loadingLinks}</p>`;
        
        const sortedSlides = [...new Set(state.unlockedSlides)].sort((a, b) => a - b);
        
        if (sortedSlides.length === 0) {
            dom.slideLinksContainer.innerHTML = '';
            return;
        }

        const checkPromises = sortedSlides.map(slideNum => {
            const path = `content/${state.language}/slide${slideNum}.html`;
            return fetch(path, { method: 'HEAD' })
                .then(response => ({ slideNum, exists: response.ok }))
                .catch(() => ({ slideNum, exists: false }));
        });

        const results = await Promise.all(checkPromises);
        dom.slideLinksContainer.innerHTML = '';

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
        const userInput = dom.codeInput.value.trim().toUpperCase();
        if (!userInput) return; // No fer res si l'entrada està buida
    
        let foundCode = null;
    
        // 1. Comprovació de coincidència exacta (el cas més comú)
        if (CODES[userInput]) {
            foundCode = userInput;
        } 
        // 2. Si no hi ha coincidència exacta, buscar amb tolerància a 1 error
        else {
            for (const validCode of CODE_ORDER) {
                if (levenshtein(userInput, validCode) === 1) {
                    foundCode = validCode;
                    break; // Hem trobat el primer codi plausible, sortim del bucle
                }
            }
        }
    
        if (foundCode) {
            const codeData = CODES[foundCode];
            const codeIndex = CODE_ORDER.indexOf(foundCode);
            
            let slidesToUnlock = [];
            for (let i = 0; i <= codeIndex; i++) {
                const currentCodeKey = CODE_ORDER[i];
                slidesToUnlock.push(...CODES[currentCodeKey].slides);
            }
            state.unlockedSlides = [...new Set(slidesToUnlock)];
            
            alert(UI_STRINGS[state.language].codeSuccess(codeData.message));
    
            dom.codeInput.value = '';
            saveState();
            renderSlideLinks();
        } else {
            alert(UI_STRINGS[state.language].codeError);
        }
    }


    function handleForget() {
        if (confirm(UI_STRINGS[state.language].forgetConfirm)) {
            state.unlockedSlides = [];
            saveState();
            renderSlideLinks();
        }
    }

    async function showModalForSlide(slideId) {
        const sortedSlides = [...new Set(state.unlockedSlides)].sort((a, b) => a - b);
        state.currentSlideIndex = sortedSlides.indexOf(parseInt(slideId, 10));

        const path = `content/${state.language}/slide${slideId}.html`;
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error('Content not found');
            const content = await response.text();
            dom.modalBody.innerHTML = content;

            // Update nav buttons
            const hasPrev = state.currentSlideIndex > 0;
            const hasNext = state.currentSlideIndex < sortedSlides.length - 1;
            dom.prevSlideButton.classList.toggle('hidden', !hasPrev);
            dom.nextSlideButton.classList.toggle('hidden', !hasNext);

            dom.slideModal.classList.remove('hidden');
            dom.modalBody.scrollTop = 0; // Scroll to top on new slide
        } catch (error) {
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

    dom.prevSlideButton.addEventListener('click', () => {
        const sortedSlides = [...new Set(state.unlockedSlides)].sort((a, b) => a - b);
        if (state.currentSlideIndex > 0) {
            const prevSlideId = sortedSlides[state.currentSlideIndex - 1];
            showModalForSlide(prevSlideId);
        }
    });

    dom.nextSlideButton.addEventListener('click', () => {
        const sortedSlides = [...new Set(state.unlockedSlides)].sort((a, b) => a - b);
        if (state.currentSlideIndex < sortedSlides.length - 1) {
            const nextSlideId = sortedSlides[state.currentSlideIndex + 1];
            showModalForSlide(nextSlideId);
        }
    });

    function init() {
        loadState();
        updateUIStrings();
        renderSlideLinks();
    }

    init();
});