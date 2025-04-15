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

    // Переменные состояния приложения
    let currentUser = null;
    let isMuted = false;
    let isVideoOn = true;
    let isScreenSharing = false;
    let currentServer = 'main';
    let currentChannel = 'general';
    let localStream = null;
    let peerConnection = null;

    // Демонстрационные данные (в реальном приложении будут загружаться с сервера)
    const demoUsers = [
        { id: 1, username: 'Admin', password: 'admin123', avatar: 'images/avatar1.png', online: true },
        { id: 2, username: 'Пользователь123', password: 'user123', avatar: 'images/avatar2.png', online: true },
        { id: 3, username: 'Тестировщик', password: 'test123', avatar: 'images/avatar3.png', online: false },
        { id: 4, username: 'НовыйПользователь', password: 'new123', avatar: 'images/avatar4.png', online: false }
    ];

    // Показать модальное окно входа при загрузке страницы
    if (!currentUser) {
        showLoginModal();
    }

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
            document.querySelector('.chat-header-left span').textContent = channelName;
            
            // В реальном приложении здесь будет загрузка сообщений для выбранного канала
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
        hideLoginModal();
        showRegisterModal();
    });

    // Показать модальное окно входа
    loginLink.addEventListener('click', function(e) {
        e.preventDefault();
        hideRegisterModal();
        showLoginModal();
    });

    // Обработка формы входа
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const user = demoUsers.find(u => u.username === username && u.password === password);
        
        if (user) {
            currentUser = user;
            updateUserInterface();
            hideLoginModal();
        } else {
            alert('Неверное имя пользователя или пароль');
        }
    });

    // Обработка формы регистрации
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('reg-email').value;
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        
        if (password !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }
        
        // В реальном приложении здесь будет отправка данных для регистрации на сервер
        // и создание нового пользователя
        
        alert('Регистрация успешна! Теперь вы можете войти в систему.');
        hideRegisterModal();
        showLoginModal();
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
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const timestamp = `Сегодня в ${hours}:${minutes}`;
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.innerHTML = `
            <img src="${currentUser.avatar}" alt="Аватар" class="avatar">
            <div class="message-content">
                <div class="message-header">
                    <span class="author">${currentUser.username}</span>
                    <span class="timestamp">${timestamp}</span>
                </div>
                <div class="message-text">
                    ${text}
                </div>
            </div>
        `;
        
        messageArea.appendChild(messageElement);
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    // Обновление интерфейса пользователя после успешного входа
    function updateUserInterface() {
        // Обновляем информацию о текущем пользователе
        document.querySelector('.user-panel .avatar').src = currentUser.avatar;
        document.querySelector('.user-panel .username').textContent = currentUser.username;
        document.querySelector('.user-panel .status').textContent = 'В сети';
    }

    // Загрузка сообщений канала
    function loadChannelMessages(channelName) {
        // В реальном приложении здесь будет загрузка сообщений с сервера
        // Демонстрационная очистка и добавление сообщения о переключении канала
        messageArea.innerHTML = '';
        
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const timestamp = `Сегодня в ${hours}:${minutes}`;
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.innerHTML = `
            <img src="images/avatar1.png" alt="Аватар" class="avatar">
            <div class="message-content">
                <div class="message-header">
                    <span class="author">OTIScord Бот</span>
                    <span class="timestamp">${timestamp}</span>
                </div>
                <div class="message-text">
                    Добро пожаловать в канал #${channelName}! Это начало истории канала.
                </div>
            </div>
        `;
        
        messageArea.appendChild(messageElement);
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

    // Временная функция для демонстрации
    // В реальном приложении это будет заменено на серверное взаимодействие
    setTimeout(() => {
        // Автоматически "входим" как демо-пользователь, если не вошли
        if (!currentUser) {
            currentUser = demoUsers[0];
            updateUserInterface();
        }
    }, 1000);
}); 