'use strict';

const gmx = {
  sid() {
    return new Promise((resolve, reject) => {
      chrome.history.search({text: 'https://navigator-bs.gmx.com/*sid='}, items => {
        if (items.length) {
          const item = items.shift();
          const args = new URLSearchParams(item.url.split('?')[1]);
          resolve(args.get('sid'));
        }
        else {
          reject(Error('no gmx.com history visit. Please open gmx.com once to get the required session identification number'));
        }
      });
    });
  },
  json(sid) {
    return fetch(`https://home.navigator-bs.gmx.com/servicetrinity/mails?sid=${sid}&_=` + Date.now())
      .then(r => {
        if (r.ok) {
          return r.json();
        }
        throw Error(r.status);
      });
  },
  check() {
    return gmx.sid().then(gmx.json).then(j => {
      const title = Object.entries(j.folderInfo).map(([folder, value]) => {
        return folder + ': ' + value.unread;
      }).join('\n') + `

--
Last check: ${(new Date()).toLocaleString()}`;
      const count = j.folderInfo.inbox.unread;
      chrome.browserAction.setBadgeText({
        text: count ? Number(count) : ''
      });
      chrome.browserAction.setTitle({
        title
      });
    }).catch(e => {
      chrome.browserAction.setBadgeText({
        text: 'x'
      });
      chrome.browserAction.setTitle({
        title: e.message
      });
    });
  }
};

chrome.alarms.create('period', {
  periodInMinutes: 10
});
chrome.alarms.onAlarm.addListener(gmx.check);
gmx.check();
chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'recheck') {
    gmx.check();
  }
});

chrome.browserAction.onClicked.addListener(() => gmx.sid().then(sid => chrome.tabs.create({
  url: `https://navigator-bs.gmx.com/mail?sid=${sid}`
})).catch(() => chrome.tabs.create({
  url: 'https://navigator-bs.gmx.com/mail'
})));
