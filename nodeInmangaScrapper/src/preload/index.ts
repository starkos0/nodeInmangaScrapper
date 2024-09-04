import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { datosFormulario } from '../interfaces/datosFormulario'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('controlesForm', {
      submitForm: (formData: datosFormulario) => ipcRenderer.send('submit-form', formData),
      onFormSuccess: (callback: (response: any) => void) =>
        ipcRenderer.on('form-submission-success', (response) => callback(response)),
      onFormError: (callback: (error: any) => void) =>
        ipcRenderer.on('form-submission-error', (response) => callback(response)),
      onDownloadSuccess: (callback: (response: any) => void) =>
        ipcRenderer.on('download-success',(response) => callback(response)),
      generatePdfs: (ubicacionCarpeta: string) => 
        ipcRenderer.send('generate-pdfs', ubicacionCarpeta),
      onGeneratedPdfs: (callback: (responsae: any) => void) =>
        ipcRenderer.on('generated-pdfs', (response) => callback(response))
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
