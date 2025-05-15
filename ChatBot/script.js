document.addEventListener('DOMContentLoaded', function() {
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const themeToggle = document.getElementById('themeToggle');
    const historyToggle = document.getElementById('historyToggle');
    const newChatButton = document.getElementById('newChatButton');
    const deleteAllChats = document.getElementById('deleteAllChats');
    const chatHistory = document.getElementById('chatHistory');
    const closeHistory = document.getElementById('closeHistory');
    const historyItems = document.getElementById('historyItems');
    const overlay = document.getElementById('overlay');
    
    // API configuration
    const API_ENDPOINT = 'http://localhost:5000/chat';
    let isWaitingForResponse = false;
    let currentChatId = generateChatId();
    let chats = loadChats();
    
    // Initialize chat
    initializeChat();
    
    // Theme toggle functionality
    themeToggle.addEventListener('click', toggleTheme);
    
    // Check for saved theme preference
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        updateThemeIcon();
    }
    
    // Chat history functionality
    historyToggle.addEventListener('click', openHistory);
    closeHistory.addEventListener('click', closeHistoryPanel);
    overlay.addEventListener('click', closeHistoryPanel);
    
    // New chat button
    newChatButton.addEventListener('click', startNewChat);
    
    // Delete all chats button
    deleteAllChats.addEventListener('click', showDeleteConfirmation);
    
    // Send message on Enter key
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !isWaitingForResponse) {
            sendMessage();
        }
    });
    
    // Send button click
    sendButton.addEventListener('click', function() {
        if (!isWaitingForResponse) {
            sendMessage();
        }
    });
    
    // Helper functions
    function initializeChat() {
        if (!chats[currentChatId]) {
            addMessageToChat('assistant', 'Hello! How can I help you today?');
            saveChat();
        } else {
            // Load existing chat
            chats[currentChatId].messages.forEach(msg => {
                addMessageToChat(msg.role, msg.content, false);
            });
        }
    }
    
    function startNewChat() {
        // Save current chat
        saveChat();
        
        // Generate new chat ID
        currentChatId = generateChatId();
        
        // Clear chat box
        chatBox.innerHTML = '';
        
        // Initialize new chat
        addMessageToChat('assistant', 'Hello! How can I help you today?');
    }
    
    function addMessageToChat(role, content, saveToHistory = true) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${role}-message`);
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.textContent = content;
        
        const messageTime = document.createElement('div');
        messageTime.classList.add('message-time');
        const now = new Date();
        messageTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        chatBox.appendChild(messageDiv);
        
        // Scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
        
        // Add to chat history data
        if (saveToHistory) {
            if (!chats[currentChatId]) {
                chats[currentChatId] = {
                    id: currentChatId,
                    createdAt: new Date().toISOString(),
                    messages: []
                };
            }
            
            chats[currentChatId].messages.push({
                role,
                content,
                timestamp: now.toISOString()
            });
            
            saveChat();
            updateHistoryUI();
        }
    }
    
    function showTypingIndicator() {
        if (document.querySelector('.typing-indicator')) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'typing-indicator');
        
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        
        chatBox.appendChild(typingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    function hideTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message || isWaitingForResponse) return;
        
        // Add user message to chat
        addMessageToChat('user', message);
        userInput.value = '';
        isWaitingForResponse = true;
        sendButton.disabled = true;
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message
                })
            });
            
            hideTypingIndicator();
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                addMessageToChat('assistant', data.response);
            } else {
                throw new Error(data.message || 'Unknown error from server');
            }
        } catch (error) {
            hideTypingIndicator();
            console.error('Error:', error);
            
            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Failed to connect to the server. Please check your connection.';
            }
            
            addMessageToChat('assistant', `Sorry, I encountered an error: ${errorMessage}`);
        } finally {
            isWaitingForResponse = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    }
    
    function toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeIcon();
    }
    
    function updateThemeIcon() {
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('dark-theme')) {
            icon.classList.replace('fa-moon', 'fa-sun');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
        }
    }
    
    function openHistory() {
        chatHistory.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateHistoryUI();
    }
    
    function closeHistoryPanel() {
        chatHistory.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function loadChats() {
        const savedChats = localStorage.getItem('chatHistory');
        return savedChats ? JSON.parse(savedChats) : {};
    }
    
    function saveChat() {
        localStorage.setItem('chatHistory', JSON.stringify(chats));
    }
    
    function generateChatId() {
        return Date.now().toString();
    }
    
    function updateHistoryUI() {
        historyItems.innerHTML = '';
        
        const chatList = Object.values(chats).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        if (chatList.length === 0) {
            historyItems.innerHTML = '<div class="empty-history">No previous chats yet</div>';
            return;
        }
        
        chatList.forEach(chat => {
            const lastUserMessage = chat.messages.findLast(msg => msg.role === 'user');
            if (lastUserMessage) {
                const historyItem = document.createElement('div');
                historyItem.classList.add('history-item');
                
                const messagePreview = document.createElement('div');
                messagePreview.textContent = 
                    lastUserMessage.content.length > 50 
                    ? lastUserMessage.content.substring(0, 50) + '...' 
                    : lastUserMessage.content;
                
                const timeElement = document.createElement('div');
                timeElement.classList.add('history-item-time');
                timeElement.textContent = new Date(chat.createdAt).toLocaleString();
                
                const deleteButton = document.createElement('button');
                deleteButton.classList.add('history-item-delete');
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showDeleteConfirmation(chat.id);
                });
                
                historyItem.appendChild(messagePreview);
                historyItem.appendChild(timeElement);
                historyItem.appendChild(deleteButton);
                
                historyItem.addEventListener('click', () => {
                    loadChat(chat.id);
                    closeHistoryPanel();
                });
                
                historyItems.appendChild(historyItem);
            }
        });
    }
    
    function loadChat(chatId) {
        if (chatId === currentChatId) return;
        
        // Save current chat
        saveChat();
        
        // Load new chat
        currentChatId = chatId;
        chatBox.innerHTML = '';
        
        if (chats[chatId] && chats[chatId].messages.length > 0) {
            chats[chatId].messages.forEach(msg => {
                addMessageToChat(msg.role, msg.content, false);
            });
        } else {
            addMessageToChat('assistant', 'Hello! How can I help you today?');
        }
    }
    
    function showDeleteConfirmation(chatId = null) {
        const isDeleteAll = chatId === null;
        const dialog = document.createElement('div');
        dialog.classList.add('confirmation-dialog');
        
        dialog.innerHTML = `
            <p>${isDeleteAll ? 'Are you sure you want to delete ALL chat history?' : 'Are you sure you want to delete this chat?'}</p>
            <div class="confirmation-dialog-buttons">
                <button class="cancel">Cancel</button>
                <button class="confirm">Delete</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        const confirmButton = dialog.querySelector('.confirm');
        const cancelButton = dialog.querySelector('.cancel');
        
        cancelButton.addEventListener('click', () => {
            dialog.remove();
        });
        
        confirmButton.addEventListener('click', () => {
            if (isDeleteAll) {
                deleteAllChatHistory();
            } else {
                deleteSingleChat(chatId);
            }
            dialog.remove();
        });
    }
    
    function deleteAllChatHistory() {
        chats = {};
        localStorage.removeItem('chatHistory');
        currentChatId = generateChatId();
        chatBox.innerHTML = '';
        addMessageToChat('assistant', 'Hello! How can I help you today?');
        updateHistoryUI();
    }
    
    function deleteSingleChat(chatId) {
        delete chats[chatId];
        saveChat();
        
        if (currentChatId === chatId) {
            currentChatId = generateChatId();
            chatBox.innerHTML = '';
            addMessageToChat('assistant', 'Hello! How can I help you today?');
        }
        
        updateHistoryUI();
    }
    
    // Initial health check
    async function checkBackendHealth() {
        try {
            const response = await fetch('http://localhost:5000/health');
            if (!response.ok) {
                addMessageToChat('assistant', 'Warning: Backend server might not be running properly');
            }
        } catch (error) {
            console.log('Health check failed:', error);
        }
    }
    
    checkBackendHealth();
});