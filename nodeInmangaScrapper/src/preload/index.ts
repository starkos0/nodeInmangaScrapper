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
        ipcRenderer.on('form-submission-success', (event, response) => callback(response)),
      onFormError: (callback: (error: string) => void) =>
        ipcRenderer.on('form-submission-error', (event, error) => callback(error)),
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
