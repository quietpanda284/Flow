const { contextBridge, ipcRenderer } = require('electron');

const listeners = new Map();
let nextId = 0;

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    // Whitelist channels
    let validChannels = ['timer-command', 'widget-command', 'toggle-widget', 'widget-resize', 'window-control'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['timer-update', 'timer-complete', 'widget-update'];
    if (validChannels.includes(channel)) {
      const id = nextId++;
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      listeners.set(id, { channel, subscription });
      return id; // Return ID so renderer can cleanup
    }
  },
  removeListener: (id) => {
      if (listeners.has(id)) {
          const { channel, subscription } = listeners.get(id);
          ipcRenderer.removeListener(channel, subscription);
          listeners.delete(id);
      }
  }
});