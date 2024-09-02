import { datosFormulario } from '../../interfaces/datosFormulario'

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    doAThing()
    processForm()
    var openModalButton = document.getElementById('crearPDF') as HTMLButtonElement;
    var myModal = document.getElementById('my_modal_1') as HTMLDialogElement;
    const infoDialogButton = document.getElementById("infoDialog") as HTMLButtonElement;
    const infoDialog = document.getElementById("my_modal_2") as HTMLDialogElement;
    // Añade el evento click al botón
    openModalButton.addEventListener('click', function() {
        myModal.showModal();
    });
    infoDialogButton.addEventListener('click', () =>{
      infoDialog.showModal();
    })
  })
}

function doAThing(): void {
  const versions = window.electron.process.versions
  replaceText('.electron-version', `Electron v${versions.electron}`)
  replaceText('.chrome-version', `Chromium v${versions.chrome}`)
  replaceText('.node-version', `Node v${versions.node}`)

  const ipcHandlerBtn = document.getElementById('ipcHandler')
  ipcHandlerBtn?.addEventListener('click', () => {
    window.electron.ipcRenderer.send('ping')
  })
}

function replaceText(selector: string, text: string): void {
  const element = document.querySelector<HTMLElement>(selector)
  if (element) {
    element.innerText = text
  }
}

function processForm() {
  const descargarCaps = document.getElementById("descargarCaps") as HTMLButtonElement;
  descargarCaps.addEventListener("click", validarForm)
  // form.addEventListener("submit", validarForm)
}

function validarForm(event: Event) {
  event.preventDefault();
  let esValido = true; // Empezamos asumiendo que es válido

  const urlBase = document.getElementById("urlBase") as HTMLInputElement;
  const ubicacionCarpeta = document.getElementById("ubicacionCarpeta") as HTMLInputElement;
  const descargarTodos = document.getElementById("descargarTodos") as HTMLInputElement;
  const seleccionCapitulos = document.getElementById("seleccionCapitulos") as HTMLInputElement;

  if (!urlBase.value.includes("https://inmanga.com/ver/manga/")) {
    esValido = false;
    mostrarAlerta("La url no pertenece a la página de manga seleccionada. De momento solo solo está disponible inmanga.");
  }

  // Validar ruta de carpeta
  if (ubicacionCarpeta.value === "") {
    esValido = false;
    mostrarAlerta("Debes introducir una ruta para guardar las descargas.");
  }

  // Validar selección de capítulos o check de descargar todos
  if (seleccionCapitulos.value === "" && !descargarTodos.checked) {
    esValido = false;
    mostrarAlerta("Debes hacer una selección de capítulos o marcar el check para descargar todos.");
  } else if (seleccionCapitulos.value !== "") {
    const validRegex = /^(\d{2})(,\d{2})*$/;
    const validRegex2 = /^(\d{2})-(\d{2})$/;

    if (seleccionCapitulos.value.includes(",")) {
      if (!validRegex.test(seleccionCapitulos.value)) {
        esValido = false;
        mostrarAlerta("Cadena de capítulos no válida. Deben estar separados por comas.");
      }
    } else if (seleccionCapitulos.value.includes("-")) {
      if (!validRegex2.test(seleccionCapitulos.value)) {
        esValido = false;
        mostrarAlerta("Cadena de capítulos no válida, deben estar separadas por un guión.");
      }
    }
  }

  // Si todas las validaciones pasan, enviar datos
  if (esValido) {
    let datos: datosFormulario = {
      urlBase: urlBase.value,
      ubicacionCarpeta: ubicacionCarpeta.value,
      descargarTodos: descargarTodos.checked,
      seleccionCapitulos: seleccionCapitulos.value
    };

    window.controlesForm.submitForm(datos);

    // Manejar respuesta de éxito
  }
}

window.controlesForm.onFormSuccess((response) => {
  console.log('Form submission successful:', response);
});

// Manejar errores
window.controlesForm.onFormError((error) => {
  console.error('Form submission error:', error);
  mostrarAlerta("La ubicación introducida no es válida/no existe.")
});


init()

function mostrarAlerta(message: string): void {
  const alertDiv = document.createElement("div");
  alertDiv.setAttribute("role", "alert");
  alertDiv.className = "alert alert-error my-4";
  alertDiv.innerHTML = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6 shrink-0 stroke-current"
        fill="none"
        viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    <span>${message}</span>
  `;
  const errorHandling = document.getElementById("errorHandling") as HTMLDivElement;
  errorHandling.insertBefore(alertDiv, errorHandling.firstChild);
  setTimeout(() => {
    alertDiv.classList.add("fade-out");
    setTimeout(() => {
      alertDiv.remove();
    }, 500); // Tiempo para que se complete la animación de fade-out
  }, 2500);
}