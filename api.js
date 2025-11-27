/**
 * API.js — Логика взаимодействия с Google Identity Services
 * Автор: XeroxDeveloper
 */

// =================================================================
// ⚙️ НАСТРОЙКИ
// =================================================================

// 1. Вставь сюда свой Client ID из Google Cloud Console.
// Если оставить поле пустым или как есть, включится РЕЖИМ СИМУЛЯЦИИ.
const GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com"; 

// =================================================================
// 🚀 ЛОГИКА
// =================================================================

let tokenClient;
let loginCallback = null; // Сюда мы сохраним функцию, которую нужно вызвать после успеха

/**
 * Инициализация клиента Google при загрузке страницы
 */
function initGoogleClient() {
    // Проверяем, загрузилась ли библиотека Google
    if (typeof google === 'undefined') {
        console.warn("Google Script not loaded yet.");
        return;
    }

    // Если ID не настроен, пропускаем инициализацию (будет работать симуляция)
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_CLIENT_ID")) {
        console.log("⚠️ Google Client ID не задан. Включен режим СИМУЛЯЦИИ.");
        return;
    }

    try {
        // Настройка официального клиента OAuth 2.0
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: async (response) => {
                if (response.error) {
                    console.error("Google Auth Error:", response);
                    alert("Ошибка авторизации Google");
                    return;
                }

                if (response.access_token) {
                    // Токен получен, теперь загружаем данные профиля
                    await fetchUserProfile(response.access_token);
                }
            },
        });
        console.log("✅ Google Client инициализирован.");
    } catch (e) {
        console.error("Ошибка инициализации Google Client:", e);
    }
}

/**
 * Запуск процесса входа
 * @param {Function} onSuccess - Функция, которая вызовется при успехе (принимает user object)
 * @param {Function} onError - Функция при ошибке
 */
function performLogin(onSuccess, onError) {
    // Сохраняем коллбек, чтобы вызвать его после получения данных
    loginCallback = onSuccess;

    // --- 1. РЕЖИМ СИМУЛЯЦИИ (Если ID нет или библиотека не загрузилась) ---
    if (!tokenClient) {
        console.log("🔄 Запуск симуляции входа...");
        
        // Имитируем задержку сети 1.5 секунды
        setTimeout(() => {
            const mockUser = {
                id: "simulated_id_12345",
                name: "Xerox Developer",
                email: "developer@xerox.com",
                picture: "https://lh3.googleusercontent.com/a/default-user=s96-c", // Стандартная иконка Google
                token: "simulation_token_xyz" // Фейковый токен
            };
            
            if (loginCallback) loginCallback(mockUser);
        }, 1500);
        return;
    }

    // --- 2. РЕАЛЬНЫЙ ВХОД GOOGLE ---
    try {
        // Просим пользователя выбрать аккаунт (если токена нет)
        // prompt: 'consent' заставляет Google показать окно выбора аккаунта снова
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
        if (onError) onError(e);
    }
}

/**
 * Получение данных профиля через Google People API
 */
async function fetchUserProfile(accessToken) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) throw new Error("Failed to fetch user info");

        const data = await response.json();

        // Формируем объект пользователя для возврата в приложение
        const user = {
            id: data.sub,
            name: data.name,
            email: data.email,
            picture: data.picture,
            token: accessToken // Важно: передаем токен, чтобы приложение могло его использовать
        };

        // Вызываем коллбек успеха, который мы передали из script.js
        if (loginCallback) loginCallback(user);

    } catch (error) {
        console.error("Ошибка загрузки профиля:", error);
        alert("Не удалось получить данные профиля.");
    }
}

// Пытаемся инициализировать при загрузке скрипта
window.onload = () => {
    // Небольшая задержка, чтобы убедиться, что скрипт Google (gsi) в head загрузился
    setTimeout(initGoogleClient, 100);
};
