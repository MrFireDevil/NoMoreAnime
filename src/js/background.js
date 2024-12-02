chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.method === 'storeAnime') {
    chrome.storage.sync.get('hiddenAnimeList', (data) => {
      let hiddenAnimeList = data.hiddenAnimeList || [];
      hiddenAnimeList.push({name: request["animeName"], hideStatus: request.hideStatus});
      chrome.storage.sync.set({hiddenAnimeList: hiddenAnimeList}, () => {
        sendResponse({status: 'Anime stored'});
      });
    });
    return true;
  } else if (request.method === 'getAnimeStatus') {
    chrome.storage.sync.get('hiddenAnimeList', (data) => {
      let hiddenAnimeList = data.hiddenAnimeList || [];
      const anime = hiddenAnimeList.find(anime => anime.name === request.animeName);
      sendResponse({hideStatus: anime ? anime.hideStatus : false});
    });
    return true;
  } else if (request.method === 'getHiddenAnimeList') {
    chrome.storage.sync.get('hiddenAnimeList', (data) => {
      let hiddenAnimeList = data.hiddenAnimeList || [];
      sendResponse({animes: hiddenAnimeList.filter(anime => anime.hideStatus)});
    });
    return true;
  } else if (request.method === 'unhideAnime') {
    chrome.storage.sync.get('hiddenAnimeList', (data) => {
      let hiddenAnimeList = data.hiddenAnimeList || [];
      const anime = hiddenAnimeList.find(anime => anime.name === request.animeName);
      if (anime) {
        anime.hideStatus = false;
      }
      chrome.storage.sync.set({hiddenAnimeList: hiddenAnimeList}, () => {
        sendResponse({status: 'Anime unhidden'});
      });
    });
    return true;
  }
});
