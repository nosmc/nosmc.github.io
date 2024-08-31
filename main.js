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
let currentLanguage = 'en';
let hasSetUsername = false;

// Auth Providers
const githubProvider = new GithubAuthProvider();
const googleProvider = new GoogleAuthProvider();

// Initialize the page
window.addEventListener('DOMContentLoaded', initializePage);

// Firebase Auth State Change
auth.onAuthStateChanged(handleAuthStateChange);

// Functions
function initializePage() {
    loadPreferences();
    translatePage();
}

function loadPreferences() {
    const savedTheme = localStorage.getItem('theme');
    const savedLanguage = localStorage.getItem('language');

    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
    }
    if (savedLanguage) {
        currentLanguage = savedLanguage;
        translatePage();
    }
}

function savePreferences() {
    localStorage.setItem('theme', document.body.getAttribute('data-theme'));
    localStorage.setItem('language', currentLanguage);
}

function translatePage() {
    Object.keys(translations).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.textContent = translations[key][currentLanguage];
        }
    });
    // Update placeholders
    const messageInput = document.getElementById('message-input');
    const usernameInput = document.getElementById('username-input');
    if (messageInput) messageInput.placeholder = translations.typeAMessage[currentLanguage];
    if (usernameInput) usernameInput.placeholder = translations.enterUsername[currentLanguage];
}

function handleAuthStateChange(user) {
    if (user) {
        currentUser = user;
        const loginButton = document.getElementById('login-btn');
        if (loginButton) {
            loginButton.innerHTML = `<i class="fas fa-sign-out-alt"></i>`;
            loginButton.setAttribute('aria-label', 'Logout');
        }
        if (!hasSetUsername) {
            checkUsername();
        }
    } else {
        const loginButton = document.getElementById('login-btn');
        if (loginButton) {
            loginButton.innerHTML = `<i class="fas fa-user"></i>`;
            loginButton.setAttribute('aria-label', 'Login');
        }
        currentUser = null;
        username = null;
        hasSetUsername = false;
        removeMessagesListener();
    }
}

function checkUsername() {
    if (hasSetUsername) return;
    
    const userRef = ref(database, `users/${currentUser.uid}`);
    get(userRef).then(snapshot => {
        if (snapshot.exists()) {
            username = snapshot.val().username;
            hasSetUsername = true;
            loadMessages();
        } else {
            showUsernameModal();
        }
    }).catch(error => {
        console.error("Error checking username:", error);
        showUsernameModal();
    });
}

function showUsernameModal() {
    const usernameModal = document.getElementById('username-modal');
    if (usernameModal) {
        usernameModal.style.display = 'flex';
        document.getElementById('username-input').focus();
    }
}

function removeMessagesListener() {
    // This function will be implemented in chat-system.js
    // Dispatch an event that chat-system.js can listen for
    document.dispatchEvent(new CustomEvent('removeMessagesListener'));
}

// Export functions and variables that need to be accessed by other modules
export {
    auth,
    database,
    currentUser,
    username,
    currentLanguage,
    hasSetUsername,
    githubProvider,
    googleProvider,
    initializePage,
    loadPreferences,
    savePreferences,
    translatePage,
    handleAuthStateChange,
    checkUsername,
    showUsernameModal,
    removeMessagesListener
};

// Translations object
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
