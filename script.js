document.addEventListener('DOMContentLoaded', () => {
    // DOM элементы
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const fileList = document.getElementById('fileList');
    const searchInput = document.getElementById('searchInput');
    const fileModal = document.getElementById('fileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const downloadBtn = document.getElementById('downloadBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const closeModalBtn = document.querySelector('.close');

    // Текущие выбранные файлы и активный файл для модального окна
    let currentFiles = [];
    let activeFile = null;

    // Инициализация - загрузка списка файлов
    loadFileList();

    // Обработчики событий перетаскивания
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Визуальные эффекты при перетаскивании
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('active');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('active');
        });
    });

    // Обработка брошенных файлов
    dropArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFiles);
    dropArea.addEventListener('click', () => fileInput.click());

    // Обработка поиска
    searchInput.addEventListener('input', filterFiles);

    // Закрытие модального окна
    closeModalBtn.addEventListener('click', () => {
        fileModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === fileModal) {
            fileModal.style.display = 'none';
        }
    });

    // Кнопки в модальном окне
    downloadBtn.addEventListener('click', downloadFile);
    deleteBtn.addEventListener('click', deleteFile);

    // Функции для обработки файлов
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files } });
    }

    function handleFiles(e) {
        const files = [...e.target.files];
        if (files.length === 0) return;

        currentFiles = files;
        uploadFiles(files);
    }

    function uploadFiles(files) {
        // Показать прогресс загрузки
        uploadProgress.style.display = 'block';
        
        // Имитация загрузки (в реальном приложении здесь был бы AJAX запрос)
        let progress = 0;
        const totalFiles = files.length;
        const interval = setInterval(() => {
            progress += 5;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    uploadProgress.style.display = 'none';
                    saveFiles(files);
                    loadFileList();
                    fileInput.value = '';
                }, 500);
            }
        }, 100);
    }

    // Сохранение файлов (имитация - сохраняем данные в localStorage)
    function saveFiles(files) {
        let savedFiles = getSavedFiles();
        
        files.forEach(file => {
            const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const savedFile = {
                id: fileId,
                name: file.name,
                size: file.size,
                type: file.type,
                date: new Date().toISOString(),
                path: `files/${file.name}` // В реальности здесь был бы путь на сервере
            };
            
            savedFiles.push(savedFile);
        });
        
        localStorage.setItem('uploadedFiles', JSON.stringify(savedFiles));
    }

    // Получение сохраненных файлов из localStorage
    function getSavedFiles() {
        const files = localStorage.getItem('uploadedFiles');
        return files ? JSON.parse(files) : [];
    }

    // Загрузка списка файлов
    function loadFileList() {
        const files = getSavedFiles();
        fileList.innerHTML = '';
        
        if (files.length === 0) {
            fileList.innerHTML = '<p class="text-center" style="grid-column: 1 / -1; color: var(--text-muted);">Нет загруженных файлов</p>';
            return;
        }
        
        files.forEach(file => {
            const fileItem = createFileElement(file);
            fileList.appendChild(fileItem);
        });
    }

    // Создание элемента файла для отображения
    function createFileElement(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileId = file.id;
        
        const fileIcon = getFileIcon(file.type);
        const fileDate = new Date(file.date).toLocaleDateString();
        const fileSize = formatFileSize(file.size);
        
        fileItem.innerHTML = `
            <div class="file-icon">
                <i class="${fileIcon}"></i>
            </div>
            <div class="file-name">${file.name}</div>
            <div class="file-meta">
                <span>${fileSize}</span>
                <span>·</span>
                <span>${fileDate}</span>
            </div>
        `;
        
        fileItem.addEventListener('click', () => {
            openFileModal(file);
        });
        
        return fileItem;
    }

    // Получение иконки в зависимости от типа файла
    function getFileIcon(fileType) {
        if (fileType.includes('image')) return 'fas fa-image';
        if (fileType.includes('pdf')) return 'fas fa-file-pdf';
        if (fileType.includes('word') || fileType.includes('document')) return 'fas fa-file-word';
        if (fileType.includes('excel') || fileType.includes('sheet')) return 'fas fa-file-excel';
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
        
        // Информация о файле
        modalContent.innerHTML = `
            <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <div style="margin-bottom: 0.8rem; display: flex; align-items: center; justify-content: center;">
                    <div style="width: 60px; height: 60px; background: rgba(138, 110, 255, 0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 1rem;">
                        <i class="${getFileIcon(file.type)}" style="font-size: 1.8rem; color: var(--primary-color);"></i>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem;">
                    <div style="color: var(--text-muted);">Тип файла:</div>
                    <div>${file.type || 'Неизвестный'}</div>
                    <div style="color: var(--text-muted);">Размер:</div>
                    <div>${formatFileSize(file.size)}</div>
                    <div style="color: var(--text-muted);">Дата загрузки:</div>
                    <div>${new Date(file.date).toLocaleString()}</div>
                    <div style="color: var(--text-muted);">Путь:</div>
                    <div style="word-break: break-all;">${file.path}</div>
                </div>
            </div>
        `;
        
        // Предпросмотр для изображений
        if (file.type.includes('image')) {
            modalContent.innerHTML += `
                <div style="text-align: center; margin-top: 1rem;">
                    <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Предпросмотр:</p>
                    <img src="${file.path}" alt="${file.name}" style="max-width: 100%; max-height: 300px; border-radius: 8px; object-fit: contain; background: rgba(0,0,0,0.2);">
                </div>
            `;
        }
        
        fileModal.style.display = 'flex';
    }

    // Фильтрация файлов по поиску
    function filterFiles() {
        const searchTerm = searchInput.value.toLowerCase();
        const files = getSavedFiles();
        
        fileList.innerHTML = '';
        
        if (files.length === 0) {
            fileList.innerHTML = '<p class="text-center" style="grid-column: 1 / -1; color: var(--text-muted);">Нет загруженных файлов</p>';
            return;
        }
        
        const filteredFiles = files.filter(file => 
            file.name.toLowerCase().includes(searchTerm)
        );
        
        if (filteredFiles.length === 0) {
            fileList.innerHTML = '<p class="text-center" style="grid-column: 1 / -1; color: var(--text-muted);">Файлы не найдены</p>';
            return;
        }
        
        filteredFiles.forEach(file => {
            const fileItem = createFileElement(file);
            fileList.appendChild(fileItem);
        });
    }

    // Скачивание файла
    function downloadFile() {
        if (!activeFile) return;
        
        // В реальном приложении здесь был бы код для скачивания файла
        // Для демонстрации создадим фиктивную ссылку для скачивания
        const link = document.createElement('a');
        link.href = activeFile.path;
        link.download = activeFile.name;
        link.click();
    }

    // Удаление файла
    function deleteFile() {
        if (!activeFile) return;
        
        if (confirm(`Вы действительно хотите удалить файл "${activeFile.name}"?`)) {
            let savedFiles = getSavedFiles();
            savedFiles = savedFiles.filter(file => file.id !== activeFile.id);
            localStorage.setItem('uploadedFiles', JSON.stringify(savedFiles));
            
            fileModal.style.display = 'none';
            loadFileList();
        }
    }
}); 