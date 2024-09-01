import { initializePage, translations } from './script.js';

document.addEventListener('DOMContentLoaded', () => {
    // Load components
    fetch('components.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('afterbegin', html);
            
            // Initialize the page after components are loaded
            initializePage();
        })
        .catch(error => console.error('Error loading components:', error));
});