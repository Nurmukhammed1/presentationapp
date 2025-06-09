//websockets.js
let connection = null;
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Enhanced SignalR Connection with better error handling
async function connectSignalR() {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
        return; // Already connected
    }

    const hubUrl = 'https://collab-slides.runasp.net/presentationHub';
    
    connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
            accessTokenFactory: () => {
                return sessionStorage.getItem('authToken');
            }
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();
    
    setupSignalRHandlers();
    
    try {
        await connection.start();
        console.log('SignalR connected successfully');
        isConnected = true;
        reconnectAttempts = 0;
        
        // Join presentation AFTER connection is established
        if (currentPresentation) {
            await joinPresentationSignalR(currentPresentation.id, currentUser.id);
        }
    } catch (err) {
        console.error('SignalR connection failed:', err);
        isConnected = false;
        handleConnectionFailure();
    }
}

function setupSignalRHandlers() {
    // User management events
    connection.on("UserJoined", (data) => {
        console.log('User joined:', data);
        if (data && data.user) {
            handleUserJoined(data.user);
        }
    });
    
    connection.on("UserLeft", (data) => {
        console.log('User left:', data);
        if (data && data.userId) {
            handleUserLeft(data.userId);
        }
    });
    
    // FIXED: Handle user role changes
    connection.on("UserRoleChanged", (data) => {
        console.log('User role changed:', data);
        if (data && data.userId && data.role) {
            handleUserRoleChanged(data);
        }
    });
    
    // Text block events
    connection.on("TextBlockUpdated", (data) => {
        console.log('Text block updated:', data);
        if (data && data.textBlock && data.userId !== currentUser.id) {
            updateTextBlockFromRemote(data.textBlock);
        }
    });
    
    // NEW: Handle text block deletion
    connection.on("TextBlockDeleted", (data) => {
        console.log('Text block deleted remotely:', data);
        if (data && data.textBlockId && data.userId !== currentUser.id) {
            handleRemoteTextBlockDeletion(data.textBlockId);
        }
    });
    
    // Slide events
    connection.on("SlideChanged", (data) => {
        if (data && data.slideIndex !== undefined) {
            handleSlideChanged(data.slideIndex);
        }
    });
    
    connection.on("SlideContentUpdated", (data) => {
        if (data && data.slideIndex === currentSlideIndex) {
            handleSlideContentUpdate(data.content);
        }
    });
    
    connection.on("PresentationUpdated", (data) => {
        if (data) {
            handlePresentationUpdate(data);
        }
    });
    
    // Connection state handlers
    connection.onclose((error) => {
        console.log('SignalR disconnected:', error);
        isConnected = false;
        handleConnectionFailure();
    });
    
    connection.onreconnecting((error) => {
        console.log('SignalR reconnecting:', error);
        showConnectionStatus('Reconnecting...');
    });
    
    connection.onreconnected((connectionId) => {
        console.log('SignalR reconnected:', connectionId);
        isConnected = true;
        showConnectionStatus('Connected');
        
        if (currentPresentation) {
            joinPresentationSignalR(currentPresentation.id, currentUser.id);
            syncCurrentState();
        }
    });
}

// Enhanced event handlers
function handleUserJoined(user) {
    if (typeof users !== 'undefined') {
        // Check if user already exists (avoid duplicates)
        const existingUserIndex = users.findIndex(u => u.id === user.id);
        if (existingUserIndex === -1) {
            users.push(user);
        } else {
            // Update existing user data
            users[existingUserIndex] = user;
        }
        
        if (typeof updateUsersList === 'function') {
            updateUsersList();
        }
    }
}

function handleUserLeft(userId) {
    if (typeof users !== 'undefined') {
        users = users.filter(u => u.id !== userId);
        if (typeof updateUsersList === 'function') {
            updateUsersList();
        }
    }
}

// NEW: Handle user role changes
function handleUserRoleChanged(data) {
    if (typeof users !== 'undefined') {
        const user = users.find(u => u.id === data.userId);
        if (user) {
            user.role = data.role;
            
            if (typeof updateUsersList === 'function') {
                updateUsersList();
            }
            
            // If it's the current user, update UI permissions
            if (data.userId === currentUser.id) {
                if (typeof updateUIBasedOnRole === 'function') {
                    updateUIBasedOnRole();
                }
            }
        }
    }
}

// NEW: Handle remote text block deletion
function handleRemoteTextBlockDeletion(textBlockId) {
    const element = document.getElementById(`textBlock-${textBlockId}`);
    if (element) {
        element.remove();
        
        // Remove from slide content data
        if (typeof removeFromSlideContent === 'function') {
            removeFromSlideContent(textBlockId);
        }
        
        // Clear selection if this block was selected
        if (typeof selectedTextBlock !== 'undefined' && selectedTextBlock === textBlockId) {
            selectedTextBlock = null;
        }
    }
}

// SignalR method calls with proper error handling
async function joinPresentationSignalR(presentationId, userId) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        console.warn('Cannot join presentation - SignalR not connected');
        return false;
    }
    
    try {
        const guidPresentationId = typeof presentationId === 'string' ? presentationId : presentationId.toString();
        const guidUserId = typeof userId === 'string' ? userId : userId.toString();
        
        await connection.invoke("JoinPresentation", guidPresentationId, guidUserId);
        console.log('Successfully joined presentation:', guidPresentationId);
        return true;
    } catch (err) {
        console.error('Failed to join presentation:', err);
        return false;
    }
}

