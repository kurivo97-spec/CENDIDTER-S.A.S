/*
 * Script de lógica de la aplicación.
 * Versión segura conectada a Firebase.
 */

// Variables de estado
let personal = []; // Los datos ahora vendrán de Firebase
let currentUser = null;
let selectedArea = null;
let selectedPerson = null;
let editing = false;
let editHorarios = {};

// Obtener nodos DOM
const areaContainer = document.getElementById('areaContainer');
const areaSelection = document.getElementById('areaSelection');
const areaView = document.getElementById('areaView');
const backLink = document.getElementById('backLink');
const areaTitle = document.getElementById('areaTitle');
const addWorkerForm = document.getElementById('addWorkerForm');
const workerGrid = document.getElementById('workerGrid');
const modalOverlay = document.getElementById('modalOverlay');
const modalInitialsEl = document.getElementById('modalInitials');
const modalNameEl = document.getElementById('modalName');
const modalStatusEl = document.getElementById('modalStatus');
const scheduleSummaryEl = document.getElementById('scheduleSummary');
const progressBarEl = document.getElementById('progressBar');
const timeRemainingEl = document.getElementById('timeRemaining');
const scheduleTableEl = document.getElementById('scheduleTable');
const editTelefonoInput = document.getElementById('editTelefono');
const editControlsEl = document.getElementById('editControls');
const defaultControlsEl = document.getElementById('defaultControls');
const loginPanel = document.getElementById('loginPanel');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loggedUserSpan = document.getElementById('loggedUser');
const logoutBtn = document.getElementById('logoutBtn');
const loginTitle = document.getElementById('loginTitle');
const logoutSection = document.querySelector('#loginPanel .logout-section');
const closeLoginBtn = document.querySelector('#loginPanel .close-login');
const adminBtn = document.getElementById('adminBtn');
const editBtn = document.getElementById('editBtn');
const deleteWorkerBtn = document.getElementById('deleteWorkerBtn');

// --- CONSTANTES ---
const AREAS = [
  'AREA DE SERVICIOS GENERALES',
  'AREA DE MANTENIMIENTO',
  'AREA DE SISTEMAS'
];

// --- INICIALIZACIÓN ---
init();

function init() {
  // Configuración de listeners (oyentes de eventos)
  backLink.addEventListener('click', e => {
    e.preventDefault();
    selectedArea = null;
    selectedPerson = null;
    editing = false;
    renderMainView();
  });
  addWorkerForm.addEventListener('submit', e => {
    e.preventDefault();
    addWorker();
  });
  adminBtn.addEventListener('click', () => toggleLoginPanel());
  closeLoginBtn.addEventListener('click', () => toggleLoginPanel(false));
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    handleLogin();
  });
  logoutBtn.addEventListener('click', handleLogout);
  editBtn.addEventListener('click', enterEditMode);
  editControlsEl.querySelector('.save').addEventListener('click', saveEdits);
  editControlsEl.querySelector('.cancel').addEventListener('click', cancelEdits);
  deleteWorkerBtn.addEventListener('click', deleteWorker);
  document.querySelector('#modal .close-modal').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
  });

  // Listener principal de autenticación de Firebase
  // Esto se ejecuta cuando la página carga y cada vez que el estado de login cambia
  auth.onAuthStateChanged(user => {
    if (user) {
      // El usuario ha iniciado sesión
      currentUser = user.email; // Guardamos el email del usuario
      fetchPersonalData(); // Descargamos los datos del personal
    } else {
      // El usuario ha cerrado sesión
      currentUser = null;
      personal = []; // Limpiamos los datos
      renderMainView(); // Renderizamos la vista (sin datos)
    }
    toggleLoginPanel(false); // Ocultamos el panel de login
  });

  // Renderizado inicial
  renderAreaCards(); // Renderizamos las tarjetas de área
  renderMainView(); // Renderizamos la vista principal

  // Actualizador de tiempo (cada 60 segundos)
  setInterval(() => {
    if (personal.length > 0) {
      updateWorkerCards();
      if (selectedPerson && !editing) updateModal();
    }
  }, 60000);
}

// --- LÓGICA DE FIREBASE ---

