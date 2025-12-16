// Глобальные переменные
let currentUser = null;
let messages = [];
let searchResults = [];
let currentSearchPage = 0;
let messageUpdateInterval = null;
let serverAvailable = false; // Флаг доступности сервера
const RESULTS_PER_PAGE = 10;
const API_URL = 'http://localhost:5000/api'; // URL сервера (измените при необходимости)

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    checkUserNickname();
    setupEventListeners();
    setupAdminConsole();
});

// Проверка наличия ника пользователя
function checkUserNickname() {
    const modal = document.getElementById('nickname-modal');
    const savedNickname = localStorage.getItem('maxim_username');
    
    if (!savedNickname) {
        showNicknameModal();
        } else {
        modal.style.display = 'none';
        currentUser = savedNickname;
        showChat();
    }
}

// Показать модальное окно выбора ника
function showNicknameModal() {
    const modal = document.getElementById('nickname-modal');
    const input = document.getElementById('nickname-input');
    const confirmBtn = document.getElementById('confirm-nickname');
    const hint = document.querySelector('.input-hint');
    
    modal.style.display = 'flex';
    setTimeout(() => input.focus(), 100);
    
    confirmBtn.onclick = async () => {
        const nickname = input.value.trim();
        
        // Проверка длины
        if (nickname.length < 2 || nickname.length > 15) {
            input.style.borderColor = 'rgba(255, 0, 0, 0.5)';
            if (hint) {
                hint.textContent = 'Имя должно быть от 2 до 15 символов';
                hint.style.color = 'rgba(255, 0, 0, 0.8)';
            }
            setTimeout(() => {
                input.style.borderColor = '';
                if (hint) {
                    hint.textContent = 'Максимум 15 символов';
                    hint.style.color = '';
                }
            }, 3000);
            return;
        }
        
        // Проверка уникальности ника (если сервер доступен)
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Проверка...';
        
        const serverOk = await checkServerAvailability();
        
        if (serverOk) {
            try {
                const response = await fetch(`${API_URL}/chat/check-username?username=${encodeURIComponent(nickname)}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(5000)
                });
                
                if (!response.ok) {
                    throw new Error('Ошибка проверки имени');
                }
                
                const result = await response.json();
                
                if (!result.isAvailable) {
                    input.style.borderColor = 'rgba(255, 0, 0, 0.5)';
                    if (hint) {
                        hint.textContent = result.message || 'Это имя уже занято';
                        hint.style.color = 'rgba(255, 0, 0, 0.8)';
                    }
                    setTimeout(() => {
                        input.style.borderColor = '';
                        if (hint) {
                            hint.textContent = 'Максимум 15 символов';
                            hint.style.color = '';
                        }
                    }, 3000);
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Начать общение';
                    return;
                }
            } catch (error) {
                console.warn('Не удалось проверить имя на сервере, продолжаем без проверки:', error);
                // Продолжаем без проверки уникальности
            }
        }
        
        // Имя доступно (или сервер недоступен) - сохраняем
        currentUser = nickname;
        localStorage.setItem('maxim_username', nickname);
        hideNicknameModal();
        showChat();
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Начать общение';
    };
    
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        }
    };
}

// Скрыть модальное окно выбора ника
function hideNicknameModal() {
    const modal = document.getElementById('nickname-modal');
    modal.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Показать чат
function showChat() {
    const container = document.getElementById('chat-container');
    const usernameDisplay = document.getElementById('display-username');
    const modal = document.getElementById('nickname-modal');
    
    modal.style.display = 'none';
    usernameDisplay.textContent = currentUser;
    container.style.display = 'flex';
    
    loadMessages();
    startMessageUpdates();
}

// Настройка обработчиков событий
function setupEventListeners() {
    const sendBtn = document.getElementById('send-button');
const messageInput = document.getElementById('message-input');
    
    sendBtn.onclick = sendMessage;
    
    messageInput.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    
    const searchBtn = document.getElementById('search-button');
    searchBtn.onclick = () => {
        showSearchMenu();
    };
    
    const closeSearchBtn = document.getElementById('close-search');
    closeSearchBtn.onclick = hideSearchMenu;
    
    const searchInput = document.getElementById('search-input');
    searchInput.oninput = () => {
        performSearch(searchInput.value.trim());
    };
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    prevBtn.onclick = () => {
        if (currentSearchPage > 0) {
            currentSearchPage--;
            displaySearchResults();
        }
    };
    
    nextBtn.onclick = () => {
        const maxPages = Math.ceil(searchResults.length / RESULTS_PER_PAGE);
        if (currentSearchPage < maxPages - 1) {
            currentSearchPage++;
            displaySearchResults();
        }
    };
    
    const searchMenuOverlay = document.getElementById('search-menu');
    searchMenuOverlay.onclick = (e) => {
        if (e.target === searchMenuOverlay) {
            hideSearchMenu();
        }
    };
}

// Проверка доступности сервера
async function checkServerAvailability() {
    try {
        const response = await fetch(`${API_URL}/chat/messages`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(2000)
        });
        serverAvailable = response.ok;
        return serverAvailable;
    } catch (error) {
        serverAvailable = false;
        return false;
    }
}

// Загрузка сообщений с сервера или из localStorage
async function loadMessages() {
    // Сначала проверяем доступность сервера
    const serverOk = await checkServerAvailability();
    
    if (serverOk) {
        // Загружаем с сервера
        try {
            const response = await fetch(`${API_URL}/chat/messages`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
            
            const serverMessages = await response.json();
            messages = serverMessages.map(msg => ({
                id: msg.id,
                author: msg.author,
                text: msg.text,
                timestamp: msg.timestamp
            }));
            
            // Сохраняем в localStorage как резервную копию
            localStorage.setItem('maxim_messages_backup', JSON.stringify(messages));
            
            renderMessages();
            return;
        } catch (error) {
            console.warn('Не удалось загрузить с сервера, используем локальные данные:', error);
            serverAvailable = false;
        }
    }
    
    // Fallback: загружаем из localStorage
    const savedMessages = localStorage.getItem('maxim_messages_backup');
    if (savedMessages) {
        try {
            messages = JSON.parse(savedMessages);
            renderMessages();
            
            // Показываем предупреждение о работе в офлайн режиме
            if (!document.querySelector('.offline-mode-shown')) {
                const offlineDiv = document.createElement('div');
                offlineDiv.className = 'offline-mode-shown';
                offlineDiv.style.cssText = `
                    background: rgba(255, 165, 0, 0.2);
                    border: 1px solid rgba(255, 165, 0, 0.5);
                    color: #ffa500;
                    padding: 12px;
                    border-radius: 12px;
                    margin: 10px;
                    text-align: center;
                `;
                offlineDiv.innerHTML = `
                    <strong>⚠ Офлайн режим</strong><br>
                    Сервер недоступен. Показываются локальные сообщения.<br>
                    <small>Для полной функциональности запустите сервер: <code>dotnet run</code></small>
                `;
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages && !chatMessages.querySelector('.offline-mode-shown')) {
                    chatMessages.insertBefore(offlineDiv, chatMessages.firstChild);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            messages = [];
            renderMessages();
        }
    } else {
        messages = [];
        renderMessages();
    }
}

// Автоматическое обновление сообщений
function startMessageUpdates() {
    if (messageUpdateInterval) {
        clearInterval(messageUpdateInterval);
    }
    // Обновляем сообщения каждые 3 секунды, если сервер доступен
    messageUpdateInterval = setInterval(async () => {
        if (serverAvailable) {
            await loadMessages();
        } else {
            // Периодически проверяем доступность сервера
            const available = await checkServerAvailability();
            if (available) {
                await loadMessages();
            }
        }
    }, 3000);
}

// Отправка сообщения на сервер или сохранение локально
async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    const sendBtn = document.getElementById('send-button');
    sendBtn.disabled = true;
    
    // Проверяем доступность сервера
    const serverOk = await checkServerAvailability();
    
    if (serverOk) {
        // Отправляем на сервер
        try {
            const response = await fetch(`${API_URL}/chat/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    author: currentUser,
                    text: text
                }),
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка отправки сообщения');
            }
            
            const message = await response.json();
            input.value = '';
            input.focus();
            
            // Обновляем сообщения
            await loadMessages();
            sendBtn.disabled = false;
            return;
        } catch (error) {
            console.warn('Не удалось отправить на сервер, сохраняем локально:', error);
            serverAvailable = false;
        }
    }
    
    // Fallback: сохраняем локально
    const message = {
        id: Date.now(),
        author: currentUser,
        text: text,
        timestamp: new Date().toISOString()
    };
    
    messages.push(message);
    localStorage.setItem('maxim_messages_backup', JSON.stringify(messages));
    
    input.value = '';
    input.focus();
    
    renderMessages();
    sendBtn.disabled = false;
    
    showError('Сервер недоступен. Сообщение сохранено локально. Запустите сервер для синхронизации.');
}

