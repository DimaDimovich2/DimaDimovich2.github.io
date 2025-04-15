// Инициализация Firebase Auth и Firestore
import { db, auth, formatTimestamp, getUserData, getUserByEmail, showNotification } from './firebase-db.js';
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, updateDoc, doc, arrayUnion, deleteDoc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Глобальные переменные
let currentChatId = null;
let currentChat = null;
let messageListenerUnsubscribe = null;
let chatsListenerUnsubscribe = null;
let currentUser = null;

// Инициализация чата
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initModals();
    initCreateChatForm();
    setupMessageForm();
});

// Инициализация авторизации
function initAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserChats();
            // Устанавливаем статус онлайн при входе
            updateUserStatus(user.uid, true);
            // Обеспечиваем обновление статуса при выходе или закрытии окна
            window.addEventListener('beforeunload', () => {
                updateUserStatus(user.uid, false);
            });
        } else {
            // Перенаправляем на страницу входа, если пользователь не авторизован
            window.location.href = 'login.html';
        }
    });
}

// Обновление статуса пользователя (онлайн/оффлайн)
async function updateUserStatus(uid, isOnline) {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            isOnline: isOnline,
            lastActive: Timestamp.now()
        });
    } catch (error) {
        console.error("Ошибка при обновлении статуса пользователя:", error);
    }
}

// Инициализация модальных окон
function initModals() {
    // Кнопка создания нового чата
    document.querySelector('.add-channel-btn').addEventListener('click', () => {
        showModal('create-chat-modal');
    });

    // Кнопки закрытия модальных окон
    document.querySelectorAll('.modal-close, .btn-cancel').forEach(button => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            hideModal(modal);
        });
    });

    // Закрытие модального окна при клике вне контента
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal);
            }
        });
    });
}

// Показать модальное окно
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Скрыть модальное окно
function hideModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Инициализация формы создания чата
function initCreateChatForm() {
    const createChatForm = document.getElementById('create-chat-form');
    if (createChatForm) {
        createChatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const chatName = document.getElementById('chat-name').value.trim();
            const chatType = document.querySelector('input[name="chat-type"]:checked').value;
            const userEmail = document.getElementById('user-email').value.trim();
            
            if (!chatName) {
                showNotification('Пожалуйста, введите название чата', 'error');
                return;
            }
            
            try {
                if (chatType === 'private' && userEmail) {
                    await createPrivateChat(chatName, userEmail);
                } else {
                    await createGroupChat(chatName);
                }
                
                document.getElementById('create-chat-form').reset();
                hideModal(document.getElementById('create-chat-modal'));
                
            } catch (error) {
                console.error("Ошибка при создании чата:", error);
                showNotification('Ошибка при создании чата: ' + error.message, 'error');
            }
        });
    }
}

// Создание приватного чата
async function createPrivateChat(chatName, userEmail) {
    // Проверяем, существует ли пользователь с указанным email
    const invitedUser = await getUserByEmail(userEmail);
    
    if (!invitedUser) {
        throw new Error('Пользователь с таким email не найден');
    }
    
    if (invitedUser.uid === currentUser.uid) {
        throw new Error('Нельзя создать чат с самим собой');
    }
    
    // Проверяем, существует ли уже чат с этим пользователем
    const chatsRef = collection(db, "chats");
    const q = query(
        chatsRef, 
        where("type", "==", "private"),
        where("members", "array-contains", currentUser.uid)
    );
    
    const querySnapshot = await getDocs(q);
    
    for (const doc of querySnapshot.docs) {
        const chatData = doc.data();
        if (chatData.members.includes(invitedUser.uid)) {
            // Чат уже существует, переключаемся на него
            selectChat(doc.id);
            return;
        }
    }
    
    // Создаем новый приватный чат
    const chatData = {
        name: chatName,
        type: "private",
        createdAt: Timestamp.now(),
        createdBy: currentUser.uid,
        members: [currentUser.uid, invitedUser.uid],
        lastMessage: null,
        lastMessageTime: null
    };
    
    const docRef = await addDoc(collection(db, "chats"), chatData);
    selectChat(docRef.id);
    
    showNotification('Приватный чат создан успешно', 'success');
}

// Создание группового чата
async function createGroupChat(chatName) {
    const chatData = {
        name: chatName,
        type: "group",
        createdAt: Timestamp.now(),
        createdBy: currentUser.uid,
        members: [currentUser.uid],
        lastMessage: null,
        lastMessageTime: null
    };
    
    const docRef = await addDoc(collection(db, "chats"), chatData);
    selectChat(docRef.id);
    
    showNotification('Групповой чат создан успешно', 'success');
}

