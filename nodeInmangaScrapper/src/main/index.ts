import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, resolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import sharp from 'sharp';
import { datosFormulario } from '../interfaces/datosFormulario';

var urlBase = 'https://pack-yak.intomanga.com/images/manga'
function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  mainWindow.webContents.openDevTools();
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('submit-form', async (event, formData: datosFormulario) => {
  console.log('Datos recibidos desde el renderer:', formData);
  console.log("-")
  if(!validateFolderPath(formData.ubicacionCarpeta)){
    event.sender.send('form-submission-error', { message: 'Proporcione una ruta válida para guardar los capítulos.' });
  }else{
    event.sender.send('form-submission-success', { message: 'Form submitted successfully' });
  }
  
  // await descargarImagenes()
  // Aquí puedes manejar los datos, realizar operaciones de negocio, etc.
  // Supongamos que la operación es exitosa:

  // Si hay un error, puedes enviar un mensaje de error:
  // event.sender.send('form-submission-error', { message: 'Error submitting form' });
});

async function descargarImagenes() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const urlInicial = "https://inmanga.com/ver/manga/Jojos-Bizarre-Adventure-Parte-7-Steel-Ball-Run/01/2c7361f8-bb98-4116-966a-657d7f8133cd";
  await page.goto(urlInicial, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#ChapList');
  console.log()
  const chapters = await page.evaluate(() => {
    const chapList = document.getElementById('ChapList');
    if (!chapList) return [];

    const options = Array.from(chapList.getElementsByTagName('option')); // Obtener las opciones
    return options.map(option => ({
      text: option.textContent?.trim() ?? "", // Maneja el caso donde textContent puede ser null
      value: option.value
    }));
  });
  // console.log('Chapters:', chapters);


  // console.log("paginas: ", pages)
  console.log("total capítulos: ", chapters.length)

  if (chapters.length > 0) {
    for (const cap of chapters) {
      let nuevoCapUrl: string = `https://inmanga.com/ver/manga/Jojos-Bizarre-Adventure-Parte-7-Steel-Ball-Run/${cap.text}/${cap.value}`

      await page.goto(nuevoCapUrl, { waitUntil: 'domcontentloaded' });

      const randomDelay = Math.floor(Math.random() * 2000) + 1000; // Entre 1000ms y 3000ms
      await new Promise(r => setTimeout(r, randomDelay)); // Usar setTimeout para retraso


      const pages = await page.evaluate(() => {
        const container = document.querySelector(".PagesContainer");
        if (!container) {
          return [];
        }

        const linksImagenes = Array.from(container.querySelectorAll("a"));

        return linksImagenes.map(link => {
          const img = link.querySelector("img");
          if (img) {
            return {
              paginaId: img.id,
              numPagina: img.getAttribute("data-pagenumber") ?? null
            };
          }
          return null;
        }).filter(item => item !== null);
      })

      if (pages.length > 0) {
        const rutaUsuario = 'E:/pruebaDescargasPuppeteer';
        const chapterFolderPath = join(rutaUsuario, `jojos-parte7-${cap.text}`);
        fs.mkdirSync(chapterFolderPath, { recursive: true });
        for (const page of pages) {
          let urlImagen = `${urlBase}/${nuevoCapUrl.split("/")[5]}/chapter/${cap.text}/page/${page.numPagina}/${page.paginaId}`
          console.log(`Descargando imagen desde ${urlImagen}`);

          try {
            // Descargar imagen como buffer
            const imageBuffer = await downloadImage(urlImagen);

            // Define el camino donde guardar las imágenes en la carpeta del capítulo
            const savePath = join(chapterFolderPath, `${page.numPagina}.png`); // Guardar como PNG

            // Convertir a PNG y guardar
            await sharp(imageBuffer)
              .png() // Convertir a formato PNG
              .toFile(savePath);

            console.log(`Imagen guardada en ${savePath}`);

            // Añadir un retraso de 1 a 2 segundos entre descargas de imágenes
            const downloadDelay = Math.floor(Math.random() * 1000) + 1000; // Entre 1000ms y 2000ms
            await new Promise(r => setTimeout(r, downloadDelay)); // Usar setTimeout para retraso
          } catch (error) {
            console.error(`Error al procesar la imagen: ${error}`);
          }
        }
      }
    }
  }
}

async function downloadImage(url) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'arraybuffer' // Cambia a arraybuffer para manejar binarios
  });

  return response.data; // Devuelve el buffer de datos
}


function validateFolderPath(folderPath)  {
  const absolutePath = resolve(folderPath);

  if(fs.existsSync(absolutePath)){
    return true;
  }else { 
    return false;
  }
}
/**
 * 
 * 
 * 
 * 
 * Estructura datos:
 * captiulos: [
 *  { text: '85', value: '0b5d5ffc-cc40-416c-8f8c-0d54adc15f91' },
 * ]
 * 
 * Por cada cap nueva url y acceder a ella
 * newChap = f"https://inmanga.com/ver/manga/Jojos-Bizarre-Adventure-Parte-7-Steel-Ball-Run/{numCap}/{option.get('value')}"
 * 
 * 
 * paginas: [
 *  { paginaId: 'b989bb86-6f94-45c4-9933-d5f951f685e0', numPagina: '1' },
 * ]
 * 
 * por cada pagina nuevaUrl para descargar img
 */