// Показать ошибку
function showError(message) {
    const chatMessages = document.getElementById('chat-messages');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        background: rgba(255, 0, 0, 0.2);
        border: 1px solid rgba(255, 0, 0, 0.5);
        color: #ff6b6b;
        padding: 12px;
        border-radius: 12px;
        margin: 10px;
        text-align: center;
    `;
    
    chatMessages.appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Добавить сообщение в чат
function addMessageToChat(message) {
    const chatMessages = document.getElementById('chat-messages');
    const welcome = chatMessages.querySelector('.welcome-message');
    
    if (welcome) {
        welcome.remove();
    }
    
    const messageEl = createMessageElement(message);
    chatMessages.appendChild(messageEl);
    
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

// Создать элемент сообщения
function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = 'message';
    div.dataset.messageId = message.id;
    
    const header = document.createElement('div');
    header.className = 'message-header';
    
    const author = document.createElement('span');
    author.className = 'message-author';
    author.textContent = message.author;
    
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatTime(message.timestamp);
    
    header.appendChild(author);
    header.appendChild(time);
    
    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = message.text;
    
    div.appendChild(header);
    div.appendChild(text);

    return div;
}

// Форматирование времени
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
        return 'только что';
    } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} мин. назад`;
    } else if (diff < 86400000) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

