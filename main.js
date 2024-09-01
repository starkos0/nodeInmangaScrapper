// main.js
import { app, BrowserWindow } from 'electron';
import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Aquí puedes usar nodemailer y puppeteer como ES Modules
(async () => {
    // Configuración de nodemailer
    // const transporter = nodemailer.createTransport({
    //     service: 'gmail',
    //     auth: {
    //         user: 'tucorreo@gmail.com',
    //         pass: 'tucontraseña',
    //     },
    // });

    // const info = await transporter.sendMail({
    //     from: '"Ejemplo" <tucorreo@gmail.com>',
    //     to: 'destinatario@example.com',
    //     subject: 'Hello',
    //     text: 'Hello world?',
    //     html: '<b>Hello world?</b>',
    // });

    // console.log('Message sent: %s', info.messageId);

    // Configuración de puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://example.com');
    await browser.close();
})();
