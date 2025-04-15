// Обработчики форм авторизации и регистрации
document.addEventListener('DOMContentLoaded', () => {
  // Формы авторизации
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const resetPasswordForm = document.getElementById('reset-password-form');
  
  // Модальные окна
  const loginModal = document.getElementById('login-modal');
  const registerModal = document.getElementById('register-modal');
  const resetPasswordModal = document.getElementById('reset-password-modal');
  
  // Кнопки переключения между формами
  const goToRegisterBtn = document.getElementById('go-to-register');
  const goToLoginBtn = document.getElementById('go-to-login');
  const forgotPasswordBtn = document.getElementById('forgot-password');
  const backToLoginBtn = document.getElementById('back-to-login');
  
  // Оверлей для закрытия модальных окон
  const modalOverlay = document.querySelector('.modal-overlay');
  
  // Элементы интерфейса, которые отображаются только для авторизованных пользователей
  const authContent = document.querySelectorAll('.auth-only');
  const nonAuthContent = document.querySelectorAll('.non-auth-only');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userStatus = document.getElementById('user-status');
  
  // Кнопка выхода
  const logoutBtn = document.getElementById('logout-btn');
  
  // Функция для показа/скрытия элементов в зависимости от статуса авторизации
  function updateUIForAuthState(user) {
    if (user) {
      // Пользователь авторизован
      authContent.forEach(el => el.style.display = 'block');
      nonAuthContent.forEach(el => el.style.display = 'none');
      
      // Обновляем данные профиля
      userName.textContent = user.displayName || 'Пользователь';
      if (user.photoURL) {
        userAvatar.src = user.photoURL;
      } else {
        // Генерируем аватар с инициалами
        const initials = (user.displayName || user.email[0]).charAt(0).toUpperCase();
        userAvatar.style.backgroundImage = 'none';
        userAvatar.style.backgroundColor = getRandomColor(user.uid);
        userAvatar.innerHTML = `<span>${initials}</span>`;
      }
      
      // Скрываем модальные окна
      hideAllModals();
      
      // Загружаем данные чатов
      loadUserChannels(user.uid);
      
      // Устанавливаем статус "онлайн"
      setUserStatus(user.uid, 'online');
    } else {
      // Пользователь не авторизован
      authContent.forEach(el => el.style.display = 'none');
      nonAuthContent.forEach(el => el.style.display = 'block');
      
      // Показываем модальное окно авторизации
      showModal(loginModal);
    }
  }
  
  // Функция для генерации случайного цвета аватара на основе user ID
  function getRandomColor(userId) {
    // Создаем стабильный цвет на основе ID пользователя
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      '#FF5722', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
      '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
      '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#795548'
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }
  
  // Функция для установки статуса пользователя
  function setUserStatus(userId, status) {
    const userStatusRef = database.ref(`users/${userId}/status`);
    userStatusRef.set(status);
    
    // Создаем обработчик отключения соединения
    database.ref('.info/connected').on('value', (snap) => {
      if (snap.val() === true) {
        // При отключении соединения статус будет установлен как "offline"
        userStatusRef.onDisconnect().set('offline');
      }
    });
  }
  
  // Обработчик входа
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    
    // Показываем индикатор загрузки
    loginForm.querySelector('.btn-primary').classList.add('loading');
    
    auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Успешная авторизация
        showNotification('Вы успешно авторизовались!', 'success');
      })
      .catch((error) => {
        // Обрабатываем ошибки
        let errorMessage = 'Ошибка при авторизации';
        
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'Пользователь с таким email не найден';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Неверный пароль';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Некорректный email';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Аккаунт заблокирован';
            break;
        }
        
        showNotification(errorMessage, 'error');
      })
      .finally(() => {
        // Скрываем индикатор загрузки
        loginForm.querySelector('.btn-primary').classList.remove('loading');
      });
  });
  
  // Обработчик регистрации
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = registerForm.username.value;
    const email = registerForm.email.value;
    const password = registerForm.password.value;
    
    // Показываем индикатор загрузки
    registerForm.querySelector('.btn-primary').classList.add('loading');
    
    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        
        // Обновляем профиль пользователя
        return user.updateProfile({
          displayName: username
        }).then(() => {
          // Сохраняем дополнительные данные пользователя в базу данных
          return database.ref(`users/${user.uid}`).set({
            username: username,
            email: email,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'online'
          });
        });
      })
      .then(() => {
        showNotification('Аккаунт успешно создан!', 'success');
      })
      .catch((error) => {
        let errorMessage = 'Ошибка при создании аккаунта';
        
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Email уже используется';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Некорректный email';
            break;
          case 'auth/weak-password':
            errorMessage = 'Слишком слабый пароль';
            break;
        }
        
        showNotification(errorMessage, 'error');
      })
      .finally(() => {
        registerForm.querySelector('.btn-primary').classList.remove('loading');
      });
  });
  
  // Обработчик сброса пароля
  resetPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = resetPasswordForm.email.value;
    
    resetPasswordForm.querySelector('.btn-primary').classList.add('loading');
    
    auth.sendPasswordResetEmail(email)
      .then(() => {
        showNotification('Инструкции по сбросу пароля отправлены на вашу почту', 'success');
        hideModal(resetPasswordModal);
        showModal(loginModal);
      })
      .catch((error) => {
        let errorMessage = 'Ошибка при сбросе пароля';
        
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Некорректный email';
            break;
          case 'auth/user-not-found':
            errorMessage = 'Пользователь с таким email не найден';
            break;
        }
        
        showNotification(errorMessage, 'error');
      })
      .finally(() => {
        resetPasswordForm.querySelector('.btn-primary').classList.remove('loading');
      });
  });
  
  // Выход из аккаунта
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      const userId = auth.currentUser.uid;
      
      // Устанавливаем статус "offline" перед выходом
      database.ref(`users/${userId}/status`).set('offline')
        .then(() => {
          return auth.signOut();
        })
        .then(() => {
          showNotification('Вы вышли из аккаунта', 'info');
        })
        .catch((error) => {
          showNotification('Ошибка при выходе из аккаунта', 'error');
          console.error('Ошибка выхода:', error);
        });
    });
  }
  
  // Переключение между формами
  goToRegisterBtn.addEventListener('click', () => {
    hideModal(loginModal);
    showModal(registerModal);
  });
  
  goToLoginBtn.addEventListener('click', () => {
    hideModal(registerModal);
    showModal(loginModal);
  });
  
  forgotPasswordBtn.addEventListener('click', () => {
    hideModal(loginModal);
    showModal(resetPasswordModal);
  });
  
  backToLoginBtn.addEventListener('click', () => {
    hideModal(resetPasswordModal);
    showModal(loginModal);
  });
  
  // Функции для работы с модальными окнами
  function showModal(modal) {
    modalOverlay.style.display = 'block';
    modal.style.display = 'block';
    
    setTimeout(() => {
      modalOverlay.classList.add('active');
      modal.classList.add('active');
    }, 10);
  }
  
  function hideModal(modal) {
    modalOverlay.classList.remove('active');
    modal.classList.remove('active');
    
    setTimeout(() => {
      modalOverlay.style.display = 'none';
      modal.style.display = 'none';
    }, 300);
  }
  
  function hideAllModals() {
    [loginModal, registerModal, resetPasswordModal].forEach(modal => {
      if (modal) hideModal(modal);
    });
  }
  
  // Закрытие модальных окон при клике на overlay
  modalOverlay.addEventListener('click', () => {
    hideAllModals();
  });
  
  // Слушатель состояния авторизации
  auth.onAuthStateChanged(updateUIForAuthState);
  
  // Авторизация через Google
  const googleAuthBtn = document.getElementById('google-auth');
  if (googleAuthBtn) {
    googleAuthBtn.addEventListener('click', () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      
      auth.signInWithPopup(provider)
        .then((result) => {
          const user = result.user;
          const isNewUser = result.additionalUserInfo.isNewUser;
          
          if (isNewUser) {
            // Сохраняем данные нового пользователя в базу данных
            return database.ref(`users/${user.uid}`).set({
              username: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              createdAt: firebase.database.ServerValue.TIMESTAMP,
              status: 'online'
            });
          }
        })
        .then(() => {
          showNotification('Вы успешно авторизовались через Google!', 'success');
        })
        .catch((error) => {
          console.error('Ошибка авторизации через Google:', error);
          showNotification('Ошибка при авторизации через Google', 'error');
        });
    });
  }
}); 