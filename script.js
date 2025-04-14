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
    
    // Загружаем список файлов при инициализации
    loadFileList();

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

    // Загрузка списка файлов из директории
    function loadFileList() {
        // В реальном приложении здесь был бы AJAX запрос к серверу
        // для получения списка файлов из директории
        
        // Для примера создадим некоторые демонстрационные файлы
        const demoFiles = [
            {
                name: 'презентация.pptx',
                size: 2540000,
                type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                date: '2023-10-15T10:30:00.000Z',
                path: 'files/презентация.pptx'
            },
            {
                name: 'документация.pdf',
                size: 1250000,
                type: 'application/pdf',
                date: '2023-10-10T14:15:00.000Z',
                path: 'files/документация.pdf'
            },
            {
                name: 'отчет.docx',
                size: 550000,
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                date: '2023-10-05T09:45:00.000Z',
                path: 'files/отчет.docx'
            },
            {
                name: 'данные.xlsx',
                size: 820000,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                date: '2023-10-01T16:20:00.000Z',
                path: 'files/данные.xlsx'
            },
            {
                name: 'фото.jpg',
                size: 1800000,
                type: 'image/jpeg',
                date: '2023-09-28T11:10:00.000Z',
                path: 'files/фото.jpg'
            },
            {
                name: 'архив.zip',
                size: 3500000,
                type: 'application/zip',
                date: '2023-09-25T13:40:00.000Z',
                path: 'files/архив.zip'
            },
            {
                name: 'инструкция.txt',
                size: 15000,
                type: 'text/plain',
                date: '2023-09-20T10:05:00.000Z',
                path: 'files/инструкция.txt'
            },
            {
                name: 'видео.mp4',
                size: 25000000,
                type: 'video/mp4',
                date: '2023-09-15T15:30:00.000Z',
                path: 'files/видео.mp4'
            }
        ];
        
        displayFiles(demoFiles);
    }

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
        fileItem.style.position = 'relative';
        
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
            <div class="download-icon">
                <i class="fas fa-download"></i>
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
                    <div style="color: var(--text-muted);">Дата добавления:</div>
                    <div>${new Date(file.date).toLocaleString()}</div>
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
        
        // В реальном приложении здесь был бы запрос к серверу
        // Для примера снова создадим демонстрационные файлы и отфильтруем их
        const demoFiles = [
            {
                name: 'презентация.pptx',
                size: 2540000,
                type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                date: '2023-10-15T10:30:00.000Z',
                path: 'files/презентация.pptx'
            },
            {
                name: 'документация.pdf',
                size: 1250000,
                type: 'application/pdf',
                date: '2023-10-10T14:15:00.000Z',
                path: 'files/документация.pdf'
            },
            {
                name: 'отчет.docx',
                size: 550000,
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                date: '2023-10-05T09:45:00.000Z',
                path: 'files/отчет.docx'
            },
            {
                name: 'данные.xlsx',
                size: 820000,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                date: '2023-10-01T16:20:00.000Z',
                path: 'files/данные.xlsx'
            },
            {
                name: 'фото.jpg',
                size: 1800000,
                type: 'image/jpeg',
                date: '2023-09-28T11:10:00.000Z',
                path: 'files/фото.jpg'
            },
            {
                name: 'архив.zip',
                size: 3500000,
                type: 'application/zip',
                date: '2023-09-25T13:40:00.000Z',
                path: 'files/архив.zip'
            },
            {
                name: 'инструкция.txt',
                size: 15000,
                type: 'text/plain',
                date: '2023-09-20T10:05:00.000Z',
                path: 'files/инструкция.txt'
            },
            {
                name: 'видео.mp4',
                size: 25000000,
                type: 'video/mp4',
                date: '2023-09-15T15:30:00.000Z',
                path: 'files/видео.mp4'
            }
        ];
        
        const filteredFiles = demoFiles.filter(file => 
            file.name.toLowerCase().includes(searchTerm)
        );
        
        displayFiles(filteredFiles);
    }

    // Скачивание файла
    function downloadFile() {
        if (!activeFile) return;
        
        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.href = activeFile.path;
        link.download = activeFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}); 