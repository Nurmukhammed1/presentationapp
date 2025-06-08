// presentation-mode.js
// Handles presentation mode functionality

// Presentation Mode
function startPresentation() {
    document.getElementById('presentMode').classList.remove('hidden');
    showPresentationSlide(0);
}

function exitPresentation() {
    document.getElementById('presentMode').classList.add('hidden');
}

function showPresentationSlide(index) {
    if (index < 0 || index >= slides.length) return;
    
    const presentSlide = document.getElementById('presentSlide');
    const slide = slides[index];
    
    presentSlide.innerHTML = '';
    presentSlide.style.width = '800px';
    presentSlide.style.height = '600px';
    
    if (slide.content && Array.isArray(slide.content)) {
        slide.content.forEach(item => {
            if (item.type === 'textBlock') {
                const element = document.createElement('div');
                element.style.position = 'absolute';
                element.style.left = item.x + 'px';
                element.style.top = item.y + 'px';
                element.style.width = item.width + 'px';
                element.style.height = item.height + 'px';
                element.style.fontSize = item.fontSize + 'px';
                element.style.fontWeight = item.fontWeight;
                element.style.fontStyle = item.fontStyle;
                element.style.textAlign = item.textAlign;
                element.style.padding = '8px';
                element.innerHTML = item.content;
                presentSlide.appendChild(element);
            }
        });
    }
    
    currentSlideIndex = index;
}

function nextSlide() {
    if (currentSlideIndex < slides.length - 1) {
        showPresentationSlide(currentSlideIndex + 1);
    }
}

function previousSlide() {
    if (currentSlideIndex > 0) {
        showPresentationSlide(currentSlideIndex - 1);
    }
}

// Keyboard shortcuts for presentation mode
document.addEventListener('keydown', (e) => {
    if (document.getElementById('presentMode').classList.contains('hidden')) return;
    
    switch(e.key) {
        case 'ArrowRight':
        case ' ':
            nextSlide();
            break;
        case 'ArrowLeft':
            previousSlide();
            break;
        case 'Escape':
            exitPresentation();
            break;
    }
});

// Zoom functionality
function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.1, 2);
    applyZoom();
}

function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.1, 0.5);
    applyZoom();
}

function applyZoom() {
    const canvas = document.getElementById('slideCanvas');
    canvas.style.transform = `scale(${zoomLevel})`;
    canvas.style.transformOrigin = 'center center';
}

// Save functionality
async function savePresentation() {
    saveCurrentSlide();
    
    try {
        const response = await fetch(`https://collab-slides.runasp.net/api/Presentations/${currentPresentation.id}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                slides: slides,
                userId: currentUser.id 
            })
        });
        
        if (response.ok) {
            // Show save confirmation
            const saveBtn = document.querySelector('[onclick="savePresentation()"]');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-check me-1"></i>Saved';
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
            }, 2000);
        }
    } catch (error) {
        console.error('Failed to save presentation:', error);
    }
}