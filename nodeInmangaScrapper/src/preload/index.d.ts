import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown,
    controlesForm: {
      submitForm: (formData: datosFormulario) => void;
      onFormSuccess: (callback: (response: any) => void) => void;
      onFormError: (callback: (error: string) => void) => void;
      onDownloadSuccess: (callback: (error: string) => void) => void;
      generatePdfs: (ubicacionCarpeta: string) => void;
      onGeneratedPdfs: (callback: (response: any) => void) => void;
    };
  }
}
