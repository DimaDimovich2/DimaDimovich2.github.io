document.addEventListener('DOMContentLoaded', () => {
    // DOM элементы основного интерфейса
    const fileList = document.getElementById('fileList');
    const searchInput = document.getElementById('searchInput');
    const fileModal = document.getElementById('fileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const downloadBtn = document.getElementById('downloadBtn');
    const closeModalBtn = document.querySelector('.close');
    const categoryCount = document.getElementById('categoryCount');
    const currentCategory = document.getElementById('currentCategory');
    
    // Элементы управления категориями и видом
    const categoryBtns = document.querySelectorAll('.category-btn');
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const sortSelect = document.getElementById('sortSelect');
    
    // Элементы модальных окон
    const settingsBtn = document.getElementById('settingsBtn');
    const helpBtn = document.getElementById('helpBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsCloseBtn = document.querySelector('.settings-close');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    const lightThemeBtn = document.getElementById('lightThemeBtn');
    const darkThemeBtn = document.getElementById('darkThemeBtn');
    const shareBtn = document.getElementById('shareBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    
    // Элементы настроек
    const showExtToggle = document.getElementById('showExtToggle');
    const animationToggle = document.getElementById('animationToggle');
    const previewToggle = document.getElementById('previewToggle');
    const confirmDownloadToggle = document.getElementById('confirmDownloadToggle');
    const elemSizeSlider = document.getElementById('elemSizeSlider');
    
    // Дополнительные элементы
    const advancedSearchBtn = document.getElementById('advancedSearchBtn');
    const toastContainer = document.getElementById('toastContainer');

    // Состояние приложения
    let activeFile = null;
    let currentFiles = [];
    let filteredFiles = [];
    let currentView = 'grid'; // grid или list
    let currentCategoryFilter = 'all';
    let favorites = [];
    let settings = {
        theme: 'light',
        elemSize: 1, // 0-маленький, 1-средний, 2-большой
        showExtensions: true,
        animations: true,
        preview: true,
        confirmDownload: false
    };
    
    // Реальные файлы в директории files
    const realFiles = [
        {
            id: 'file1',
            name: 'инструкция.txt',
            size: 70,
            type: 'text/plain',
            date: '2023-12-10T10:05:00.000Z',
            path: '/files/инструкция.txt',
            category: 'documents'
        },
        {
            id: 'file2',
            name: 'dimf.blend',
            size: 12582912, // примерно 12MB
            type: 'application/octet-stream',
            date: '2023-12-10T11:30:00.000Z',
            path: '/files/dimf.blend',
            category: 'other'
        },
        {
            id: 'file3',
            name: 'readme.md',
            size: 634,
            type: 'text/markdown',
            date: '2023-12-10T12:00:00.000Z',
            path: '/files/readme.md',
            category: 'documents'
        }
    ];
    
    // Инициализация
    init();
    
    function init() {
        // Загрузка сохраненных настроек
        loadSettings();
        // Применяем тему и другие настройки
        applySettings();
        // Загрузка избранных файлов
        loadFavorites();
        // Загрузка и отображение файлов
        loadFiles();
        // Установка обработчиков событий
        setupEventListeners();
    }
    
    // Загрузка настроек из localStorage
    function loadSettings() {
        const savedSettings = localStorage.getItem('fileStorageSettings');
        if (savedSettings) {
            settings = {...settings, ...JSON.parse(savedSettings)};
        }
    }
    
    // Применение настроек
    function applySettings() {
        // Применяем тему
        document.body.className = settings.theme === 'dark' ? 'dark-theme' : 'light-theme';
        
        // Обновляем элементы управления настройками
        lightThemeBtn.classList.toggle('active', settings.theme === 'light');
        darkThemeBtn.classList.toggle('active', settings.theme === 'dark');
        
        showExtToggle.checked = settings.showExtensions;
        animationToggle.checked = settings.animations;
        previewToggle.checked = settings.preview;
        confirmDownloadToggle.checked = settings.confirmDownload;
        elemSizeSlider.value = settings.elemSize;
        
        // Применяем размер элементов
        document.documentElement.style.setProperty('--file-item-scale', 0.85 + settings.elemSize * 0.15);
        
        // Удаляем или добавляем анимации
        if (!settings.animations) {
            document.body.classList.add('no-animations');
        } else {
            document.body.classList.remove('no-animations');
        }
    }
    
    // Сохранение настроек
    function saveSettings() {
        localStorage.setItem('fileStorageSettings', JSON.stringify(settings));
        applySettings();
        showToast('Успех', 'Настройки сохранены');
    }
    
    // Сброс настроек
    function resetSettings() {
        settings = {
            theme: 'light',
            elemSize: 1,
            showExtensions: true,
            animations: true,
            preview: true,
            confirmDownload: false
        };
        saveSettings();
    }
    
    // Загрузка и обработка файлов
    function loadFiles() {
        try {
            currentFiles = [...realFiles];
            applyFilters();
        } catch (e) {
            console.error('Ошибка при загрузке файлов:', e);
            fileList.innerHTML = `<p class="file-error">Ошибка при загрузке файлов</p>`;
        }
    }
    
    // Получение правильного склонения для числа файлов
    function getFileCountText(count) {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
            return 'файлов';
        }
        
        if (lastDigit === 1) {
            return 'файл';
        }
        
        if (lastDigit >= 2 && lastDigit <= 4) {
            return 'файла';
        }
        
        return 'файлов';
    }
    
    // Применение фильтров и сортировки
    function applyFilters() {
        // Фильтрация по поисковому запросу
        const searchTerm = searchInput.value.toLowerCase();
        
        // Фильтрация по категории
        filteredFiles = currentFiles.filter(file => {
            // Проверяем категорию
            const categoryMatch = currentCategoryFilter === 'all' || file.category === currentCategoryFilter;
            
            // Проверяем поисковый запрос
            const searchMatch = !searchTerm || file.name.toLowerCase().includes(searchTerm);
            
            return categoryMatch && searchMatch;
        });
        
        // Сортировка
        sortFiles();
        
        // Отображение файлов
        displayFiles();
        
        // Обновляем счетчик категории
        const categoryFiles = currentCategoryFilter === 'all' 
            ? currentFiles 
            : currentFiles.filter(file => file.category === currentCategoryFilter);
            
        categoryCount.textContent = `${categoryFiles.length} ${getFileCountText(categoryFiles.length)}`;
    }
    
    // Сортировка файлов
    function sortFiles() {
        const sortType = sortSelect.value;
        
        switch (sortType) {
            case 'name-asc':
                filteredFiles.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                filteredFiles.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'date-new':
                filteredFiles.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'date-old':
                filteredFiles.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'size-large':
                filteredFiles.sort((a, b) => b.size - a.size);
                break;
            case 'size-small':
                filteredFiles.sort((a, b) => a.size - b.size);
                break;
        }
    }

    // Отображение файлов в списке
    function displayFiles() {
        fileList.innerHTML = '';
        
        if (filteredFiles.length === 0) {
            fileList.innerHTML = '<p class="file-error">Файлы не найдены</p>';
            return;
        }
        
        filteredFiles.forEach(file => {
            const fileItem = createFileElement(file);
            fileList.appendChild(fileItem);
        });
    }

    // Создание элемента файла для отображения
    function createFileElement(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileId = file.id;
        
        const fileIcon = getFileIcon(file.type, file.name);
        const fileDate = new Date(file.date).toLocaleDateString();
        const fileSize = formatFileSize(file.size);
        
        // Определяем, показывать ли расширение
        const fileName = settings.showExtensions ? file.name : removeExtension(file.name);
        
        if (currentView === 'grid') {
            fileItem.innerHTML = `
                <div class="file-icon">
                    <i class="${fileIcon}"></i>
                </div>
                <div class="file-name">${fileName}</div>
                <div class="file-meta">
                    <span>${fileSize}</span>
                    <span>·</span>
                    <span>${fileDate}</span>
                </div>
                <div class="download-icon" title="Скачать">
                    <i class="fas fa-download"></i>
                </div>
            `;
        } else {
            fileItem.innerHTML = `
                <div class="file-icon">
                    <i class="${fileIcon}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${fileName}</div>
                    <div class="file-meta">
                        <span>${fileSize}</span>
                        <span>·</span>
                        <span class="file-category">${getCategoryName(file.category)}</span>
                        <span class="file-date">${fileDate}</span>
                    </div>
                </div>
                <div class="download-icon" title="Скачать">
                    <i class="fas fa-download"></i>
                </div>
            `;
        }
        
        // Добавляем избранное
        if (isFavorite(file.id)) {
            fileItem.classList.add('favorite');
            fileItem.insertAdjacentHTML('beforeend', `
                <div class="favorite-icon" title="В избранном">
                    <i class="fas fa-star"></i>
                </div>
            `);
        }
        
        // Обработчик клика по файлу
        fileItem.addEventListener('click', () => {
            openFileModal(file);
        });
        
        // Обработчик клика по иконке скачивания
        const downloadIcon = fileItem.querySelector('.download-icon');
        downloadIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем открытие модального окна
            
            if (settings.confirmDownload) {
                // Показываем диалог подтверждения
                const confirmed = confirm(`Скачать файл "${file.name}"?`);
                if (!confirmed) return;
            }
            
            downloadFile(file);
            showToast('Скачивание', `Файл "${file.name}" скачивается...`);
        });
        
        return fileItem;
    }
    
    // Удаление расширения файла
    function removeExtension(filename) {
        return filename.replace(/\.[^/.]+$/, "");
    }
    
    // Получение текстового названия категории
    function getCategoryName(category) {
        const categories = {
            'documents': 'Документ',
            'images': 'Изображение',
            'archives': 'Архив',
            'other': 'Другое'
        };
        
        return categories[category] || 'Файл';
    }
    
    // Проверка, является ли файл избранным
    function isFavorite(fileId) {
        return favorites.includes(fileId);
    }
    
    // Загрузка избранных файлов
    function loadFavorites() {
        const savedFavorites = localStorage.getItem('favoriteFiles');
        if (savedFavorites) {
            favorites = JSON.parse(savedFavorites);
        }
    }
    
    // Добавление/удаление файла из избранного
    function toggleFavorite(fileId) {
        if (isFavorite(fileId)) {
            favorites = favorites.filter(id => id !== fileId);
            showToast('Готово', 'Файл удален из избранного');
        } else {
            favorites.push(fileId);
            showToast('Готово', 'Файл добавлен в избранное');
        }
        
        localStorage.setItem('favoriteFiles', JSON.stringify(favorites));
        
        // Обновляем иконку в модальном окне
        favoriteBtn.innerHTML = isFavorite(fileId) 
            ? '<i class="fas fa-star"></i>'
            : '<i class="far fa-star"></i>';
        favoriteBtn.title = isFavorite(fileId)
            ? 'Удалить из избранного'
            : 'Добавить в избранное';
            
        // Обновляем отображение списка файлов
        displayFiles();
    }
    
    // Получение иконки в зависимости от типа файла и имени
    function getFileIcon(fileType, fileName) {
        // Проверка по расширению файла
        if (fileName) {
            const extension = fileName.split('.').pop().toLowerCase();
            
            if (extension === 'pdf') return 'fas fa-file-pdf';
            if (extension === 'doc' || extension === 'docx') return 'fas fa-file-word';
            if (extension === 'xls' || extension === 'xlsx') return 'fas fa-file-excel';
            if (extension === 'ppt' || extension === 'pptx') return 'fas fa-file-powerpoint';
            if (extension === 'zip' || extension === 'rar' || extension === '7z') return 'fas fa-file-archive';
            if (extension === 'txt') return 'fas fa-file-alt';
            if (extension === 'html' || extension === 'css' || extension === 'js') return 'fas fa-file-code';
            if (extension === 'md') return 'fas fa-file-alt';
            if (extension === 'blend') return 'fas fa-cubes';
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) return 'fas fa-image';
            if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(extension)) return 'fas fa-file-video';
            if (['mp3', 'wav', 'ogg', 'flac'].includes(extension)) return 'fas fa-file-audio';
        }
        
        // Запасной вариант - проверка по MIME-типу
        if (fileType.includes('image')) return 'fas fa-image';
        if (fileType.includes('pdf')) return 'fas fa-file-pdf';
        if (fileType.includes('word') || fileType.includes('document')) return 'fas fa-file-word';
        if (fileType.includes('excel') || fileType.includes('sheet')) return 'fas fa-file-excel';
        if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'fas fa-file-powerpoint';
        if (fileType.includes('video')) return 'fas fa-file-video';
        if (fileType.includes('audio')) return 'fas fa-file-audio';
        if (fileType.includes('zip') || fileType.includes('archive') || fileType.includes('compressed')) return 'fas fa-file-archive';
        if (fileType.includes('text')) return 'fas fa-file-alt';
        if (fileType.includes('html')) return 'fas fa-file-code';
        
        return 'fas fa-file';
    }

    // Форматирование размера файла
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Открытие модального окна с информацией о файле
    function openFileModal(file) {
        activeFile = file;
        modalTitle.textContent = file.name;
        
        // Обновляем состояние кнопки избранного
        favoriteBtn.innerHTML = isFavorite(file.id) 
            ? '<i class="fas fa-star"></i>'
            : '<i class="far fa-star"></i>';
        favoriteBtn.title = isFavorite(file.id)
            ? 'Удалить из избранного'
            : 'Добавить в избранное';
        
        // Информация о файле
        modalContent.innerHTML = `
            <div class="file-details">
                <div class="file-preview">
                    <div class="preview-icon">
                        <i class="${getFileIcon(file.type, file.name)}"></i>
                    </div>
                </div>
                <div class="file-info">
                    <div class="info-row">
                        <span class="info-label">Тип:</span>
                        <span class="info-value">${getFileType(file.type, file.name)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Размер:</span>
                        <span class="info-value">${formatFileSize(file.size)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Дата:</span>
                        <span class="info-value">${new Date(file.date).toLocaleString()}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Категория:</span>
                        <span class="info-value">${getCategoryName(file.category)}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Предпросмотр для изображений
        if (file.type.includes('image') && settings.preview) {
            const imgPreview = document.createElement('div');
            imgPreview.style.marginTop = '1rem';
            imgPreview.style.textAlign = 'center';
            imgPreview.innerHTML = `
                <img src="${file.path}" alt="${file.name}" 
                    style="max-width: 100%; max-height: 300px; border-radius: 8px; object-fit: contain; background-color: rgba(0,0,0,0.05);">
            `;
            modalContent.querySelector('.file-preview').innerHTML = '';
            modalContent.querySelector('.file-preview').appendChild(imgPreview);
        }
        
        fileModal.style.display = 'flex';
    }
    
    // Получение читаемого типа файла
    function getFileType(fileType, fileName) {
        if (fileName) {
            const extension = fileName.split('.').pop().toLowerCase();
            
            const typeMap = {
                'pdf': 'PDF документ',
                'doc': 'Word документ',
                'docx': 'Word документ',
                'xls': 'Excel таблица',
                'xlsx': 'Excel таблица',
                'ppt': 'PowerPoint презентация',
                'pptx': 'PowerPoint презентация',
                'txt': 'Текстовый файл',
                'md': 'Markdown файл',
                'png': 'Изображение PNG',
                'jpg': 'Изображение JPEG',
                'jpeg': 'Изображение JPEG',
                'gif': 'Изображение GIF',
                'mp4': 'Видео MP4',
                'mp3': 'Аудио MP3',
                'zip': 'Архив ZIP',
                'rar': 'Архив RAR',
                'blend': 'Blender файл'
            };
            
            if (extension in typeMap) {
                return typeMap[extension];
            }
        }
        
        // Общие типы файлов
        if (fileType.includes('image')) return 'Изображение';
        if (fileType.includes('pdf')) return 'PDF документ';
        if (fileType.includes('word') || fileType.includes('document')) return 'Документ';
        if (fileType.includes('excel') || fileType.includes('sheet')) return 'Таблица';
        if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'Презентация';
        if (fileType.includes('video')) return 'Видео';
        if (fileType.includes('audio')) return 'Аудио';
        if (fileType.includes('zip') || fileType.includes('archive')) return 'Архив';
        if (fileType.includes('text')) return 'Текстовый файл';
        
        return 'Файл';
    }

    // Скачивание файла
    function downloadFile(file) {
        if (!file) return;
        
        const link = document.createElement('a');
        link.href = file.path;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Копирование ссылки на файл
    function copyFileLink() {
        if (!activeFile) return;
        
        // Формируем полный URL на основе базового пути и репозитория
        // Для GitHub Pages с пользовательским доменом
        const url = window.location.origin + activeFile.path;
        
        navigator.clipboard.writeText(url)
            .then(() => {
                showToast('Успех', 'Ссылка скопирована в буфер обмена');
            })
            .catch(err => {
                console.error('Ошибка при копировании:', err);
                showToast('Ошибка', 'Не удалось скопировать ссылку');
            });
    }
    
    // Поделиться файлом
    function shareFile() {
        if (!activeFile) return;
        
        if (navigator.share) {
            navigator.share({
                title: 'Поделиться файлом',
                text: `Смотри файл "${activeFile.name}"`,
                url: window.location.origin + '/' + activeFile.path
            })
            .then(() => {
                showToast('Успех', 'Файл отправлен');
            })
            .catch(err => {
                console.error('Ошибка при отправке:', err);
                showToast('Ошибка', 'Не удалось поделиться файлом');
            });
        } else {
            // Запасной вариант
            copyFileLink();
        }
    }
    
    // Показ уведомления
    function showToast(title, message, duration = 3000) {
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.id = toastId;
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Добавляем обработчик для закрытия
        toast.querySelector('.toast-close').addEventListener('click', () => {
            removeToast(toastId);
        });
        
        // Удаляем через указанное время
        setTimeout(() => {
            removeToast(toastId);
        }, duration);
    }
    
    // Удаление уведомления
    function removeToast(toastId) {
        const toast = document.getElementById(toastId);
        if (!toast) return;
        
        // Добавляем класс для анимации исчезновения
        toast.classList.add('fade-out');
        
        // Удаляем элемент после завершения анимации
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
    
    // Переключение вида отображения (сетка/список)
    function switchView(viewType) {
        currentView = viewType;
        
        // Обновляем активную кнопку
        gridViewBtn.classList.toggle('active', viewType === 'grid');
        listViewBtn.classList.toggle('active', viewType === 'list');
        
        // Обновляем класс списка
        fileList.className = `file-list ${viewType}-view`;
        
        // Перерисовываем файлы
        displayFiles();
    }
    
    // Переключение категории
    function switchCategory(category) {
        currentCategoryFilter = category;
        
        // Обновляем заголовок текущей категории
        const categoryNames = {
            'all': 'Все файлы',
            'documents': 'Документы',
            'images': 'Изображения',
            'archives': 'Архивы',
            'other': 'Другие файлы'
        };
        
        currentCategory.textContent = categoryNames[category] || 'Все файлы';
        
        // Обновляем активную кнопку
        categoryBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        // Применяем фильтры и перерисовываем
        applyFilters();
    }
    
    // Настройка обработчиков событий
    function setupEventListeners() {
        // Поиск
        searchInput.addEventListener('input', applyFilters);
        
        // Сортировка
        sortSelect.addEventListener('change', applyFilters);
        
        // Переключение вида (сетка/список)
        gridViewBtn.addEventListener('click', () => switchView('grid'));
        listViewBtn.addEventListener('click', () => switchView('list'));
        
        // Кнопки категорий
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                switchCategory(btn.dataset.category);
            });
        });
        
        // Настройки
        settingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'flex';
        });
        
        settingsCloseBtn.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
        
        saveSettingsBtn.addEventListener('click', () => {
            // Сохраняем настройки из элементов управления
            settings.theme = lightThemeBtn.classList.contains('active') ? 'light' : 'dark';
            settings.showExtensions = showExtToggle.checked;
            settings.animations = animationToggle.checked;
            settings.preview = previewToggle.checked;
            settings.confirmDownload = confirmDownloadToggle.checked;
            settings.elemSize = parseInt(elemSizeSlider.value);
            
            saveSettings();
            
            // Перерисовываем файлы с новыми настройками
            displayFiles();
            
            // Закрываем модальное окно
            settingsModal.style.display = 'none';
        });
        
        resetSettingsBtn.addEventListener('click', () => {
            resetSettings();
            settingsModal.style.display = 'none';
        });
        
        // Переключение темы
        lightThemeBtn.addEventListener('click', () => {
            lightThemeBtn.classList.add('active');
            darkThemeBtn.classList.remove('active');
        });
        
        darkThemeBtn.addEventListener('click', () => {
            darkThemeBtn.classList.add('active');
            lightThemeBtn.classList.remove('active');
        });
        
        // Закрытие модальных окон
        window.addEventListener('click', (e) => {
            if (e.target === fileModal) {
                fileModal.style.display = 'none';
            }
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
        
        // Кнопка загрузки файла
        downloadBtn.addEventListener('click', () => {
            downloadFile(activeFile);
            fileModal.style.display = 'none';
            showToast('Скачивание', `Файл "${activeFile.name}" скачивается...`);
        });
        
        // Кнопка "поделиться"
        shareBtn.addEventListener('click', shareFile);
        
        // Кнопка "Избранное"
        favoriteBtn.addEventListener('click', () => {
            if (activeFile) {
                toggleFavorite(activeFile.id);
            }
        });
        
        // Кнопка "копировать ссылку"
        copyLinkBtn.addEventListener('click', copyFileLink);
        
        // Кнопка расширенного поиска
        advancedSearchBtn.addEventListener('click', () => {
            showToast('Скоро', 'Расширенный поиск находится в разработке');
        });
        
        // Кнопка помощи
        helpBtn.addEventListener('click', () => {
            showToast('Подсказка', 'Нажмите на файл, чтобы посмотреть подробную информацию и скачать его');
        });
    }
}); 