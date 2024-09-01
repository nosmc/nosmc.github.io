// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GithubAuthProvider, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded, query, orderByChild, set, get, equalTo } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

console.log("Script started loading");

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

console.log("Firebase initialized");

// Global variables
let currentUser = null;
let username = null;
let messagesRef = null;
const developerUsername = "nos";
let currentLanguage = 'en';
let isSettingUsername = false;
let hasSetUsername = false;
let unreadMessages = 0;
let isChatOpen = false;

// Function to initialize DOM-dependent code
function initializeDOMElements() {
    console.log("Initializing DOM elements");

    // Event delegation for dynamic elements
    document.body.addEventListener('click', function(event) {
        console.log("Click event detected on:", event.target);

        if (event.target.matches('.chat-button')) {
            console.log("Chat button clicked");
            toggleChat();
        } else if (event.target.matches('#login-btn')) {
            console.log("Login button clicked");
            handleLoginButtonClick();
        } else if (event.target.matches('#close-login-modal')) {
            console.log("Close login modal clicked");
            document.getElementById('login-modal').style.display = 'none';
        } else if (event.target.matches('#login-google')) {
            console.log("Google login clicked");
            signInWithProvider(new GoogleAuthProvider());
        } else if (event.target.matches('#login-github')) {
            console.log("GitHub login clicked");
            signInWithProvider(new GithubAuthProvider());
        } else if (event.target.matches('#send-button')) {
            console.log("Send button clicked");
            sendMessage();
        } else if (event.target.matches('#theme-switcher')) {
            console.log("Theme switcher clicked");
            toggleTheme();
        } else if (event.target.matches('#language-switcher')) {
            console.log("Language switcher clicked");
            toggleLanguage();
        } else if (event.target.matches('#setUsernameBtn')) {
            console.log("Set username button clicked");
            handleSetUsername();
        } else if (event.target.matches('#close-username-modal')) {
            console.log("Close username modal clicked");
            document.getElementById('username-modal').style.display = 'none';
            signOut(auth);
        } else if (event.target.closest('.dropdown-content a')) {
            console.log("Generator link clicked");
            handleGeneratorRedirect(event);
        }
    });

    // Non-click event listeners
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', handleMessageInputKeypress);
        console.log("Keypress listener added to message input");
    }

    // Firebase Auth State Change
    auth.onAuthStateChanged(handleAuthStateChange);
    console.log("Auth state change listener added");

    // Initialize the page
    initializePage();
}

// Wait for the DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");
    initializeDOMElements();
});

// Functions
function toggleChat() {
    console.log("toggleChat function called");
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        isChatOpen = !isChatOpen;
        chatContainer.style.display = isChatOpen ? 'flex' : 'none';
        console.log("Chat toggled:", isChatOpen);
        if (isChatOpen) {
            scrollChatToBottom();
            clearUnreadIndicator();
        }
    } else {
        console.log("Chat container not found");
    }
}

function handleLoginButtonClick() {
    console.log("handleLoginButtonClick function called");
    if (currentUser) {
        signOut(auth).then(() => {
            currentUser = null;
            username = null;
            hasSetUsername = false;
            removeMessagesListener();
            console.log("User signed out");
        }).catch(error => {
            console.error("Error signing out:", error);
        });
    } else {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.style.display = 'flex';
            console.log("Login modal displayed");
        } else {
            console.log("Login modal not found");
        }
    }
}

function signInWithProvider(provider) {
    console.log(`signInWithProvider function called with provider: ${provider.providerId}`);
    signInWithPopup(auth, provider).then(result => {
        currentUser = result.user;
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.style.display = 'none';
            console.log("Login modal closed");
        }
        checkUsername();
    }).catch(error => {
        console.error(`Error during ${provider.providerId} login:`, error);
    });
}

function handleAuthStateChange(user) {
    console.log("handleAuthStateChange function called with user:", user);
    if (user) {
        currentUser = user;
        const loginButton = document.getElementById('login-btn');
        if (loginButton) {
            loginButton.innerHTML = `<i class="fas fa-sign-out-alt"></i>`;
            loginButton.setAttribute('aria-label', 'Logout');
            console.log("Login button updated to logout");
        }
        if (!hasSetUsername) {
            checkUsername();
        }
    } else {
        const loginButton = document.getElementById('login-btn');
        if (loginButton) {
            loginButton.innerHTML = `<i class="fas fa-user"></i>`;
            loginButton.setAttribute('aria-label', 'Login');
            console.log("Login button updated to login");
        }
        currentUser = null;
        username = null;
        hasSetUsername = false;
        removeMessagesListener();
    }
}

function checkUsername() {
    console.log("checkUsername function called");
    if (isSettingUsername || hasSetUsername) return;
    
    isSettingUsername = true;
    const userRef = ref(database, `users/${currentUser.uid}`);
    get(userRef).then(snapshot => {
        if (snapshot.exists()) {
            username = snapshot.val().username;
            hasSetUsername = true;
            loadMessages();
            console.log("Username loaded:", username);
        } else {
            showUsernameModal();
        }
    }).catch(error => {
        console.error("Error checking username:", error);
        showUsernameModal();
    }).finally(() => {
        isSettingUsername = false;
    });
}

