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
    let currentUserData = null;
    let isMuted = false;
    let isVideoOn = true;
    let isScreenSharing = false;
    let currentServer = 'main';
    let currentChannel = 'общий';
    let localStream = null;
    let peerConnection = null;
    let messageDatabaseRef = null;

    // Проверяем авторизацию и инициализируем предустановленные данные
    async function initializeApp() {
        try {
            // Проверка авторизации пользователя
            const user = await checkAuth();
            
            if (user) {
                // Пользователь авторизован
                currentUser = user;
                
                // Получаем дополнительные данные пользователя
                const snapshot = await getUserData(user.uid);
                currentUserData = snapshot.val();
                
                // Обновляем статус пользователя на "онлайн"
                await database.ref('users/' + user.uid).update({
                    online: true,
                    lastOnline: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Инициализируем интерфейс
                updateUserInterface();
                
                // Создаем начальные каналы, если они не существуют
                await initializeChannels();
                
                // Загружаем сообщения текущего канала
                loadChannelMessages(currentChannel);
                
                // Слушаем изменения в списке пользователей
                listenForUserChanges();
                
                // Слушаем новые сообщения в активном канале
                listenForMessages(currentChannel);
            } else {
                // Пользователь не авторизован, показываем окно входа
                showLoginModal();
                
                // Создаем начальные каналы, если они не существуют
                await initializeChannels();
            }
        } catch (error) {
            console.error('Ошибка инициализации приложения:', error);
            showLoginModal();
        }
    }

    // Инициализация каналов
    async function initializeChannels() {
        try {
            // Получаем список каналов
            const snapshot = await getChannels();
            
            if (!snapshot.exists()) {
                // Если каналов нет, создаем начальные каналы
                await database.ref('channels').set({
                    'общий': {
                        name: 'общий',
                        type: 'text',
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    },
                    'помощь': {
                        name: 'помощь',
                        type: 'text',
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    },
                    'случайное': {
                        name: 'случайное',
                        type: 'text',
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    },
                    'Общий голосовой': {
                        name: 'Общий голосовой',
                        type: 'voice',
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    },
                    'Игры': {
                        name: 'Игры',
                        type: 'voice',
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    }
                });
                
                // Создаем приветственные сообщения в каналах
                await sendMessageToChannel('общий', {
                    author: 'Admin',
                    authorId: 'system',
                    avatar: 'images/avatar1.svg',
                    text: 'Добро пожаловать в OTIScord! Это альтернатива Discord с открытым исходным кодом.',
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                
                await sendMessageToChannel('помощь', {
                    author: 'OTIScord Бот',
                    authorId: 'system',
                    avatar: 'images/avatar1.svg',
                    text: 'Это канал помощи. Здесь вы можете задать вопросы о работе OTIScord.',
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                
                await sendMessageToChannel('случайное', {
                    author: 'OTIScord Бот',
                    authorId: 'system',
                    avatar: 'images/avatar1.svg',
                    text: 'Это канал для случайных разговоров. Общайтесь на любые темы!',
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
            }
        } catch (error) {
            console.error('Ошибка инициализации каналов:', error);
        }
    }

    // Обновление статуса прослушивания сообщений
    function listenForMessages(channelName) {
        // Отключаем предыдущую прослушку, если она была
        if (messageDatabaseRef) {
            messageDatabaseRef.off();
        }
        
        // Создаем новую прослушку для текущего канала
        messageDatabaseRef = database.ref('messages/' + channelName);
        messageDatabaseRef.on('child_added', (snapshot) => {
            // Проверяем, не существует ли уже сообщение в DOM
            const messageId = snapshot.key;
            if (!document.getElementById('message-' + messageId)) {
                const message = snapshot.val();
                displayMessage(message, messageId);
            }
        });
    }

    // Прослушиваем изменения в списке пользователей
    function listenForUserChanges() {
        database.ref('users').on('value', (snapshot) => {
            updateUsersList(snapshot.val());
        });
    }

    // Отправка сообщения
    async function sendMessage(text) {
        if (!currentUser || !currentUserData) return;
        
        try {
            // Создаем объект сообщения
            const messageData = {
                author: currentUserData.username,
                authorId: currentUser.uid,
                avatar: currentUserData.avatar,
                text: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            
            // Отправляем сообщение в базу данных
            await sendMessageToChannel(currentChannel, messageData);
            
            // Очищаем поле ввода
            messageInput.value = '';
        } catch (error) {
            console.error('Ошибка при отправке сообщения:', error);
            alert('Не удалось отправить сообщение. Пожалуйста, попробуйте снова.');
        }
    }

    // Функция отображения сообщения
    function displayMessage(messageData, messageId) {
        const timestamp = messageData.timestamp ? formatTimestamp(new Date(messageData.timestamp)) : 'Только что';
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.id = 'message-' + messageId;
        messageElement.innerHTML = `
            <img src="${messageData.avatar}" alt="Аватар" class="avatar">
            <div class="message-content">
                <div class="message-header">
                    <span class="author">${messageData.author}</span>
                    <span class="timestamp">${timestamp}</span>
                </div>
                <div class="message-text">
                    ${messageData.text}
                </div>
            </div>
        `;
        
        messageArea.appendChild(messageElement);
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    // Форматирование временной метки
    function formatTimestamp(date) {
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffInHours < 24) {
            // Если сообщение отправлено сегодня, показываем время
            const hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `Сегодня в ${hours}:${minutes}`;
        } else if (diffInHours < 48) {
            // Если сообщение отправлено вчера
            const hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `Вчера в ${hours}:${minutes}`;
        } else {
            // Иначе показываем полную дату
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${day}.${month}.${date.getFullYear()} в ${hours}:${minutes}`;
        }
    }

    // Обновление интерфейса пользователя после успешного входа
    function updateUserInterface() {
        if (!currentUser || !currentUserData) return;
        
        // Обновляем информацию о текущем пользователе
        document.querySelector('.user-panel .avatar').src = currentUserData.avatar;
        document.querySelector('.user-panel .username').textContent = currentUserData.username;
        document.querySelector('.user-panel .status').textContent = 'В сети';
        
        // Скрываем модальное окно входа
        hideLoginModal();
        hideRegisterModal();
    }

    // Обновление списка пользователей
    function updateUsersList(users) {
        if (!users) return;
        
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
        Object.keys(users).forEach(uid => {
            const user = users[uid];
            
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
    async function loadChannelMessages(channelName) {
        try {
            // Очищаем текущие сообщения
            messageArea.innerHTML = '';
            
            // Запрашиваем сообщения из базы данных
            const snapshot = await getChannelMessages(channelName);
            
            if (snapshot.exists()) {
                // Если есть сообщения, отображаем их
                snapshot.forEach((childSnapshot) => {
                    const message = childSnapshot.val();
                    displayMessage(message, childSnapshot.key);
                });
            } else {
                // Если сообщений нет, отправляем приветственное сообщение
                const welcomeMessage = {
                    author: 'OTIScord Бот',
                    authorId: 'system',
                    avatar: 'images/avatar1.svg',
                    text: `Добро пожаловать в канал #${channelName}! Это начало истории канала.`,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                
                await sendMessageToChannel(channelName, welcomeMessage);
            }
            
            // Настраиваем прослушивание новых сообщений
            listenForMessages(channelName);
        } catch (error) {
            console.error('Ошибка при загрузке сообщений:', error);
            alert('Не удалось загрузить сообщения. Пожалуйста, обновите страницу.');
        }
    }

    // Инициализация приложения
    initializeApp();

    // Обработчики событий

    // Обработчик для кнопки выхода из системы
    document.getElementById('logout-btn').addEventListener('click', function() {
        if (currentUser) {
            if (confirm('Вы действительно хотите выйти из системы?')) {
                logoutUser()
                    .then(() => {
                        currentUser = null;
                        currentUserData = null;
                        showLoginModal();
                    })
                    .catch((error) => {
                        console.error('Ошибка при выходе из системы:', error);
                        alert('Не удалось выйти из системы. Пожалуйста, попробуйте снова.');
                    });
            }
        }
    });

    // Отправка сообщения
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim() !== '') {
            sendMessage(this.value.trim());
        }
    });

    // Переключение каналов
    channels.forEach(channel => {
        channel.addEventListener('click', function() {
            // Проверяем, не голосовой ли это канал
            const channelName = this.querySelector('span').textContent;
            const isVoiceChannel = this.querySelector('i.fa-volume-up') !== null;
            
            if (isVoiceChannel) {
                // Запускаем голосовой звонок
                startCall();
                return;
            }
            
            // Обновляем UI и загружаем сообщения
            document.querySelector('.channel.active').classList.remove('active');
            this.classList.add('active');
            
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
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Скрываем сообщение об ошибке при новой попытке входа
        loginError.style.display = 'none';
        
        loginUser(email, password)
            .then((userCredential) => {
                currentUser = userCredential.user;
                
                // Получаем данные пользователя
                return getUserData(currentUser.uid);
            })
            .then((snapshot) => {
                currentUserData = snapshot.val();
                
                // Обновляем статус на "онлайн"
                return database.ref('users/' + currentUser.uid).update({
                    online: true,
                    lastOnline: firebase.database.ServerValue.TIMESTAMP
                });
            })
            .then(() => {
                updateUserInterface();
                loadChannelMessages(currentChannel);
                listenForMessages(currentChannel);
                listenForUserChanges();
            })
            .catch((error) => {
                console.error('Ошибка входа:', error);
                
                // Показываем ошибку в форме
                loginError.textContent = getAuthErrorMessage(error.code);
                loginError.style.display = 'block';
            });
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
        
        // Регистрация пользователя
        registerUser(email, username, password)
            .then(() => {
                // Очищаем поля формы
                document.getElementById('reg-email').value = '';
                document.getElementById('reg-username').value = '';
                document.getElementById('reg-password').value = '';
                document.getElementById('reg-confirm-password').value = '';
                
                // Показываем успешное сообщение и переходим к входу
                alert('Регистрация успешна! Теперь вы можете войти в систему.');
                hideRegisterModal();
                showLoginModal();
            })
            .catch((error) => {
                console.error('Ошибка регистрации:', error);
                
                // Показываем ошибку в форме
                registerError.textContent = getAuthErrorMessage(error.code || error.message);
                registerError.style.display = 'block';
            });
    });

    // Функция для перевода сообщений об ошибках Firebase Auth
    function getAuthErrorMessage(errorCode) {
        switch(errorCode) {
            case 'auth/email-already-in-use':
                return 'Этот email уже используется другим аккаунтом';
            case 'auth/invalid-email':
                return 'Неверный формат email';
            case 'auth/user-disabled':
                return 'Этот аккаунт отключен';
            case 'auth/user-not-found':
                return 'Пользователь с таким email не найден';
            case 'auth/wrong-password':
                return 'Неверный пароль';
            case 'auth/weak-password':
                return 'Слишком простой пароль';
            case 'Пользователь с таким именем уже существует':
                return 'Пользователь с таким именем уже существует';
            default:
                return 'Произошла ошибка: ' + errorCode;
        }
    }

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