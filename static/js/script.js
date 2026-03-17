document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('image-input');
    const dropZone = document.getElementById('drop-zone');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const classifyBtn = document.getElementById('classify-btn');
    const resultSection = document.getElementById('result-section');
    const resultText = document.getElementById('result-text');

    let selectedFile = null;

    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and drop functionality
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        selectedFile = file;
        
        // Setup image preview
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            previewContainer.style.display = 'block';
            classifyBtn.disabled = false;
            
            // Hide previous results
            resultSection.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    // Classify button click
    classifyBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        // Show loading state
        classifyBtn.classList.add('loading');
        classifyBtn.disabled = true;

        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            const response = await fetch('/classify', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            // Display results
            resultSection.className = 'result-section'; // Reset classes
            if (response.ok) {
                resultText.textContent = data.result;
            } else {
                resultSection.classList.add('error');
                resultText.textContent = data.error || 'An error occurred';
            }
            resultSection.style.display = 'block';

        } catch (error) {
            resultSection.className = 'result-section error';
            resultText.textContent = 'Failed to connect to the server.';
            resultSection.style.display = 'block';
        } finally {
            // Remove loading state
            classifyBtn.classList.remove('loading');
            classifyBtn.disabled = false;
        }
    });
});