function fetchPersonalData() {
  // Solo descargamos datos si el usuario está logueado
  if (!currentUser) return;

  db.collection("personal").get().then(querySnapshot => {
      personal = []; // Vaciamos la lista local
      querySnapshot.forEach(doc => {
          let workerData = doc.data();
          workerData.id = doc.id; // ¡Importante! Guardamos el ID del documento
          personal.push(workerData);
      });
      console.log("Datos del personal cargados desde Firebase:", personal.length);
      renderMainView(); // Volvemos a dibujar la vista principal
  }).catch(error => {
      console.error("Error al obtener los datos del personal: ", error);
      alert("No se pudieron cargar los datos. Revisa la consola.");
  });
}

function handleLogin() {
  const email = usernameInput.value.trim(); // Ahora usamos email
  const pass = passwordInput.value.trim();
  
  if (!email || !pass) {
    alert("Por favor ingresa email y contraseña");
    return;
  }

  auth.signInWithEmailAndPassword(email, pass)
    .then(userCredential => {
      console.log('Inicio de sesión exitoso:', userCredential.user.email);
      // El listener 'onAuthStateChanged' se encargará del resto
      usernameInput.value = '';
      passwordInput.value = '';
    })
    .catch(error => {
      console.error("Error de login:", error.message);
      alert('Error: Usuario o contraseña incorrectos.');
    });
}

function handleLogout() {
  auth.signOut().then(() => {
    console.log('Cierre de sesión exitoso');
    // El listener 'onAuthStateChanged' se encargará del resto
  });
}

function addWorker() {
  const nombre = document.getElementById('newNombre').value.trim();
  const apellido = document.getElementById('newApellido').value.trim();
  const telefono = document.getElementById('newTelefono').value.trim();
  if (!nombre || !apellido || !telefono) return;

  // Usamos los horarios del primer trabajador como plantilla
  const sample = personal.length > 0 ? personal[0] : { horarios: {} };
  const newHorarios = JSON.parse(JSON.stringify(sample.horarios));

  const newWorker = {
    nombre,
    apellido,
    telefono,
    area: selectedArea,
    horarios: newHorarios
  };

  // Añadimos el nuevo trabajador a Firestore
  db.collection("personal").add(newWorker)
    .then(docRef => {
      console.log("Trabajador añadido con ID: ", docRef.id);
      document.getElementById('newNombre').value = '';
      document.getElementById('newApellido').value = '';
      document.getElementById('newTelefono').value = '';
      fetchPersonalData(); // Recargamos los datos para mostrar el nuevo
    })
    .catch(error => {
      console.error("Error al añadir trabajador: ", error);
      alert("No se pudo añadir el trabajador.");
    });
}

function deleteWorker() {
  if (!selectedPerson || !selectedPerson.id) return;
  const confirmDelete = confirm('¿Desea eliminar a este trabajador?');
  if (!confirmDelete) return;

  // Usamos el ID del documento para borrarlo
  db.collection("personal").doc(selectedPerson.id).delete()
    .then(() => {
        console.log("Trabajador eliminado con éxito");
        closeModal();
        fetchPersonalData(); // Recargamos los datos
    })
    .catch(error => {
        console.error("Error al eliminar el trabajador: ", error);
        alert("Hubo un error al eliminar el trabajador.");
    });
}

function saveEdits() {
  if (!selectedPerson || !selectedPerson.id) return;

  // 1. Aplicar cambios temporales en horarios al objeto 'selectedPerson'
  for (const d in editHorarios) {
    editHorarios[d].forEach((block, idx) => {
      if (!selectedPerson.horarios[d]) selectedPerson.horarios[d] = [];
      if (block.inicio != null && block.fin != null) {
        // Asegurarse de que el bloque exista
        if (!selectedPerson.horarios[d][idx]) {
          selectedPerson.horarios[d][idx] = {};
        }
        selectedPerson.horarios[d][idx].inicio = block.inicio;
        selectedPerson.horarios[d][idx].fin = block.fin;
      }
    });
  }

  // 2. Crear el objeto de actualización para Firestore
  const updatedData = {
    horarios: selectedPerson.horarios, // Enviamos el objeto de horarios completo
    telefono: editTelefonoInput.value.trim() // Actualizamos el teléfono
  };

  // 3. Enviar la actualización a Firestore
  db.collection("personal").doc(selectedPerson.id).update(updatedData)
    .then(() => {
      console.log("Datos del trabajador actualizados");
      editing = false;
      editHorarios = {};
      updateModal(); // Actualiza la vista del modal
      renderWorkerCards(); // Actualiza la tarjeta del trabajador
    })
    .catch(error => {
      console.error("Error al guardar cambios: ", error);
      alert("No se pudieron guardar los cambios.");
    });
}


