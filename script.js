
document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const imageEditor = document.getElementById('image-editor');
    const preview = document.getElementById('preview');
    const resetBtn = document.getElementById('reset-btn');
    const autoEnhanceBtn = document.getElementById('auto-enhance-btn');
    const downloadBtn = document.getElementById('download-btn');
    const cropContainer = document.querySelector('.crop-container');
    const histogramCanvas = document.getElementById('histogram-canvas');
    const loading = document.querySelector('.loading');

    // Enhancement controls
    const brightnessSlider = document.getElementById('brightness-slider');
    const brightnessValue = document.getElementById('brightness-value');
    const contrastSlider = document.getElementById('contrast-slider');
    const contrastValue = document.getElementById('contrast-value');
    const saturationSlider = document.getElementById('saturation-slider');
    const saturationValue = document.getElementById('saturation-value');
    const sharpnessSlider = document.getElementById('sharpness-slider');
    const sharpnessValue = document.getElementById('sharpness-value');
    const noiseSlider = document.getElementById('noise-slider');
    const noiseValue = document.getElementById('noise-value');
    const gammaSlider = document.getElementById('gamma-slider');
    const gammaValue = document.getElementById('gamma-value');
    const temperatureSlider = document.getElementById('temperature-slider');
    const temperatureValue = document.getElementById('temperature-value');
    const vignetteSlider = document.getElementById('vignette-slider');
    const vignetteValue = document.getElementById('vignette-value');
    const claritySlider = document.getElementById('clarity-slider');
    const clarityValue = document.getElementById('clarity-value');
    const vibranceSlider = document.getElementById('vibrance-slider');
    const vibranceValue = document.getElementById('vibrance-value');
    const resetEnhancementBtn = document.getElementById('reset-enhancement');

    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // Output options
    const formatButtons = document.querySelectorAll('.option-btn[data-format]');
    const qualityOptions = document.querySelectorAll('input[name="quality"]');
    const resamplingButtons = document.querySelectorAll('.option-btn[data-resampling]');

    // Variables
    let cropper;
    let originalImageUrl;
    let currentEnhancements = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        sharpness: 0,
        noise: 0,
        gamma: 1.0,
        temperature: 0,
        vignette: 0,
        clarity: 0,
        vibrance: 0
    };
    let outputOptions = {
        format: 'jpeg',
        quality: 1.0,
        resampling: 'bilinear'
    };
    let originalImageData = null;
    // For throttling preview updates
    let updateTimer = null;

    // Event Listeners
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    resetBtn.addEventListener('click', resetCropper);
    autoEnhanceBtn.addEventListener('click', autoEnhance);
    downloadBtn.addEventListener('click', downloadImage);

    // Enhancement sliders
    brightnessSlider.addEventListener('input', updateValue('brightness'));
    contrastSlider.addEventListener('input', updateValue('contrast'));
    saturationSlider.addEventListener('input', updateValue('saturation'));
    sharpnessSlider.addEventListener('input', updateValue('sharpness'));
    noiseSlider.addEventListener('input', updateValue('noise'));
    gammaSlider.addEventListener('input', updateValue('gamma'));
    temperatureSlider.addEventListener('input', updateValue('temperature'));
    vignetteSlider.addEventListener('input', updateValue('vignette'));
    claritySlider.addEventListener('input', updateValue('clarity'));
    vibranceSlider.addEventListener('input', updateValue('vibrance'));

    resetEnhancementBtn.addEventListener('click', resetEnhancements);

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId + '-tab') {
                    content.classList.add('active');
                }
            });
        });
    });

    // Output options
    formatButtons.forEach(button => {
        button.addEventListener('click', () => {
            formatButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            outputOptions.format = button.getAttribute('data-format');
        });
    });

    qualityOptions.forEach(option => {
        option.addEventListener('change', () => {
            outputOptions.quality = parseFloat(option.value);
        });
    });

    resamplingButtons.forEach(button => {
        button.addEventListener('click', () => {
            resamplingButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            outputOptions.resampling = button.getAttribute('data-resampling');
        });
    });

    // Functions
    function handleFileUpload(e) {
        if (e.target.files.length) {
            const file = e.target.files[0];

            if (!file.type.match('image.*')) {
                alert('Please select an image file.');
                return;
            }

            if (originalImageUrl) {
                URL.revokeObjectURL(originalImageUrl);
            }

            originalImageUrl = URL.createObjectURL(file);
            imageEditor.src = originalImageUrl;

            // Show loading indicator
            loading.classList.add('active');

            imageEditor.onload = function () {
                initCropper();
                cropContainer.style.display = 'block';
                loading.classList.remove('active');
            };
        }
    }

    function initCropper() {
        if (cropper) {
            cropper.destroy();
        }

        cropper = new Cropper(imageEditor, {
            aspectRatio: 223 / 348,
            viewMode: 1,
            autoCropArea: 0.8,
            responsive: true,
            restore: false,
            guides: false,
            center: false,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            ready: function () {
                // Set initial crop box size
                this.cropper.setCropBoxData({
                    width: 223,
                    height: 348
                });

                // Generate initial preview
                updatePreview();
            }
        });

        // Add crop event listener for real-time preview
        cropper.element.addEventListener('crop', throttledPreviewUpdate);
    }

    // Throttle preview updates to avoid performance issues
    function throttledPreviewUpdate() {
        if (updateTimer !== null) {
            clearTimeout(updateTimer);
        }
        updateTimer = setTimeout(function () {
            updatePreview();
            updateTimer = null;
        }, 30); // Update every 30ms during drag
    }

    function updatePreview() {
        if (!cropper) return;

        const canvas = cropper.getCroppedCanvas({
            width: 223,
            height: 348,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: outputOptions.resampling === 'bicubic' ? 'high' : 'medium',
            fillColor: '#000000'
        });

        if (!canvas) return;

        // Store original image data for enhancements
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);
        originalImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

        // Apply enhancements
        const enhancedCanvas = applyEnhancements(tempCanvas);

        // Create preview
        const previewImg = document.createElement('img');
        previewImg.src = enhancedCanvas.toDataURL(`image/${outputOptions.format}`, outputOptions.quality);

        preview.innerHTML = '';
        preview.appendChild(previewImg);

        // Update histogram
        updateHistogram(tempCanvas);
    }

    function updateHistogram(canvas) {
        const ctx = histogramCanvas.getContext('2d');
        const width = histogramCanvas.width = histogramCanvas.offsetWidth;
        const height = histogramCanvas.height = 100;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get image data
        const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;

        // Create histogram data
        const histogramR = new Array(256).fill(0);
        const histogramG = new Array(256).fill(0);
        const histogramB = new Array(256).fill(0);
        const histogramL = new Array(256).fill(0);

        // Calculate histogram
        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];

            // Calculate luminance
            const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

            histogramR[r]++;
            histogramG[g]++;
            histogramB[b]++;
            histogramL[l]++;
        }

        // Find max value for scaling
        let maxValue = 0;
        for (let i = 0; i < 256; i++) {
            maxValue = Math.max(maxValue, histogramL[i]);
        }

        // Scale factor
        const scale = height / maxValue;

        // Draw RGB histogram
        ctx.globalAlpha = 0.5;

        // Red channel
        ctx.strokeStyle = '#ff0000';
        ctx.beginPath();
        for (let i = 0; i < 256; i++) {
            const x = i / 256 * width;
            const y = height - histogramR[i] * scale;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Green channel
        ctx.strokeStyle = '#00ff00';
        ctx.beginPath();
        for (let i = 0; i < 256; i++) {
            const x = i / 256 * width;
            const y = height - histogramG[i] * scale;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Blue channel
        ctx.strokeStyle = '#0000ff';
        ctx.beginPath();
        for (let i = 0; i < 256; i++) {
            const x = i / 256 * width;
            const y = height - histogramB[i] * scale;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Luminance (white line)
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        for (let i = 0; i < 256; i++) {
            const x = i / 256 * width;
            const y = height - histogramL[i] * scale;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // Continue from where the code left off in the applyEnhancements function
    function applyEnhancements(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Reset canvas with original image data
        ctx.putImageData(originalImageData, 0, 0);

        // Create a new buffer to work on
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Apply gamma first (as it affects the overall tonal range)
        if (currentEnhancements.gamma !== 1.0) {
            const gammaCorrection = 1 / currentEnhancements.gamma;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 * Math.pow(data[i] / 255, gammaCorrection);
                data[i + 1] = 255 * Math.pow(data[i + 1] / 255, gammaCorrection);
                data[i + 2] = 255 * Math.pow(data[i + 2] / 255, gammaCorrection);
            }
        }

        // Apply temperature (color temperature adjustment)
        if (currentEnhancements.temperature !== 0) {
            const factor = currentEnhancements.temperature / 100;
            for (let i = 0; i < data.length; i += 4) {
                // Warm up (add red, reduce blue) or cool down (add blue, reduce red)
                data[i] = clamp(data[i] + (factor * 30), 0, 255);     // Red
                data[i + 2] = clamp(data[i + 2] - (factor * 30), 0, 255); // Blue
            }
        }

        // Apply brightness
        if (currentEnhancements.brightness !== 0) {
            const brightnessAdjust = Math.floor(255 * (currentEnhancements.brightness / 100));
            for (let i = 0; i < data.length; i += 4) {
                data[i] = clamp(data[i] + brightnessAdjust, 0, 255);
                data[i + 1] = clamp(data[i + 1] + brightnessAdjust, 0, 255);
                data[i + 2] = clamp(data[i + 2] + brightnessAdjust, 0, 255);
            }
        }

        // Apply contrast
        // Apply contrast
        if (currentEnhancements.contrast !== 0) {
            const factor = (259 * (currentEnhancements.contrast / 100 * 255 + 255)) / (255 * (259 - currentEnhancements.contrast / 100 * 255));
            for (let i = 0; i < data.length; i += 4) {
                data[i] = clamp(factor * (data[i] - 128) + 128, 0, 255);
                data[i + 1] = clamp(factor * (data[i + 1] - 128) + 128, 0, 255);
                data[i + 2] = clamp(factor * (data[i + 2] - 128) + 128, 0, 255);
            }
        }

        // Apply saturation
        if (currentEnhancements.saturation !== 0) {
            const saturationFactor = 1 + (currentEnhancements.saturation / 100);
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2]; // Luminance
                data[i] = clamp(gray + saturationFactor * (data[i] - gray), 0, 255);
                data[i + 1] = clamp(gray + saturationFactor * (data[i + 1] - gray), 0, 255);
                data[i + 2] = clamp(gray + saturationFactor * (data[i + 2] - gray), 0, 255);
            }
        }

        // Apply vibrance - similar to saturation but protects skin tones
        if (currentEnhancements.vibrance !== 0) {
            const vibranceFactor = currentEnhancements.vibrance / 100;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const max = Math.max(data[i], data[i + 1], data[i + 2]);
                const amt = Math.abs(max - avg) * 2 / 255 * vibranceFactor;

                if (data[i] !== max) {
                    data[i] += (max - data[i]) * amt;
                }
                if (data[i + 1] !== max) {
                    data[i + 1] += (max - data[i + 1]) * amt;
                }
                if (data[i + 2] !== max) {
                    data[i + 2] += (max - data[i + 2]) * amt;
                }
            }
        }

        // Apply basic noise reduction (simple box blur)
        if (currentEnhancements.noise > 0) {
            // This is a simplified version - real noise reduction is more complex
            const tempData = new Uint8ClampedArray(data);
            const strength = currentEnhancements.noise / 100;

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;

                    for (let c = 0; c < 3; c++) {
                        let sum = 0;
                        sum += tempData[idx - width * 4 - 4 + c];
                        sum += tempData[idx - width * 4 + c];
                        sum += tempData[idx - width * 4 + 4 + c];
                        sum += tempData[idx - 4 + c];
                        sum += tempData[idx + c];
                        sum += tempData[idx + 4 + c];
                        sum += tempData[idx + width * 4 - 4 + c];
                        sum += tempData[idx + width * 4 + c];
                        sum += tempData[idx + width * 4 + 4 + c];

                        const avg = sum / 9;
                        data[idx + c] = data[idx + c] * (1 - strength) + avg * strength;
                    }
                }
            }
        }

        // Apply sharpness using a simple unsharp mask
        if (currentEnhancements.sharpness > 0) {
            const tempData = new Uint8ClampedArray(data);
            const strength = currentEnhancements.sharpness / 100 * 0.5; // Scale it down a bit

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;

                    for (let c = 0; c < 3; c++) {
                        // Apply a Laplacian filter for edge detection
                        const laplacian =
                            -tempData[idx - width * 4 + c] -
                            tempData[idx - 4 + c] +
                            4 * tempData[idx + c] -
                            tempData[idx + 4 + c] -
                            tempData[idx + width * 4 + c];

                        data[idx + c] = clamp(tempData[idx + c] + laplacian * strength, 0, 255);
                    }
                }
            }
        }

        // Apply clarity (local contrast enhancement)
        if (currentEnhancements.clarity !== 0) {
            const tempData = new Uint8ClampedArray(data);
            const strength = currentEnhancements.clarity / 100;

            for (let y = 2; y < height - 2; y++) {
                for (let x = 2; x < width - 2; x++) {
                    const idx = (y * width + x) * 4;

                    for (let c = 0; c < 3; c++) {
                        // Get local average
                        let sum = 0;
                        let count = 0;

                        for (let j = -2; j <= 2; j++) {
                            for (let i = -2; i <= 2; i++) {
                                const sampleIdx = ((y + j) * width + (x + i)) * 4;
                                sum += tempData[sampleIdx + c];
                                count++;
                            }
                        }

                        const avg = sum / count;
                        const diff = tempData[idx + c] - avg;
                        data[idx + c] = clamp(tempData[idx + c] + diff * strength, 0, 255);
                    }
                }
            }
        }

        // Apply vignette effect
        if (currentEnhancements.vignette > 0) {
            const strength = currentEnhancements.vignette / 100;
            const centerX = width / 2;
            const centerY = height / 2;
            const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;

                    // Calculate distance from center (normalized)
                    const distX = (x - centerX) / centerX;
                    const distY = (y - centerY) / centerY;
                    const dist = Math.sqrt(distX * distX + distY * distY);

                    // Apply vignette
                    const factor = 1 - Math.min(1, dist * strength * 1.5);

                    data[idx] = data[idx] * factor;
                    data[idx + 1] = data[idx + 1] * factor;
                    data[idx + 2] = data[idx + 2] * factor;
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    // Helper function to clamp values
    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function resetCropper() {
        if (cropper) {
            cropper.reset();
            updatePreview();
        }
    }

    function updateValue(property) {
        return function (e) {
            const value = parseFloat(e.target.value);
            const displayElement = document.getElementById(`${property}-value`);

            // Update value display
            if (property === 'gamma') {
                displayElement.textContent = value.toFixed(1);
            } else {
                displayElement.textContent = value;
            }

            // Update stored enhancement value
            currentEnhancements[property] = value;

            // Update preview with new enhancement
            updatePreview();
        };
    }

    function resetEnhancements() {
        // Reset all sliders to default values
        brightnessSlider.value = 0;
        brightnessValue.textContent = '0';
        contrastSlider.value = 0;
        contrastValue.textContent = '0';
        saturationSlider.value = 0;
        saturationValue.textContent = '0';
        sharpnessSlider.value = 0;
        sharpnessValue.textContent = '0';
        noiseSlider.value = 0;
        noiseValue.textContent = '0';
        gammaSlider.value = 1.0;
        gammaValue.textContent = '1.0';
        temperatureSlider.value = 0;
        temperatureValue.textContent = '0';
        vignetteSlider.value = 0;
        vignetteValue.textContent = '0';
        claritySlider.value = 0;
        clarityValue.textContent = '0';
        vibranceSlider.value = 0;
        vibranceValue.textContent = '0';

        // Reset enhancement values
        currentEnhancements = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            sharpness: 0,
            noise: 0,
            gamma: 1.0,
            temperature: 0,
            vignette: 0,
            clarity: 0,
            vibrance: 0
        };

        // Update preview
        updatePreview();
    }

    function autoEnhance() {
        // Show loading indicator
        loading.classList.add('active');

        // Use setTimeout to give UI a chance to update
        setTimeout(() => {
            // Simple auto enhancement based on image analysis
            if (!originalImageData) {
                loading.classList.remove('active');
                return;
            }

            // Analyze image histogram
            const data = originalImageData.data;
            const histR = new Array(256).fill(0);
            const histG = new Array(256).fill(0);
            const histB = new Array(256).fill(0);
            const histL = new Array(256).fill(0);

            for (let i = 0; i < data.length; i += 4) {
                histR[data[i]]++;
                histG[data[i + 1]]++;
                histB[data[i + 2]]++;

                // Calculate luminance
                const l = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
                histL[l]++;
            }

            // Find min and max values
            let minL = 0, maxL = 255;
            const totalPixels = data.length / 4;
            const threshold = totalPixels * 0.01; // Ignore bottom and top 1%

            let sum = 0;
            for (let i = 0; i < 256; i++) {
                sum += histL[i];
                if (sum > threshold) {
                    minL = i;
                    break;
                }
            }

            sum = 0;
            for (let i = 255; i >= 0; i--) {
                sum += histL[i];
                if (sum > threshold) {
                    maxL = i;
                    break;
                }
            }

            // Calculate auto enhancement settings
            let autoContrast = 0;
            let autoBrightness = 0;
            let autoSaturation = 0;

            // Auto contrast adjustment
            if (maxL - minL < 200) {
                autoContrast = Math.min(30, (1 - (maxL - minL) / 200) * 60);
            }

            // Auto brightness adjustment
            const medianL = getMedian(histL);
            if (medianL < 118) {
                autoBrightness = Math.min(20, (128 - medianL) / 3);
            } else if (medianL > 138) {
                autoBrightness = Math.max(-20, (128 - medianL) / 3);
            }

            // Auto saturation adjustment
            // Calculate average saturation
            let totalSat = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const sat = max === 0 ? 0 : (max - min) / max;
                totalSat += sat;
            }

            const avgSat = totalSat / (data.length / 4);
            if (avgSat < 0.2) {
                autoSaturation = Math.min(20, (0.3 - avgSat) * 100);
            }

            // Apply auto enhancements
            brightnessSlider.value = autoBrightness;
            brightnessValue.textContent = Math.round(autoBrightness);
            currentEnhancements.brightness = autoBrightness;

            contrastSlider.value = autoContrast;
            contrastValue.textContent = Math.round(autoContrast);
            currentEnhancements.contrast = autoContrast;

            saturationSlider.value = autoSaturation;
            saturationValue.textContent = Math.round(autoSaturation);
            currentEnhancements.saturation = autoSaturation;

            // Apply small clarity enhancement
            claritySlider.value = 10;
            clarityValue.textContent = '10';
            currentEnhancements.clarity = 10;

            // Apply slight sharpness
            sharpnessSlider.value = 15;
            sharpnessValue.textContent = '15';
            currentEnhancements.sharpness = 15;

            // Update preview
            updatePreview();

            // Hide loading indicator
            loading.classList.remove('active');
        }, 50);
    }

    function getMedian(histogram) {
        const total = histogram.reduce((a, b) => a + b, 0);
        let sum = 0;

        for (let i = 0; i < histogram.length; i++) {
            sum += histogram[i];
            if (sum >= total / 2) {
                return i;
            }
        }

        return 128; // Default value
    }

    function downloadImage() {
        if (!cropper) return;

        // Show loading indicator
        loading.classList.add('active');

        // Use setTimeout to give UI a chance to update
        setTimeout(() => {
            // Get cropped canvas with enhancements applied
            const canvas = cropper.getCroppedCanvas({
                width: 223,
                height: 348,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: outputOptions.resampling === 'bicubic' ? 'high' : 'medium',
                fillColor: '#000000'
            });

            if (!canvas) {
                loading.classList.remove('active');
                return;
            }

            // Apply enhancements
            const enhancedCanvas = applyEnhancements(canvas);

            // Create a new canvas with space for border
            const borderedCanvas = document.createElement('canvas');
            borderedCanvas.width = enhancedCanvas.width + 2; // +2 for 1px border on each side
            borderedCanvas.height = enhancedCanvas.height + 2; // +2 for 1px border on each side
            const ctx = borderedCanvas.getContext('2d');

            // Draw white border (by filling the canvas with white first)
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, borderedCanvas.width, borderedCanvas.height);

            // Draw the enhanced image on top, offset by 1px to create the border
            ctx.drawImage(enhancedCanvas, 1, 1);

            // Set up the download
            const link = document.createElement('a');

            // Determine file extension
            let fileExtension = '.jpg';
            let mimeType = 'image/jpeg';

            switch (outputOptions.format) {
                case 'png':
                    fileExtension = '.png';
                    mimeType = 'image/png';
                    break;
                case 'webp':
                    fileExtension = '.webp';
                    mimeType = 'image/webp';
                    break;
            }

            // Create download link
            link.download = `peace_✌${fileExtension}`;
            link.href = borderedCanvas.toDataURL(mimeType, outputOptions.quality);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Hide loading indicator
            loading.classList.remove('active');
        }, 100);
    }

    // Initialize empty preview container
    window.addEventListener('load', function () {
        const previewPlaceholder = document.createElement('img');
        previewPlaceholder.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="223" height="348" viewBox="0 0 223 348"%3E%3Crect width="223" height="348" fill="%23121212"/%3E%3Ctext x="111.5" y="174" font-family="sans-serif" font-size="14" text-anchor="middle" fill="%23e0e0e0"%3EPreview will appear here%3C/text%3E%3C/svg%3E';
        preview.appendChild(previewPlaceholder);
    });
});
