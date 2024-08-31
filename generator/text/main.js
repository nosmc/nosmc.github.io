// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GithubAuthProvider, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded, query, orderByChild, set, get, equalTo } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDzku7AoSdbF7GzZTJEtVj5beyl1MnrTAk",
    authDomain: "minecraft-generators.firebaseapp.com",
    databaseURL: "https://minecraft-generators-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "minecraft-generators",
    storageBucket: "minecraft-generators.appspot.com",
    messagingSenderId: "191346462383",
    appId: "1:191346462383:web:6c8759e5ee2f676594ce5a",
    measurementId: "G-QJT1XPTPDZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Global variables
let currentUser = null;
let username = null;
let messagesRef = null;
const developerUsername = "nos";
let currentLanguage = 'en';
let contents = JSON.parse(localStorage.getItem('contents')) || [];
let dragSrcIndex = null;
let scrollInterval = null;

const minecraftColorMap = {
    black: '#000000',
    dark_blue: '#0000AA',
    dark_green: '#00AA00',
    dark_aqua: '#00AAAA',
    dark_red: '#AA0000',
    dark_purple: '#AA00AA',
    gold: '#FFAA00',
    gray: '#AAAAAA',
    dark_gray: '#555555',
    blue: '#5555FF',
    green: '#55FF55',
    aqua: '#55FFFF',
    red: '#FF5555',
    light_purple: '#FF55FF',
    yellow: '#FFFF55',
    white: '#FFFFFF'
};

// DOM elements
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesList = document.getElementById('chat-messages');
const chatContainer = document.getElementById('chat-container');
const chatButton = document.querySelector('.chat-button');
const loginButton = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal');
const closeLoginModal = document.getElementById('close-login-modal');
const googleLoginBtn = document.getElementById('login-google');
const githubLoginBtn = document.getElementById('login-github');
const themeSwitcher = document.getElementById('theme-switcher');
const body = document.body;
const languageSwitcher = document.getElementById('language-switcher');

// Auth Providers
const githubProvider = new GithubAuthProvider();
const googleProvider = new GoogleAuthProvider();

// Event Listeners
chatButton.addEventListener('click', toggleChat);
loginButton.addEventListener('click', handleLoginButtonClick);
closeLoginModal.addEventListener('click', () => loginModal.style.display = 'none');
googleLoginBtn.addEventListener('click', () => signInWithProvider(googleProvider));
githubLoginBtn.addEventListener('click', () => signInWithProvider(githubProvider));
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', handleMessageInputKeypress);
themeSwitcher.addEventListener('click', toggleTheme);
languageSwitcher.addEventListener('click', toggleLanguage);
document.getElementById('add-content-btn').addEventListener('click', () => {
    const contentType = document.getElementById('content-type').value;
    addContent(contentType);
});
document.getElementById('copy-json-btn').addEventListener('click', copyJsonToClipboard);
document.getElementById('clear-all-btn').addEventListener('click', clearAll);
document.getElementById('indentation').addEventListener('change', updateOutputAndPreview);

// Dropdown Menu Redirection
document.querySelectorAll('.dropdown-content a').forEach(link => {
    link.addEventListener('click', handleGeneratorRedirect);
});

// Initialize the page
window.addEventListener('DOMContentLoaded', initializePage);

// Firebase Auth State Change
auth.onAuthStateChanged(handleAuthStateChange);

// Functions
function toggleChat() {
    const isChatOpen = chatContainer.style.display === 'flex';
    chatContainer.style.display = isChatOpen ? 'none' : 'flex';
    if (!isChatOpen) {
        messagesList.scrollTop = messagesList.scrollHeight;
    }
}

function handleLoginButtonClick() {
    if (currentUser) {
        signOut(auth).then(() => {
            currentUser = null;
            username = null;
            removeMessagesListener();
        }).catch(error => {
            console.error("Error signing out:", error);
        });
    } else {
        loginModal.style.display = 'flex';
    }
}

function signInWithProvider(provider) {
    signInWithPopup(auth, provider).then(result => {
        currentUser = result.user;
        loginModal.style.display = 'none';
        checkUsername();
    }).catch(error => {
        console.error(`Error during ${provider.providerId} login:`, error);
    });
}

function handleAuthStateChange(user) {
    if (user) {
        currentUser = user;
        loginButton.innerHTML = `<i class="fas fa-sign-out-alt"></i>`;
        loginButton.setAttribute('aria-label', 'Logout');
        checkUsername();
    } else {
        loginButton.innerHTML = `<i class="fas fa-user"></i>`;
        loginButton.setAttribute('aria-label', 'Login');
        currentUser = null;
    }
}