// --- LÓGICA DE RENDERIZADO (VISTAS) ---
// (Estas funciones son casi iguales a las de antes)

function renderAreaCards() {
  areaContainer.innerHTML = '';
  AREAS.forEach(area => {
    const card = document.createElement('div');
    card.className = 'area-card';
    // ... (código SVG de iconos) ...
    const iconGroup = document.createElement('div');
    iconGroup.className = 'area-icon-group';
    if (area === 'AREA DE SERVICIOS GENERALES') {
      const bucket = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      bucket.setAttribute('viewBox', '0 0 448 512');
      bucket.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      const bucketPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      bucketPath.setAttribute('d', 'M96 152l0 8-48 0 0-8C48 68.1 116.1 0 200 0l48 0c83.9 0 152 68.1 152 152l0 8-48 0 0-8c0-57.4-46.6-104-104-104l-48 0C142.6 48 96 94.6 96 152zM0 224c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-5.1 0L388.5 469c-2.6 24.4-23.2 43-47.7 43l-233.6 0c-24.6 0-45.2-18.5-47.7-43L37.1 256 32 256c-17.7 0-32-14.3-32-32z');
      bucket.appendChild(bucketPath);
      const broom = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      broom.setAttribute('viewBox', '0 0 576 512');
      broom.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      const broomPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      broomPath.setAttribute('d', 'M566.6 54.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192-34.7-34.7c-4.2-4.2-10-6.6-16-6.6c-12.5 0-22.6 10.1-22.6 22.6l0 29.1L364.3 320l29.1 0c12.5 0 22.6-10.1 22.6-22.6c0-6-2.4-11.8-6-16l-34.7-34.7 192-192zM341.1 353.4L222.6 234.9c-42.7-3.7-85.2 11.7-115.8 42.3l-8 8C76.5 307.5 64 337.7 64 369.2c0 6.8 7.1 11.2 13.2 8.2l51.1-25.5c5-2.5 9.5 4.1 5.4 7.9L7.3 473.4C2.7 477.6 0 483.6 0 489.9C0 502.1 9.9 512 22.1 512l173.3 0c38.8 0 75.9-15.4 103.4-42.8c30.6-30.6 45.9-73.1 42.3-115.8z');
      broom.appendChild(broomPath);
      iconGroup.appendChild(bucket);
      iconGroup.appendChild(broom);
    } else if (area === 'AREA DE MANTENIMIENTO') {
      const wrench = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      wrench.setAttribute('viewBox', '0 0 512 512');
      wrench.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      const wrenchPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      wrenchPath.setAttribute('d', 'M352 320c88.4 0 160-71.6 160-160c0-15.3-2.2-30.1-6.2-44.2c-3.1-10.8-16.4-13.2-24.3-5.3l-76.8 76.8c-3 3-7.1 4.7-11.3 4.7L336 192c-8.8 0-16-7.2-16-16l0-57.4c0-4.2 1.7-8.3 4.7-11.3l76.8-76.8c7.9-7.9 5.4-21.2-5.3-24.3C382.1 2.2 367.3 0 352 0C263.6 0 192 71.6 192 160c0 19.1 3.4 37.5 9.5 54.5L19.9 396.1C7.2 408.8 0 426.1 0 444.1C0 481.6 30.4 512 67.9 512c18 0 35.3-7.2 48-19.9L297.5 310.5c17 6.2 35.4 9.5 54.5 9.5zM80 408a24 24 0 1 1 0 48 24 24 0 1 1 0-48z');
      wrench.appendChild(wrenchPath);
      iconGroup.appendChild(wrench);
    } else if (area === 'AREA DE SISTEMAS') {
      const monitor = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      monitor.setAttribute('viewBox', '0 0 576 512');
      monitor.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      const monitorPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      monitorPath.setAttribute('d', 'M64 0C28.7 0 0 28.7 0 64L0 352c0 35.3 28.7 64 64 64l176 0-10.7 32L160 448c-17.7 0-32 14.3-32 32s14.3 32 32 32l256 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-69.3 0L336 416l176 0c35.3 0 64-28.7 64-64l0-288c0-35.3-28.7-64-64-64L64 0zM512 64l0 224L64 288 64 64l448 0z');
      monitor.appendChild(monitorPath);
      iconGroup.appendChild(monitor);
    }
    card.appendChild(iconGroup);
    // ... (fin código SVG) ...
    const nameSpan = document.createElement('span');
    nameSpan.textContent = area;
    card.appendChild(nameSpan);
    card.addEventListener('click', () => selectArea(area));
    areaContainer.appendChild(card);
  });
}

