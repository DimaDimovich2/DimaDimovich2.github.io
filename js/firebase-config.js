// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Создание удобных ссылок на службы Firebase
const auth = firebase.auth();
const database = firebase.database();

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Показываем уведомление
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Скрываем через 5 секунд
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

// Функция для форматирования даты и времени
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  let datePrefix = '';
  
  if (date.toDateString() === today.toDateString()) {
    datePrefix = 'Сегодня в';
  } else if (date.toDateString() === yesterday.toDateString()) {
    datePrefix = 'Вчера в';
  } else {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    datePrefix = `${day}.${month}.${year} в`;
  }
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${datePrefix} ${hours}:${minutes}`;
}

// Функция для проверки авторизации
function checkAuth() {
  return new Promise((resolve) => {
    auth.onAuthStateChanged((user) => {
      resolve(user);
    });
  });
}

// Функция для регистрации пользователя
function registerUser(email, username, password) {
  return new Promise((resolve, reject) => {
    // Сначала проверяем, существует ли пользователь с таким именем
    database.ref('users').orderByChild('username').equalTo(username).once('value')
      .then((snapshot) => {
        if (snapshot.exists()) {
          reject(new Error('Пользователь с таким именем уже существует'));
          return;
        }
        
        // Создаем пользователя в Firebase Auth
        auth.createUserWithEmailAndPassword(email, password)
          .then((userCredential) => {
            const user = userCredential.user;
            
            // Сохраняем дополнительную информацию в базе данных
            return database.ref('users/' + user.uid).set({
              username: username,
              email: email,
              avatar: 'images/avatar.svg',
              online: true,
              createdAt: firebase.database.ServerValue.TIMESTAMP
            });
          })
          .then(() => {
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
}

// Функция для входа в систему
function loginUser(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

// Функция для выхода из системы
function logoutUser() {
  // Сначала обновляем статус пользователя на оффлайн
  const user = auth.currentUser;
  if (user) {
    database.ref('users/' + user.uid).update({
      online: false,
      lastOnline: firebase.database.ServerValue.TIMESTAMP
    });
  }
  
  // Затем выходим из системы
  return auth.signOut();
}

// Функция для получения данных пользователя
function getUserData(uid) {
  return database.ref('users/' + uid).once('value');
}

// Функция для получения списка пользователей
function getAllUsers() {
  return database.ref('users').once('value');
}

// Функция для получения сообщений канала
function getChannelMessages(channelName) {
  return database.ref('messages/' + channelName).orderByChild('timestamp').once('value');
}

// Функция для отправки сообщения
function sendMessageToChannel(channelName, messageData) {
  return database.ref('messages/' + channelName).push(messageData);
}

// Функция для получения списка каналов
function getChannels() {
  return database.ref('channels').once('value');
} 