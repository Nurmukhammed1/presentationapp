
//slides.js
// Slide Management
function updateSlidesList() {
    const slidesList = document.getElementById('slidesList');
    slidesList.innerHTML = '';
    
    slides.forEach((slide, index) => {
        const slideElement = document.createElement('div');
        slideElement.className = `slide-thumbnail ${index === currentSlideIndex ? 'active' : ''}`;
        slideElement.onclick = () => loadSlide(index);
        slideElement.innerHTML = `
            <div class="slide-number">${index + 1}</div>
            <div>Slide ${index + 1}</div>
        `;
        slidesList.appendChild(slideElement);
    });
}

async function addSlide() {
    if (!canEdit()) return;
    
    try {
        const response = await fetch(`https://collab-slides.runasp.net/api/Presentations/${currentPresentation.id}/slides`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: currentUser.id,
                index: slides.length 
            })
        });
        
        if (response.ok) {
            const newSlide = await response.json();
            slides.push(newSlide);
            updateSlidesList();
            loadSlide(slides.length - 1);
        }
    } catch (error) {
        console.error('Failed to add slide:', error);
    }
}

function loadSlide(index) {
    if (index < 0 || index >= slides.length) return;
    
    // Save current slide before switching
    if (currentSlideIndex !== index) {
        saveCurrentSlide();
    }
    
    currentSlideIndex = index;
    const slide = slides[index];
    
    // Clear canvas
    const canvas = document.getElementById('slideCanvas');
    canvas.innerHTML = '';
    
    // Load slide content
    if (slide.content && Array.isArray(slide.content)) {
        slide.content.forEach(item => {
            if (item.type === 'textBlock') {
                createTextBlockElement(item);
            }
        });
    }
    
    updateSlidesList();
}

// Slide content management
function addToSlideContent(item) {
    if (!slides[currentSlideIndex].content) {
        slides[currentSlideIndex].content = [];
    }
    slides[currentSlideIndex].content.push(item);
}

function updateSlideContent(id, item) {
    if (!slides[currentSlideIndex].content) {
        slides[currentSlideIndex].content = [];
    }
    
    const index = slides[currentSlideIndex].content.findIndex(c => c.id === id);
    if (index >= 0) {
        slides[currentSlideIndex].content[index] = item;
    } else {
        slides[currentSlideIndex].content.push(item);
    }
}

function removeFromSlideContent(id) {
    if (slides[currentSlideIndex].content) {
        slides[currentSlideIndex].content = slides[currentSlideIndex].content.filter(c => c.id !== id);
    }
}

function saveCurrentSlide() {
    if (!currentPresentation) return;
    
    // Collect all text blocks from DOM
    const textBlocks = [];
    document.querySelectorAll('.text-block').forEach(element => {
        const id = element.id.replace('textBlock-', '');
        const textContent = element.querySelector('.text-content');
        
        textBlocks.push({
            id: id,
            type: 'textBlock',
            x: parseInt(element.style.left),
            y: parseInt(element.style.top),
            width: parseInt(element.style.width),
            height: parseInt(element.style.height),
            content: textContent.innerHTML,
            fontSize: parseInt(textContent.style.fontSize) || 16,
            fontWeight: textContent.style.fontWeight || 'normal',
            fontStyle: textContent.style.fontStyle || 'normal',
            textAlign: textContent.style.textAlign || 'left'
        });
    });
    
    slides[currentSlideIndex].content = textBlocks;
}