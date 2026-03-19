document.addEventListener('DOMContentLoaded', () => {
    // Nav elements
    const navBtns = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');
    const viewSubtitle = document.getElementById('view-subtitle');
    
    // Dashboard elements
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const resetBtn = document.getElementById('reset-btn');
    const loader = document.getElementById('loader');
    const resultsSection = document.getElementById('results-section');

    // History & Settings elements
    const historyContainer = document.getElementById('history-container');
    const noHistoryMsg = document.getElementById('no-history-msg');
    const clearHistoryBtn = document.getElementById('btn-clear-history');

    // -- State Management --
    let currentHistory = JSON.parse(localStorage.getItem('visionAI_history')) || [];

    // -- Navigation Tabs --
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const target = btn.getAttribute('data-target');
            
            // Hide all views
            viewSections.forEach(section => section.classList.add('hidden'));
            document.getElementById(`view-${target}`).classList.remove('hidden');

            // Update Header Subtitle
            if(target === 'dashboard') {
                viewSubtitle.textContent = "Upload an image to extract actionable insights instantly using our advanced AI models.";
            } else if(target === 'history') {
                viewSubtitle.textContent = "Review your highly detailed past image classification inferences.";
                renderHistory();
            } else if(target === 'settings') {
                viewSubtitle.textContent = "Manage local application data and layout preferences.";
            }
        });
    });

    // -- Dashboard / File Upload --
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => uploadZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('dragover'), false);
    });

    uploadZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', function() { handleFiles(this.files); });
    resetBtn.addEventListener('click', () => resetApp());

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (e) => {
                    const dataUrl = e.target.result;
                    imagePreview.src = dataUrl;
                    uploadZone.classList.add('hidden');
                    previewContainer.classList.remove('hidden');
                    analyzeImage(file, dataUrl);
                }
            } else {
                alert("Please upload an image file.");
            }
        }
    }

    async function analyzeImage(file, dataUrl) {
        loader.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        previewContainer.style.opacity = '0.5';

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.error) {
                alert("Error: " + data.error);
                resetApp(); return;
            }

            updateUI(data);
            saveToHistory(data, dataUrl);

        } catch (error) {
            console.error(error);
            alert("An error occurred during analysis.");
            resetApp();
        } finally {
            loader.classList.add('hidden');
            previewContainer.style.opacity = '1';
        }
    }

    function updateUI(data) {
        document.getElementById('res-prediction').textContent = data.prediction || '--';
        document.getElementById('res-accuracy').textContent = data.accuracy !== undefined ? data.accuracy + '%' : '--%';
        document.getElementById('res-quality').textContent = data.quality !== undefined ? data.quality : '--';
        document.getElementById('res-background').textContent = data.background || '--';
        
        const authenticityBadge = document.getElementById('res-authenticity');
        authenticityBadge.textContent = data.authenticity || '--';
        
        if (data.authenticity === 'Real Image') {
            authenticityBadge.style.background = 'rgba(16, 185, 129, 0.15)';
            authenticityBadge.style.color = 'var(--green)';
            authenticityBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        } else if (data.authenticity === 'AI Generated') {
            authenticityBadge.style.background = 'rgba(59, 130, 246, 0.15)';
            authenticityBadge.style.color = 'var(--blue)';
            authenticityBadge.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        } else {
            authenticityBadge.style.background = 'rgba(168, 85, 247, 0.15)';
            authenticityBadge.style.color = 'var(--purple)';
            authenticityBadge.style.borderColor = 'rgba(168, 85, 247, 0.3)';
        }

        document.getElementById('res-description').textContent = data.description || '--';
        document.getElementById('res-objects').textContent = data.detected_objects || '--';
        document.getElementById('res-sharpness').textContent = data.sharpness !== undefined ? data.sharpness : '--';

        const genderSection = document.getElementById('gender-section');
        if (data.gender) {
            genderSection.classList.remove('hidden');
            document.getElementById('res-male-count').textContent = data.gender.male;
            document.getElementById('res-female-count').textContent = data.gender.female;
        } else {
            genderSection.classList.add('hidden');
        }

        resultsSection.classList.remove('hidden');
        resultsSection.classList.add('fade-in');
        setTimeout(() => resultsSection.classList.remove('fade-in'), 500);
    }

    function resetApp() {
        uploadZone.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        resultsSection.classList.add('hidden');
        loader.classList.add('hidden');
        fileInput.value = '';
    }

    // -- History Data Logic --
    function saveToHistory(data, dataUrl) {
        const item = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            image: dataUrl,
            prediction: data.prediction,
            accuracy: data.accuracy,
            authenticity: data.authenticity
        };
        currentHistory.unshift(item); // Add to sequence front
        
        // Keep only last 20 to avoid exceeding localStorage quota
        if(currentHistory.length > 20) currentHistory.pop();
        
        localStorage.setItem('visionAI_history', JSON.stringify(currentHistory));
    }

    function renderHistory() {
        historyContainer.innerHTML = '';
        
        if (currentHistory.length === 0) {
            historyContainer.classList.add('hidden');
            noHistoryMsg.classList.remove('hidden');
            return;
        }

        noHistoryMsg.classList.add('hidden');
        historyContainer.classList.remove('hidden');

        currentHistory.forEach(item => {
            const card = document.createElement('div');
            card.className = 'glass-card history-card fade-in';
            card.innerHTML = `
                <img src="${item.image}" alt="History item" class="history-img">
                <div class="history-content">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <h4 style="font-size: 18px;">${item.prediction}</h4>
                        <span class="badge" style="font-size: 10px;">${item.authenticity}</span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 8px;"><i class="fa-regular fa-clock"></i> ${item.date}</p>
                    <p style="font-size: 14px; color: var(--blue);"><i class="fa-solid fa-bullseye"></i> Accuracy: ${item.accuracy}%</p>
                </div>
            `;
            historyContainer.appendChild(card);
        });
    }

    // -- Settings Logic --
    clearHistoryBtn.addEventListener('click', () => {
        if(confirm("Are you sure you want to clear all history? This cannot be undone.")) {
            localStorage.removeItem('visionAI_history');
            currentHistory = [];
            alert("History cleared successfully.");
            if (!document.getElementById('view-history').classList.contains('hidden')) {
                renderHistory();
            }
        }
    });

    // -- Preferences Logic --
    const themeToggle = document.getElementById('theme-toggle');
    const animationToggle = document.getElementById('animation-toggle');
    
    let prefs = JSON.parse(localStorage.getItem('visionAI_prefs')) || { lightTheme: false, animations: true };
    
    if(prefs.lightTheme) {
        document.body.classList.add('light-theme');
        themeToggle.checked = true;
    }
    if(!prefs.animations) {
        document.body.classList.add('no-animations');
        animationToggle.checked = false;
    }

    themeToggle.addEventListener('change', (e) => {
        prefs.lightTheme = e.target.checked;
        if(prefs.lightTheme) document.body.classList.add('light-theme');
        else document.body.classList.remove('light-theme');
        localStorage.setItem('visionAI_prefs', JSON.stringify(prefs));
    });

    animationToggle.addEventListener('change', (e) => {
        prefs.animations = e.target.checked;
        if(!prefs.animations) document.body.classList.add('no-animations');
        else document.body.classList.remove('no-animations');
        localStorage.setItem('visionAI_prefs', JSON.stringify(prefs));
    });
});
