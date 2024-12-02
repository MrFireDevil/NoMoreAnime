let currentPage = 0;
const itemsPerPage = 25;

function saveData(data) {
    chrome.storage.sync.set(data, function () {
        if (chrome.runtime.lastError) {
            if (chrome.runtime.lastError.message.includes('QUOTA_BYTES_PER_ITEM')) {
                showSyncLimitExceededMessage(data);
            }
        } else {
            console.log('Data has been synchronized');
        }
    });
}

function showSyncLimitExceededMessage(data) {
    const message = 'Saving via the sync memory exceeds the limit. Do you want to save the data locally?';
    if (confirm(message)) {
        saveDataLocally(data);
    }
}

function saveDataLocally(data) {
    chrome.storage.local.set(data, function () {
        console.log('Data was saved in local storage.');
    });
}

function calculateStorageUsage() {
    chrome.storage.sync.get(null, (items) => {
        const totalSize = Object.keys(items).reduce((size, key) => {
            const item = JSON.stringify(items[key]);
            return size + item.length;
        }, 0);
        const storageUsageInKB = (totalSize / 1024).toFixed(2);
        document.getElementById('storage-usage').textContent = `Current usage: ${storageUsageInKB} KB`;
    });
}

function createAnimeElement(animeName, hiddenAnimeList, updateCallback) {
    const animeDiv = document.createElement('div');
    animeDiv.className = 'anime';

    const animeNameSpan = document.createElement('span');
    animeNameSpan.textContent = animeName;
    animeNameSpan.className = 'anime-name';
    animeNameSpan.title = animeName;
    animeDiv.appendChild(animeNameSpan);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.title = "Delete";
    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-trash-alt');
    deleteButton.appendChild(icon);

    deleteButton.addEventListener('click', () => {
        chrome.storage.sync.remove(animeName, () => {
            const updatedAnimes = hiddenAnimeList.filter(anime => anime !== animeName);
            updateCallback(updatedAnimes);
        });
    });

    animeDiv.appendChild(deleteButton);
    return animeDiv;
}

function updatePagination(hiddenAnimeList) {
    const pageIndicator = document.getElementById('page-indicator');
    const totalPages = Math.ceil(hiddenAnimeList.length / itemsPerPage);
    pageIndicator.innerHTML = `Page ${currentPage + 1} / ${totalPages}`;
}

function updateList(hiddenAnimeList) {
    const hiddenAnimeListList = document.getElementById('hidden-anime-list');
    hiddenAnimeListList.innerHTML = '';

    const animesForPage = hiddenAnimeList.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
    animesForPage.forEach((animeName) => {
        const animeDiv = createAnimeElement(animeName, hiddenAnimeList, updateList);
        hiddenAnimeListList.appendChild(animeDiv);
    });

    updatePagination(hiddenAnimeList);

    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    prevPageButton.disabled = currentPage === 0;
    prevPageButton.title = "Previous page";
    nextPageButton.disabled = (currentPage + 1) * itemsPerPage >= hiddenAnimeList.length;
    nextPageButton.title = "Next page";

    const title = document.getElementById('title');
    title.textContent = `Unwanted animes (${hiddenAnimeList.length})`;
}

document.getElementById('reset').addEventListener('click', () => {
    const userConfirmed = confirm("Are you sure you want to delete all saved data?");
    if (userConfirmed) {
        chrome.storage.sync.clear(() => {
            alert("Cache successfully reset!");
            chrome.storage.sync.get(null, (items) => {
                let hiddenAnimeList = Object.keys(items).filter((key) => items[key]);
                updateList(hiddenAnimeList);
                calculateStorageUsage();
                reloadPageIfNecessary();
            });
        });
    }
});

chrome.storage.sync.get(null, (items) => {
    let hiddenAnimeList = Object.keys(items).filter((key) => items[key]);

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (event) => {
        const searchQuery = event.target.value.toLowerCase();
        hiddenAnimeList = Object.keys(items)
            .filter((key) => items[key] && key.toLowerCase().includes(searchQuery))
            .sort((a, b) => Math.abs(a.length - searchQuery.length) - Math.abs(b.length - searchQuery.length));
        currentPage = 0;
        updateList(hiddenAnimeList);
    });

    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');

    prevPageButton.addEventListener('click', () => {
        currentPage--;
        updateList(hiddenAnimeList);
    });

    nextPageButton.addEventListener('click', () => {
        currentPage++;
        updateList(hiddenAnimeList);
    });

    updateList(hiddenAnimeList);
});

function reloadPageIfNecessary() {
    const currentUrl = window.location.href;
    if (currentUrl.includes("crunchyroll.com")) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.reload(tabs[0].id);
        });
    } else {
        console.log("No Crunchyroll page, therefore no reload.");
    }
}

document.getElementById('export').addEventListener('click', () => {
    exportAsFile();
});

function exportAsFile() {
    chrome.storage.sync.get(null, (items) => {
        const hiddenAnimeList = Object.keys(items).filter((key) => items[key]);
        const exportData = JSON.stringify(hiddenAnimeList);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "_");
        const filename = `hidden_anime_${timestamp}.json`;
        const blob = new Blob([exportData], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
}

document.getElementById('import').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

document.getElementById('file-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        const hiddenAnimeList = JSON.parse(event.target.result);
        const items = {};
        for (const anime of hiddenAnimeList) {
            items[anime] = true;
        }
        saveData(items);
        reloadPageIfNecessary();
        window.location.reload();
    };
    reader.readAsText(file);
});

const themeSwitch = document.querySelector('#checkbox');
themeSwitch.checked = localStorage.getItem('darkMode') === 'true';

if (themeSwitch.checked) {
    document.body.classList.add('dark-mode');
}

themeSwitch.addEventListener('change', (e) => {
    document.body.classList.toggle('dark-mode', e.target.checked);
    localStorage.setItem('darkMode', e.target.checked);
});