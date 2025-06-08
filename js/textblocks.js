// Text Block Management
function addTextBlock() {
    if (!canEdit()) return;
    
    const textBlock = {
        id: Date.now().toString(),
        type: 'textBlock',
        x: 100,
        y: 100,
        width: 200,
        height: 60,
        content: 'Click to edit text...',
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left'
    };
    
    createTextBlockElement(textBlock);
    addToSlideContent(textBlock);
    selectTextBlock(textBlock.id);
}

function createTextBlockElement(textBlock) {
    const element = document.createElement('div');
    element.className = 'text-block';
    element.id = `textBlock-${textBlock.id}`;
    element.style.left = textBlock.x + 'px';
    element.style.top = textBlock.y + 'px';
    element.style.width = textBlock.width + 'px';
    element.style.height = textBlock.height + 'px';
    
    element.innerHTML = `
        <div class="format-toolbar">
            <button class="format-btn" onclick="formatText('bold')" data-format="bold">
                <i class="fas fa-bold"></i>
            </button>
            <button class="format-btn" onclick="formatText('italic')" data-format="italic">
                <i class="fas fa-italic"></i>
            </button>
            <button class="format-btn" onclick="formatText('underline')" data-format="underline">
                <i class="fas fa-underline"></i>
            </button>
            <button class="format-btn" onclick="alignText('left')" data-align="left">
                <i class="fas fa-align-left"></i>
            </button>
            <button class="format-btn" onclick="alignText('center')" data-align="center">
                <i class="fas fa-align-center"></i>
            </button>
            <button class="format-btn" onclick="alignText('right')" data-align="right">
                <i class="fas fa-align-right"></i>
            </button>
            <button class="format-btn" onclick="deleteTextBlock('${textBlock.id}')">
                <i class="fas fa-trash text-danger"></i>
            </button>
        </div>
        <div class="text-content" contenteditable="${canEdit()}" 
             style="font-size: ${textBlock.fontSize}px; font-weight: ${textBlock.fontWeight}; 
                    font-style: ${textBlock.fontStyle}; text-align: ${textBlock.textAlign};">
            ${textBlock.content}
        </div>
        <div class="resize-handle"></div>
    `;
    
    // Add event listeners
    element.addEventListener('mousedown', (e) => startDrag(e, textBlock.id));
    element.addEventListener('click', (e) => {
        e.stopPropagation();
        selectTextBlock(textBlock.id);
    });
    
    const textContent = element.querySelector('.text-content');
    textContent.addEventListener('input', () => debounceUpdate(textBlock.id));
    textContent.addEventListener('blur', () => updateTextBlockAndSync(textBlock.id));
    
    const resizeHandle = element.querySelector('.resize-handle');
    resizeHandle.addEventListener('mousedown', (e) => startResize(e, textBlock.id));
    
    document.getElementById('slideCanvas').appendChild(element);
}

function selectTextBlock(id) {
    // Deselect all text blocks
    document.querySelectorAll('.text-block').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Select the clicked one
    const element = document.getElementById(`textBlock-${id}`);
    if (element) {
        element.classList.add('selected');
        selectedTextBlock = id;
    }
}

function startDrag(e, id) {
    if (!canEdit()) return;
    if (e.target.classList.contains('resize-handle')) return;
    
    isDragging = true;
    selectedTextBlock = id;
    
    const element = document.getElementById(`textBlock-${id}`);
    const rect = element.getBoundingClientRect();
    const canvasRect = document.getElementById('slideCanvas').getBoundingClientRect();
    
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    element.style.zIndex = '1000';
    selectTextBlock(id);
    
    e.preventDefault();
}

function startResize(e, id) {
    if (!canEdit()) return;
    
    isResizing = true;
    selectedTextBlock = id;
    selectTextBlock(id);
    e.stopPropagation();
    e.preventDefault();
}

