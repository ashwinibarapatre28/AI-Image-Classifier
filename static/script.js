document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('upload-btn');
    const imageInput = document.getElementById('image-input');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const analyzeBtn = document.getElementById('analyze-btn');
    const loading = document.getElementById('loading');
    const resultSection = document.getElementById('result-section');
    const errorMsg = document.getElementById('error-message');
    const resetBtn = document.getElementById('reset-btn');

    // Results DOM
    const predValue = document.getElementById('pred-value');
    const descValue = document.getElementById('desc-value');
    const objValue = document.getElementById('obj-value');
    
    let selectedFile = null;

    uploadBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            selectedFile = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                uploadBtn.classList.add('hidden');
                previewContainer.classList.remove('hidden');
                resultSection.classList.add('hidden');
                errorMsg.classList.add('hidden');
            };

            reader.readAsDataURL(selectedFile);
        }
    });

    analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        // UI State: Loading
        previewContainer.classList.add('hidden');
        loading.classList.remove('hidden');
        errorMsg.classList.add('hidden');

        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze image.');
            }

            // Populate results
            predValue.textContent = data.prediction;
            descValue.textContent = data.description;
            // Update detected objects
            if (objValue) {
                objValue.textContent = data.detected_objects;
            }

            // UI State: Show Results
            loading.classList.add('hidden');
            resultSection.classList.remove('hidden');
            
        } catch (error) {
            loading.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            errorMsg.textContent = error.message;
            errorMsg.classList.remove('hidden');
        }
    });

    resetBtn.addEventListener('click', () => {
        selectedFile = null;
        imageInput.value = '';
        resultSection.classList.add('hidden');
        uploadBtn.classList.remove('hidden');
        // Clear preview
        imagePreview.src = '';
    });
});
