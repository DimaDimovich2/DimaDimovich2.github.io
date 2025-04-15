// Функции для работы с сообщениями и чатами
document.addEventListener('DOMContentLoaded', () => {
  // Ссылки на элементы интерфейса
  const chatList = document.getElementById('chat-list');
  const messagesList = document.getElementById('messages-list');
  const messageForm = document.getElementById('message-form');
  const createChannelForm = document.getElementById('create-channel-form');
  const currentChannelTitle = document.getElementById('current-channel-title');
  const currentChannelDescription = document.getElementById('current-channel-description');
  const currentChannelMembers = document.getElementById('current-channel-members');
  const noChannelSelectedMessage = document.getElementById('no-channel-selected');
  const channelContainer = document.getElementById('channel-container');
  
  // Текущий выбранный канал и пользователь
  let currentChannelId = null;
  let currentUser = null;
  
  // Слушатель состояния авторизации
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      loadUserChannels(user.uid);
    } else {
      // Если пользователь не авторизован, очищаем интерфейс
      clearChannelsList();
      clearMessagesList();
      hideChannelContainer();
    }
  });
  
  // Функция для загрузки каналов пользователя
  function loadUserChannels(userId) {
    // Очищаем список каналов
    clearChannelsList();
    
    // Получаем список каналов, в которых состоит пользователь
    const userChannelsRef = database.ref('user_channels').child(userId);
    
    userChannelsRef.on('child_added', (snapshot) => {
      const channelId = snapshot.key;
      
      // Получаем информацию о канале
      database.ref('channels').child(channelId).once('value', (channelSnapshot) => {
        const channelData = channelSnapshot.val();
        if (channelData) {
          addChannelToList(channelId, channelData);
        }
      });
    });
    
    userChannelsRef.on('child_removed', (snapshot) => {
      const channelId = snapshot.key;
      removeChannelFromList(channelId);
      
      // Если был выбран удаленный канал, скрываем контейнер с сообщениями
      if (currentChannelId === channelId) {
        currentChannelId = null;
        hideChannelContainer();
        showNoChannelSelectedMessage();
      }
    });
  }
  
  // Функция для добавления канала в список
  function addChannelToList(channelId, channelData) {
    const channelItem = document.createElement('div');
    channelItem.className = 'chat-item';
    channelItem.dataset.channelId = channelId;
    
    // Получаем последнее сообщение для отображения в превью
    database.ref('messages').child(channelId).limitToLast(1).once('value', (messagesSnapshot) => {
      let lastMessageText = '';
      let lastMessageTime = '';
      
      if (messagesSnapshot.exists()) {
        messagesSnapshot.forEach((messageSnapshot) => {
          const messageData = messageSnapshot.val();
          lastMessageText = messageData.text;
          lastMessageTime = formatTimestamp(messageData.timestamp);
        });
      }
      
      // Формируем HTML для элемента списка
      channelItem.innerHTML = `
        <div class="chat-avatar">
          <div class="chat-avatar-img" style="background-color: ${getChannelColor(channelId)}">
            ${channelData.name.charAt(0).toUpperCase()}
          </div>
        </div>
        <div class="chat-info">
          <div class="chat-name">${channelData.name}</div>
          <div class="chat-last-message">${lastMessageText || 'Нет сообщений'}</div>
        </div>
        <div class="chat-meta">
          <div class="chat-time">${lastMessageTime}</div>
          <div class="chat-status"></div>
        </div>
      `;
      
      // Добавляем обработчик клика
      channelItem.addEventListener('click', () => {
        setActiveChannel(channelId);
      });
      
      // Добавляем элемент в список
      chatList.appendChild(channelItem);
      
      // Если это единственный канал, выбираем его автоматически
      if (chatList.children.length === 1) {
        setActiveChannel(channelId);
      }
    });
    
    // Слушаем изменения в количестве непрочитанных сообщений
    database.ref(`unread_messages/${currentUser.uid}/${channelId}`).on('value', (snapshot) => {
      const unreadCount = snapshot.val() || 0;
      updateUnreadCount(channelId, unreadCount);
    });
  }
  
  // Функция для обновления счетчика непрочитанных сообщений
  function updateUnreadCount(channelId, count) {
    const channelItem = document.querySelector(`.chat-item[data-channel-id="${channelId}"]`);
    if (channelItem) {
      const statusElement = channelItem.querySelector('.chat-status');
      
      if (count > 0 && channelId !== currentChannelId) {
        statusElement.textContent = count > 99 ? '99+' : count;
        statusElement.classList.add('unread');
      } else {
        statusElement.textContent = '';
        statusElement.classList.remove('unread');
      }
    }
  }
  
  // Функция для удаления канала из списка
  function removeChannelFromList(channelId) {
    const channelItem = document.querySelector(`.chat-item[data-channel-id="${channelId}"]`);
    if (channelItem) {
      chatList.removeChild(channelItem);
    }
  }
  
  // Функция для установки активного канала
  function setActiveChannel(channelId) {
    // Снимаем выделение с предыдущего активного канала
    const activeChannel = document.querySelector('.chat-item.active');
    if (activeChannel) {
      activeChannel.classList.remove('active');
    }
    
    // Выделяем новый активный канал
    const newActiveChannel = document.querySelector(`.chat-item[data-channel-id="${channelId}"]`);
    if (newActiveChannel) {
      newActiveChannel.classList.add('active');
    }
    
    // Обновляем текущий канал
    currentChannelId = channelId;
    
    // Показываем контейнер с сообщениями и скрываем сообщение о неактивном канале
    showChannelContainer();
    hideNoChannelSelectedMessage();
    
    // Загружаем информацию о канале
    loadChannelInfo(channelId);
    
    // Загружаем сообщения канала
    loadChannelMessages(channelId);
    
    // Сбрасываем счетчик непрочитанных сообщений
    resetUnreadCount(channelId);
  }
  
  // Функция для сброса счетчика непрочитанных сообщений
  function resetUnreadCount(channelId) {
    if (currentUser) {
      database.ref(`unread_messages/${currentUser.uid}/${channelId}`).set(0);
    }
  }
  
  // Функция для загрузки информации о канале
  function loadChannelInfo(channelId) {
    database.ref('channels').child(channelId).once('value', (snapshot) => {
      const channelData = snapshot.val();
      
      if (channelData) {
        // Обновляем заголовок и описание канала
        currentChannelTitle.textContent = channelData.name;
        currentChannelDescription.textContent = channelData.description || '';
        
        // Загружаем информацию о участниках канала
        loadChannelMembers(channelId);
      }
    });
  }
  
  // Функция для загрузки информации о участниках канала
  function loadChannelMembers(channelId) {
    // Очищаем список участников
    currentChannelMembers.innerHTML = '';
    
    database.ref(`channel_members/${channelId}`).once('value', (snapshot) => {
      const members = snapshot.val();
      
      if (members) {
        const memberIds = Object.keys(members);
        let loadedCount = 0;
        
        memberIds.forEach((memberId) => {
          database.ref(`users/${memberId}`).once('value', (userSnapshot) => {
            const userData = userSnapshot.val();
            
            if (userData) {
              // Создаем элемент для отображения участника
              const memberElement = document.createElement('div');
              memberElement.className = 'channel-member';
              
              memberElement.innerHTML = `
                <span class="member-avatar" style="background-color: ${getRandomColor(memberId)}">${userData.username.charAt(0).toUpperCase()}</span>
                <span class="member-name">${userData.username}</span>
                <span class="member-status ${userData.status || 'offline'}"></span>
              `;
              
              currentChannelMembers.appendChild(memberElement);
            }
            
            loadedCount++;
            
            // Если загрузили всех участников, показываем их количество
            if (loadedCount === memberIds.length) {
              const memberCountElement = document.createElement('div');
              memberCountElement.className = 'member-count';
              memberCountElement.textContent = `${memberIds.length} участников`;
              
              currentChannelMembers.prepend(memberCountElement);
            }
          });
        });
      }
    });
  }
  
  // Функция для загрузки сообщений канала
  function loadChannelMessages(channelId) {
    // Очищаем список сообщений
    clearMessagesList();
    
    // Получаем последние 50 сообщений канала
    const messagesRef = database.ref('messages').child(channelId).limitToLast(50);
    
    // Слушаем добавление новых сообщений
    messagesRef.on('child_added', (snapshot) => {
      const messageId = snapshot.key;
      const messageData = snapshot.val();
      
      addMessageToList(messageId, messageData);
      
      // Прокручиваем к последнему сообщению
      messagesList.scrollTop = messagesList.scrollHeight;
    });
    
    // Слушаем изменения сообщений
    messagesRef.on('child_changed', (snapshot) => {
      const messageId = snapshot.key;
      const messageData = snapshot.val();
      
      updateMessageInList(messageId, messageData);
    });
    
    // Слушаем удаление сообщений
    messagesRef.on('child_removed', (snapshot) => {
      const messageId = snapshot.key;
      removeMessageFromList(messageId);
    });
  }
  
  // Функция для добавления сообщения в список
  function addMessageToList(messageId, messageData) {
    const messageItem = document.createElement('div');
    messageItem.className = 'message-item';
    messageItem.dataset.messageId = messageId;
    
    // Определяем, является ли отправитель текущим пользователем
    const isMine = messageData.senderId === currentUser.uid;
    
    if (isMine) {
      messageItem.classList.add('my-message');
    }
    
    // Форматируем время сообщения
    const messageTime = formatTimestamp(messageData.timestamp);
    
    // Загружаем информацию о отправителе
    database.ref(`users/${messageData.senderId}`).once('value', (snapshot) => {
      const senderData = snapshot.val() || { username: 'Пользователь' };
      
      messageItem.innerHTML = `
        <div class="message-avatar">
          <div class="message-avatar-img" style="background-color: ${getRandomColor(messageData.senderId)}">
            ${senderData.username.charAt(0).toUpperCase()}
          </div>
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">${isMine ? 'Вы' : senderData.username}</span>
            <span class="message-time">${messageTime}</span>
          </div>
          <div class="message-text">${messageData.text}</div>
        </div>
      `;
      
      // Добавляем возможность удаления собственных сообщений
      if (isMine) {
        const deleteButton = document.createElement('div');
        deleteButton.className = 'message-delete';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        
        deleteButton.addEventListener('click', () => {
          deleteMessage(currentChannelId, messageId);
        });
        
        messageItem.appendChild(deleteButton);
      }
      
      // Добавляем сообщение в список
      messagesList.appendChild(messageItem);
    });
  }
  
  // Функция для обновления сообщения в списке
  function updateMessageInList(messageId, messageData) {
    const messageItem = document.querySelector(`.message-item[data-message-id="${messageId}"]`);
    
    if (messageItem) {
      const messageTextElement = messageItem.querySelector('.message-text');
      messageTextElement.textContent = messageData.text;
      
      // Обновляем время редактирования, если есть
      if (messageData.editedAt) {
        const messageTimeElement = messageItem.querySelector('.message-time');
        messageTimeElement.textContent = `${formatTimestamp(messageData.timestamp)} (ред.)`;
      }
    }
  }
  
  // Функция для удаления сообщения из списка
  function removeMessageFromList(messageId) {
    const messageItem = document.querySelector(`.message-item[data-message-id="${messageId}"]`);
    
    if (messageItem) {
      messagesList.removeChild(messageItem);
    }
  }
  
  // Функция для удаления сообщения
  function deleteMessage(channelId, messageId) {
    database.ref(`messages/${channelId}/${messageId}`).remove()
      .then(() => {
        showNotification('Сообщение удалено', 'success');
      })
      .catch((error) => {
        console.error('Ошибка при удалении сообщения:', error);
        showNotification('Ошибка при удалении сообщения', 'error');
      });
  }
  
  // Функция для отправки сообщения
  function sendMessage(channelId, text) {
    if (!text.trim() || !currentUser) return;
    
    const newMessageRef = database.ref('messages').child(channelId).push();
    const messageId = newMessageRef.key;
    
    const messageData = {
      text: text.trim(),
      senderId: currentUser.uid,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Отправляем сообщение
    newMessageRef.set(messageData)
      .then(() => {
        // Обновляем время последнего сообщения в канале
        return database.ref(`channels/${channelId}/lastMessageAt`).set(firebase.database.ServerValue.TIMESTAMP);
      })
      .then(() => {
        // Увеличиваем счетчики непрочитанных сообщений для всех участников канала, кроме отправителя
        return updateUnreadCounters(channelId, messageId);
      })
      .catch((error) => {
        console.error('Ошибка при отправке сообщения:', error);
        showNotification('Ошибка при отправке сообщения', 'error');
      });
  }
  
  // Функция для обновления счетчиков непрочитанных сообщений
  function updateUnreadCounters(channelId, messageId) {
    return database.ref(`channel_members/${channelId}`).once('value')
      .then((snapshot) => {
        const members = snapshot.val();
        
        if (members) {
          const updates = {};
          
          Object.keys(members).forEach((memberId) => {
            // Пропускаем отправителя
            if (memberId !== currentUser.uid) {
              // Увеличиваем счетчик непрочитанных сообщений
              updates[`unread_messages/${memberId}/${channelId}`] = firebase.database.ServerValue.increment(1);
            }
          });
          
          // Применяем все обновления сразу
          if (Object.keys(updates).length > 0) {
            return database.ref().update(updates);
          }
        }
      });
  }
  
  // Функция для создания нового канала
  function createChannel(name, description = '', members = []) {
    if (!name.trim() || !currentUser) return;
    
    // Создаем новый канал
    const newChannelRef = database.ref('channels').push();
    const channelId = newChannelRef.key;
    
    const channelData = {
      name: name.trim(),
      description: description.trim(),
      createdBy: currentUser.uid,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      lastMessageAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Добавляем список участников, включая создателя
    const memberUpdates = {};
    
    // Добавляем создателя канала
    memberUpdates[`channel_members/${channelId}/${currentUser.uid}`] = true;
    memberUpdates[`user_channels/${currentUser.uid}/${channelId}`] = true;
    
    // Добавляем других участников
    members.forEach((memberId) => {
      if (memberId !== currentUser.uid) {
        memberUpdates[`channel_members/${channelId}/${memberId}`] = true;
        memberUpdates[`user_channels/${memberId}/${channelId}`] = true;
      }
    });
    
    // Выполняем все обновления в базе данных
    const updates = {
      [`channels/${channelId}`]: channelData,
      ...memberUpdates
    };
    
    return database.ref().update(updates)
      .then(() => {
        return channelId;
      });
  }
  
  // Обработчик формы отправки сообщения
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const messageInput = messageForm.querySelector('input[type="text"]');
    const messageText = messageInput.value;
    
    if (currentChannelId && messageText.trim()) {
      sendMessage(currentChannelId, messageText);
      messageInput.value = '';
    }
  });
  
  // Обработчик формы создания канала
  createChannelForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const channelNameInput = createChannelForm.querySelector('#channel-name');
    const channelDescriptionInput = createChannelForm.querySelector('#channel-description');
    
    const channelName = channelNameInput.value;
    const channelDescription = channelDescriptionInput.value;
    
    if (channelName.trim()) {
      // Показываем индикатор загрузки
      createChannelForm.querySelector('.btn-primary').classList.add('loading');
      
      createChannel(channelName, channelDescription)
        .then((channelId) => {
          showNotification(`Канал "${channelName}" создан`, 'success');
          
          // Очищаем форму
          channelNameInput.value = '';
          channelDescriptionInput.value = '';
          
          // Закрываем модальное окно создания канала
          const createChannelModal = document.getElementById('create-channel-modal');
          hideModal(createChannelModal);
          
          // Выбираем новый канал
          setActiveChannel(channelId);
        })
        .catch((error) => {
          console.error('Ошибка при создании канала:', error);
          showNotification('Ошибка при создании канала', 'error');
        })
        .finally(() => {
          // Скрываем индикатор загрузки
          createChannelForm.querySelector('.btn-primary').classList.remove('loading');
        });
    }
  });
  
  // Вспомогательные функции
  function clearChannelsList() {
    chatList.innerHTML = '';
  }
  
  function clearMessagesList() {
    messagesList.innerHTML = '';
  }
  
  function showChannelContainer() {
    channelContainer.style.display = 'flex';
  }
  
  function hideChannelContainer() {
    channelContainer.style.display = 'none';
  }
  
  function showNoChannelSelectedMessage() {
    noChannelSelectedMessage.style.display = 'flex';
  }
  
  function hideNoChannelSelectedMessage() {
    noChannelSelectedMessage.style.display = 'none';
  }
  
  function getChannelColor(channelId) {
    const colors = [
      '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#607D8B',
      '#E91E63', '#3F51B5', '#009688', '#FFC107', '#795548'
    ];
    
    let hash = 0;
    for (let i = 0; i < channelId.length; i++) {
      hash = channelId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
  
  // Показываем сообщение о необходимости выбрать чат при первой загрузке
  showNoChannelSelectedMessage();
}); 