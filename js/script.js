document.addEventListener('DOMContentLoaded', function() {
    // Элементы интерфейса
    const messageInput = document.getElementById('message-box');
    const messageArea = document.getElementById('messages');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const voiceCallModal = document.getElementById('voice-call-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const registerLink = document.getElementById('register-link');
    const loginLink = document.getElementById('login-link');
    const muteBtn = document.getElementById('mute-btn');
    const videoBtn = document.getElementById('video-btn');
    const screenShareBtn = document.getElementById('screen-share-btn');
    const endCallBtn = document.getElementById('end-call-btn');
    const channels = document.querySelectorAll('.channel');
    const servers = document.querySelectorAll('.server');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');

    // Переменные состояния приложения
    let currentUser = null;
    let isMuted = false;
    let isVideoOn = true;
    let isScreenSharing = false;
    let currentServer = 'main';
    let currentChannel = 'general';
    let localStream = null;
    let peerConnection = null;

    // Инициализация данных из localStorage или использование демо-данных
    let demoUsers = [
        { id: 1, username: 'Admin', password: 'admin123', avatar: 'images/avatar1.svg', online: true },
        { id: 2, username: 'Пользователь123', password: 'user123', avatar: 'images/avatar2.svg', online: true },
        { id: 3, username: 'Тестировщик', password: 'test123', avatar: 'images/avatar3.svg', online: false },
        { id: 4, username: 'НовыйПользователь', password: 'new123', avatar: 'images/avatar4.svg', online: false }
    ];
    
    // Инициализация хранилища сообщений по каналам
    let channelMessages = {
        'общий': [
            {
                author: 'Admin',
                avatar: 'images/avatar1.svg',
                text: 'Добро пожаловать в OTIScord! Это альтернатива Discord с открытым исходным кодом.',
                timestamp: 'Сегодня в 12:00'
            },
            {
                author: 'Пользователь123',
                avatar: 'images/avatar2.svg',
                text: 'Привет всем! Как дела?',
                timestamp: 'Сегодня в 12:05'
            }
        ],
        'помощь': [
            {
                author: 'OTIScord Бот',
                avatar: 'images/avatar1.svg',
                text: 'Это канал помощи. Здесь вы можете задать вопросы о работе OTIScord.',
                timestamp: formatTimestamp(new Date())
            }
        ],
        'случайное': [
            {
                author: 'OTIScord Бот',
                avatar: 'images/avatar1.svg',
                text: 'Это канал для случайных разговоров. Общайтесь на любые темы!',
                timestamp: formatTimestamp(new Date())
            }
        ]
    };

    // Загрузка данных из localStorage при запуске
    function loadDataFromStorage() {
        // Загрузка пользователей
        const storedUsers = localStorage.getItem('otiscord_users');
        if (storedUsers) {
            demoUsers = JSON.parse(storedUsers);
        } else {
            // Если данных нет, сохраняем дефолтные значения
            localStorage.setItem('otiscord_users', JSON.stringify(demoUsers));
        }

        // Загрузка сообщений
        const storedMessages = localStorage.getItem('otiscord_messages');
        if (storedMessages) {
            channelMessages = JSON.parse(storedMessages);
        } else {
            // Если данных нет, сохраняем дефолтные значения
            localStorage.setItem('otiscord_messages', JSON.stringify(channelMessages));
        }

        // Загрузка текущего пользователя, если авторизован
        const storedCurrentUser = localStorage.getItem('otiscord_current_user');
        if (storedCurrentUser) {
            currentUser = JSON.parse(storedCurrentUser);
            updateUserInterface();
        } else {
            // Показать модальное окно входа, если пользователь не авторизован
            showLoginModal();
        }
    }

    // Функция сохранения данных в localStorage
    function saveDataToStorage() {
        localStorage.setItem('otiscord_users', JSON.stringify(demoUsers));
        localStorage.setItem('otiscord_messages', JSON.stringify(channelMessages));
        if (currentUser) {
            localStorage.setItem('otiscord_current_user', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('otiscord_current_user');
        }
    }

    // Форматирование временной метки
    function formatTimestamp(date) {
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `Сегодня в ${hours}:${minutes}`;
    }

    // Загружаем данные при запуске
    loadDataFromStorage();

    // Обработчики событий

    // Отправка сообщения
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim() !== '') {
            sendMessage(this.value);
            this.value = '';
        }
    });

    // Переключение каналов
    channels.forEach(channel => {
        channel.addEventListener('click', function() {
            document.querySelector('.channel.active').classList.remove('active');
            this.classList.add('active');
            
            const channelName = this.querySelector('span').textContent;
            currentChannel = channelName;
            document.querySelector('.chat-header-left span').textContent = channelName;
            
            // Загрузка сообщений для выбранного канала
            loadChannelMessages(channelName);
        });
    });

    // Переключение серверов
    servers.forEach(server => {
        server.addEventListener('click', function() {
            document.querySelector('.server.active').classList.remove('active');
            this.classList.add('active');
            
            // В реальном приложении здесь будет загрузка каналов для выбранного сервера
            // и обновление списка участников
        });
    });

    // Показать модальное окно регистрации
    registerLink.addEventListener('click', function(e) {
        e.preventDefault();
        // Скрываем сообщения об ошибках при переключении между формами
        loginError.style.display = 'none';
        registerError.style.display = 'none';
        hideLoginModal();
        showRegisterModal();
    });

    // Показать модальное окно входа
    loginLink.addEventListener('click', function(e) {
        e.preventDefault();
        // Скрываем сообщения об ошибках при переключении между формами
        loginError.style.display = 'none';
        registerError.style.display = 'none';
        hideRegisterModal();
        showLoginModal();
    });

    // Обработка формы входа
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Скрываем сообщение об ошибке при новой попытке входа
        loginError.style.display = 'none';
        
        const user = demoUsers.find(u => u.username === username && u.password === password);
        
        if (user) {
            // Обновляем статус пользователя на "онлайн"
            user.online = true;
            currentUser = user;
            updateUserInterface();
            hideLoginModal();
            
            // Сохраняем данные в localStorage
            saveDataToStorage();
            
            // Загружаем текущий канал
            loadChannelMessages(currentChannel);
        } else {
            // Показываем ошибку в форме вместо alert
            loginError.textContent = 'Неверное имя пользователя или пароль';
            loginError.style.display = 'block';
        }
    });

    // Обработка формы регистрации
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('reg-email').value;
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        
        // Скрываем сообщение об ошибке при новой попытке регистрации
        registerError.style.display = 'none';
        
        if (password !== confirmPassword) {
            // Показываем ошибку в форме вместо alert
            registerError.textContent = 'Пароли не совпадают';
            registerError.style.display = 'block';
            return;
        }
        
        // Проверка, что пользователь с таким именем не существует
        if (demoUsers.find(u => u.username === username)) {
            // Показываем ошибку в форме вместо alert
            registerError.textContent = 'Пользователь с таким именем уже существует';
            registerError.style.display = 'block';
            return;
        }
        
        // Создаем нового пользователя и добавляем его в массив
        const newUser = {
            id: demoUsers.length + 1,
            username: username,
            password: password,
            avatar: 'images/avatar.svg', // используем стандартный аватар
            online: true
        };
        
        demoUsers.push(newUser);
        
        // Сохраняем обновленный список пользователей
        saveDataToStorage();
        
        // Очищаем поля формы
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-username').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-confirm-password').value = '';
        
        // Показываем успешное сообщение и переходим к входу
        alert('Регистрация успешна! Теперь вы можете войти в систему.');
        hideRegisterModal();
        showLoginModal();
    });

    // Обработчик для кнопки выхода из системы
    document.getElementById('logout-btn').addEventListener('click', function() {
        if (currentUser) {
            if (confirm('Вы действительно хотите выйти из системы?')) {
                // Меняем статус пользователя на "оффлайн"
                const user = demoUsers.find(u => u.id === currentUser.id);
                if (user) {
                    user.online = false;
                }
                
                currentUser = null;
                localStorage.removeItem('otiscord_current_user');
                saveDataToStorage();
                showLoginModal();
                
                // Обновляем список пользователей
                updateUsersList();
            }
        }
    });

    // Обработчики для голосовых и видеозвонков
    muteBtn.addEventListener('click', function() {
        isMuted = !isMuted;
        
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !isMuted;
            });
        }
        
        this.innerHTML = isMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
    });

    videoBtn.addEventListener('click', function() {
        isVideoOn = !isVideoOn;
        
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = isVideoOn;
            });
        }
        
        this.innerHTML = isVideoOn ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
    });

    screenShareBtn.addEventListener('click', function() {
        toggleScreenSharing();
    });

    endCallBtn.addEventListener('click', function() {
        endCall();
        hideVoiceCallModal();
    });

    // Инициализация голосового звонка при клике на голосовой канал
    document.querySelectorAll('.channel i.fa-volume-up').forEach(icon => {
        icon.parentElement.addEventListener('click', function() {
            startCall();
        });
    });

    // Функции

    // Отправка сообщения
    function sendMessage(text) {
        if (!currentUser) return;
        
        const now = new Date();
        const timestamp = formatTimestamp(now);
        
        // Создаем объект сообщения
        const messageObj = {
            author: currentUser.username,
            avatar: currentUser.avatar,
            text: text,
            timestamp: timestamp
        };
        
        // Добавляем сообщение в соответствующий канал
        if (!channelMessages[currentChannel]) {
            channelMessages[currentChannel] = [];
        }
        
        channelMessages[currentChannel].push(messageObj);
        
        // Сохраняем сообщения в localStorage
        saveDataToStorage();
        
        // Отображаем сообщение
        displayMessage(messageObj);
    }

    // Функция отображения сообщения
    function displayMessage(messageObj) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.innerHTML = `
            <img src="${messageObj.avatar}" alt="Аватар" class="avatar">
            <div class="message-content">
                <div class="message-header">
                    <span class="author">${messageObj.author}</span>
                    <span class="timestamp">${messageObj.timestamp}</span>
                </div>
                <div class="message-text">
                    ${messageObj.text}
                </div>
            </div>
        `;
        
        messageArea.appendChild(messageElement);
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    // Обновление интерфейса пользователя после успешного входа
    function updateUserInterface() {
        if (!currentUser) return;
        
        // Обновляем информацию о текущем пользователе
        document.querySelector('.user-panel .avatar').src = currentUser.avatar;
        document.querySelector('.user-panel .username').textContent = currentUser.username;
        document.querySelector('.user-panel .status').textContent = 'В сети';
        
        // Обновляем список пользователей в сайдбаре
        updateUsersList();
    }

    // Обновление списка пользователей
    function updateUsersList() {
        // Получаем элементы списков пользователей
        const onlineUsersList = document.querySelector('.users-list');
        const offlineUsersList = document.querySelector('.users-list.offline-users');
        
        // Очищаем списки
        onlineUsersList.innerHTML = '';
        offlineUsersList.innerHTML = '';
        
        // Счетчики пользователей
        let onlineCount = 0;
        let offlineCount = 0;
        
        // Наполняем списки пользователями
        demoUsers.forEach(user => {
            const userElement = document.createElement('div');
            userElement.classList.add('user');
            if (!user.online) {
                userElement.classList.add('offline');
            }
            
            userElement.innerHTML = `
                <img src="${user.avatar}" alt="Аватар" class="avatar">
                <div class="user-info">
                    <span class="username">${user.username}</span>
                    <span class="status">${user.online ? 'Онлайн' : 'Не в сети'}</span>
                </div>
            `;
            
            if (user.online) {
                onlineUsersList.appendChild(userElement);
                onlineCount++;
            } else {
                offlineUsersList.appendChild(userElement);
                offlineCount++;
            }
        });
        
        // Обновляем заголовки с количеством пользователей
        document.querySelector('.users-header h3').textContent = `ПОЛЬЗОВАТЕЛИ В СЕТИ — ${onlineCount}`;
        document.querySelector('.users-header.offline-header h3').textContent = `НЕ В СЕТИ — ${offlineCount}`;
    }

    // Загрузка сообщений канала
    function loadChannelMessages(channelName) {
        // Очищаем текущие сообщения
        messageArea.innerHTML = '';
        
        // Проверяем, есть ли сообщения для этого канала
        if (channelMessages[channelName] && channelMessages[channelName].length > 0) {
            // Отображаем все сообщения канала
            channelMessages[channelName].forEach(message => {
                displayMessage(message);
            });
        } else {
            // Если канал пустой, создаем приветственное сообщение
            const welcomeMessage = {
                author: 'OTIScord Бот',
                avatar: 'images/avatar1.svg',
                text: `Добро пожаловать в канал #${channelName}! Это начало истории канала.`,
                timestamp: formatTimestamp(new Date())
            };
            
            // Инициализируем канал, если он не существует
            if (!channelMessages[channelName]) {
                channelMessages[channelName] = [];
            }
            
            // Добавляем приветственное сообщение
            channelMessages[channelName].push(welcomeMessage);
            saveDataToStorage();
            
            // Отображаем приветственное сообщение
            displayMessage(welcomeMessage);
        }
    }

    // Функции для модальных окон
    function showLoginModal() {
        loginModal.style.display = 'flex';
    }

    function hideLoginModal() {
        loginModal.style.display = 'none';
    }

    function showRegisterModal() {
        registerModal.style.display = 'flex';
    }

    function hideRegisterModal() {
        registerModal.style.display = 'none';
    }

    function showVoiceCallModal() {
        voiceCallModal.style.display = 'flex';
    }

    function hideVoiceCallModal() {
        voiceCallModal.style.display = 'none';
    }

    // Функции для аудио/видео звонков
    async function startCall() {
        try {
            // Запрашиваем доступ к камере и микрофону
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            
            // Отображаем локальное видео
            const localVideo = document.getElementById('local-video');
            localVideo.srcObject = localStream;
            
            // В реальном приложении здесь будет инициализация WebRTC соединения
            // и отправка сигнального сообщения на сервер
            
            showVoiceCallModal();
            
        } catch (error) {
            console.error('Ошибка при получении доступа к медиа-устройствам:', error);
            alert('Не удалось получить доступ к камере или микрофону');
        }
    }

    async function toggleScreenSharing() {
        if (isScreenSharing) {
            // Останавливаем демонстрацию экрана и возвращаемся к камере
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                const localVideo = document.getElementById('local-video');
                localVideo.srcObject = localStream;
                
                screenShareBtn.innerHTML = '<i class="fas fa-desktop"></i>';
                isScreenSharing = false;
            } catch (error) {
                console.error('Ошибка при возврате к камере:', error);
            }
        } else {
            // Начинаем демонстрацию экрана
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
                
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                }
                
                localStream = screenStream;
                const localVideo = document.getElementById('local-video');
                localVideo.srcObject = localStream;
                
                screenShareBtn.innerHTML = '<i class="fas fa-camera"></i>';
                isScreenSharing = true;
                
                // Автоматически останавливаем демонстрацию при отмене пользователем
                screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                    toggleScreenSharing();
                });
            } catch (error) {
                console.error('Ошибка при демонстрации экрана:', error);
            }
        }
    }

    function endCall() {
        // Останавливаем все медиа-треки
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        // Закрываем соединение WebRTC
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        
        // Сбрасываем состояние кнопок
        isMuted = false;
        isVideoOn = true;
        isScreenSharing = false;
        
        muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        videoBtn.innerHTML = '<i class="fas fa-video"></i>';
        screenShareBtn.innerHTML = '<i class="fas fa-desktop"></i>';
    }
}); 