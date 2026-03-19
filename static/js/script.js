document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const resetBtn = document.getElementById('reset-btn');
    const loader = document.getElementById('loader');
    const resultsSection = document.getElementById('results-section');

    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.remove('dragover');
        }, false);
    });

    uploadZone.addEventListener('drop', (e) => {
        let dt = e.dataTransfer;
        let files = dt.files;
        handleFiles(files);
    });

    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    resetBtn.addEventListener('click', () => {
        resetApp();
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                // Show preview
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    uploadZone.classList.add('hidden');
                    previewContainer.classList.remove('hidden');
                    
                    // Analyze
                    analyzeImage(file);
                }
            } else {
                alert("Please upload an image file.");
            }
        }
    }

    async function analyzeImage(file) {
        // Show loader, hide old results
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
                resetApp();
                return;
            }

            // Populate UI
            updateUI(data);

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
        
        document.getElementById('res-authenticity').textContent = data.authenticity || '--';
        
        // Dynamic badge color
        const badge = document.getElementById('res-authenticity');
        if (data.authenticity === 'Real Image') {
            badge.style.background = 'rgba(16, 185, 129, 0.15)';
            badge.style.color = 'var(--green)';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        } else if (data.authenticity === 'AI Generated') {
            badge.style.background = 'rgba(59, 130, 246, 0.15)';
            badge.style.color = 'var(--blue)';
            badge.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        } else {
            badge.style.background = 'rgba(168, 85, 247, 0.15)';
            badge.style.color = 'var(--purple)';
            badge.style.borderColor = 'rgba(168, 85, 247, 0.3)';
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

        // Show results with fade in
        resultsSection.classList.remove('hidden');
        resultsSection.classList.add('fade-in');
        
        // Remove animation class after it completes so it can apply again next time
        setTimeout(() => {
            resultsSection.classList.remove('fade-in');
        }, 500);
    }

    function resetApp() {
        uploadZone.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        resultsSection.classList.add('hidden');
        loader.classList.add('hidden');
        fileInput.value = '';
    }
});
