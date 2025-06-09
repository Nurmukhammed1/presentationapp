//textblocks.js
function addTextBlock() {
    if (!canEdit()) return;
    
    // FIXED: Ensure all properties have correct data types
    const textBlock = {
        id: generateUniqueId(),
        type: 'textBlock',
        x: Math.floor(100 + (Math.random() * 200)), // Ensure integer
        y: Math.floor(100 + (Math.random() * 200)), // Ensure integer
        width: 200, // Integer
        height: 60, // Integer
        content: 'Click to edit text...',
        fontSize: 16, // Integer
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        createdBy: currentUser.id.toString(), // Ensure string
        timestamp: Date.now()
    };
    
    // Create locally first (optimistic update)
    createTextBlockElement(textBlock);
    addToSlideContent(textBlock);
    selectTextBlock(textBlock.id);
    
    // FIXED: Sanitize data before sending
    const sanitizedTextBlock = sanitizeTextBlockData(textBlock);
    sendTextBlockUpdate(sanitizedTextBlock);
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
        <div class="text-content" contenteditable="true" 
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
    textContent.addEventListener('click', (e) => {
    e.stopPropagation();
    if (canEdit()) {
        textContent.focus();
    }
    });
    
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

// FIXED: Better drag and resize with real-time updates
let dragUpdateInterval;

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
    
    // FIXED: Start real-time position updates during drag
    startDragUpdates(id);
    
    e.preventDefault();
}

function startDragUpdates(id) {
    // Send position updates every 100ms during drag for smooth real-time movement
    dragUpdateInterval = setInterval(() => {
        if (isDragging && selectedTextBlock === id) {
            const element = document.getElementById(`textBlock-${id}`);
            if (element) {
                const textBlock = extractTextBlockData(element, id);
                const sanitizedTextBlock = sanitizeTextBlockData(textBlock);
                sendTextBlockUpdate(sanitizedTextBlock);
            }
        }
    }, 100);
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
        
        const newX = Math.floor(e.clientX - canvasRect.left - dragOffset.x);
        const newY = Math.floor(e.clientY - canvasRect.top - dragOffset.y);
        
        element.style.left = Math.max(0, newX) + 'px';
        element.style.top = Math.max(0, newY) + 'px';
    } else if (isResizing && selectedTextBlock) {
        const element = document.getElementById(`textBlock-${selectedTextBlock}`);
        const canvasRect = document.getElementById('slideCanvas').getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        const newWidth = Math.floor(e.clientX - elementRect.left);
        const newHeight = Math.floor(e.clientY - elementRect.top);
        
        element.style.width = Math.max(50, newWidth) + 'px';
        element.style.height = Math.max(20, newHeight) + 'px';
    }
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        // Clear drag update interval
        if (dragUpdateInterval) {
            clearInterval(dragUpdateInterval);
            dragUpdateInterval = null;
        }
        
        if (selectedTextBlock) {
            // Send final position update
            updateTextBlockAndSync(selectedTextBlock);
            const element = document.getElementById(`textBlock-${selectedTextBlock}`);
            element.style.zIndex = 'auto';
        }
    }
    
    if (isResizing && selectedTextBlock) {
        updateTextBlockAndSync(selectedTextBlock);
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
        // Remove locally first for immediate feedback
        element.remove();
        removeFromSlideContent(id);
        if (selectedTextBlock === id) {
            selectedTextBlock = null;
        }
        
        // Send delete notification via SignalR
        sendTextBlockDelete(id);
    }
}

// NEW: Send text block deletion via SignalR
async function sendTextBlockDelete(textBlockId) {  
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        console.warn('Cannot send delete - SignalR not connected');
        return;
    }
    
    try {
        const deleteData = {
            presentationId: typeof currentPresentation.id === 'string' ? currentPresentation.id : currentPresentation.id.toString(),
            slideIndex: parseInt(currentSlideIndex) || 0,
            textBlockId: textBlockId.toString(),
            userId: typeof currentUser.id === 'string' ? currentUser.id : currentUser.id.toString()
        };
        
        await connection.invoke("DeleteTextBlock", deleteData);
        console.log('Text block delete sent successfully:', textBlockId);
    } catch (err) {
        console.error('Failed to send text block delete:', err);
    }
}

// FIXED: Debounced updates with better timing
let updateTimeouts = new Map();
const DEBOUNCE_DELAY = 300; // Reduced for more responsive updates

function debounceUpdate(id) {
    if (updateTimeouts.has(id)) {
        clearTimeout(updateTimeouts.get(id));
    }
    
    const timeout = setTimeout(() => {
        updateTextBlockAndSync(id);
        updateTimeouts.delete(id);
    }, DEBOUNCE_DELAY);
    
    updateTimeouts.set(id, timeout);
}

// Local update only (for real-time feedback)
function updateTextBlockLocal(id) {
    const element = document.getElementById(`textBlock-${id}`);
    if (!element) return;
    
    const textContent = element.querySelector('.text-content');
    const textBlock = {
        id: id,
        type: 'textBlock',
        x: parseInt(element.style.left) || 0,
        y: parseInt(element.style.top) || 0,
        width: parseInt(element.style.width) || 200,
        height: parseInt(element.style.height) || 60,
        content: textContent.innerHTML || '',
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
    
    // FIXED: Sanitize data before sending
    const sanitizedTextBlock = sanitizeTextBlockData(textBlock);
    
    // Send update via SignalR instead of WebSocket
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
        sendTextBlockUpdate(sanitizedTextBlock);
    }
}