function checkUsername() {
    const userRef = ref(database, `users/${currentUser.uid}`);
    get(userRef).then(snapshot => {
        if (snapshot.exists()) {
            username = snapshot.val().username;
            loadMessages();
        } else {
            const newUsername = prompt(translations[currentLanguage].enterUsername);
            if (newUsername) {
                saveUsername(newUsername);
            }
        }
    }).catch(error => {
        console.error("Error checking username:", error);
    });
}

function saveUsername(newUsername) {
    const usernamesRef = ref(database, 'users');
    const usernameQuery = query(usernamesRef, orderByChild('username'), equalTo(newUsername));

    get(usernameQuery).then(snapshot => {
        if (snapshot.exists()) {
            alert(translations[currentLanguage].usernameExists);
        } else {
            set(ref(database, `users/${currentUser.uid}`), {
                username: newUsername
            }).then(() => {
                username = newUsername;
                loadMessages();
            }).catch(error => {
                console.error("Error saving username:", error);
            });
        }
    }).catch(error => {
        console.error("Error checking username uniqueness:", error);
    });
}

function loadMessages() {
    if (messagesRef) {
        return;
    }
    messagesRef = query(ref(database, 'messages'), orderByChild('timestamp'));
    onChildAdded(messagesRef, (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
    });
}

function removeMessagesListener() {
    if (messagesRef) {
        messagesRef = null;
    }
}

function convertToLocalTime(isoTimestamp) {
    const date = new Date(isoTimestamp);
    return date.toLocaleString();
}

function displayMessage(message) {
    const li = document.createElement('li');
    li.className = message.sender === username ? 'sent' : 'received';

    if (message.sender === developerUsername) {
        li.classList.add('developer');
    }

    const img = document.createElement('img');
    img.src = message.avatar || 'default-avatar.png';
    img.alt = message.sender;

    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';

    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'username';
    usernameSpan.textContent = message.sender;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = convertToLocalTime(message.timestamp);

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = message.content;

    messageHeader.appendChild(usernameSpan);
    messageHeader.appendChild(timeSpan);

    if (li.className.includes('sent')) {
        messageHeader.appendChild(img);
    } else {
        messageHeader.insertBefore(img, usernameSpan);
    }

    li.appendChild(messageHeader);
    li.appendChild(messageContent);
    messagesList.appendChild(li);

    messagesList.scrollTop = messagesList.scrollHeight;
}

function sendMessage() {
    if (username && messageInput.value.trim()) {
        const timestamp = new Date().toISOString();

        push(ref(database, 'messages'), {
            sender: username,
            avatar: currentUser.photoURL || "default-avatar.png",
            content: messageInput.value,
            timestamp: timestamp
        }).then(() => {
            messageInput.value = '';
            messageInput.focus();
        }).catch(error => {
            console.error("Error sending message:", error);
        });
    }
}

function handleMessageInputKeypress(e) {
    if (e.key === 'Enter') {
        sendMessage();
        e.preventDefault();
    }
}

function toggleTheme() {
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
    updateUI();
    savePreferences();
}

function savePreferences() {
    localStorage.setItem('theme', body.getAttribute('data-theme'));
    localStorage.setItem('language', currentLanguage);
}

function loadPreferences() {
    const savedTheme = localStorage.getItem('theme');
    const savedLanguage = localStorage.getItem('language');

    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
    }
    if (savedLanguage) {
        currentLanguage = savedLanguage;
        translatePage();
    }
}

function translatePage() {
    Object.keys(translations).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.textContent = translations[key][currentLanguage];
        }
    });
    
    // Translate content type options
    document.getElementById('plainTextOption').textContent = translations.plainText[currentLanguage];
    document.getElementById('translatedTextOption').textContent = translations.translatedText[currentLanguage];
    document.getElementById('scoreOption').textContent = translations.score[currentLanguage];
    document.getElementById('selectorOption').textContent = translations.selector[currentLanguage];
    document.getElementById('keybindOption').textContent = translations.keybind[currentLanguage];
    document.getElementById('nbtOption').textContent = translations.nbt[currentLanguage];
    document.getElementById('linebreakOption').textContent = translations.linebreak[currentLanguage];

    // Translate JSON indentation options
    const indentationSelect = document.getElementById('indentation');
    indentationSelect.options[0].text = translations.none[currentLanguage];
    indentationSelect.options[1].text = translations.twoSpaces[currentLanguage];
    indentationSelect.options[2].text = translations.fourSpaces[currentLanguage];

    document.getElementById('message-input').placeholder = translations.typeAMessage[currentLanguage];
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

        // Function to check if the link exists
        function linkExists(url, callback) {
            fetch(url, { method: 'HEAD' })
                .then(response => callback(response.ok))
                .catch(() => callback(false));
        }

        // Check if the target URL exists
        linkExists(targetUrl, function(exists) {
            if (exists) {
                // If the link exists, navigate to the generator page
                window.location.href = targetUrl;
            } else {
                // If the link doesn't exist, redirect to the home page
                window.location.href = 'https://nosmc.github.io/';
            }
        });
    }
}