// Mouse event handlers
document.addEventListener('mousemove', (e) => {
    if (isDragging && selectedTextBlock) {
        const element = document.getElementById(`textBlock-${selectedTextBlock}`);
        const canvasRect = document.getElementById('slideCanvas').getBoundingClientRect();
        
        const newX = e.clientX - canvasRect.left - dragOffset.x;
        const newY = e.clientY - canvasRect.top - dragOffset.y;
        
        element.style.left = Math.max(0, newX) + 'px';
        element.style.top = Math.max(0, newY) + 'px';
    } else if (isResizing && selectedTextBlock) {
        const element = document.getElementById(`textBlock-${selectedTextBlock}`);
        const canvasRect = document.getElementById('slideCanvas').getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        const newWidth = e.clientX - elementRect.left;
        const newHeight = e.clientY - elementRect.top;
        
        element.style.width = Math.max(50, newWidth) + 'px';
        element.style.height = Math.max(20, newHeight) + 'px';
    }
});

document.addEventListener('mouseup', () => {
    if (isDragging && selectedTextBlock) {
        updateTextBlockPosition(selectedTextBlock);
        const element = document.getElementById(`textBlock-${selectedTextBlock}`);
        element.style.zIndex = 'auto';
    }
    if (isResizing && selectedTextBlock) {
        updateTextBlockSize(selectedTextBlock);
    }
    isDragging = false;
    isResizing = false;
});

// Click outside to deselect
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('slideCanvas').addEventListener('click', (e) => {
        if (e.target.id === 'slideCanvas') {
            document.querySelectorAll('.text-block').forEach(el => {
                el.classList.remove('selected');
            });
            selectedTextBlock = null;
        }
    });
});

// Text formatting functions
function formatText(format) {
    if (!selectedTextBlock || !canEdit()) return;
    
    const element = document.getElementById(`textBlock-${selectedTextBlock}`);
    const textContent = element.querySelector('.text-content');
    
    document.execCommand(format, false, null);
    updateTextBlockAndSync(selectedTextBlock);
}

function alignText(alignment) {
    if (!selectedTextBlock || !canEdit()) return;
    
    const element = document.getElementById(`textBlock-${selectedTextBlock}`);
    const textContent = element.querySelector('.text-content');
    
    textContent.style.textAlign = alignment;
    updateTextBlockAndSync(selectedTextBlock);
}

function deleteTextBlock(id) {
    if (!canEdit()) return;
    
    const element = document.getElementById(`textBlock-${id}`);
    if (element) {
        element.remove();
        removeFromSlideContent(id);
        if (selectedTextBlock === id) {
            selectedTextBlock = null;
        }
        // TODO: Send delete notification via SignalR if needed
    }
}

// Update functions with debouncing
let updateTimeouts = {};

function debounceUpdate(id) {
    clearTimeout(updateTimeouts[id]);
    updateTimeouts[id] = setTimeout(() => updateTextBlockAndSync(id), 500);
}

// Local update only (for real-time feedback)
function updateTextBlockLocal(id) {
    const element = document.getElementById(`textBlock-${id}`);
    if (!element) return;
    
    const textContent = element.querySelector('.text-content');
    const textBlock = {
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
    };
    
    updateSlideContent(id, textBlock);
    return textBlock;
}

// Update and sync via SignalR
function updateTextBlockAndSync(id) {
    const textBlock = updateTextBlockLocal(id);
    if (!textBlock) return;
    
    // Send update via SignalR instead of WebSocket
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
        sendTextBlockUpdate(textBlock);
    }
}

function updateTextBlockPosition(id) {
    updateTextBlockAndSync(id);
}

function updateTextBlockSize(id) {
    updateTextBlockAndSync(id);
}

// Handle incoming text block updates from other users
function updateTextBlockFromRemote(textBlock) {
    const element = document.getElementById(`textBlock-${textBlock.id}`);
    if (!element) {
        // Create new text block if it doesn't exist
        createTextBlockElement(textBlock);
        addToSlideContent(textBlock);
        return;
    }
    
    // Update existing text block
    element.style.left = textBlock.x + 'px';
    element.style.top = textBlock.y + 'px';
    element.style.width = textBlock.width + 'px';
    element.style.height = textBlock.height + 'px';
    
    const textContent = element.querySelector('.text-content');
    if (textContent.innerHTML !== textBlock.content) {
        textContent.innerHTML = textBlock.content;
    }
    
    textContent.style.fontSize = textBlock.fontSize + 'px';
    textContent.style.fontWeight = textBlock.fontWeight;
    textContent.style.fontStyle = textBlock.fontStyle;
    textContent.style.textAlign = textBlock.textAlign;
    
    // Update local slide content
    updateSlideContent(textBlock.id, textBlock);
}