// Отображение всех сообщений
function renderMessages() {
    const chatMessages = document.getElementById('chat-messages');
    const scrollPosition = chatMessages.scrollTop;
    const isAtBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 50;
    
    chatMessages.innerHTML = '';
    
    if (messages.length === 0) {
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">💬</div>
                <h3>Добро пожаловать в MAXim!</h3>
                <p>Начните общение, отправив первое сообщение</p>
            </div>
        `;
        return;
    }
    
    messages.forEach(message => {
        const messageEl = createMessageElement(message);
        chatMessages.appendChild(messageEl);
    });
    
    if (isAtBottom) {
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    } else {
        chatMessages.scrollTop = scrollPosition;
    }
}

// Показать меню поиска
function showSearchMenu() {
    const menu = document.getElementById('search-menu');
    const searchInput = document.getElementById('search-input');
    
    menu.style.display = 'flex';
    
    setTimeout(() => {
        searchInput.focus();
    }, 100);
}

// Скрыть меню поиска
function hideSearchMenu() {
    const menu = document.getElementById('search-menu');
    const searchInput = document.getElementById('search-input');
    
    menu.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
        menu.style.display = 'none';
        menu.style.animation = '';
        searchInput.value = '';
        searchResults = [];
        currentSearchPage = 0;
        displaySearchResults();
        removeHighlights();
    }, 300);
}

// Выполнить поиск
function performSearch(query) {
    if (!query) {
        searchResults = [];
        displaySearchResults();
        removeHighlights();
        return;
    }
    
    const lowerQuery = query.toLowerCase();
    searchResults = messages.filter(message => {
        return message.text.toLowerCase().includes(lowerQuery) ||
               message.author.toLowerCase().includes(lowerQuery);
    });
    
    currentSearchPage = 0;
    displaySearchResults();
}

// Отображение результатов поиска
function displaySearchResults() {
    const resultsContainer = document.getElementById('search-results');
    const pagination = document.getElementById('search-pagination');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (searchResults.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">Ничего не найдено</div>';
        pagination.style.display = 'none';
        return;
    }
    
    const maxPages = Math.ceil(searchResults.length / RESULTS_PER_PAGE);
    const start = currentSearchPage * RESULTS_PER_PAGE;
    const end = start + RESULTS_PER_PAGE;
    const pageResults = searchResults.slice(start, end);
    
    resultsContainer.innerHTML = '';
    
    pageResults.forEach((message, index) => {
    const item = document.createElement('div');
        item.className = 'search-result-item';
        item.onclick = () => {
            scrollToMessage(message.id);
            hideSearchMenu();
        };
        
        const author = document.createElement('div');
        author.className = 'result-author';
        author.textContent = message.author;
        
        const text = document.createElement('div');
        text.className = 'result-text';
        text.textContent = message.text;
        
        const time = document.createElement('div');
        time.className = 'result-time';
        time.textContent = formatTime(message.timestamp);
        
        item.appendChild(author);
        item.appendChild(text);
        item.appendChild(time);
        
        resultsContainer.appendChild(item);
    });
    
    if (searchResults.length > RESULTS_PER_PAGE) {
        pagination.style.display = 'flex';
        pageInfo.textContent = `${currentSearchPage + 1} / ${maxPages}`;
        prevBtn.disabled = currentSearchPage === 0;
        nextBtn.disabled = currentSearchPage === maxPages - 1;
    } else {
        pagination.style.display = 'none';
    }
}

// Прокрутка к сообщению и подсветка
function scrollToMessage(messageId) {
    const chatMessages = document.getElementById('chat-messages');
    const messageEl = chatMessages.querySelector(`[data-message-id="${messageId}"]`);
    
    if (messageEl) {
        removeHighlights();
        messageEl.classList.add('highlight');
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            messageEl.classList.remove('highlight');
        }, 3000);
    }
}

// Удалить все подсветки
function removeHighlights() {
    const highlighted = document.querySelectorAll('.message.highlight');
    highlighted.forEach(msg => msg.classList.remove('highlight'));
}

// Настройка админ консоли
function setupAdminConsole() {
    // Добавляем функцию очистки чата в консоль для админа
    window.clearChat = async function() {
        // Проверка с учетом регистра для русского текста
        if (currentUser !== 'Создатель') {
            console.error('Только администратор может очистить чат!');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/admin/clear-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: currentUser
                })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка очистки чата');
            }
            
            console.log('Чат успешно очищен!');
            await loadMessages();
        } catch (error) {
            console.error('Ошибка очистки чата:', error);
        }
    };
    
    console.log('%cАдмин панель MAXim', 'color: #8b5cf6; font-size: 16px; font-weight: bold;');
    console.log('%cДля очистки чата введите: clearChat()', 'color: #6366f1; font-size: 12px;');
}

// Добавить CSS анимацию fadeOut
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
