const { app, BrowserWindow, Tray, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const icon_path = path.join(__dirname, 'cal.png');
const todosFilePath = path.join(app.getPath('userData'), 'todos.json');
const holidaysFilePath = path.join(__dirname, 'holidays.json');
let mainWindow;
let todoWindow;

function loadTodos() {
    if (fs.existsSync(todosFilePath)) {
        return JSON.parse(fs.readFileSync(todosFilePath));
    }
    return {};
}

function saveTodos(todos) {
    fs.writeFileSync(todosFilePath, JSON.stringify(todos, null, 2));
}

function loadHolidays() {
    if (fs.existsSync(holidaysFilePath)) {
        return JSON.parse(fs.readFileSync(holidaysFilePath));
    }
    return {};
}

function createMainWindow() {
    if (mainWindow) {
        mainWindow.show();
        return;
    }

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 1000,
        frame: false, // 无边框窗口
        transparent: true, // 透明背景
        resizable: false,
        title: '桌面日历',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true,
            enableRemoteModule: false,
        },
    });

    mainWindow.setIcon(icon_path);
    
    appTray = new Tray(icon_path);
    appTray.setToolTip('桌面日历');
    appTray.on('click', () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
    const contextMenu = Menu.buildFromTemplate([
        { label: '切换', click: () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() },
        { label: '刷新', click: () => mainWindow.reload() },
        { label: '导出', click: () => exportTodos() },
        { label: '导入', click: () => importTodos() },
        { label: '调试', click: () => mainWindow.webContents.openDevTools() },
        { label: '退出', click: () => app.quit() },
    ]);
    appTray.setContextMenu(contextMenu);

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    //mainWindow.setAlwaysOnTop(true, 'screen-saver'); // 始终置顶
    //mainWindow.webContents.openDevTools();

    // 禁止双击窗口变大变小
    mainWindow.on('maximize', (event) => {
        event.preventDefault();
        mainWindow.unmaximize();
    });

    mainWindow.on('unmaximize', (event) => {
        event.preventDefault();
        mainWindow.maximize();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createMainWindow);

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 监听编辑待办事项事件
ipcMain.handle('edit-todo', async (event, todo) => {
    if (todoWindow) {
        todoWindow.focus();
        return;
    }

    todoWindow = new BrowserWindow({
        width: 800,
        height: 600,
        parent: mainWindow,
        frame: false, // 无边框窗口
        transparent: false, // 透明背景
        resizable: false,
        modal: true,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    todoWindow.loadFile(path.join(__dirname, 'todo-dialog.html'));

    todoWindow.on('closed', () => {
        todoWindow = null;
    });
    

    todoWindow.once('ready-to-show', () => {
        todoWindow.webContents.send('set-todo', todo);
        todoWindow.show();
    });

    return new Promise((resolve, reject) => {
        ipcMain.once('save-todo', (event, newTodo) => {
            resolve(newTodo);
            todoWindow.close();
        });

        ipcMain.once('cancel-todo', () => {
            resolve(null);
            todoWindow.close();
        });
    });
});

// 处理获取和设置待办事项的 IPC 事件
ipcMain.handle('get-todo', (event, todoKey) => {
    const todos = loadTodos();
    return todos[todoKey] || '';
});

ipcMain.handle('set-todo', (event, todoKey, todo) => {
    const todos = loadTodos();
    todos[todoKey] = todo;
    saveTodos(todos);
});

// 处理获取节假日的 IPC 事件
ipcMain.handle('get-holidays', () => {
    return loadHolidays();
});

// 导出待办事项
function exportTodos() {
    dialog.showSaveDialog(mainWindow, {
        title: '导出待办事项',
        defaultPath: path.join(app.getPath('documents'), 'todos.json'),
        filters: [
            { name: 'JSON Files', extensions: ['json'] }
        ]
    }).then(file => {
        if (!file.canceled) {
            const todos = loadTodos();
            fs.writeFileSync(file.filePath.toString(), JSON.stringify(todos, null, 2));
        }
    }).catch(err => {
        console.log(err);
    });
}

// 导入待办事项
function importTodos() {
    dialog.showOpenDialog(mainWindow, {
        title: '导入待办事项',
        defaultPath: app.getPath('documents'),
        filters: [
            { name: 'JSON Files', extensions: ['json'] }
        ],
        properties: ['openFile']
    }).then(file => {
        if (!file.canceled) {
            const todos = JSON.parse(fs.readFileSync(file.filePaths[0]).toString());
            saveTodos(todos);
            mainWindow.reload();
        }
    }).catch(err => {
        console.log(err);
    });
}