function renderMainView() {
  if (!currentUser) {
    // Si no hay usuario, solo mostrar áreas, ocultar todo lo demás
    areaSelection.style.display = 'block';
    areaView.style.display = 'none';
    return;
  }

  // Si hay usuario logueado
  if (!selectedArea) {
    areaSelection.style.display = 'block';
    areaView.style.display = 'none';
  } else {
    areaSelection.style.display = 'none';
    areaView.style.display = 'block';
    areaTitle.textContent = selectedArea;
    addWorkerForm.style.display = 'block'; // Mostrar siempre el form si está logueado
    renderWorkerCards();
  }
}

function selectArea(area) {
  if (!currentUser) {
    alert("Debes iniciar sesión para ver los detalles del área.");
    toggleLoginPanel(true);
    return;
  }
  selectedArea = area;
  selectedPerson = null;
  editing = false;
  renderMainView();
}

function renderWorkerCards() {
  workerGrid.innerHTML = '';
  if (personal.length === 0) return; // No hacer nada si no hay datos

  const workers = personal.filter(p => p.area === selectedArea);
  workers.forEach(person => {
    const card = document.createElement('div');
    card.className = 'worker-card';
    const initials = document.createElement('div');
    initials.className = 'worker-initials';
    initials.textContent = getInitials(person);
    card.appendChild(initials);
    const name = document.createElement('p');
    name.className = 'worker-name';
    name.textContent = person.nombre;
    card.appendChild(name);
    const surname = document.createElement('p');
    surname.className = 'worker-surname';
    surname.textContent = person.apellido;
    card.appendChild(surname);
    const { isOnShift } = getShiftInfo(person);
    const status = document.createElement('div');
    status.className = 'worker-status';
    status.textContent = isOnShift ? 'En turno' : 'Fuera de turno';
    status.style.background = isOnShift ? '#4caf50' : '#f44336';
    card.appendChild(status);
    const whatsappBtn = document.createElement('button');
    whatsappBtn.className = 'whatsapp-btn';
    whatsappBtn.textContent = 'WhatsApp';
    whatsappBtn.addEventListener('click', e => {
      e.stopPropagation();
      window.open(getWhatsAppLink(person.telefono), '_blank');
    });
    card.appendChild(whatsappBtn);
    card.addEventListener('click', () => openModal(person));
    workerGrid.appendChild(card);
  });
}

function updateWorkerCards() {
  if (!selectedArea || personal.length === 0) return;
  
  const workers = personal.filter(p => p.area === selectedArea);
  const cards = workerGrid.children;
  
  // Asegurarse de que el número de tarjetas coincida con los trabajadores
  if (cards.length !== workers.length) {
    renderWorkerCards(); // Redibujar si hay discrepancia
    return;
  }

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const statusDiv = card.querySelector('.worker-status');
    if (statusDiv) {
      const { isOnShift } = getShiftInfo(workers[i]);
      statusDiv.textContent = isOnShift ? 'En turno' : 'Fuera de turno';
      statusDiv.style.background = isOnShift ? '#4caf50' : '#f44336';
    }
  }
}

function openModal(person) {
  selectedPerson = person;
  editing = false;
  editHorarios = {};
  modalOverlay.style.display = 'flex';
  updateModal();
}

function closeModal() {
  modalOverlay.style.display = 'none';
  selectedPerson = null;
  editing = false;
  editHorarios = {};
}

