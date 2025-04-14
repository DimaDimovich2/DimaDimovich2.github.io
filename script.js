document.addEventListener('DOMContentLoaded', () => {
    // DOM элементы
    const fileList = document.getElementById('fileList');
    const searchInput = document.getElementById('searchInput');
    const fileModal = document.getElementById('fileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const downloadBtn = document.getElementById('downloadBtn');
    const closeModalBtn = document.querySelector('.close');

    // Активный файл для модального окна
    let activeFile = null;
    
    // Реальные файлы в директории files
    const realFiles = [
        {
            name: 'инструкция.txt',
            size: 70,
            type: 'text/plain',
            date: '2023-12-10T10:05:00.000Z',
            path: './files/инструкция.txt'
        },
        {
            name: 'dimf.blend',
            size: 12582912, // примерно 12MB
            type: 'application/octet-stream',
            date: '2023-12-10T11:30:00.000Z',
            path: './files/dimf.blend'
        },
        {
            name: 'readme.md',
            size: 634,
            type: 'text/markdown',
            date: '2023-12-10T12:00:00.000Z',
            path: './files/readme.md'
        }
    ];
    
    // Обработка ошибок
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('Ошибка:', message);
        fileList.innerHTML = `<p class="file-error">Произошла ошибка при загрузке файлов</p>`;
        return false;
    };
    
    // Загружаем список файлов при инициализации
    try {
        displayFiles(realFiles);
    } catch (e) {
        console.error('Ошибка при отображении файлов:', e);
        fileList.innerHTML = `<p class="file-error">Ошибка при отображении файлов</p>`;
    }

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

    // Кнопка скачивания в модальном окне
    downloadBtn.addEventListener('click', downloadFile);

    // Отображение файлов в списке
    function displayFiles(files) {
        fileList.innerHTML = '';
        
        if (files.length === 0) {
            fileList.innerHTML = '<p class="file-error">Файлы не найдены</p>';
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
        
        const fileIcon = getFileIcon(file.type, file.name);
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
            <div class="download-icon">
                <i class="fas fa-download"></i>
            </div>
        `;
        
        // Обработчик клика по файлу
        fileItem.addEventListener('click', () => {
            openFileModal(file);
        });
        
        // Обработчик клика по иконке скачивания
        const downloadIcon = fileItem.querySelector('.download-icon');
        downloadIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем открытие модального окна
            downloadDirectly(file);
        });
        
        return fileItem;
    }
    
    // Функция для прямого скачивания
    function downloadDirectly(file) {
        const link = document.createElement('a');
        link.href = file.path;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                </div>
            </div>
        `;
        
        // Стили для блоков информации
        const style = document.createElement('style');
        style.textContent = `
            .file-details {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1.5rem;
                padding: 1rem;
                background: ${file.type.includes('image') ? 'transparent' : '#f8fafc'};
                border-radius: 8px;
            }
            .file-preview {
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .preview-icon {
                width: 70px;
                height: 70px;
                background: #f0f4ff;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .preview-icon i {
                font-size: 2rem;
                color: var(--primary-color);
            }
            .file-info {
                width: 100%;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 0.7rem 0;
                border-bottom: 1px solid #e2e8f0;
            }
            .info-label {
                font-weight: 500;
                color: var(--text-light);
            }
            .info-value {
                font-weight: 500;
                color: var(--text-color);
            }
        `;
        modalContent.appendChild(style);
        
        // Предпросмотр для изображений
        if (file.type.includes('image')) {
            const imgPreview = document.createElement('div');
            imgPreview.style.marginTop = '1rem';
            imgPreview.style.textAlign = 'center';
            imgPreview.innerHTML = `
                <img src="${file.path}" alt="${file.name}" 
                    style="max-width: 100%; max-height: 300px; border-radius: 8px; object-fit: contain;">
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

    // Фильтрация файлов по поиску
    function filterFiles() {
        const searchTerm = searchInput.value.toLowerCase();
        
        const filteredFiles = realFiles.filter(file => 
            file.name.toLowerCase().includes(searchTerm)
        );
        
        displayFiles(filteredFiles);
    }

    // Скачивание файла из модального окна
    function downloadFile() {
        if (!activeFile) return;
        
        downloadDirectly(activeFile);
        fileModal.style.display = 'none';
    }
}); 