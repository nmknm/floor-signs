document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Caching ---
    const canvas = document.getElementById('floor-sign-canvas');
    const ctx = canvas.getContext('2d');

    const textInput = document.getElementById('text-input');
    const exampleBtn = document.getElementById('example-btn');

    const fontSearchInput = document.getElementById('font-search-input');
    const fontList = document.getElementById('font-list');
    const fontWeightSelect = document.getElementById('font-weight-select');
    const fontStyleSelect = document.getElementById('font-style-select');
    const fontColorPicker = document.getElementById('font-color-picker');

    const bgColor1 = document.getElementById('bg-color-1');
    const bgColor2 = document.getElementById('bg-color-2');
    const gradientAngle = document.getElementById('gradient-angle');
    const gradientAngleValue = document.getElementById('gradient-angle-value');

    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const formatSelect = document.getElementById('format-select');
    const downloadSetBtn = document.getElementById('download-set-btn');

    const savePresetBtn = document.getElementById('save-preset-btn');
    const presetSelect = document.getElementById('preset-select');
    const deletePresetBtn = document.getElementById('delete-preset-btn');

    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    // --- State Management ---
    let settings = {
        text: '99',
        fontFamily: 'Inter',
        fontWeight: '500',
        fontStyle: 'normal',
        fontColor: '#FFFFFF',
        bgColor1: '#31A9FF',
        bgColor2: '#0099FF',
        gradientAngle: 180
    };

    const signSet = Array.from({length: 109}, (_, i) => (i - 9).toString());
    signSet.push('P', 'L');

    const curatedFonts = [
        'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Code Pro',
        'Raleway', 'PT Sans', 'Merriweather', 'Nunito', 'Concert One', 'Poiret One',
        'Playfair Display', 'Slabo 27px', 'Lora', 'Ubuntu', 'Arimo', 'Noto Sans'
    ];

    // --- Core Drawing & Generation Functions ---
    const calculateFontSize = (ctx, text, fontFamily, fontWeight, fontStyle) => {
        const sizes = [2800, 2400, 2000];
        const maxWidth = 1800; // 1920 - 120 padding

        for (const size of sizes) {
            ctx.font = `${fontStyle} ${fontWeight} ${size}px ${fontFamily}`;
            const textMetrics = ctx.measureText(text);
            if (textMetrics.width <= maxWidth) {
                return size;
            }
        }
        return sizes[sizes.length - 1]; // Return smallest size if all are too wide
    };

    const loadFont = async (family, weight, style) => {
        const font = `${style} ${weight} 10px ${family}`;
        if (document.fonts.check(font)) return;
        await document.fonts.load(font);
    };

    const getGradientCoordinates = (angle, width, height) => {
        const rad = angle * Math.PI / 180;
        const x1 = width / 2 * (1 - Math.cos(rad));
        const y1 = height / 2 * (1 - Math.sin(rad));
        const x2 = width / 2 * (1 + Math.cos(rad));
        const y2 = height / 2 * (1 + Math.sin(rad));
        return { x1, y1, x2, y2 };
    };

    const generateSign = async (currentSettings) => {
        const { text, fontFamily, fontWeight, fontStyle, fontColor, bgColor1, bgColor2, gradientAngle, fontSize } = currentSettings;

        try {
            await loadFont(fontFamily, fontWeight, fontStyle);
        } catch (e) {
            console.error(`Font loading failed for ${fontFamily}. Using fallback.`, e);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const { x1, y1, x2, y2 } = getGradientCoordinates(gradientAngle, canvas.width, canvas.height);
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, bgColor1);
        gradient.addColorStop(1, bgColor2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = fontColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    };

    const generateSvgString = (currentSettings) => {
        const { text, fontFamily, fontWeight, fontStyle, fontColor, bgColor1, bgColor2, gradientAngle, fontSize } = currentSettings;
        return `
<svg width="1920" height="1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="background-gradient" gradientTransform="rotate(${gradientAngle - 90})">
      <stop offset="0%" stop-color="${bgColor1}" />
      <stop offset="100%" stop-color="${bgColor2}" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#background-gradient)" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${fontColor}">
    ${text}
  </text>
</svg>
        `.trim();
    };

    // --- UI Update Functions ---
    const updateUIFromSettings = () => {
        textInput.value = settings.text;
        fontSearchInput.value = settings.fontFamily;
        fontWeightSelect.value = settings.fontWeight;
        fontStyleSelect.value = settings.fontStyle;
        fontColorPicker.value = settings.fontColor;
        bgColor1.value = settings.bgColor1;
        bgColor2.value = settings.bgColor2;
        gradientAngle.value = settings.gradientAngle;
        gradientAngleValue.textContent = `${settings.gradientAngle}°`;
    };

    const updateSettingsFromUI = () => {
        settings = {
            text: textInput.value,
            fontFamily: fontSearchInput.value,
            fontWeight: fontWeightSelect.value,
            fontStyle: fontStyleSelect.value,
            fontColor: fontColorPicker.value,
            bgColor1: bgColor1.value,
            bgColor2: bgColor2.value,
            gradientAngle: gradientAngle.value,
            fontSize: settings.fontSize
        };
    };

    const regenerate = () => {
        updateSettingsFromUI();
        settings.fontSize = calculateFontSize(ctx, settings.text, settings.fontFamily, settings.fontWeight, settings.fontStyle);
        generateSign(settings);
    };

    // --- Event Listeners ---
    const setupEventListeners = () => {
        [textInput, fontWeightSelect, fontStyleSelect, fontColorPicker, bgColor1, bgColor2, gradientAngle].forEach(el => {
            el.addEventListener('input', regenerate);
        });

        // --- Font Picker Logic ---
        const populateFontList = (fonts) => {
            fontList.innerHTML = '';
            fonts.forEach(font => {
                const item = document.createElement('div');
                item.className = 'font-item';
                item.textContent = font;
                item.style.fontFamily = font;
                fontList.appendChild(item);
            });
        };

        const loadGoogleFontStylesheet = (fontFamily) => {
            const fontId = `google-font-${fontFamily.replace(/\s/g, '-')}`;
            if (document.getElementById(fontId)) return; // Already loaded

            const link = document.createElement('link');
            link.id = fontId;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s/g, '+')}:wght@100..900&display=swap`;
            document.head.appendChild(link);
        };

        fontSearchInput.addEventListener('focus', () => {
            fontList.style.display = 'block';
            populateFontList(curatedFonts);
        });

        fontSearchInput.addEventListener('blur', () => {
            // Delay hiding to allow click event to register
            setTimeout(() => {
                fontList.style.display = 'none';
            }, 200);
        });

        fontSearchInput.addEventListener('input', () => {
            const searchTerm = fontSearchInput.value.toLowerCase();
            const filteredFonts = curatedFonts.filter(font => font.toLowerCase().includes(searchTerm));
            populateFontList(filteredFonts);
        });

        fontList.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('font-item')) {
                const fontFamily = e.target.textContent;
                fontSearchInput.value = fontFamily;
                settings.fontFamily = fontFamily;
                loadGoogleFontStylesheet(fontFamily);
                regenerate();
            }
        });

        gradientAngle.addEventListener('input', () => {
            gradientAngleValue.textContent = `${gradientAngle.value}°`;
        });

        generateBtn.addEventListener('click', regenerate);

        exampleBtn.addEventListener('click', () => {
            const randomSign = signSet[Math.floor(Math.random() * signSet.length)];
            textInput.value = randomSign;
            regenerate();
        });

        downloadBtn.addEventListener('click', () => {
            const format = formatSelect.value;
            const filename = `floor-sign-${settings.text}.${format}`;

            if (format === 'svg') {
                const svgString = generateSvgString(settings);
                const blob = new Blob([svgString], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = filename;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                return;
            }

            const mimeType = `image/${format}`;
            const dataURL = canvas.toDataURL(mimeType, 1.0);
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataURL;
            link.click();
        });

        const generateSignOffscreen = async (currentSettings, offscreenCanvas, offscreenCtx) => {
            const { text, fontFamily, fontWeight, fontStyle, fontColor, bgColor1, bgColor2, gradientAngle } = currentSettings;

            await loadFont(fontFamily, fontWeight, fontStyle);

            offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
            const { x1, y1, x2, y2 } = getGradientCoordinates(gradientAngle, offscreenCanvas.width, offscreenCanvas.height);
            const gradient = offscreenCtx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, bgColor1);
            gradient.addColorStop(1, bgColor2);
            offscreenCtx.fillStyle = gradient;
            offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

            const fontSize = getFontSize(text);
            offscreenCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
            offscreenCtx.fillStyle = fontColor;
            offscreenCtx.textAlign = 'center';
            offscreenCtx.textBaseline = 'middle';

            offscreenCtx.fillText(text, offscreenCanvas.width / 2, offscreenCanvas.height / 2);
        };

        downloadSetBtn.addEventListener('click', async (e) => {
            loadingOverlay.style.display = 'flex';
            loadingText.textContent = 'Initializing...';

            const zip = new JSZip();
            const currentStyleSettings = { ...settings };

            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = 1920;
            offscreenCanvas.height = 1920;
            const offscreenCtx = offscreenCanvas.getContext('2d');

            for (let i = 0; i < signSet.length; i++) {
                const signText = signSet[i];
                const settingsForSign = { ...currentStyleSettings, text: signText };
                await generateSignOffscreen(settingsForSign, offscreenCanvas, offscreenCtx);

                const dataURL = offscreenCanvas.toDataURL('image/png');
                zip.file(`sign-${signText}.png`, dataURL.split(',')[1], { base64: true });

                const progress = Math.round(((i + 1) / signSet.length) * 100);
                loadingText.textContent = `Generating... (${progress}%)`;
            }

            loadingText.textContent = 'Zipping files...';
            zip.generateAsync({ type: 'blob' }).then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'floor-sign-set.zip';
                link.click();

                loadingOverlay.style.display = 'none';
            });
        });

        // --- Preset Management Logic ---
        const getPresets = () => {
            const presets = localStorage.getItem('floorSignPresets');
            return presets ? JSON.parse(presets) : {};
        };

        const savePresets = (presets) => {
            localStorage.setItem('floorSignPresets', JSON.stringify(presets));
        };

        const updatePresetList = () => {
            const presets = getPresets();
            presetSelect.innerHTML = '<option value="">-- Select a Preset --</option>';
            for (const name in presets) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                presetSelect.appendChild(option);
            }
        };

        savePresetBtn.addEventListener('click', () => {
            const name = prompt('Enter a name for your preset:', 'My Custom Style');
            if (name) {
                const presets = getPresets();
                presets[name] = { ...settings };
                savePresets(presets);
                updatePresetList();
                alert(`Preset "${name}" saved!`);
            }
        });

        presetSelect.addEventListener('change', () => {
            const name = presetSelect.value;
            if (name) {
                const presets = getPresets();
                settings = presets[name];
                updateUIFromSettings();
                regenerate();
            }
        });

        deletePresetBtn.addEventListener('click', () => {
            const name = presetSelect.value;
            if (name) {
                if (confirm(`Are you sure you want to delete the preset "${name}"?`)) {
                    const presets = getPresets();
                    delete presets[name];
                    savePresets(presets);
                    updatePresetList();
                    alert(`Preset "${name}" deleted.`);
                }
            } else {
                alert('Please select a preset to delete.');
            }
        });
    };

    // --- Initialization ---
    const init = async () => {
        updateUIFromSettings();
        setupEventListeners();
        updatePresetList(); // Populate preset list on load
        await generateSign(settings);
    };

    init().catch(error => {
        console.error("An error occurred during initialization:", error);
    });
});