function updateModal() {
  if (!selectedPerson) return;
  
  // Clonar horarios para edición segura
  const currentHorarios = editing ? JSON.parse(JSON.stringify(selectedPerson.horarios)) : selectedPerson.horarios;
  
  // Aplicar cambios temporales de 'editHorarios' si estamos editando
  if (editing) {
    for (const d in editHorarios) {
      editHorarios[d].forEach((block, idx) => {
        if (!currentHorarios[d]) currentHorarios[d] = [];
        if (!currentHorarios[d][idx]) currentHorarios[d][idx] = {};
        if (block.inicio != null) currentHorarios[d][idx].inicio = block.inicio;
        if (block.fin != null) currentHorarios[d][idx].fin = block.fin;
      });
    }
  }

  modalInitialsEl.textContent = getInitials(selectedPerson);
  modalNameEl.textContent = `${selectedPerson.nombre} ${selectedPerson.apellido}`;
  const { isOnShift, currentShiftEnd, nextShiftStart } = getShiftInfo(selectedPerson);
  modalStatusEl.textContent = isOnShift ? 'En turno' : 'Fuera de turno';
  modalStatusEl.style.background = isOnShift ? '#4caf50' : '#f44336';
  
  // Resumen de horarios
  const now = new Date();
  const days = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
  const today = days[now.getDay()];
  const blocks = selectedPerson.horarios[today] || [];
  scheduleSummaryEl.textContent = '';
  if (blocks.length > 0) {
    let summaryStr = blocks.map(b => `${formatTime(b.inicio)} - ${formatTime(b.fin)}`).join(' y ');
    scheduleSummaryEl.textContent = summaryStr;
    if (!isOnShift && nextShiftStart !== null) {
      scheduleSummaryEl.textContent += `\nPróximo turno: ${capitalize(today)} ${formatTime(nextShiftStart)}`;
    }
  } else {
    scheduleSummaryEl.textContent = 'Sin turno asignado hoy';
  }

  // Progreso
  if (isOnShift && currentShiftEnd !== null) {
    const nowFloat = now.getHours() + now.getMinutes() / 60;
    const currentBlock = blocks.find(b => nowFloat >= b.inicio && nowFloat < b.fin);
    if(currentBlock) {
      const progress = (nowFloat - currentBlock.inicio) / (currentBlock.fin - currentBlock.inicio);
      progressBarEl.style.width = `${Math.min(Math.max(progress, 0), 1) * 100}%`;
      const remainingMinutes = Math.round((currentBlock.fin - nowFloat) * 60);
      const hrs = Math.floor(remainingMinutes / 60);
      const mins = remainingMinutes % 60;
      timeRemainingEl.textContent = `${hrs}h ${mins}m restantes`;
    } else {
      progressBarEl.style.width = '0%';
      timeRemainingEl.textContent = 'Error calculando turno';
    }
  } else {
    progressBarEl.style.width = '0%';
    timeRemainingEl.textContent = '';
  }

  // Tabla de horarios
  renderScheduleTable(currentHorarios, editing);

  // Controles
  if (editing) {
    defaultControlsEl.style.display = 'none';
    editControlsEl.style.display = 'flex';
    document.getElementById('phoneEdit').style.display = 'block';
    editTelefonoInput.value = selectedPerson.telefono;
  } else {
    editControlsEl.style.display = 'none';
    defaultControlsEl.style.display = currentUser ? 'flex' : 'none'; // Mostrar botón 'Editar' si está logueado
    document.getElementById('phoneEdit').style.display = 'none';
  }
}