// Загрузка списка чатов пользователя
function loadUserChats() {
    if (chatsListenerUnsubscribe) {
        chatsListenerUnsubscribe();
    }
    
    const chatsRef = collection(db, "chats");
    const q = query(
        chatsRef, 
        where("members", "array-contains", currentUser.uid),
        orderBy("lastMessageTime", "desc")
    );
    
    chatsListenerUnsubscribe = onSnapshot(q, async (querySnapshot) => {
        const chatsList = document.getElementById('chats-list');
        chatsList.innerHTML = '';
        
        if (querySnapshot.empty) {
            chatsList.innerHTML = '<div class="no-chats">У вас пока нет чатов</div>';
            return;
        }
        
        for (const doc of querySnapshot.docs) {
            const chat = doc.data();
            const chatId = doc.id;
            
            // Для приватных чатов получаем данные второго участника
            let chatPartner = null;
            if (chat.type === "private") {
                const partnerUserId = chat.members.find(uid => uid !== currentUser.uid);
                if (partnerUserId) {
                    chatPartner = await getUserData(partnerUserId);
                }
            }
            
            const chatElement = createChatListItem(chat, chatId, chatPartner);
            chatsList.appendChild(chatElement);
            
            // Если это первый чат и нет активного чата, открываем его автоматически
            if (querySnapshot.docs.indexOf(doc) === 0 && !currentChatId) {
                selectChat(chatId);
            }
        }
    });
}

// Создание элемента списка чатов
function createChatListItem(chat, chatId, chatPartner) {
    const chatDiv = document.createElement('div');
    chatDiv.className = 'chat-item';
    chatDiv.dataset.chatId = chatId;
    
    // Определяем имя чата
    let chatName = chat.name;
    let chatColor = getRandomColor(chatId);
    let chatStatus = '';
    
    if (chat.type === "private" && chatPartner) {
        chatName = chatPartner.displayName || chatPartner.email.split('@')[0];
        chatColor = chatPartner.color || getRandomColor(chatPartner.uid);
        chatStatus = chatPartner.isOnline ? 'online' : 'offline';
    }
    
    // Формируем содержимое элемента чата
    const avatarInitial = chatName.charAt(0).toUpperCase();
    const lastMessage = chat.lastMessage ? 
        (chat.lastMessage.length > 25 ? chat.lastMessage.substring(0, 25) + '...' : chat.lastMessage) : 
        'Нет сообщений';
    const lastMessageTime = chat.lastMessageTime ? formatTimestamp(chat.lastMessageTime) : '';
    
    chatDiv.innerHTML = `
        <div class="chat-avatar" style="background-color: ${chatColor}">${avatarInitial}</div>
        <div class="chat-info">
            <div class="chat-name">${chatName}</div>
            <div class="chat-last-message">${lastMessage}</div>
        </div>
        <div class="chat-meta">
            <div class="chat-time">${lastMessageTime}</div>
            <div class="chat-status ${chatStatus}"></div>
        </div>
    `;
    
    // Обработчик выбора чата
    chatDiv.addEventListener('click', () => {
        selectChat(chatId);
    });
    
    return chatDiv;
}

// Выбор активного чата
function selectChat(chatId) {
    // Убираем активный класс со всех элементов чатов
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Добавляем активный класс выбранному чату
    const selectedChat = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (selectedChat) {
        selectedChat.classList.add('active');
    }
    
    currentChatId = chatId;
    loadChat(chatId);
}

// Загрузка данных чата
async function loadChat(chatId) {
    try {
        // Отписываемся от предыдущего слушателя сообщений, если он был
        if (messageListenerUnsubscribe) {
            messageListenerUnsubscribe();
        }
        
        // Получаем информацию о чате
        const chatRef = doc(db, "chats", chatId);
        const chatSnapshot = await getDoc(chatRef);
        
        if (!chatSnapshot.exists()) {
            showNotification('Чат не найден', 'error');
            return;
        }
        
        currentChat = chatSnapshot.data();
        currentChat.id = chatId;
        
        // Настраиваем заголовок чата
        setupChatHeader();
        
        // Загружаем сообщения чата
        loadChatMessages(chatId);
    } catch (error) {
        console.error("Ошибка при загрузке чата:", error);
        showNotification('Ошибка при загрузке чата', 'error');
    }
}

// Настройка заголовка чата
async function setupChatHeader() {
    const chatHeader = document.querySelector('.chat-header');
    
    if (!currentChat) {
        chatHeader.innerHTML = '';
        return;
    }
    
    let chatName = currentChat.name;
    let chatStatus = '';
    let chatColor = getRandomColor(currentChat.id);
    
    // Для приватных чатов отображаем информацию о собеседнике
    if (currentChat.type === "private") {
        const partnerUserId = currentChat.members.find(uid => uid !== currentUser.uid);
        if (partnerUserId) {
            const partnerData = await getUserData(partnerUserId);
            if (partnerData) {
                chatName = partnerData.displayName || partnerData.email.split('@')[0];
                chatColor = partnerData.color || getRandomColor(partnerData.uid);
                chatStatus = partnerData.isOnline ? 
                    'В сети' : 
                    (partnerData.lastActive ? `Был(а) в сети ${formatTimestamp(partnerData.lastActive)}` : 'Offline');
            }
        }
    } else {
        chatStatus = `${currentChat.members.length} участников`;
    }
    
    chatHeader.innerHTML = `
        <div class="chat-avatar" style="background-color: ${chatColor}">${chatName.charAt(0).toUpperCase()}</div>
        <div class="chat-info">
            <div class="chat-name">${chatName}</div>
            <div class="chat-status">${chatStatus}</div>
        </div>
    `;
}

