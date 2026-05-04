// Configuration
const GEMINI_API_KEY = "AIzaSyDEkY4ZI4M49RUWumlXt6ocao0iC0lYs7Q";
const firebaseConfig = {
  apiKey: "AIzaSyCJ7LMWHkcL1W23OgQlBV0ficQkdljAyrk",
  authDomain: "neuro-5edf2.firebaseapp.com",
  projectId: "neuro-5edf2",
  storageBucket: "neuro-5edf2.firebasestorage.app",
  messagingSenderId: "370736241678",
  appId: "1:370736241678:web:41cfcd5fd5809d10b9705f",
  measurementId: "G-5MZC0E00YZ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// DOM Elements
const els = {
    loader: document.getElementById('full-loader'),
    scrollContainer: document.getElementById('scroll-container'),
    userMenu: document.getElementById('user-menu'),
    pages: {
        login: document.getElementById('page-login'),
        hero: document.getElementById('page-hero'),
        input: document.getElementById('page-input'),
        analyzing: document.getElementById('page-analyzing'),
        results: document.getElementById('page-results'),
        breathing: document.getElementById('page-breathing')
    },
    input: document.getElementById('user-input'),
    charCount: document.getElementById('char-count'),
    error: document.getElementById('input-error'),
    errorText: document.getElementById('input-error-text'),
    results: {
        sentiment: document.getElementById('result-sentiment'),
        summary: document.getElementById('result-summary'),
        planContainer: document.getElementById('plan-container'),
        swipeIndicator: document.getElementById('results-swipe-indicator')
    },
    breathing: {
        circle: document.getElementById('breathe-circle'),
        instruction: document.getElementById('breathe-instruction'),
        btn: document.getElementById('start-breathe-btn') 
    }
};

let currentUser = null;

// Auth Listener bypassed for testing
setTimeout(() => {
    const user = { displayName: 'Guest', email: 'guest@example.com' };
    currentUser = user;
    setTimeout(() => {
        els.loader.style.opacity = '0';
        setTimeout(() => els.loader.classList.add('hidden'), 300);
        els.scrollContainer.classList.remove('hidden');
    }, 500);

    // Hide all pages initially
    Object.values(els.pages).forEach(p => p.classList.add('hidden'));

    if (user) {
        els.userMenu.classList.remove('hidden');
        // Show the interactive swipe flow
        els.pages.hero.classList.remove('hidden');
        els.pages.input.classList.remove('hidden');
        // Reset scroll to top
        els.scrollContainer.scrollTop = 0;
    } else {
        els.userMenu.classList.add('hidden');
        // Show only login
        els.pages.login.classList.remove('hidden');
    }
}, 500);

// Input logic
els.input.addEventListener('input', (e) => {
    const text = e.target.value;
    els.charCount.textContent = `${text.length} / 2000`;
    if (text.length > 2000) els.input.value = text.substring(0, 2000);
    els.error.classList.add('hidden');
});

// App Controller
window.app = {
    signInWithGoogle: () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(e => alert("Sign in failed."));
    },
    signOut: () => {
        auth.signOut();
        els.input.value = '';
        els.charCount.textContent = '0 / 2000';
        els.scrollContainer.scrollTop = 0;
    },
    scrollTo: (id) => {
        const target = document.getElementById(id);
        if(target && !target.classList.contains('hidden')) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    },
    analyzeInput: async () => {
        const text = els.input.value.trim();
        if (text.length < 10) {
            els.errorText.textContent = 'Please describe your feelings in a bit more detail.';
            els.error.classList.remove('hidden');
            return;
        }
        
        // Show analyzing page and scroll to it
        els.pages.analyzing.classList.remove('hidden');
        app.scrollTo('page-analyzing');

        try {
            const result = await fetchGeminiAnalysis(text);
            renderResults(result);
            
            // Hide analyzing, show results
            setTimeout(() => {
                els.pages.analyzing.classList.add('hidden');
                els.pages.results.classList.remove('hidden');
                app.scrollTo('page-results');
            }, 1000);

        } catch (error) {
            console.error(error);
            els.pages.analyzing.classList.add('hidden');
            els.errorText.textContent = "Sorry, analysis failed. Try again.";
            els.error.classList.remove('hidden');
            app.scrollTo('page-input');
        }
    },

    startBreathingExercise: () => {
        els.breathing.btn.classList.add('hidden');
        
        const runCycle = () => {
            els.breathing.instruction.textContent = "Breathe In...";
            els.breathing.circle.className = "breathe-circle breathe-in";
            
            window.breathingTimeout1 = setTimeout(() => {
                els.breathing.instruction.textContent = "Hold...";
                els.breathing.circle.className = "breathe-circle breathe-hold";
                
                window.breathingTimeout2 = setTimeout(() => {
                    els.breathing.instruction.textContent = "Breathe Out...";
                    els.breathing.circle.className = "breathe-circle breathe-out";
                }, 2000);
            }, 4000);
        };

        runCycle();
        window.breathingInterval = setInterval(runCycle, 10000);
    }
};

// API Call
async function fetchGeminiAnalysis(text) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const prompt = `You are Lumina, a compassionate AI wellness doctor specializing in burnout detection and stress management. 
Analyze the user's input for signs of burnout, stress, and emotional exhaustion. 
Based on your analysis, provide a gentle, step-by-step action plan to help the user. 
Your tone should be empathetic, bright, professional, and reassuring. 
If suggesting a breathing exercise, set the 'type' field to 'breathing'.

Respond ONLY with valid JSON:
{"analysis": {"sentiment": "Short", "summary": "Paragraph"}, "plan": [{"step": 1, "title": "T", "description": "D", "type": "text"}]}
User input: "${text}"`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });
    if (!res.ok) throw new Error("API Error");
    const data = await res.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
}

function renderResults(data) {
    els.results.sentiment.textContent = data.analysis.sentiment;
    els.results.summary.textContent = data.analysis.summary;
    els.results.planContainer.innerHTML = '';
    
    let hasBreathing = false;

    data.plan.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `plan-item`;
        
        let action = '';
        if (item.type === 'breathing' || item.title.toLowerCase().includes('breathe')) {
            hasBreathing = true;
            action = `<button onclick="app.scrollTo('page-breathing')" class="btn btn-secondary" style="margin-top:1rem;font-size:0.875rem;"><i class="fa-solid fa-lungs"></i> Do Breathing Exercise</button>`;
        }

        div.innerHTML = `
            <div class="plan-step-num">${item.step}</div>
            <div style="flex-grow: 1;">
                <h4 style="color: var(--text-main); margin-bottom: 0.5rem;">${item.title}</h4>
                <p style="margin-bottom: 0;">${item.description}</p>
                ${action}
            </div>
        `;
        els.results.planContainer.appendChild(div);
    });

    if (hasBreathing) {
        els.pages.breathing.classList.remove('hidden');
        els.results.swipeIndicator.style.display = 'flex';
    } else {
        els.pages.breathing.classList.add('hidden');
        els.results.swipeIndicator.style.display = 'none';
    }
}
