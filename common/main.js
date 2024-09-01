import { initializePage, translations } from './script.js';

function loadComponents() {
    return fetch('/common/components.html')  // Use absolute path
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('afterbegin', html);
        })
        .catch(error => console.error('Error loading components:', error));
}

function init() {
    // Load preferences immediately
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    loadComponents()
        .then(() => {
            initializePage();
        })
        .catch(error => console.error('Error initializing page:', error));
}

// Wait for the DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}