// Генерация случайного цвета по ID
function getRandomColor(id) {
    // Преобразуем строку ID в число
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Генерируем HSL цвет с приятной насыщенностью и яркостью
    const h = hash % 360;
    return `hsl(${h}, 65%, 55%)`;
}

// Загрузка сообщений чата
function loadChatMessages(chatId) {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    
    // Настраиваем слушатель сообщений
    messageListenerUnsubscribe = onSnapshot(q, (snapshot) => {
        const messagesList = document.querySelector('.messages-list');
        
        // Очищаем список сообщений
        messagesList.innerHTML = '';
        
        if (snapshot.empty) {
            messagesList.innerHTML = '<div class="no-messages">Нет сообщений</div>';
            return;
        }
        
        snapshot.forEach(doc => {
            const message = doc.data();
            const messageElement = createMessageElement(message, doc.id);
            messagesList.appendChild(messageElement);
        });
        
        // Прокручиваем к последнему сообщению
        scrollToBottom();
    });
}

// Создание элемента сообщения
async function createMessageElement(message, messageId) {
    const isOwnMessage = message.senderId === currentUser.uid;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwnMessage ? 'own' : ''}`;
    messageDiv.dataset.id = messageId;
    
    // Получаем данные отправителя
    let sender = null;
    if (!isOwnMessage) {
        sender = await getUserData(message.senderId);
    }
    
    const senderName = isOwnMessage ? 'Вы' : (sender ? (sender.displayName || sender.email.split('@')[0]) : 'Пользователь');
    const senderColor = isOwnMessage ? '#4CAF50' : (sender ? (sender.color || getRandomColor(message.senderId)) : '#999');
    
    messageDiv.innerHTML = `
        <div class="message-avatar" style="background-color: ${senderColor}">
            ${senderName.charAt(0).toUpperCase()}
        </div>
        <div class="message-content">
            <div class="message-sender">${senderName}</div>
            <div class="message-text">${message.text}</div>
            <div class="message-time">${formatTimestamp(message.timestamp)}</div>
        </div>
        ${isOwnMessage ? `
        <div class="message-options">
            <button class="message-delete-btn" title="Удалить сообщение">
                <i class="fas fa-trash"></i>
            </button>
        </div>` : ''}
    `;
    
    // Добавляем обработчик для удаления сообщения
    if (isOwnMessage) {
        const deleteBtn = messageDiv.querySelector('.message-delete-btn');
        deleteBtn.addEventListener('click', () => {
            deleteMessage(messageId);
        });
    }
    
    return messageDiv;
}

// Удаление сообщения
async function deleteMessage(messageId) {
    try {
        await deleteDoc(doc(db, "chats", currentChatId, "messages", messageId));
        showNotification('Сообщение удалено', 'success');
    } catch (error) {
        console.error("Ошибка при удалении сообщения:", error);
        showNotification('Ошибка при удалении сообщения', 'error');
    }
}

// Прокрутка чата к последнему сообщению
function scrollToBottom() {
    const chatBody = document.querySelector('.chat-body');
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Настройка формы отправки сообщений
function setupMessageForm() {
    const messageForm = document.querySelector('.message-form');
    const messageInput = document.querySelector('.message-input');
    const sendButton = document.querySelector('.send-button');
    
    // Отключаем кнопку отправки, если поле ввода пустое
    messageInput.addEventListener('input', () => {
        sendButton.disabled = messageInput.value.trim() === '';
    });
    
    // Отправка сообщения при нажатии на кнопку
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const messageText = messageInput.value.trim();
        if (!messageText || !currentChatId) return;
        
        try {
            await sendMessage(messageText);
            messageInput.value = '';
            sendButton.disabled = true;
        } catch (error) {
            console.error("Ошибка при отправке сообщения:", error);
            showNotification('Ошибка при отправке сообщения', 'error');
        }
    });
    
    // Отправка сообщения при нажатии Enter (без Shift)
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            messageForm.dispatchEvent(new Event('submit'));
        }
    });
}

// Отправка сообщения
async function sendMessage(text) {
    if (!currentUser || !currentChatId) return;
    
    const timestamp = Timestamp.now();
    const message = {
        text: text,
        senderId: currentUser.uid,
        timestamp: timestamp,
        read: false
    };
    
    // Добавляем сообщение в коллекцию сообщений чата
    await addDoc(collection(db, "chats", currentChatId, "messages"), message);
    
    // Обновляем информацию о последнем сообщении в чате
    await updateDoc(doc(db, "chats", currentChatId), {
        lastMessage: text,
        lastMessageTime: timestamp
    });
}

// Экспортируем нужные функции для использования в других файлах
export {
    showModal,
    hideModal,
    getRandomColor
}; 