document.addEventListener('DOMContentLoaded', () => {
    // 1. Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // 2. File Upload Handling Logic
    const uploadZone = document.getElementById('upload-zone');
    const fileUpload = document.getElementById('file-upload');
    const fileNameDisplay = document.getElementById('file-name-display');
    const codeInput = document.getElementById('code-input');

    uploadZone.addEventListener('click', () => fileUpload.click());
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileUpload.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.name.endsWith('.py')) {
            showError("Only .py files are supported.");
            return;
        }
        fileNameDisplay.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (event) => {
            codeInput.value = event.target.result;
            // Switch back to paste tab to show code
            document.querySelector('.tab-btn[data-tab="paste"]').click();
        };
        reader.readAsText(file);
    }

    // 3. Documentation Generation Logic
    const generateBtn = document.getElementById('generate-btn');
    const appContent = document.querySelector('.app-content');
    const outputPanel = document.getElementById('output-panel');
    const resultsContainer = document.getElementById('results-container');
    const loader = document.getElementById('loader');
    const errorBanner = document.getElementById('error-banner');
    const template = document.getElementById('doc-card-template');

    generateBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim();
        if (!code) {
            showError("Please paste some Python code or upload a file first.");
            return;
        }

        hideError();
        loader.classList.remove('hidden');

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const data = await response.json();

            // Enforce EXACTLY 1 second of loading for the WOW presentation effect
            await new Promise(r => setTimeout(r, 1000));

            if (!response.ok) {
                throw new Error(data.error || "An error occurred while analyzing the code.");
            }

            if (!data.functions || data.functions.length === 0) {
                throw new Error("No Python functions detected in the provided source block.");
            }

            loader.classList.add('hidden');
            renderResults(data.functions);

        } catch (err) {
            loader.classList.add('hidden');
            showError(err.message);
        }
    });

    function renderResults(functions) {
        resultsContainer.innerHTML = '';
        
        functions.forEach(func => {
            const clone = template.content.cloneNode(true);
            
            // Function Name & Summary
            clone.querySelector('.func-name').textContent = func.name;
            clone.querySelector('.purpose-val').textContent = func.purpose;
            
            // Parameters (Dynamic tags)
            const paramsContainer = clone.querySelector('.params-val');
            paramsContainer.innerHTML = '';
            if (func.parameters_raw && func.parameters_raw.length > 0) {
                func.parameters_raw.forEach(param => {
                    const tag = document.createElement('span');
                    tag.className = 'param-tag';
                    tag.textContent = param;
                    paramsContainer.appendChild(tag);
                });
            } else {
                paramsContainer.textContent = 'None';
            }

            // Return Value
            clone.querySelector('.return-val').textContent = func.return_value;

            // Example Usage generation snippet
            let rawParams = (func.parameters_raw || []).map(p => {
                // Strip type hints for a clean realistic call example
                return p.split(':')[0].trim();
            });
            let demoCall = `result = ${func.name}(${rawParams.join(', ')})\nprint(result)`;
            clone.querySelector('.usage-code').textContent = demoCall;

            // Technical Explanation
            clone.querySelector('.explanation-val').textContent = func.explanation;

            resultsContainer.appendChild(clone);
        });
        
        // Expose Output Panel dynamically using CSS transition
        appContent.classList.add('active-split');
        
        // Slight delay before fading in results to let the layout expand first
        setTimeout(() => {
            outputPanel.classList.remove('hidden');
        }, 150);
    }

    function showError(message) {
        errorBanner.textContent = message;
        errorBanner.classList.remove('hidden');
    }

    function hideError() {
        errorBanner.classList.add('hidden');
    }
});
