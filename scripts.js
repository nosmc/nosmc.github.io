import { translations } from './common/translations.js';

// Replace the existing code for generator card click events with this:
document.querySelectorAll('.generator-card').forEach(card => {
    card.addEventListener('click', () => {
        let targetUrl;
        const generatorTitle = card.querySelector('.generator-title').id;
        
        switch (generatorTitle) {
            case 'textGeneratorTitle':
                targetUrl = 'https://nosmc.github.io/generator/text';
                break;
            case 'itemGeneratorTitle':
                targetUrl = 'https://nosmc.github.io/generator/item';
                break;
            case 'entityGeneratorTitle':
                targetUrl = 'https://nosmc.github.io/generator/entity';
                break;
            default:
                targetUrl = 'https://nosmc.github.io/';
        }

        // Function to check if the link exists
        function linkExists(url, callback) {
            fetch(url, { method: 'HEAD' })
                .then(response => callback(response.ok))
                .catch(() => callback(false));
        }

        // Check if the target URL exists
        linkExists(targetUrl, function(exists) {
            if (exists) {
                window.location.href = targetUrl;
            } else {
                window.location.href = 'https://nosmc.github.io/';
            }
        });
    });
});