function initializePage() {
    loadPreferences();
    translatePage();
    updateUI();
}

function createContent(type, data = {}) {
    return {
        type: type,
        data: {
            text: data.text || '',
            translate: data.translate || '',
            with: data.with || [],
            scoreName: data.scoreName || '',
            scoreObjective: data.scoreObjective || '',
            selector: data.selector || '',
            keybind: data.keybind || '',
            nbtPath: data.nbtPath || '',
            nbtSource: data.nbtSource || 'entity',
            storageSource: data.storageSource || '',
            interpret: data.interpret || false,
            color: data.color || 'none',
            bold: data.bold || false,
            italic: data.italic || false,
            underlined: data.underlined || false,
            strikethrough: data.strikethrough || false,
            obfuscated: data.obfuscated || false
        },
        clickEvent: { action: '', value: '' },
        hoverEvent: { action: '', contents: [] }
    };
}

function addContent(type) {
    contents.push(createContent(type));
    updateUI();
    saveContents();
}

function updateUI() {
    const contentList = document.getElementById('content-list');
    contentList.innerHTML = '';

    contents.forEach((content, index) => {
        const div = document.createElement('div');
        div.className = 'content';
        div.setAttribute('role', 'region');
        div.setAttribute('aria-labelledby', `content-label-${index}`);
        div.setAttribute('draggable', true);

        const contentLabel = document.createElement('label');
        contentLabel.className = 'content-label';
        contentLabel.id = `content-label-${index}`;
        const typeTranslation = translations[content.type] ? translations[content.type][currentLanguage] : content.type;
        contentLabel.innerHTML = `<i class="fas fa-cube"></i> ${translations.contentLabel[currentLanguage].replace('{number}', index + 1).replace('{type}', typeTranslation)}`;
        div.appendChild(contentLabel);

        // Add input fields based on content type
        if (content.type === 'plainText') {
            addTextInput(div, content, 'text', translations.enterText[currentLanguage]);
        } else if (content.type === 'translatedText') {
            addTextInput(div, content, 'translate', translations.enterTranslationKey[currentLanguage]);
            addWithInputs(div, content);
        } else if (content.type === 'score') {
            addTextInput(div, content, 'scoreName', translations.enterScoreName[currentLanguage]);
            addTextInput(div, content, 'scoreObjective', translations.enterScoreObjective[currentLanguage]);
        } else if (content.type === 'selector') {
            addTextInput(div, content, 'selector', translations.enterSelector[currentLanguage]);
        } else if (content.type === 'keybind') {
            addTextInput(div, content, 'keybind', translations.enterKeybind[currentLanguage]);
        } else if (content.type === 'nbt') {
            addTextInput(div, content, 'nbtPath', translations.enterNbtPath[currentLanguage]);
            addNbtSourceSelect(div, content);
            addCheckbox(div, content, 'interpret', translations.interpret[currentLanguage]);
        }

        // Add formatting options
        if (content.type !== 'linebreak') {
            addFormattingOptions(div, content);
            addEventOptions(div, content);
        }

        // Add control buttons
        addControlButtons(div, index);

        // Add drag-and-drop event listeners
        addDragAndDropListeners(div, index);

        contentList.appendChild(div);
    });

    updateOutputAndPreview();
}

function addTextInput(parent, content, field, placeholder) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.value = content.data[field];
    input.addEventListener('input', () => {
        content.data[field] = input.value;
        updateOutputAndPreview();
        saveContents();
    });
    parent.appendChild(input);
}

function addWithInputs(parent, content) {
    content.data.with.forEach((withContent, withIndex) => {
        const withDiv = document.createElement('div');
        addTextInput(withDiv, withContent.data, 'text', `${translations.enterText[currentLanguage]} ${withIndex + 1}`);
        const deleteWithButton = createButton(translations.delete[currentLanguage], 'fa-trash', () => {
            content.data.with.splice(withIndex, 1);
            updateUI();
            saveContents();
        });
        withDiv.appendChild(deleteWithButton);
        parent.appendChild(withDiv);
    });

    const addWithButton = createButton(translations.addContent[currentLanguage], 'fa-plus', () => {
        content.data.with.push(createContent('plainText', { text: '' }));
        updateUI();
        saveContents();
    });
    parent.appendChild(addWithButton);
}

