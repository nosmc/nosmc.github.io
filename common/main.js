import { initializePage, translations } from './script.js';

function loadComponents() {
    return fetch('/common/components.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('afterbegin', html);
            console.log('Components loaded');
        })
        .catch(error => console.error('Error loading components:', error));
}

function init() {
    console.log('Init function called');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    console.log('Initial theme set:', savedTheme);

    loadComponents()
        .then(() => {
            console.log('Calling initializePage');
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