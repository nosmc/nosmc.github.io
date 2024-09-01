import { initializePage, translations } from './script.js';

function loadComponents() {
    return fetch('components.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('afterbegin', html);
        })
        .catch(error => console.error('Error loading components:', error));
}

function init() {
    loadComponents()
        .then(() => {
            initializePage();
        });
}

// Wait for the DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}