function addNbtSourceSelect(parent, content) {
    const select = document.createElement('select');
    ['entity', 'block', 'storage'].forEach(source => {
        const option = document.createElement('option');
        option.value = source;
        option.textContent = translations[source][currentLanguage];
        option.selected = content.data.nbtSource === source;
        select.appendChild(option);
    });
    select.addEventListener('change', () => {
        content.data.nbtSource = select.value;
        updateOutputAndPreview();
        saveContents();
    });
    parent.appendChild(select);

    if (content.data.nbtSource === 'storage') {
        addTextInput(parent, content, 'storageSource', translations.enterNbtPath[currentLanguage]);
    }
}

function addCheckbox(parent, content, field, label) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = content.data && content.data[field] || false;
    checkbox.addEventListener('change', () => {
        if (!content.data) content.data = {};
        content.data[field] = checkbox.checked;
        updateOutputAndPreview();
        saveContents();
    });
    const labelElement = document.createElement('label');
    labelElement.appendChild(checkbox);
    labelElement.appendChild(document.createTextNode(label));
    parent.appendChild(labelElement);
}

function addFormattingOptions(parent, content) {
    const formattingDiv = document.createElement('div');
    formattingDiv.className = 'formatting-options';

    // Color selection
    const colorSelect = document.createElement('select');
    
    // Add "none" option
    const noneOption = document.createElement('option');
    noneOption.value = 'none';
    noneOption.textContent = translations.none[currentLanguage];
    noneOption.selected = !content.data.color || content.data.color === 'none';
    colorSelect.appendChild(noneOption);

    Object.keys(minecraftColorMap).forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = translations[color][currentLanguage];
        option.selected = content.data && content.data.color === color;
        colorSelect.appendChild(option);
    });
    colorSelect.addEventListener('change', () => {
        if (!content.data) content.data = {};
        content.data.color = colorSelect.value;
        updateOutputAndPreview();
        saveContents();
    });
    formattingDiv.appendChild(colorSelect);

    // Text properties
    ['bold', 'italic', 'underlined', 'strikethrough', 'obfuscated'].forEach(prop => {
        addCheckbox(formattingDiv, content, prop, translations[prop][currentLanguage]);
    });

    parent.appendChild(formattingDiv);
}

function addEventOptions(parent, content) {
    // Click event options
    const clickEventDiv = document.createElement('div');
    clickEventDiv.className = 'event-options';
    const clickEventLabel = document.createElement('label');
    clickEventLabel.textContent = translations.clickEvent[currentLanguage];
    clickEventDiv.appendChild(clickEventLabel);

    const clickEventSelect = document.createElement('select');
    ['', 'open_url', 'open_file', 'run_command', 'suggest_command', 'change_page', 'copy_to_clipboard'].forEach(action => {
        const option = document.createElement('option');
        option.value = action;
        option.textContent = translations[action || 'noClickEvent'][currentLanguage];
        option.selected = content.clickEvent.action === action;
        clickEventSelect.appendChild(option);
    });
    clickEventSelect.addEventListener('change', () => {
        content.clickEvent.action = clickEventSelect.value;
        updateClickAndHoverEventInputs(clickEventValueInput, clickEventSelect.value);
        updateOutputAndPreview();
        saveContents();
    });
    clickEventDiv.appendChild(clickEventSelect);

    const clickEventValueInput = document.createElement('input');
    clickEventValueInput.type = 'text';
    clickEventValueInput.placeholder = translations.enterText[currentLanguage];
    clickEventValueInput.value = content.clickEvent.value;
    clickEventValueInput.style.display = content.clickEvent.action ? 'inline' : 'none';
    clickEventValueInput.addEventListener('input', () => {
        content.clickEvent.value = clickEventValueInput.value;
        updateOutputAndPreview();
        saveContents();
    });
    clickEventDiv.appendChild(clickEventValueInput);
    parent.appendChild(clickEventDiv);

    // Hover event options
    const hoverEventDiv = document.createElement('div');
    hoverEventDiv.className = 'event-options';
    const hoverEventLabel = document.createElement('label');
    hoverEventLabel.textContent = translations.hoverEvent[currentLanguage];
    hoverEventDiv.appendChild(hoverEventLabel);

    const hoverEventSelect = document.createElement('select');
    ['', 'show_text', 'show_item', 'show_entity'].forEach(action => {
        const option = document.createElement('option');
        option.value = action;
        option.textContent = translations[action || 'noHoverEvent'][currentLanguage];
        option.selected = content.hoverEvent.action === action;
        hoverEventSelect.appendChild(option);
    });
    hoverEventSelect.addEventListener('change', () => {
        content.hoverEvent.action = hoverEventSelect.value;
        updateClickAndHoverEventInputs(hoverEventContentsInput, hoverEventSelect.value);
        updateOutputAndPreview();
        saveContents();
    });
    hoverEventDiv.appendChild(hoverEventSelect);

    const hoverEventContentsInput = document.createElement('input');
    hoverEventContentsInput.type = 'text';
    hoverEventContentsInput.placeholder = translations.enterText[currentLanguage];
    hoverEventContentsInput.value = content.hoverEvent.contents.map(content => content.text).join(', ');
    hoverEventContentsInput.style.display = content.hoverEvent.action ? 'inline' : 'none';
    hoverEventContentsInput.addEventListener('input', () => {
        content.hoverEvent.contents = hoverEventContentsInput.value.split(',').map(item => ({ text: item.trim() }));
        updateOutputAndPreview();
        saveContents();
    });
    hoverEventDiv.appendChild(hoverEventContentsInput);
    parent.appendChild(hoverEventDiv);
}

