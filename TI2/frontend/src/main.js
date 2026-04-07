import './style.css';
import './app.css';
import { EncryptFile } from '../wailsjs/go/main/App';

// Создаем HTML структуру
document.querySelector('#app').innerHTML = `
    <div class="container">
        <h1>🔐 Шифрование файлов LFSR</h1>
        
        <!-- Поле для ввода 27 бит -->
        <div class="form-group">
            <label>Ключ шифрования (только 0 и 1):</label>
            <div class="key-input-container">
                <input type="text" id="keyInput" class="bits-input" placeholder="Введите двоичный ключ (27 символов)" maxlength="27">
            </div>
            <div class="char-counter">
                Символов: <span id="charCount">0</span>/27
            </div>
        </div>

        <!-- Выбор файла -->
        <div class="form-group">
            <label>Выберите файл:</label>
            <div class="file-input-wrapper">
                <div class="file-input-button" id="fileButton">
                    📁 Выбрать файл
                </div>
                <input type="file" id="fileInput" style="display: none;">
            </div>
            <div class="file-name" id="fileName">
                Файл не выбран
            </div>
        </div>

        <!-- Информационные поля -->
        <div class="info-fields">
            <div class="info-card">
                <div class="info-title">📄 Оригинальный файл (первые/последние 10 байт):</div>
                <div class="info-content" id="originalFileInfo">—</div>
            </div>

            <div class="info-card">
                <div class="info-title">🔐 СГЕНЕРИРОВАННЫЙ LFSR КЛЮЧ (первые/последние 80 бит):</div>
                <div class="info-content" id="keyOutput">—</div>
            </div>

            <div class="info-card">
                <div class="info-title">🔒 Обработанный файл (первые/последние 10 байт):</div>
                <div class="info-content" id="encryptedFileInfo">—</div>
            </div>
        </div>

        <!-- Кнопки -->
        <div class="button-group">
            <button class="btn-encrypt" id="encryptBtn" disabled>🔒 Зашифровать и сохранить</button>
            <button class="btn-reset" id="resetBtn">🗑️ Сбросить</button>
        </div>

        <div class="status" id="status"></div>
    </div>
`;

// Глобальные переменные
let selectedFile = null;
let currentKey = '';
let isEncryptMode = true;

// DOM элементы
const keyInput = document.getElementById('keyInput');
const charCount = document.getElementById('charCount');
const fileInput = document.getElementById('fileInput');
const fileButton = document.getElementById('fileButton');
const fileName = document.getElementById('fileName');
const encryptBtn = document.getElementById('encryptBtn');
const resetBtn = document.getElementById('resetBtn');
const originalFileInfo = document.getElementById('originalFileInfo');
const encryptedFileInfo = document.getElementById('encryptedFileInfo');
const keyOutput = document.getElementById('keyOutput');
const statusDiv = document.getElementById('status');

// Форматирование байтов в двоичный формат
function formatBytesToBinary(bytes) {
    if (!bytes || bytes.length === 0) return '';
    const binaryBytes = Array.from(bytes).map(b => b.toString(2).padStart(8, '0'));
    return binaryBytes.join(' ');
}

// Форматирование размера файла
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Показать статус
function showStatus(message, type) {
    if (!statusDiv) return;
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    setTimeout(() => {
        if (statusDiv) {
            statusDiv.style.display = 'none';
            statusDiv.className = 'status';
        }
    }, 3000);
}

// Определение режима работы по имени файла
function checkFileMode(file) {
    if (!file) return;
    const isEncrypted = file.name.toLowerCase().includes('encrypted');

    if (isEncrypted) {
        isEncryptMode = false;
        encryptBtn.textContent = '🔓 Расшифровать и сохранить';
        showStatus('🔓 Режим расшифровки', 'info');
    } else {
        isEncryptMode = true;
        encryptBtn.textContent = '🔒 Зашифровать и сохранить';
        showStatus('🔒 Режим шифрования', 'info');
    }
    checkEncryptAbility();
}

// Чтение информации о файле
async function readFileInfo(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const first10 = bytes.slice(0, 10);
        const last10 = bytes.slice(-10);

        let info = '';
        info += '📊 ПЕРВЫЕ 10 БАЙТ:\n';
        info += formatBytesToBinary(first10);

        if (bytes.length > 20) {
            info += '\n\n...\n\n';
            info += '📊 ПОСЛЕДНИЕ 10 БАЙТ:\n';
            info += formatBytesToBinary(last10);
        }

        if (originalFileInfo) {
            originalFileInfo.textContent = info;
        }
        return bytes;
    } catch (error) {
        console.error('Ошибка чтения файла:', error);
        if (originalFileInfo) {
            originalFileInfo.textContent = 'Ошибка чтения файла';
        }
        return null;
    }
}