function renderScheduleTable(horarios, editable) {
  scheduleTableEl.innerHTML = '';
  const headerRow = document.createElement('tr');
  ['Día','Primera Jornada','Segunda Jornada'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  scheduleTableEl.appendChild(headerRow);
  const days = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
  days.forEach(d => {
    const row = document.createElement('tr');
    const dayCell = document.createElement('td');
    dayCell.textContent = capitalize(d);
    row.appendChild(dayCell);
    const blocks = horarios[d] || [];
    for (let i = 0; i < 2; i++) {
      const cell = document.createElement('td');
      const block = blocks[i];
      if (block && block.inicio != null && block.fin != null) {
        if (editable) {
          const startInput = document.createElement('input');
          startInput.type = 'time';
          startInput.value = toTimeInput(block.inicio);
          startInput.dataset.day = d;
          startInput.dataset.index = i;
          startInput.dataset.field = 'inicio';
          startInput.addEventListener('change', handleTimeChange);
          const endInput = document.createElement('input');
          endInput.type = 'time';
          endInput.value = toTimeInput(block.fin);
          endInput.dataset.day = d;
          endInput.dataset.index = i;
          endInput.dataset.field = 'fin';
          endInput.addEventListener('change', handleTimeChange);
          cell.appendChild(startInput);
          cell.appendChild(document.createTextNode(' - '));
          cell.appendChild(endInput);
        } else {
          cell.textContent = `${formatTime(block.inicio)} - ${formatTime(block.fin)}`;
        }
      } else {
        if (editable) {
          const addBtn = document.createElement('button');
          addBtn.textContent = '+';
          addBtn.dataset.day = d;
          addBtn.dataset.index = i;
          addBtn.addEventListener('click', handleAddBlock);
          cell.appendChild(addBtn);
        } else {
          cell.textContent = '-';
        }
      }
      row.appendChild(cell);
    }
    scheduleTableEl.appendChild(row);
  });
}

function enterEditMode() {
  if (!selectedPerson) return;
  editing = true;
  editHorarios = {}; // Reiniciar cambios temporales
  updateModal();
}

function cancelEdits() {
  editing = false;
  editHorarios = {};
  updateModal();
}

function handleTimeChange(e) {
  const day = e.target.dataset.day;
  const index = parseInt(e.target.dataset.index);
  const field = e.target.dataset.field;
  const [h, m] = e.target.value.split(':').map(Number);
  const value = h + m / 60;
  
  if (!editHorarios[day]) editHorarios[day] = [];
  if (!editHorarios[day][index]) {
    // Copiar valores existentes para no perder el otro campo
    const originalBlock = selectedPerson.horarios[day] ? selectedPerson.horarios[day][index] : null;
    editHorarios[day][index] = originalBlock ? { ...originalBlock } : { inicio: null, fin: null };
  }
  
  editHorarios[day][index][field] = value;
  
  // Actualizar visualmente la tabla en tiempo real
  updateModal();
}

function handleAddBlock(e) {
  e.preventDefault();
  const day = e.target.dataset.day;
  const index = parseInt(e.target.dataset.index);
  
  if (!editHorarios[day]) editHorarios[day] = [];
  // Añadir un bloque por defecto, p.ej. 8:00 - 12:00
  editHorarios[day][index] = { inicio: 8, fin: 12 };

  // Actualizar visualmente la tabla
  updateModal();
}

function toggleLoginPanel(show) {
  const open = show === undefined ? !loginPanel.classList.contains('open') : show;
  if (open) {
    loginPanel.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (currentUser) {
      loginForm.style.display = 'none';
      logoutSection.style.display = 'flex';
      loggedUserSpan.textContent = currentUser;
      loginTitle.textContent = 'Usuario';
    } else {
      loginForm.style.display = 'flex';
      logoutSection.style.display = 'none';
      loginTitle.textContent = 'Iniciar sesión';
      // Cambiar placeholder de usuario a email
      usernameInput.placeholder = "Email";
    }
  } else {
    loginPanel.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// --- FUNCIONES UTILITARIAS ---

function getInitials(person) {
  const n1 = person.nombre.split(' ')[0][0] || '';
  const n2 = person.apellido.split(' ')[0][0] || '';
  return `${n1}${n2}`.toUpperCase();
}

function getWhatsAppLink(telefono) {
  let num = telefono.replace(/\D/g, '');
  if (!num.startsWith('57')) num = '57' + num;
  return `https://wa.me/${num}`;
}

function getShiftInfo(person) {
  const now = new Date();
  const dayIndex = now.getDay();
  const days = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
  const today = days[dayIndex];
  const time = now.getHours() + now.getMinutes() / 60;
  const daySchedules = person.horarios[today] || [];
  
  let isOnShift = false;
  let currentShiftEnd = null;
  let nextShiftStart = null;

  for (const block of daySchedules) {
    if (block.inicio != null && block.fin != null) {
      if (time >= block.inicio && time < block.fin) {
        isOnShift = true;
        currentShiftEnd = block.fin;
        break;
      }
      if (block.inicio > time && (nextShiftStart === null || block.inicio < nextShiftStart)) {
        nextShiftStart = block.inicio;
      }
    }
  }
  return { isOnShift, currentShiftEnd, nextShiftStart };
}

function formatTime(value) {
  if(value === null || value === undefined) return '?';
  const hrs = Math.floor(value);
  const mins = Math.round((value - hrs) * 60);
  const d = new Date();
  d.setHours(hrs, mins, 0);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toTimeInput(value) {
  if(value === null || value === undefined) return '00:00';
  const hrs = Math.floor(value);
  const mins = Math.round((value - hrs) * 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}