function addControlButtons(parent, index) {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'content-controls';

    const moveUpBtn = createButton(translations.moveUp[currentLanguage], 'fa-arrow-up', () => moveContent(index, -1));
    const moveDownBtn = createButton(translations.moveDown[currentLanguage], 'fa-arrow-down', () => moveContent(index, 1));
    const duplicateBtn = createButton(translations.duplicate[currentLanguage], 'fa-clone', () => duplicateContent(index));
    const deleteBtn = createButton(translations.delete[currentLanguage], 'fa-trash', () => deleteContent(index));

    controlsDiv.appendChild(moveUpBtn);
    controlsDiv.appendChild(moveDownBtn);
    controlsDiv.appendChild(duplicateBtn);
    controlsDiv.appendChild(deleteBtn);

    parent.appendChild(controlsDiv);
}

function createButton(text, iconClass, onClick) {
    const button = document.createElement('button');
    button.className = 'button button-accent';
    button.innerHTML = `<i class="fas ${iconClass}"></i> ${text}`;
    button.addEventListener('click', onClick);
    return button;
}

function addDragAndDropListeners(div, index) {
    div.addEventListener('dragstart', () => {
        dragSrcIndex = index;
        div.classList.add('dragging');
        startAutoScroll();
    });

    div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
        stopAutoScroll();
        updateUI();
    });

    div.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingElement = document.querySelector('.dragging');
        const contentList = document.getElementById('content-list');
        const afterElement = getDragAfterElement(contentList, e.clientY);
        if (afterElement == null) {
            contentList.appendChild(draggingElement);
        } else {
            contentList.insertBefore(draggingElement, afterElement);
        }
    });

    div.addEventListener('drop', () => {
        const draggedContent = contents.splice(dragSrcIndex, 1)[0];
        const dropIndex = Array.from(document.getElementById('content-list').children).indexOf(div);
        contents.splice(dropIndex, 0, draggedContent);
        updateUI();
        saveContents();
    });
}

function startAutoScroll() {
    scrollInterval = setInterval(() => {
        const container = document.querySelector('.left-panel');
        const headerRect = document.querySelector('header').getBoundingClientRect();
        const footerRect = document.querySelector('footer').getBoundingClientRect();
        const draggingElement = document.querySelector('.dragging');
        if (draggingElement) {
            const draggingRect = draggingElement.getBoundingClientRect();
            const scrollSpeed = 15;

            if (draggingRect.top < headerRect.bottom) {
                container.scrollTop -= scrollSpeed;
            } else if (draggingRect.bottom > footerRect.top) {
                container.scrollTop += scrollSpeed;
            }
        }
    }, 50);
}

function stopAutoScroll() {
    clearInterval(scrollInterval);
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.content:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateClickAndHoverEventInputs(inputElement, action) {
    inputElement.style.display = action && action !== translations.noClickEvent[currentLanguage] && action !== translations.noHoverEvent[currentLanguage] ? 'inline' : 'none';
}

function moveContent(index, direction) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < contents.length) {
        const temp = contents[index];
        contents[index] = contents[newIndex];
        contents[newIndex] = temp;
        updateUI();
        saveContents();
    }
}

function duplicateContent(index) {
    const newContent = JSON.parse(JSON.stringify(contents[index]));
    contents.splice(index + 1, 0, newContent);
    updateUI();
    saveContents();
}

function deleteContent(index) {
    contents.splice(index, 1);
    updateUI();
    saveContents();
}

