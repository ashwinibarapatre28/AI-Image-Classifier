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
    const exportHistoryBtn = document.getElementById('btn-export-history');

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
            } else if(target === 'analytics') {
                viewSubtitle.textContent = "Gain comprehensive insights from your historical classification metrics.";
                renderAnalytics();
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
                if (prefs.errorAlerts !== false) {
                    alert("Error: " + data.error);
                }
                resetApp(); return;
            }

            updateUI(data);
            saveToHistory(data, dataUrl);

            // Optional: User requested Notification preferences
            if (prefs.soundNotifications) {
                const audio = new Audio('https://upload.wikimedia.org/wikipedia/commons/e/ec/Chime-sound.mp3');
                audio.play().catch(e => console.log('Audio disabled by browser.', e));
            }
            if (prefs.successAlerts) {
                setTimeout(() => alert("Analysis complete successfully!"), 50);
            }

        } catch (error) {
            console.error(error);
            if (prefs.errorAlerts !== false) {
                alert("An error occurred during analysis.");
            }
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
        
        const resResolution = document.getElementById('res-resolution');
        if (resResolution) resResolution.textContent = data.resolution || '--';

        const resAuthenticity = document.getElementById('res-authenticity');
        if (resAuthenticity) resAuthenticity.textContent = data.authenticity || '--';

        document.getElementById('res-description').textContent = data.description || '--';
        document.getElementById('res-objects').textContent = data.detected_objects || '--';
        document.getElementById('res-sharpness').textContent = data.sharpness !== undefined ? data.sharpness : '--';

        const personsMetric = document.getElementById('total-persons-metric');
        if (data.total_persons !== undefined && data.total_persons > 0) {
            if (personsMetric) personsMetric.style.display = 'flex';
            const resPersons = document.getElementById('res-persons');
            if (resPersons) resPersons.textContent = data.total_persons;
        } else {
            if (personsMetric) personsMetric.style.display = 'none';
        }

        if (data.annotated_image) {
            imagePreview.src = data.annotated_image;
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
        
        const personsMetric = document.getElementById('total-persons-metric');
        if (personsMetric) personsMetric.style.display = 'none';
    }

    // -- History Data Logic --
    function saveToHistory(data, dataUrl) {
        const item = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            image: dataUrl,
            prediction: data.prediction,
            accuracy: data.accuracy
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
            if (!document.getElementById('view-analytics').classList.contains('hidden')) {
                renderAnalytics();
            }
        }
    });

    exportHistoryBtn?.addEventListener('click', () => {
        if (currentHistory.length === 0) {
            alert("No history to export.");
            return;
        }
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(20);
            doc.text("VisionAI - Analysis History", 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Exported on ${new Date().toLocaleString()}`, 14, 30);
            
            const tableColumn = ["Date", "Prediction", "Accuracy (%)"];
            const tableRows = [];
            
            currentHistory.forEach(item => {
                tableRows.push([
                    item.date,
                    item.prediction,
                    item.accuracy
                ]);
            });
            
            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 38,
                theme: 'striped',
                headStyles: { fillColor: [99, 102, 241] }
            });
            
            doc.save('visionAI_history.pdf');
        } catch (e) {
            console.error("PDF generation failed", e);
            alert("Failed to generate PDF. Make sure jsPDF is loaded.");
        }
    });

    // -- Analytics Chart Logic --
    let analyticsChartInstance = null;
    
    function renderAnalytics() {
        // Calculate stats
        const total = currentHistory.length;
        document.getElementById('stat-total').textContent = total;
        
        let avgAccuracy = 0;
        let realCount = 0;
        const classCounts = {};
        
        if (total > 0) {
            const sumAcc = currentHistory.reduce((acc, item) => acc + parseFloat(item.accuracy), 0);
            avgAccuracy = (sumAcc / total).toFixed(1);
            

            
            currentHistory.forEach(item => {
                const pred = item.prediction;
                if (!classCounts[pred]) classCounts[pred] = 0;
                classCounts[pred]++;
            });
        }
        
        document.getElementById('stat-accuracy').textContent = avgAccuracy + '%';
        
        // Render Chart
        const ctx = document.getElementById('predictionsChart').getContext('2d');
        
        // Destroy existing chart to prevent memory leaks and overlapping renders
        if (analyticsChartInstance) {
            analyticsChartInstance.destroy();
        }
        
        const isLightTheme = document.body.classList.contains('light-theme');
        const textColor = isLightTheme ? '#64748b' : '#94a3b8';
        const gridColor = isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
        
        analyticsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(classCounts),
                datasets: [{
                    label: 'Classification Frequency',
                    data: Object.values(classCounts),
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1,
                    borderRadius: 8,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: isLightTheme ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.9)',
                        titleColor: isLightTheme ? '#0f172a' : '#f8fafc',
                        bodyColor: isLightTheme ? '#475569' : '#cbd5e1',
                        borderColor: isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 14, family: "'Inter', sans-serif" },
                        bodyFont: { size: 13, family: "'Inter', sans-serif" }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            color: textColor,
                            font: { family: "'Inter', sans-serif" }
                        },
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: textColor,
                            font: { family: "'Inter', sans-serif", size: 13 }
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    }
                }
            }
        });
    }

    // -- Preferences Logic --
    const themeToggle = document.getElementById('theme-toggle');
    const animationToggle = document.getElementById('animation-toggle');
    const successAlertToggle = document.getElementById('success-alert-toggle');
    const errorAlertToggle = document.getElementById('error-alert-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    let defaultPrefs = { lightTheme: false, animations: true, successAlerts: true, errorAlerts: true, soundNotifications: false };
    let prefs = Object.assign(defaultPrefs, JSON.parse(localStorage.getItem('visionAI_prefs')) || {});
    
    // Set UI state based on prefs
    if(prefs.lightTheme) {
        document.body.classList.add('light-theme');
        if(themeToggle) themeToggle.checked = true;
    }
    if(!prefs.animations) {
        document.body.classList.add('no-animations');
        if(animationToggle) animationToggle.checked = false;
    }
    if(successAlertToggle) successAlertToggle.checked = prefs.successAlerts;
    if(errorAlertToggle) errorAlertToggle.checked = prefs.errorAlerts;
    if(soundToggle) soundToggle.checked = prefs.soundNotifications;

    themeToggle?.addEventListener('change', (e) => {
        prefs.lightTheme = e.target.checked;
        if(prefs.lightTheme) document.body.classList.add('light-theme');
        else document.body.classList.remove('light-theme');
        localStorage.setItem('visionAI_prefs', JSON.stringify(prefs));
    });

    animationToggle?.addEventListener('change', (e) => {
        prefs.animations = e.target.checked;
        if(!prefs.animations) document.body.classList.add('no-animations');
        else document.body.classList.remove('no-animations');
        localStorage.setItem('visionAI_prefs', JSON.stringify(prefs));
    });

    successAlertToggle?.addEventListener('change', (e) => {
        prefs.successAlerts = e.target.checked;
        localStorage.setItem('visionAI_prefs', JSON.stringify(prefs));
    });

    errorAlertToggle?.addEventListener('change', (e) => {
        prefs.errorAlerts = e.target.checked;
        localStorage.setItem('visionAI_prefs', JSON.stringify(prefs));
    });

    soundToggle?.addEventListener('change', (e) => {
        prefs.soundNotifications = e.target.checked;
        localStorage.setItem('visionAI_prefs', JSON.stringify(prefs));
    });
});
