import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, resolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import sharp from 'sharp';
import { datosFormulario } from '../interfaces/datosFormulario';
import { PDFDocument } from 'pdf-lib'
var urlBase = 'https://pack-yak.intomanga.com/images/manga';
var selectedManga = "";
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

ipcMain.on('generate-pdfs', async (event, ubicacionCarpeta: string) => {
  console.log("-")
  await createPDFsFromImages(ubicacionCarpeta);
  event.sender.send('generated-pdfs', { message: 'Prodeso de generación de pdfs terminado.' });
})

ipcMain.on('submit-form', async (event, formData: datosFormulario) => {
  console.log('Datos recibidos desde el renderer:', formData);
  console.log("-")
  if (!validateFolderPath(formData.ubicacionCarpeta)) {
    event.sender.send('form-submission-error', { message: 'Proporcione una ruta válida para guardar los capítulos.' });
  } else {
    event.sender.send('form-submission-success', { message: 'Form submitted successfully' });
  }

  await descargarImagenes(formData)
  event.sender.send('download-success', { message: 'Download finished.' })
  // Aquí puedes manejar los datos, realizar operaciones de negocio, etc.
  // Supongamos que la operación es exitosa:

  // Si hay un error, puedes enviar un mensaje de error:
  // event.sender.send('form-submission-error', { message: 'Error submitting form' });
});

async function descargarImagenes(datosFormulario: datosFormulario) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const urlInicial = datosFormulario.urlBase;
  selectedManga = urlInicial.split("/")[5]
  await page.goto(urlInicial, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#ChapList');
  console.log()
  var chapters = await page.evaluate(() => {
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
    if (datosFormulario.seleccionCapitulos !== "") {
      let chaptersRange: string[] = [];
      let [firstChapter, lastChapter] = datosFormulario.seleccionCapitulos.split("-").map(chapter => chapter.padStart(2, '0'));
      if (datosFormulario.seleccionCapitulos.includes("-")) {
        for (let i = parseInt(firstChapter); i < parseInt(lastChapter); i++) {
          if (i.toString().length === 1) {
            chaptersRange.push("0" + i.toString())
          } else {
            chaptersRange.push(i.toString())
          }
        }
      } else if (datosFormulario.seleccionCapitulos.includes(",")) {
        console.log(datosFormulario.seleccionCapitulos.split(","))
        chaptersRange = datosFormulario.seleccionCapitulos
          .split(",")
          .map(chapter => chapter.trim())  // Elimina espacios en blanco adicionales
          .filter(chapter => chapter !== "")  // Filtra elementos vacíos
          .filter((chapter, index, self) => self.indexOf(chapter) === index)  // Elimina duplicados
          .sort((a, b) => parseInt(a) - parseInt(b));

      }
      chaptersRange.push(lastChapter)
      console.log(chaptersRange)
      if (chaptersRange.length > 0) {
        chaptersRange = chaptersRange.filter(chapter => chapter !== undefined);
        chapters = chapters.filter(chap => chaptersRange.includes(chap.text))
      }
      console.log(chapters)
      // chapters.filter(chap => chap.text )
    }
    for (const cap of chapters) {
      let nuevoCapUrl: string = `https://inmanga.com/ver/manga/${selectedManga}/${cap.text}/${cap.value}`

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
        const chapterFolderPath = join(datosFormulario.ubicacionCarpeta, `${selectedManga}-${cap.text}`);
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
            const downloadDelay = 500; // Entre 1000ms y 2000ms
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


function validateFolderPath(folderPath) {
  const absolutePath = resolve(folderPath);

  if (fs.existsSync(absolutePath)) {
    return true;
  } else {
    return false;
  }
}

async function createPDFsFromImages(basePath) {
  const pdfFolder = join(basePath, "capitulosFormatoPdf")
  if (!fs.existsSync(pdfFolder)) {
    // Crea la nueva carpeta
    fs.mkdirSync(pdfFolder, { recursive: true });
    console.log(`Carpeta creada en: ${pdfFolder}`);
  } else {
    console.log(`La carpeta ya existe: ${pdfFolder}`);
  }
  const chapters = fs.readdirSync(basePath)
    .filter(file => {
        const fullPath = join(basePath, file);
        return fs.statSync(fullPath).isDirectory() && file !== "capitulosFormatoPdf";
    });
  console.log(chapters)
  for (const chapter of chapters) {
    const chapterPath = join(basePath, chapter);
    console.log(chapterPath)
    const images = fs.readdirSync(chapterPath).filter(file => file.endsWith('.png')).sort((a, b) => a.localeCompare(b));
    console.log(images)
    const pdfDoc = await PDFDocument.create();

    for (const imageName of images) {
      const imagePath = join(chapterPath, imageName);
      const imageBytes = fs.readFileSync(imagePath); // Leer la imagen como buffer
      console.log("--")
      const image = await pdfDoc.embedPng(imageBytes); // Insertar imagen en el PDF
      const { width, height } = image.scale(1); // Usar tamaño original de la imagen

      // Crear una página del tamaño de la imagen
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width,
        height,
      });
      console.log("--")
    }

    // Guardar el PDF en la carpeta del capítulo
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(pdfFolder + "/" + chapter + ".pdf", pdfBytes);
    console.log(`PDF generado para ${chapter}: ${pdfFolder}`);
  }
  console.log("proceso terminado")
  
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