const { contextBridge, ipcRenderer } = require('electron');
const lunar = require('lunar-calendar');

contextBridge.exposeInMainWorld('api', {
    lunar: lunar,
    ipcRenderer: {
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
    }
});