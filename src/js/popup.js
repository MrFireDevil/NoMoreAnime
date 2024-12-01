let currentPage = 0;
const itemsPerPage = 25;

// Funktion zum Speichern von Daten mit Sync-Speicher
function saveData(data) {
    chrome.storage.sync.set(data, function() {
        if (chrome.runtime.lastError) {
            // Wenn das Limit erreicht wurde, zeige eine Option an
            if (chrome.runtime.lastError.message.includes('QUOTA_BYTES_PER_ITEM')) {
                showSyncLimitExceededMessage(data);
            }
        } else {
            console.log('Daten wurden mit Sync gespeichert.');
        }
    });
}

// Zeige eine Benachrichtigung an, dass das Limit überschritten wurde
function showSyncLimitExceededMessage(data) {
    const message = 'Das Speichern über den Sync-Speicher überschreitet das Limit. Möchtest du die Daten lokal speichern?';
    if (confirm(message)) {
        saveDataLocally(data);
    }
}

// Funktion zum Speichern von Daten im Local-Speicher
function saveDataLocally(data) {
    chrome.storage.local.set(data, function() {
        console.log('Daten wurden im Local Storage gespeichert.');
    });
}

// Berechne den Speicherverbrauch
function calculateStorageUsage() {
    chrome.storage.sync.get(null, (items) => {
        const totalSize = Object.keys(items).reduce((size, key) => {
            const item = JSON.stringify(items[key]); // Umwandeln in JSON-String
            return size + item.length;
        }, 0);
        const storageUsageInKB = (totalSize / 1024).toFixed(2); // Umrechnen in KB
        document.getElementById('storage-usage').textContent = `Speicherverbrauch: ${storageUsageInKB} KB`;
    });
}

// Aktualisiere die Liste
function updateList(hiddenAnimes, items) {
    const hiddenAnimesList = document.getElementById('hidden-animes-list');
    const pageIndicator = document.getElementById('page-indicator');
    hiddenAnimesList.innerHTML = '';

    const animesForPage = hiddenAnimes.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
    pageIndicator.innerHTML = '';
    const totalPages = Math.ceil(hiddenAnimes.length / itemsPerPage);
    const pageText = document.createElement('span');
    pageText.textContent = `Seite ${currentPage + 1} / ${totalPages}`;
    pageIndicator.appendChild(pageText);

    animesForPage.forEach((animeName) => {
        const animeDiv = document.createElement('div');
        animeDiv.className = 'anime';

        const animeNameSpan = document.createElement('span');
        animeNameSpan.textContent = animeName;
        animeNameSpan.className = 'anime-name';
        animeDiv.appendChild(animeNameSpan);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-trash-alt');
        deleteButton.appendChild(icon);

        deleteButton.addEventListener('click', () => {
            chrome.storage.sync.remove(animeName, () => {
                animeDiv.remove();
                hiddenAnimes = hiddenAnimes.filter(anime => anime !== animeName);
                updateList(hiddenAnimes, items);
            });
        });

        animeDiv.appendChild(deleteButton);
        hiddenAnimesList.appendChild(animeDiv);
    });

    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');

    prevPageButton.disabled = currentPage === 0;
    nextPageButton.disabled = (currentPage + 1) * itemsPerPage >= hiddenAnimes.length;

    const title = document.getElementById('title');
    title.textContent = `Unwanted animes (${hiddenAnimes.length})`;
}

document.getElementById('reset').addEventListener('click', () => {
    const userConfirmed = confirm("Bist du sicher, dass du alle gespeicherten Daten löschen möchtest?");
    if (userConfirmed) {
        chrome.storage.sync.clear(() => {
            alert("Cache erfolgreich zurückgesetzt!");
            chrome.storage.sync.get(null, (items) => {
                let hiddenAnimes = Object.keys(items).filter((key) => items[key]);
                updateList(hiddenAnimes, items);
                calculateStorageUsage();
                reloadPageIfNecessary();
            });
        });
    }
});

chrome.storage.sync.get(null, (items) => {
    let hiddenAnimes = Object.keys(items).filter((key) => items[key]);

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (event) => {
        const searchQuery = event.target.value.toLowerCase();
        hiddenAnimes = Object.keys(items)
            .filter((key) => items[key] && key.toLowerCase().includes(searchQuery))
            .sort((a, b) => Math.abs(a.length - searchQuery.length) - Math.abs(b.length - searchQuery.length));
        currentPage = 0; // Reset current page
        updateList(hiddenAnimes, items);
    });

    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');

    prevPageButton.addEventListener('click', () => {
        currentPage--;
        updateList(hiddenAnimes, items);
    });

    nextPageButton.addEventListener('click', () => {
        currentPage++;
        updateList(hiddenAnimes, items);
    });

    updateList(hiddenAnimes, items);
});

// Funktion zum Neuladen nur, wenn es die Crunchyroll-Seite ist
function reloadPageIfNecessary() {
    // Überprüfe die URL der aktuellen Seite
    const currentUrl = window.location.href;

    // Nur auf Crunchyroll-Seiten neuladen (angepasst auf die URL-Struktur von Crunchyroll)
    if (currentUrl.includes("crunchyroll.com")) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.reload(tabs[0].id); // Nur auf Crunchyroll-Seiten neu laden
        });
    } else {
        console.log("Keine Crunchyroll-Seite, daher kein Neuladen.");
    }
}

document.getElementById('export').addEventListener('click', () => {
    exportAsFile();
});

function exportAsFile() {
    chrome.storage.sync.get(null, (items) => {
        const hiddenAnimes = Object.keys(items).filter((key) => items[key]);

        // Exportiere die Daten (z. B. in eine Datei)
        const exportData = JSON.stringify(hiddenAnimes);
        // Erstelle einen Timestamp (z. B. 2024-12-01_14-30-45)
        const timestamp = new Date().toISOString().replace(/[:.]/g, "_"); // Ersetzt ":" und "." mit "_"

        // Erstelle den Dateinamen mit dem Timestamp
        const filename = `hidden_animes_${timestamp}.json`;

        // Erstelle einen Blob für den Export (als JSON-Datei)
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Erstelle einen Download-Link
        const a = document.createElement('a');
        a.href = url;
        a.download = filename; // Dateiname mit Timestamp
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
}

document.getElementById('import').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        const hiddenAnimes = JSON.parse(event.target.result);
        const items = {};
        for (const anime of hiddenAnimes) {
            items[anime] = true;
        }
        saveData(items);

        // Nur neu laden, wenn es notwendig ist (z. B. Crunchyroll)
        reloadPageIfNecessary();

        // Aktualisiere Popup
        window.location.reload();
    };
    reader.readAsText(file);
});

// Darkmode slider
const themeSwitch = document.querySelector('#checkbox');
themeSwitch.checked = localStorage.getItem('darkMode') === 'true';

if (themeSwitch.checked) {
    document.body.classList.add('dark-mode');
}

themeSwitch.addEventListener('change', (e) => {
    document.body.classList.toggle('dark-mode', e.target.checked);
    localStorage.setItem('darkMode', e.target.checked);
});
