// Инициализация и настройка базы данных Firebase
document.addEventListener('DOMContentLoaded', () => {
  // Получаем ссылку на базу данных
  const database = firebase.database();

  // Функция для обновления информации о пользователе
  function updateUserProfile(uid, userData) {
    return database.ref(`users/${uid}`).update(userData);
  }

  // Функция для установки статуса пользователя (онлайн/оффлайн)
  function setUserStatus(uid, status) {
    if (!uid) return Promise.reject('UID не предоставлен');
    
    return database.ref(`users/${uid}/status`).set(status);
  }

  // Функция для получения информации о пользователе
  function getUserData(uid) {
    return database.ref(`users/${uid}`).once('value')
      .then((snapshot) => snapshot.val());
  }

  // Функция для форматирования временной метки
  window.formatTimestamp = function(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
  }

  // Функция для проверки наличия пользователя по email
  function getUserByEmail(email) {
    return database.ref('users')
      .orderByChild('email')
      .equalTo(email)
      .once('value')
      .then((snapshot) => {
        if (snapshot.exists()) {
          // Пользователь найден
          let userId = null;
          let userData = null;
          
          snapshot.forEach((childSnapshot) => {
            userId = childSnapshot.key;
            userData = childSnapshot.val();
          });
          
          return { id: userId, ...userData };
        }
        
        // Пользователь не найден
        return null;
      });
  }

  // Функция для получения списка всех пользователей
  function getAllUsers() {
    return database.ref('users').once('value')
      .then((snapshot) => {
        const users = [];
        
        snapshot.forEach((childSnapshot) => {
          const userId = childSnapshot.key;
          const userData = childSnapshot.val();
          
          users.push({
            id: userId,
            ...userData
          });
        });
        
        return users;
      });
  }

  // Функция для генерации случайного цвета для аватара
  window.getRandomColor = function(id) {
    const colors = [
      '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#607D8B',
      '#E91E63', '#3F51B5', '#009688', '#FFC107', '#795548'
    ];
    
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  // Функция для отображения уведомлений
  window.showNotification = function(message, type = 'info') {
    const notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
      // Создаем контейнер, если его нет
      const container = document.createElement('div');
      container.id = 'notification-container';
      document.body.appendChild(container);
    }
    
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Добавляем уведомление в контейнер
    document.getElementById('notification-container').appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
      notification.classList.add('fadeout');
      
      // Удаляем элемент после анимации
      setTimeout(() => {
        try {
          document.getElementById('notification-container').removeChild(notification);
        } catch (e) {
          // Игнорируем ошибку, если элемент уже удален
        }
      }, 300);
    }, 3000);
  }

  // Функция для показа модального окна
  window.showModal = function(modal) {
    if (typeof modal === 'string') {
      modal = document.getElementById(modal);
    }
    
    if (modal) {
      document.body.classList.add('modal-open');
      modal.style.display = 'flex';
      
      setTimeout(() => {
        modal.classList.add('show');
      }, 10);
    }
  }

  // Функция для скрытия модального окна
  window.hideModal = function(modal) {
    if (typeof modal === 'string') {
      modal = document.getElementById(modal);
    }
    
    if (modal) {
      modal.classList.remove('show');
      
      setTimeout(() => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
      }, 300);
    }
  }

  // Инициализация обработчиков модальных окон
  document.querySelectorAll('.modal').forEach((modal) => {
    // Закрытие при клике на фон или кнопку закрытия
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal-close')) {
        hideModal(modal);
      }
    });
  });

  // Экспортируем объект database в глобальную область видимости
  window.database = database;
}); 