function showUsernameModal() {
    console.log("showUsernameModal function called");
    const usernameModal = document.getElementById('username-modal');
    if (usernameModal) {
        usernameModal.style.display = 'flex';
        console.log("Username modal displayed");
        const usernameInput = document.getElementById('username-input');
        if (usernameInput) {
            usernameInput.focus();
            console.log("Username input focused");
        }
    }
}

function handleSetUsername() {
    console.log("handleSetUsername function called");
    const usernameInput = document.getElementById('username-input');
    if (usernameInput) {
        const newUsername = usernameInput.value.trim();
        if (newUsername) {
            saveUsername(newUsername);
        } else {
            showUsernameError(translations.usernameEmpty[currentLanguage]);
        }
    }
}

function saveUsername(newUsername) {
    console.log("saveUsername function called with newUsername:", newUsername);
    const usernamesRef = ref(database, 'users');
    const usernameQuery = query(usernamesRef, orderByChild('username'), equalTo(newUsername));

    get(usernameQuery).then(snapshot => {
        if (snapshot.exists()) {
            showUsernameError(translations.usernameExists[currentLanguage]);
            const usernameInput = document.getElementById('username-input');
            if (usernameInput) {
                usernameInput.value = '';
                usernameInput.focus();
                console.log("Username input cleared and focused");
            }
        } else {
            set(ref(database, `users/${currentUser.uid}`), {
                username: newUsername
            }).then(() => {
                username = newUsername;
                hasSetUsername = true;
                const usernameModal = document.getElementById('username-modal');
                if (usernameModal) {
                    usernameModal.style.display = 'none';
                    console.log("Username modal closed");
                }
                loadMessages();
                console.log("Username saved and messages loaded");
            }).catch(error => {
                console.error("Error saving username:", error);
                showUsernameError(translations.errorSavingUsername[currentLanguage]);
            });
        }
    }).catch(error => {
        console.error("Error checking username uniqueness:", error);
        showUsernameError(translations.errorCheckingUsername[currentLanguage]);
    });
}

function showUsernameError(message) {
    console.log("showUsernameError function called with message:", message);
    const errorElement = document.getElementById('username-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        console.log("Username error displayed");
    }
}

function loadMessages() {
    console.log("loadMessages function called");
    if (messagesRef) {
        return;
    }
    messagesRef = query(ref(database, 'messages'), orderByChild('timestamp'));
    
    const loadTimestamp = new Date().getTime();
    
    onChildAdded(messagesRef, (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
        
        if (new Date(message.timestamp).getTime() > loadTimestamp) {
            handleNewMessage(message);
        }
    });
    console.log("Messages loaded");
}

function handleNewMessage(message) {
    console.log("handleNewMessage function called with message:", message);
    if (!isChatOpen) {
        showUnreadIndicator();
    }
    // If the chat is open and the user is at the bottom, scroll to the new message
    if (isChatOpen && isScrolledToBottom()) {
        scrollChatToBottom();
    }
}

function isScrolledToBottom() {
    console.log("isScrolledToBottom function called");
    const messagesList = document.getElementById('chat-messages');
    if (messagesList) {
        return messagesList.scrollHeight - messagesList.clientHeight <= messagesList.scrollTop + 1;
    }
    return false;
}

function removeMessagesListener() {
    console.log("removeMessagesListener function called");
    if (messagesRef) {
        messagesRef = null;
    }
    const messagesList = document.getElementById('chat-messages');
    if (messagesList) {
        messagesList.innerHTML = '';
        console.log("Messages list cleared");
    }
}

function convertToLocalTime(isoTimestamp) {
    console.log("convertToLocalTime function called with isoTimestamp:", isoTimestamp);
    const date = new Date(isoTimestamp);
    return date.toLocaleString();
}

function displayMessage(message) {
    console.log("displayMessage function called with message:", message);
    const messagesList = document.getElementById('chat-messages');
    if (messagesList) {
        const li = document.createElement('li');
        li.className = message.sender === username ? 'sent' : 'received';

        if (message.sender === developerUsername) {
            li.classList.add('developer');
        }

        const messageHeader = document.createElement('div');
        messageHeader.className = 'message-header';

        const img = document.createElement('img');
        img.src = message.avatar || 'default-avatar.png';
        img.alt = message.sender;

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'username';
        usernameSpan.textContent = message.sender;

        messageHeader.appendChild(img);
        messageHeader.appendChild(usernameSpan);

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = message.content;

        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = convertToLocalTime(message.timestamp);

        li.appendChild(messageHeader);
        li.appendChild(messageContent);
        li.appendChild(messageTime);

        messagesList.appendChild(li);
        scrollChatToBottom();
        console.log("Message displayed");
    }
}

function sendMessage() {
    console.log("sendMessage function called");
    const messageInput = document.getElementById('message-input');
    if (username && messageInput && messageInput.value.trim()) {
        const timestamp = new Date().toISOString();

        push(ref(database, 'messages'), {
            sender: username,
            avatar: currentUser?.photoURL || "default-avatar.png",
            content: messageInput.value,
            timestamp: timestamp
        }).then(() => {
            messageInput.value = '';
            messageInput.focus();
            scrollChatToBottom();
            console.log("Message sent");
        }).catch(error => {
            console.error("Error sending message:", error);
        });
    }
}

