document.addEventListener('DOMContentLoaded', () => {

    // --- НАСТРОЙКА СХЕМ ПРИЛОЖЕНИЙ ---
    // Вместо https:// используем кастомные схемы (Deep Links),
    // которые прописаны в AndroidManifest.xml или Info.plist твоих приложений.
    const APPS = {
        hortor: {
            scheme: "hortor://auth_callback", // Приложение должно слушать эту схему
            name: "Hortor"
        },
        fontra: {
            scheme: "fontra://login_success", // Приложение должно слушать эту схему
            name: "Fontra"
        },
        testing: {
            scheme: "https://github.com/XeroxDeveloper/authguide", // Тест остается ссылкой
            name: "Guide"
        }
    };

    const submitBtn = document.getElementById('submit-btn');
    const radioButtons = document.querySelectorAll('input[name="service"]');
    
    // Инициализация (если api.js подключен)
    if (typeof initGoogleClient === "function") {
        initGoogleClient((userData) => handleAuthSuccess(userData));
    }

    // Разблокировка кнопки
    radioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            if (submitBtn.disabled) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '0';
                setTimeout(() => submitBtn.style.opacity = '1', 50);
            }
        });
    });

    // Клик "Продолжить"
    submitBtn.addEventListener('click', () => {
        const selected = document.querySelector('input[name="service"]:checked');
        if (!selected) return;

        setLoading(true);

        // Вызов входа (из api.js)
        performLogin(
            (user) => handleAuthSuccess(user, selected.value),
            (error) => {
                console.error(error);
                alert("Ошибка авторизации. Попробуйте снова.");
                setLoading(false);
            }
        );
    });

    // --- ЛОГИКА ВОЗВРАТА В ПРИЛОЖЕНИЕ ---
    function handleAuthSuccess(user, appKey) {
        console.log("User authorized:", user);

        const appConfig = APPS[appKey];
        
        // Визуальный успех
        submitBtn.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px">
                <span class="material-symbols-outlined">check_circle</span>
                <span>Возвращаемся в ${appConfig.name}...</span>
            </div>
        `;
        submitBtn.style.backgroundColor = "#2e7d32"; // Green success

        // Формируем данные для передачи
        // Мы кодируем данные в URL параметры
        const userDataString = encodeURIComponent(JSON.stringify(user));
        const token = encodeURIComponent(user.token || "simulation_token"); // Токен из Google

        setTimeout(() => {
            // 1. Попытка вернуть данные через Deep Link (iOS/Android)
            // Ссылка получится такой: hortor://auth_callback?data={...}&token=123
            const deepLink = `${appConfig.scheme}?data=${userDataString}&token=${token}`;
            
            // 2. Попытка вернуть данные через JS Interface (для Android WebView)
            // Если в твоем Android коде есть addJavascriptInterface(..., "Android")
            if (window.Android && window.Android.onLoginSuccess) {
                window.Android.onLoginSuccess(JSON.stringify(user));
                return; // Если сработал мост, дип линк можно не открывать (опционально)
            }

            // 3. Попытка через message handler (для iOS WebKit)
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.login) {
                window.webkit.messageHandlers.login.postMessage(JSON.stringify(user));
                return;
            }

            // Если мостов нет, просто переходим по ссылке (стандартный способ)
            window.location.href = deepLink;

            // Если это просто веб-тест (testing), то через секунду сбросим кнопку
            if (appKey === 'testing') {
                setTimeout(() => {
                    setLoading(false);
                    submitBtn.style.backgroundColor = ""; 
                }, 2000);
            }

        }, 1000);
    }

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.dataset.text = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span>';
            submitBtn.style.pointerEvents = 'none';
        } else {
            submitBtn.innerHTML = submitBtn.dataset.text || 'Продолжить';
            submitBtn.style.pointerEvents = 'auto';
            submitBtn.style.backgroundColor = "";
        }
    }
});

// CSS для спиннера (если нет в style.css)
const style = document.createElement('style');
style.textContent = `.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`;
document.head.appendChild(style);