function updateOutputAndPreview() {
    const output = contents.map(content => {
        let jsonContent = {};

        if (content.type === 'plainText') {
            jsonContent.text = content.data.text;
        } else if (content.type === 'translatedText') {
            jsonContent.translate = content.data.translate;
            if (content.data.with && content.data.with.length > 0) {
                jsonContent.with = content.data.with.map(withContent => ({ text: withContent.data.text }));
            }
        } else if (content.type === 'score') {
            jsonContent.score = {
                name: content.data.scoreName,
                objective: content.data.scoreObjective,
            };
        } else if (content.type === 'selector') {
            jsonContent.selector = content.data.selector;
        } else if (content.type === 'keybind') {
            jsonContent.keybind = content.data.keybind;
        } else if (content.type === 'nbt') {
            jsonContent.nbt = content.data.nbtPath;
            jsonContent[content.data.nbtSource] = content.data.storageSource || undefined;
            jsonContent.interpret = content.data.interpret;
        } else if (content.type === 'linebreak') {
            return "\n";
        }

        if (content.data.color !== 'none') {
            jsonContent.color = content.data.color;
        }
        if (content.data.bold) jsonContent.bold = content.data.bold;
        if (content.data.italic) jsonContent.italic = content.data.italic;
        if (content.data.underlined) jsonContent.underlined = content.data.underlined;
        if (content.data.strikethrough) jsonContent.strikethrough = content.data.strikethrough;
        if (content.data.obfuscated) jsonContent.obfuscated = content.data.obfuscated;

        if (content.clickEvent && content.clickEvent.action) {
            jsonContent.clickEvent = {
                action: content.clickEvent.action,
                value: content.clickEvent.value
            };
        }

        if (content.hoverEvent && content.hoverEvent.action) {
            jsonContent.hoverEvent = {
                action: content.hoverEvent.action,
                contents: content.hoverEvent.contents
            };
        }

        return jsonContent;
    });

    const indentation = document.getElementById('indentation').value;
    const jsonOutput = JSON.stringify(output, null, indentation === 'none' ? 0 : parseInt(indentation));
    document.getElementById('json-area').value = jsonOutput;

    updatePreview(output);
}

function updatePreview(output) {
    const previewDiv = document.getElementById('preview-content');
    previewDiv.innerHTML = ''; // Clear the previous content

    output.forEach(content => {
        if (content === '\n') {
            previewDiv.appendChild(document.createElement('br'));
            return;
        }

        const span = document.createElement('span');

        if (content.color && content.color !== 'none') {
            span.style.color = minecraftColorMap[content.color];
        }
        if (content.bold) span.style.fontWeight = 'bold';
        if (content.italic) span.style.fontStyle = 'italic';
        if (content.underlined) span.style.textDecoration = 'underline';
        if (content.strikethrough) span.style.textDecoration = (span.style.textDecoration ? span.style.textDecoration + ' ' : '') + 'line-through';
        if (content.obfuscated) span.style.filter = 'blur(2px)';

        let textContent = '';
        if (content.text) {
            textContent = content.text;
        } else if (content.translate) {
            textContent = content.translate;
        } else if (content.score) {
            textContent = `${content.score.name}:${content.score.objective}`;
        } else if (content.selector) {
            textContent = content.selector;
        } else if (content.keybind) {
            textContent = content.keybind;
        } else if (content.nbt) {
            textContent = content.nbt;
        }

        span.textContent = textContent;

        // Handle click events
        if (content.clickEvent) {
            span.className = 'click-event';
            span.style.cursor = 'pointer';
            span.addEventListener('click', () => {
                if (content.clickEvent.action === 'run_command') {
                    alert(`Running command: ${content.clickEvent.value}`);
                } else if (content.clickEvent.action === 'open_url') {
                    window.open(content.clickEvent.value, '_blank');
                } else if (content.clickEvent.action === 'suggest_command') {
                    alert(`Suggested command: ${content.clickEvent.value}`);
                } else if (content.clickEvent.action === 'change_page') {
                    alert(`Changing to page: ${content.clickEvent.value}`);
                } else if (content.clickEvent.action === 'copy_to_clipboard') {
                    navigator.clipboard.writeText(content.clickEvent.value).then(() => {
                        alert('Copied to clipboard!');
                    });
                }
            });
        }

        // Handle hover events
        if (content.hoverEvent && content.hoverEvent.action === 'show_text') {
            span.className = 'hover-event';
            span.title = content.hoverEvent.contents.map(content => content.text).join('');
        }

        previewDiv.appendChild(span);
        previewDiv.appendChild(document.createTextNode(' ')); // Add space between contents
    });
}

function copyJsonToClipboard() {
    const jsonArea = document.getElementById('json-area');
    jsonArea.select();
    document.execCommand('copy');
}

function clearAll() {
    contents = [];
    updateUI();
    document.getElementById('json-area').value = '';
    document.getElementById('preview-content').innerHTML = '';
    localStorage.removeItem('contents');
}

function saveContents() {
    localStorage.setItem('contents', JSON.stringify(contents));
}

