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

const translations = {
    heroTitle: {
        en: "Welcome to Minecraft Datapack Generator",
        zh: "歡迎使用 Minecraft 資料包生成器"
    },
    heroDescription: {
        en: "Create custom datapacks for Minecraft with ease. No coding knowledge required!",
        zh: "輕鬆創建自定義 Minecraft 資料包。無需編碼知識！"
    },
    getStartedBtn: {
        en: "Get Started",
        zh: "開始使用"
    },
    feature1Title: {
        en: "Easy to Use",
        zh: "易於使用"
    },
    feature1Description: {
        en: "Intuitive interface for creating datapacks without coding knowledge",
        zh: "直觀的界面，無需編碼知識即可創建資料包"
    },
    feature2Title: {
        en: "Customizable",
        zh: "可定制"
    },
    feature2Description: {
        en: "Tailor your datapacks to fit your specific needs",
        zh: "根據您的具體需求定制資料包"
    },
    feature3Title: {
        en: "Export",
        zh: "導出"
    },
    feature3Description: {
        en: "Download your datapacks and use them in Minecraft",
        zh: "下載您的資料包並在 Minecraft 中使用"
    },
    generatorsTitle: {
        en: "Available Generators",
        zh: "可用生成器"
    },
    textGeneratorTitle: {
        en: "Text Generator",
        zh: "文本生成器"
    },
    itemGeneratorTitle: {
        en: "Item Generator",
        zh: "物品生成器"
    },
    entityGeneratorTitle: {
        en: "Entity Generator",
        zh: "實體生成器"
    }
};