function handleMessageInputKeypress(e) {
    console.log("handleMessageInputKeypress function called with event:", e);
    if (e.key === 'Enter') {
        sendMessage();
        e.preventDefault();
    }
}

function toggleTheme() {
    console.log("toggleTheme function called");
    const body = document.body;
    if (body) {
        if (body.getAttribute('data-theme') === 'light') {
            body.setAttribute('data-theme', 'dark');
            console.log("Theme switched to dark");
        } else {
            body.setAttribute('data-theme', 'light');
            console.log("Theme switched to light");
        }
        savePreferences();
    }
}

function toggleLanguage() {
    console.log("toggleLanguage function called");
    currentLanguage = currentLanguage === 'en' ? 'zh' : 'en';
    translatePage();
    savePreferences();
}

function savePreferences() {
    console.log("savePreferences function called");
    const body = document.body;
    if (body) {
        localStorage.setItem('theme', body.getAttribute('data-theme'));
        localStorage.setItem('language', currentLanguage);
        console.log("Preferences saved");
    }
}

function loadPreferences() {
    console.log("loadPreferences function called");
    const savedTheme = localStorage.getItem('theme');
    const savedLanguage = localStorage.getItem('language');

    const body = document.body;
    if (body) {
        if (savedTheme) {
            body.setAttribute('data-theme', savedTheme);
            console.log("Theme loaded:", savedTheme);
        }
        if (savedLanguage) {
            currentLanguage = savedLanguage;
            translatePage();
            console.log("Language loaded:", savedLanguage);
        }
    }
}

function translatePage() {
    console.log("translatePage function called");
    Object.keys(translations).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.textContent = translations[key][currentLanguage];
            console.log(`Translated element with id ${key} to ${currentLanguage}`);
        }
    });
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.placeholder = translations.typeAMessage[currentLanguage];
        console.log("Translated message input placeholder");
    }
    const usernameInput = document.getElementById('username-input');
    if (usernameInput) {
        usernameInput.placeholder = translations.enterUsername[currentLanguage];
        console.log("Translated username input placeholder");
    }
}

function handleGeneratorRedirect(e) {
    console.log("handleGeneratorRedirect function called with event:", e);
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
            console.log("linkExists function called with url:", url);
            fetch(url, { method: 'HEAD' })
                .then(response => callback(response.ok))
                .catch(() => callback(false));
        }

        linkExists(targetUrl, function(exists) {
            if (exists) {
                window.location.href = targetUrl;
                console.log("Redirected to:", targetUrl);
            } else {
                window.location.href = 'https://nosmc.github.io/';
                console.log("Redirected to home page");
            }
        });
    }
}

function initializePage() {
    console.log("initializePage function called");
    loadPreferences();
    translatePage();
}

function showUnreadIndicator() {
    console.log("showUnreadIndicator function called");
    unreadMessages++;
    const unreadDot = document.querySelector('.chat-button .unread-dot');
    if (unreadDot) {
        unreadDot.style.display = 'block';
        console.log("Unread indicator displayed");
    }
}

function clearUnreadIndicator() {
    console.log("clearUnreadIndicator function called");
    unreadMessages = 0;
    const unreadDot = document.querySelector('.chat-button .unread-dot');
    if (unreadDot) {
        unreadDot.style.display = 'none';
        console.log("Unread indicator cleared");
    }
}

window.addEventListener('focus', () => {
    console.log("Window focus event detected");
    if (isChatOpen) {
        clearUnreadIndicator();
    }
});

function scrollChatToBottom() {
    console.log("scrollChatToBottom function called");
    const messagesList = document.getElementById('chat-messages');
    if (messagesList) {
        messagesList.scrollTop = messagesList.scrollHeight;
        console.log("Chat scrolled to bottom");
    }
}

const translations = {
    headerTitle: {
        en: "Minecraft Datapack Generator",
        zh: "Minecraft 資料包生成器"
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
    setUsernameTitle: {
        en: "Set Your Username",
        zh: "設置您的用戶名"
    },
    enterUsername: {
        en: "Enter your username",
        zh: "輸入您的用戶名"
    },
    setUsernameBtn: {
        en: "Set Username",
        zh: "設置用戶名"
    },
    cancelSetUsername: {
        en: "Cancel",
        zh: "取消"
    },
    usernameEmpty: {
        en: "Username cannot be empty",
        zh: "用戶名不能為空"
    },
    usernameExists: {
        en: "Username already exists. Please choose another one.",
        zh: "用戶名已存在。請選擇另一個。"
    },
    errorSavingUsername: {
        en: "Error saving username. Please try again.",
        zh: "保存用戶名時出錯。請重試。"
    },
    errorCheckingUsername: {
        en: "Error checking username. Please try again.",
        zh: "檢查用戶名時出錯。請重試。"
    }
};

// Initialize the page
initializePage();

console.log("Script finished loading");