// JSON input event listener
document.getElementById('json-area').addEventListener('input', debounce(() => {
    const jsonArea = document.getElementById('json-area').value;
    try {
        const parsedContents = JSON.parse(jsonArea);
        contents = parsedContents.map(parseJsonContent).filter(Boolean);
        updateUI();
        saveContents();
    } catch (e) {
        console.error("Invalid JSON input", e);
    }
}, 300));

function parseJsonContent(content) {
    if (typeof content === 'string' && content === '\n') {
        return createContent('linebreak');
    }

    let type, data = {};

    if (content.text !== undefined) {
        type = 'plainText';
        data.text = content.text;
    } else if (content.translate !== undefined) {
        type = 'translatedText';
        data.translate = content.translate;
        if (content.with) {
            data.with = content.with.map(withContent => ({ text: withContent.text }));
        }
    } else if (content.score !== undefined) {
        type = 'score';
        data.scoreName = content.score.name;
        data.scoreObjective = content.score.objective;
    } else if (content.selector !== undefined) {
        type = 'selector';
        data.selector = content.selector;
    } else if (content.keybind !== undefined) {
        type = 'keybind';
        data.keybind = content.keybind;
    } else if (content.nbt !== undefined) {
        type = 'nbt';
        data.nbtPath = content.nbt;
        data.nbtSource = content.storage ? 'storage' : content.block ? 'block' : 'entity';
        data.storageSource = content.storage || '';
        data.interpret = content.interpret || false;
    } else {
        return null; // Invalid content type
    }

    const newContent = createContent(type, data);

    newContent.data.color = content.color || 'none';
    newContent.data.bold = content.bold || false;
    newContent.data.italic = content.italic || false;
    newContent.data.underlined = content.underlined || false;
    newContent.data.strikethrough = content.strikethrough || false;
    newContent.data.obfuscated = content.obfuscated || false;

    if (content.clickEvent) {
        newContent.clickEvent = { action: content.clickEvent.action, value: content.clickEvent.value };
    }

    if (content.hoverEvent) {
        newContent.hoverEvent = {
            action: content.hoverEvent.action,
            contents: content.hoverEvent.contents || []
        };
    }

    return newContent;
}