function updateTextBlockPosition(id) {
    updateTextBlockAndSync(id);
}

function updateTextBlockSize(id) {
    updateTextBlockAndSync(id);
}

// FIXED: Enhanced text block update handling with conflict resolution
function updateTextBlockFromRemote(textBlock) {
    // Ignore if this is our own update
    if (pendingUpdates.has(textBlock.id)) {
        return;
    }
    
    const element = document.getElementById(`textBlock-${textBlock.id}`);
    if (!element) {
        // Create new text block
        createTextBlockElement(textBlock);
        addToSlideContent(textBlock);
        return;
    }
    
    // FIXED: Check if user is currently editing this text block
    const textContent = element.querySelector('.text-content');
    const isBeingEdited = document.activeElement === textContent;
    
    if (isBeingEdited) {
        // Show conflict indicator and queue update
        showEditConflict(textBlock.id);
        queueUpdate('textBlock', textBlock);
        return;
    }
    
    // Apply remote update
    applyTextBlockUpdate(element, textBlock);
    updateSlideContent(textBlock.id, textBlock);
    
    // Show brief indicator that content was updated by another user
    showRemoteUpdateIndicator(textBlock.id);
}

function applyTextBlockUpdate(element, textBlock) {
    // Update position and size
    element.style.left = textBlock.x + 'px';
    element.style.top = textBlock.y + 'px';
    element.style.width = textBlock.width + 'px';
    element.style.height = textBlock.height + 'px';
    
    // Update content and styling
    const textContent = element.querySelector('.text-content');
    textContent.innerHTML = textBlock.content;
    textContent.style.fontSize = textBlock.fontSize + 'px';
    textContent.style.fontWeight = textBlock.fontWeight;
    textContent.style.fontStyle = textBlock.fontStyle;
    textContent.style.textAlign = textBlock.textAlign;
}

function generateUniqueId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// FIXED: Ensure extracted data has correct types
function extractTextBlockData(element, id) {
    const textContent = element.querySelector('.text-content');
    return {
        id: id.toString(),
        type: 'textBlock',
        x: parseInt(element.style.left) || 0,
        y: parseInt(element.style.top) || 0,
        width: parseInt(element.style.width) || 200,
        height: parseInt(element.style.height) || 60,
        content: textContent.innerHTML || '',
        fontSize: parseInt(textContent.style.fontSize) || 16,
        fontWeight: textContent.style.fontWeight || 'normal',
        fontStyle: textContent.style.fontStyle || 'normal',
        textAlign: textContent.style.textAlign || 'left',
        timestamp: Date.now()
    };
}

function queueUpdate(type, data) {
    updateQueue.push({ type, data, timestamp: Date.now() });
}

function processQueuedUpdates() {
    while (updateQueue.length > 0) {
        const update = updateQueue.shift();
        if (update.type === 'textBlock') {
            const sanitizedData = sanitizeTextBlockData(update.data);
            sendTextBlockUpdate(sanitizedData);
        }
    }
}

function handleConnectionFailure() {
    reconnectAttempts++;
    if (reconnectAttempts < maxReconnectAttempts) {
        showConnectionStatus('Connection lost. Retrying...');
        setTimeout(connectSignalR, 2000 * reconnectAttempts);
    } else {
        showConnectionStatus('Connection failed. Please refresh the page.');
    }
}

function showConnectionStatus(message) {
    // Create or update connection status indicator
    let statusEl = document.getElementById('connectionStatus');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'connectionStatus';
        statusEl.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #ffc107;
            color: #000;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 9999;
        `;
        document.body.appendChild(statusEl);
    }
    
    statusEl.textContent = message;
    
    if (message === 'Connected') {
        statusEl.style.background = '#28a745';
        statusEl.style.color = '#fff';
        setTimeout(() => statusEl.remove(), 2000);
    }
}

function showRemoteUpdateIndicator(textBlockId) {
    const element = document.getElementById(`textBlock-${textBlockId}`);
    if (element) {
        element.style.boxShadow = '0 0 10px #007bff';
        setTimeout(() => {
            element.style.boxShadow = '';
        }, 1000);
    }
}

function showEditConflict(textBlockId) {
    const element = document.getElementById(`textBlock-${textBlockId}`);
    if (element) {
        element.style.borderColor = '#dc3545';
        element.title = 'Another user is editing this. Your changes will be applied when you finish editing.';
    }
}

// FIXED: Moved sanitizeTextBlockData function here (was referenced in websockets.js)
function sanitizeTextBlockData(textBlock) {
    return {
        id: textBlock.id ? textBlock.id.toString() : generateUniqueId(),
        type: textBlock.type || "textBlock",
        x: parseInt(textBlock.x) || 0,
        y: parseInt(textBlock.y) || 0,
        width: parseInt(textBlock.width) || 200,
        height: parseInt(textBlock.height) || 60,
        content: textBlock.content || "",
        fontSize: parseInt(textBlock.fontSize) || 16,
        fontWeight: textBlock.fontWeight || "normal",
        fontStyle: textBlock.fontStyle || "normal",
        textAlign: textBlock.textAlign || "left"
    };
}


