import { currentLanguage, savePreferences, translatePage } from './main.js';

document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcher = document.getElementById('theme-switcher');
    const languageSwitcher = document.getElementById('language-switcher');
    const loginButton = document.getElementById('login-btn');

    if (themeSwitcher) themeSwitcher.addEventListener('click', toggleTheme);
    if (languageSwitcher) languageSwitcher.addEventListener('click', toggleLanguage);
    if (loginButton) loginButton.addEventListener('click', handleLoginButtonClick);

    // Add event listeners for generator redirects
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        link.addEventListener('click', handleGeneratorRedirect);
    });
});

function toggleTheme() {
    const body = document.body;
    if (body.getAttribute('data-theme') === 'light') {
        body.setAttribute('data-theme', 'dark');
    } else {
        body.setAttribute('data-theme', 'light');
    }
    savePreferences();
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'zh' : 'en';
    translatePage();
    savePreferences();
}

function handleLoginButtonClick() {
    // This function will be implemented in the chat system module
    // You might want to dispatch a custom event here that the chat system can listen for
    const event = new CustomEvent('loginButtonClicked');
    document.dispatchEvent(event);
}

function handleGeneratorRedirect(e) {
    e.preventDefault();
    const generator = e.target.closest('[data-generator]').getAttribute('data-generator');
    if (generator) {
        let targetUrl;
        switch (generator) {
            case 'text':
                targetUrl = 'https://nosmc.github.io/generator/text';
                break;
            case 'item':
                targetUrl = 'https://nosmc.github.io/generator/item';
                break;
            case 'entity':
                targetUrl = 'https://nosmc.github.io/generator/entity';
                break;
            default:
                console.error('Unknown generator type:', generator);
                return;
        }

        function linkExists(url, callback) {
            fetch(url, { method: 'HEAD' })
                .then(response => callback(response.ok))
                .catch(() => callback(false));
        }

        linkExists(targetUrl, function(exists) {
            if (exists) {
                window.location.href = targetUrl;
            } else {
                window.location.href = 'https://nosmc.github.io/';
            }
        });
    }
}