function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Translations
const translations = {
    headerTitle: {
        en: "Text Component Generator",
        zh: "文本組件生成器"
    },
    home: {
        en: "Home",
        zh: "主頁"
    },
    generators: {
        en: "Generators",
        zh: "生成器"
    },
    generatorText: {
        en: "Text",
        zh: "文字"
    },
    generatorItem: {
        en: "Item",
        zh: "物品"
    },
    generatorEntity: {
        en: "Entity",
        zh: "實體"
    },
    contentList: {
        en: "Content List",
        zh: "內容列表"
    },
    addContent: {
        en: "Add Content",
        zh: "添加內容"
    },
    jsonEditor: {
        en: "JSON Editor",
        zh: "JSON 編輯器"
    },
    preview: {
        en: "Preview",
        zh: "預覽"
    },
    copyJson: {
        en: "Copy JSON",
        zh: "複製 JSON"
    },
    clearAll: {
        en: "Clear All",
        zh: "清除所有"
    },
    contentType: {
        en: "Content Type:",
        zh: "內容類型："
    },
    jsonIndentation: {
        en: "JSON Indentation:",
        zh: "JSON 縮進："
    },
    none: {
        en: "None",
        zh: "無"
    },
    twoSpaces: {
        en: "2 Spaces",
        zh: "2 個空格"
    },
    fourSpaces: {
        en: "4 Spaces",
        zh: "4 個空格"
    },
    plainText: {
        en: "Plain Text",
        zh: "純文本"
    },
    translatedText: {
        en: "Translated Text",
        zh: "翻譯文本"
    },
    score: {
        en: "Score",
        zh: "分數"
    },
    selector: {
        en: "Selector",
        zh: "選擇器"
    },
    keybind: {
        en: "Keybind",
        zh: "按鍵綁定"
    },
    nbt: {
        en: "NBT",
        zh: "NBT"
    },
    linebreak: {
        en: "Line Break",
        zh: "換行"
    },
    enterText: {
        en: "Enter text",
        zh: "輸入文本"
    },
    enterTranslationKey: {
        en: "Enter translation key",
        zh: "輸入翻譯鍵"
    },
    enterScoreName: {
        en: "Enter score name",
        zh: "輸入分數名稱"
    },
    enterScoreObjective: {
        en: "Enter score objective",
        zh: "輸入分數目標"
    },
    enterSelector: {
        en: "Enter selector",
        zh: "輸入選擇器"
    },
    enterKeybind: {
        en: "Enter keybind",
        zh: "輸入按鍵綁定"
    },
    enterNbtPath: {
        en: "Enter NBT path",
        zh: "輸入 NBT 路徑"
    },
    entity: {
        en: "Entity",
        zh: "實體"
    },
    block: {
        en: "Block",
        zh: "方塊"
    },
    storage: {
        en: "Storage",
        zh: "存儲"
    },
    interpret: {
        en: "Interpret",
        zh: "解釋"
    },
    noClickEvent: {
        en: "No Click Event",
        zh: "無點擊事件"
    },
    open_url: {
        en: "Open URL",
        zh: "打開 URL"
    },
    open_file: {
        en: "Open File",
        zh: "打開文件"
    },
    run_command: {
        en: "Run Command",
        zh: "運行命令"
    },
    suggest_command: {
        en: "Suggest Command",
        zh: "建議命令"
    },
    change_page: {
        en: "Change Page",
        zh: "更改頁面"
    },
    copy_to_clipboard: {
        en: "Copy to Clipboard",
        zh: "複製到剪貼板"
    },
    noHoverEvent: {
        en: "No Hover Event",
        zh: "無懸停事件"
    },
    show_text: {
        en: "Show Text",
        zh: "顯示文本"
    },
    show_item: {
        en: "Show Item",
        zh: "顯示物品"
    },
    show_entity: {
        en: "Show Entity",
        zh: "顯示實體"
    },
    bold: {
        en: "Bold",
        zh: "粗體"
    },
    italic: {
        en: "Italic",
        zh: "斜體"
    },
    underlined: {
        en: "Underlined",
        zh: "下劃線"
    },
    strikethrough: {
        en: "Strikethrough",
        zh: "刪除線"
    },
    obfuscated: {
        en: "Obfuscated",
        zh: "模糊"
    },
    clickEvent: {
        en: "Click Event:",
        zh: "點擊事件："
    },
    hoverEvent: {
        en: "Hover Event:",
        zh: "懸停事件："
    },
    moveUp: {
        en: "Move Up",
        zh: "上移"
    },
    moveDown: {
        en: "Move Down",
        zh: "下移"
    },
    duplicate: {
        en: "Duplicate",
        zh: "複製"
    },
    delete: {
        en: "Delete",
        zh: "刪除"
    },
    contentLabel: {
        en: "Content {number} ({type})",
        zh: "內容 {number} ({type})"
    },
    black: {
        en: "Black",
        zh: "黑色"
    },
    dark_blue: {
        en: "Dark Blue",
        zh: "深藍色"
    },
    dark_green: {
        en: "Dark Green",
        zh: "深綠色"
    },
    dark_aqua: {
        en: "Dark Aqua",
        zh: "深青色"
    },
    dark_red: {
        en: "Dark Red",
        zh: "深紅色"
    },
    dark_purple: {
        en: "Dark Purple",
        zh: "深紫色"
    },
    gold: {
        en: "Gold",
        zh: "金色"
    },
    gray: {
        en: "Gray",
        zh: "灰色"
    },
    dark_gray: {
        en: "Dark Gray",
        zh: "深灰色"
    },
    blue: {
        en: "Blue",
        zh: "藍色"
    },
    green: {
        en: "Green",
        zh: "綠色"
    },
    aqua: {
        en: "Aqua",
        zh: "青色"
    },
    red: {
        en: "Red",
        zh: "紅色"
    },
    light_purple: {
        en: "Light Purple",
        zh: "淺紫色"
    },
    yellow: {
        en: "Yellow",
        zh: "黃色"
    },
    white: {
        en: "White",
        zh: "白色"
    },
    chatTitle: {
        en: "Chat",
        zh: "聊天"
    },
    sendButtonText: {
        en: "Send",
        zh: "發送"
    },
    typeAMessage: {
        en: "Type a message...",
        zh: "輸入消息..."
    },
    chooseLoginMethod: {
        en: "Choose a Login Method",
        zh: "選擇登錄方式"
    },
    youtube: {
        en: "YouTube",
        zh: "YouTube"
    },
    instagram: {
        en: "Instagram",
        zh: "Instagram"
    },
    discord: {
        en: "Discord",
        zh: "Discord"
    },
    developedBy: {
        en: "Developed by nos",
        zh: "由 nos 開發"
    },
    donate: {
        en: "Donate",
        zh: "捐贈"
    },
    enterUsername: {
        en: "Please set your username:",
        zh: "請設置您的用戶名："
    },
    usernameExists: {
        en: "Username already exists. Please choose another one.",
        zh: "用戶名已存在。請選擇另一個。"
    },
    loginWithGoogle: {
        en: "Login with Google",
        zh: "使用 Google 登錄"
    },
    loginWithGithub: {
        en: "Login with GitHub",
        zh: "使用 GitHub 登錄"
    },
    cancelLogin: {
        en: "Cancel",
        zh: "取消"
    }
};

// Initialize the page
initializePage();