// Проверка возможности шифрования
function checkEncryptAbility() {
    const hasValidKey = currentKey.length === 27;
    const hasFile = selectedFile !== null;
    if (encryptBtn) {
        encryptBtn.disabled = !(hasValidKey && hasFile);
    }
}

// Функция шифрования/расшифровки
async function encryptFile() {
    if (!selectedFile || !currentKey) {
        showStatus('Пожалуйста, выберите файл и введите ключ', 'error');
        return;
    }

    if (currentKey.length !== 27) {
        showStatus('Пожалуйста, введите ключ длиной 27 символов (только 0 и 1)', 'error');
        return;
    }

    const originalText = encryptBtn.innerHTML;
    encryptBtn.innerHTML = `<span class="loading"></span> ${isEncryptMode ? 'Шифрование' : 'Расшифровка'}...`;
    encryptBtn.disabled = true;

    try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const fileBytes = new Uint8Array(arrayBuffer);
        const fileData = Array.from(fileBytes);

        console.log('=== ОТЛАДКА ===');
        console.log('Имя файла:', selectedFile.name);
        console.log('Режим:', isEncryptMode ? 'Шифрование' : 'Расшифровка');
        console.log('Ключ:', currentKey);

        const response = await EncryptFile(currentKey, fileData, selectedFile.name);

        console.log('Ответ от Go:', response);

        if (!response) {
            throw new Error('Сервер вернул пустой ответ');
        }

        // Отображаем ключ
        if (keyOutput) {
            keyOutput.textContent = response.key || '—';
        }

        // Отображаем результат
        if (encryptedFileInfo && response.encrypted) {
            encryptedFileInfo.textContent = response.encrypted;
        }

        // Обновляем оригинал (если нужно)
        if (originalFileInfo && response.original) {
            originalFileInfo.textContent = response.original;
        }

        const successMessage = isEncryptMode ?
            `✅ Файл успешно зашифрован и сохранен как "${response.saved_as}"!` :
            `✅ Файл успешно расшифрован и сохранен как "${response.saved_as}"!`;
        showStatus(successMessage, 'success');

    } catch (error) {
        console.error('ОШИБКА:', error);
        showStatus(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
        encryptBtn.innerHTML = originalText;
        checkEncryptAbility();
    }
}

// Сброс всех данных
function resetAll() {
    if (keyInput) keyInput.value = '';
    currentKey = '';
    if (charCount) charCount.textContent = '0';
    if (fileInput) fileInput.value = '';
    selectedFile = null;
    if (fileName) fileName.textContent = 'Файл не выбран';
    if (originalFileInfo) originalFileInfo.textContent = '—';
    if (encryptedFileInfo) encryptedFileInfo.textContent = '—';
    if (keyOutput) keyOutput.textContent = '—';
    isEncryptMode = true;
    if (encryptBtn) {
        encryptBtn.textContent = '🔒 Зашифровать и сохранить';
        encryptBtn.disabled = true;
    }
    showStatus('🔄 Все данные сброшены', 'info');
}

// Обработчики событий
if (keyInput) {
    keyInput.addEventListener('input', function(e) {
        let value = e.target.value;
        value = value.replace(/[^01]/g, '');
        if (value.length > 27) {
            value = value.slice(0, 27);
        }
        keyInput.value = value;
        currentKey = value;
        if (charCount) charCount.textContent = value.length;
        checkEncryptAbility();
    });

    keyInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const filteredText = pastedText.replace(/[^01]/g, '').slice(0, 27);
        keyInput.value = filteredText;
        currentKey = filteredText;
        if (charCount) charCount.textContent = filteredText.length;
        checkEncryptAbility();
    });
}

if (fileButton) {
    fileButton.addEventListener('click', () => {
        if (fileInput) fileInput.click();
    });
}

if (fileInput) {
    fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            if (fileName) {
                fileName.textContent = `${file.name} (${formatFileSize(file.size)})`;
            }
            await readFileInfo(file);
            checkFileMode(file);
            checkEncryptAbility();
            showStatus(`Файл "${file.name}" загружен`, 'success');
        } else {
            if (fileName) fileName.textContent = 'Файл не выбран';
            selectedFile = null;
            checkEncryptAbility();
        }
    });
}

if (encryptBtn) {
    encryptBtn.addEventListener('click', encryptFile);
}

if (resetBtn) {
    resetBtn.addEventListener('click', resetAll);
}

// Проверяем доступность Go бэкенда
if (window.go && window.go.main && window.go.main.App) {
    console.log('✅ Go бэкенд доступен');
} else {
    console.warn('⚠️ Go бэкенд не найден');
    showStatus('Запустите приложение через "wails dev" для работы с бэкендом', 'info');
}

checkEncryptAbility();
console.log('✅ Приложение загружено');