async function leavePresentationSignalR(presentationId, userId) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        return;
    }
    
    try {
        const guidPresentationId = typeof presentationId === 'string' ? presentationId : presentationId.toString();
        const guidUserId = typeof userId === 'string' ? userId : userId.toString();
        
        await connection.invoke("LeavePresentation", guidPresentationId, guidUserId);
        console.log('Left presentation:', guidPresentationId);
    } catch (err) {
        console.error('Failed to leave presentation:', err);
    }
}

// Text block update with optimistic updates
let pendingUpdates = new Map();
let updateQueue = [];

async function sendTextBlockUpdate(textBlock) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        console.warn('Cannot send update - SignalR not connected');
        queueUpdate('textBlock', textBlock);
        return;
    }
    
    try {
        // Add to pending updates to prevent echo
        pendingUpdates.set(textBlock.id, Date.now());
        
        const updateData = {
            presentationId: typeof currentPresentation.id === 'string' ? currentPresentation.id : currentPresentation.id.toString(),
            slideIndex: parseInt(currentSlideIndex) || 0,
            textBlock: sanitizeTextBlockData(textBlock),
            userId: typeof currentUser.id === 'string' ? currentUser.id : currentUser.id.toString()
        };
        
        console.log('Sending text block update:', updateData);
        
        await connection.invoke("UpdateTextBlock", updateData);
        console.log('Text block update sent successfully:', textBlock.id);
        
        // Remove from pending after a delay
        setTimeout(() => {
            pendingUpdates.delete(textBlock.id);
        }, 1000);
        
    } catch (err) {
        console.error('Failed to send text block update:', err);
        pendingUpdates.delete(textBlock.id);
        queueUpdate('textBlock', textBlock);
    }
}

// NEW: Send text block deletion
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

// NEW: Send user role change
async function sendUserRoleChange(userId, newRole) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        console.warn('Cannot send role change - SignalR not connected');
        return false;
    }

    try {
        const roleChangeData = {
            presentationId: typeof currentPresentation.id === 'string' ? currentPresentation.id : currentPresentation.id.toString(),
            userId: typeof userId === 'string' ? userId : userId.toString(),
            newRole: newRole,
            requesterId: typeof currentUser.id === 'string' ? currentUser.id : currentUser.id.toString()
        };

        await connection.invoke("ChangeUserRole", roleChangeData);
        console.log('Role change request sent successfully');
        return true;
    } catch (err) {
        console.error('Failed to send role change:', err);
        return false;
    }
}

// Queue management for offline updates
function queueUpdate(type, data) {
    updateQueue.push({ type, data, timestamp: Date.now() });
    
    // Limit queue size
    if (updateQueue.length > 50) {
        updateQueue.shift();
    }
}

function processQueuedUpdates() {
    if (!isConnected || updateQueue.length === 0) return;
    
    console.log(`Processing ${updateQueue.length} queued updates`);
    
    const updates = [...updateQueue];
    updateQueue = [];
    
    updates.forEach(update => {
        switch(update.type) {
            case 'textBlock':
                sendTextBlockUpdate(update.data);
                break;
            case 'delete':
                sendTextBlockDelete(update.data);
                break;
            case 'roleChange':
                sendUserRoleChange(update.data.userId, update.data.role);
                break;
        }
    });
}

// Connection failure handling
function handleConnectionFailure() {
    showConnectionStatus('Disconnected');
    
    if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.pow(2, reconnectAttempts) * 1000; // Exponential backoff
        
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
        
        setTimeout(() => {
            connectSignalR();
        }, delay);
    } else {
        console.error('Max reconnection attempts reached');
        showConnectionStatus('Connection Failed');
    }
}

// Sync current state after reconnection
function syncCurrentState() {
    // Refresh user list and presentation data
    if (typeof loadPresentationData === 'function') {
        loadPresentationData(currentPresentation.id);
    }
    
    // Process any queued updates
    processQueuedUpdates();
}

// Helper functions
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

function showConnectionStatus(status) {
    console.log('Connection status:', status);
    
    // Update UI to show connection status
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = `connection-status ${status.toLowerCase().replace(' ', '-')}`;
    }
    
    // Show toast notification for important status changes
    if (typeof showToast === 'function') {
        if (status === 'Connected') {
            showToast('Connected to real-time updates', 'success');
        } else if (status === 'Connection Failed') {
            showToast('Real-time updates unavailable', 'error');
        }
    }
}

function generateUniqueId() {
    return 'textblock-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Helper function for text block changes
function onTextBlockChanged(textBlock) {
    // Update locally first for immediate feedback
    if (typeof updateTextBlockLocal === 'function') {
        updateTextBlockLocal(textBlock.id);
    }
    
    // Then send to SignalR for other users
    sendTextBlockUpdate(textBlock);
}

// Initialize connection when page loads
document.addEventListener('DOMContentLoaded', function() {
    connectSignalR();
});

// Clean up connection when page unloads
window.addEventListener('beforeunload', function() {
    if (connection && currentPresentation && currentUser) {
        // Try to leave presentation gracefully
        leavePresentationSignalR(currentPresentation.id, currentUser.id);
    }
    
    if (connection) {
        connection.stop();
    }
});

// Retry connection on visibility change (when user returns to tab)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && !isConnected) {
        console.log('Page became visible, attempting to reconnect...');
        connectSignalR();
    }
});

// Export functions for use in other scripts
window.signalRUtils = {
    connectSignalR,
    sendTextBlockUpdate,
    sendTextBlockDelete,
    sendUserRoleChange,
    joinPresentationSignalR,
    leavePresentationSignalR,
    isConnected: () => isConnected
};