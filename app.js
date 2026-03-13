// --- 1. CONFIGURACIÓN ---
const PB_URL = 'https://martiperpocketbase.duckdns.org';
const pb = new PocketBase(PB_URL);

let eventosActuales = [];
let eventoAEditar = null;
let currentTab = 'proximo';

// --- 2. INICIO ---
window.addEventListener('DOMContentLoaded', () => {
    if (pb.authStore.isValid) {
        mostrarApp();
    }

    // Listener para feedback de PDF
    document.getElementById('ev-archivo-file').addEventListener('change', (e) => {
        const status = document.getElementById('pdf-status');
        if (e.target.files.length > 0) {
            status.textContent = "✓ PDF: " + e.target.files[0].name;
            status.style.display = 'block';
        } else {
            status.style.display = 'none';
        }
    });
});

async function login() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const btn = document.getElementById('btn-login');

    if (!email || !pass) return alert("Hacen falta datos");

    try {
        btn.disabled = true;
        btn.textContent = "Entrando...";
        await pb.collection('users').authWithPassword(email, pass);
        mostrarApp();
    } catch (e) {
        alert("Error: " + e.message);
        btn.disabled = false;
        btn.textContent = "Entrar";
    }
}

function mostrarApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-main').style.display = 'block';
    cargarEventos();
}

// --- 3. GESTIÓN DE TABS Y FILTROS ---
function setTab(status) {
    currentTab = status;
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.status === status) t.classList.add('active');
    });
    cargarEventos();
}

function filtrarEventos() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const filtered = eventosActuales.filter(ev => 
        ev.titulo.toLowerCase().includes(search) || 
        ev.ubicacion.toLowerCase().includes(search)
    );
    renderizarEventos(filtered);
}

// --- 4. DATA FETCHING ---
async function cargarEventos() {
    try {
        if (!pb.authStore.isValid) return;

        // Filtramos por estado y usuario
        const registros = await pb.collection('MisEventos').getFullList({
            filter: `estado = '${currentTab}' && user = '${pb.authStore.model.id}'`,
            sort: 'fecha',
        });

        eventosActuales = registros;
        renderizarEventos(registros);
    } catch (err) {
        console.error("Error al cargar eventos:", err);
    }
}

function renderizarEventos(eventos) {
    const container = document.getElementById('event-list');
    container.innerHTML = '';

    if (eventos.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:50px; color:#64748b;">
                <div style="font-size:3rem; margin-bottom:15px;">🔍</div>
                <p>No hay eventos en esta categoría</p>
            </div>`;
        return;
    }

    eventos.forEach(ev => {
        const date = new Date(ev.fecha);
        const day = date.getDate();
        const month = date.toLocaleString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
        
        const imgUrl = ev.imagen 
            ? pb.files.getUrl(ev, ev.imagen) 
            : 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=600&q=80';

        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <img src="${imgUrl}" class="event-img" alt="${ev.titulo}">
            <div class="date-badge">
                <span class="month">${month}</span>
                <span class="day">${day}</span>
            </div>
            <div class="event-info">
                <div class="event-title">${ev.titulo}</div>
                <div class="event-meta">
                    <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        ${ev.horario || 'Sin horario'}
                    </div>
                    <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        ${ev.ubicacion || 'Sin ubicación'}
                    </div>
                </div>
                <div class="event-footer">
                    <div style="display:flex; gap:10px;">
                        ${ev.archivo ? `
                            <button class="btn-details" style="background:#f1f5f9; color:var(--text-dark);" onclick="window.open('${pb.files.getUrl(ev, ev.archivo)}', '_blank')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                Entrada
                            </button>` : ''}
                        <button class="btn-details" onclick="abrirModalEditar('${ev.id}')">Ver Detalles</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- 5. MODALS Y CRUD ---
function abrirModalNuevo() {
    eventoAEditar = null;
    document.getElementById('modal-titulo').textContent = 'Nuevo Evento';
    document.getElementById('ev-titulo').value = '';
    document.getElementById('ev-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('ev-horario').value = '';
    document.getElementById('ev-ubicacion').value = '';
    document.getElementById('ev-notas').value = '';
    document.getElementById('ev-archivo-file').value = '';
    document.getElementById('pdf-status').style.display = 'none';
    document.getElementById('delete-action').style.display = 'none';
    document.getElementById('modal-evento').style.display = 'flex';
}

function abrirModalEditar(id) {
    const ev = eventosActuales.find(e => e.id === id);
    if (!ev) return;

    eventoAEditar = id;
    document.getElementById('modal-titulo').textContent = 'Editar Evento';
    document.getElementById('ev-titulo').value = ev.titulo;
    document.getElementById('ev-fecha').value = ev.fecha.split(' ')[0];
    document.getElementById('ev-horario').value = ev.horario;
    document.getElementById('ev-ubicacion').value = ev.ubicacion;
    document.getElementById('ev-notas').value = ev.notas || '';
    document.getElementById('ev-archivo-file').value = '';
    document.getElementById('pdf-status').style.display = ev.archivo ? 'block' : 'none';
    if (ev.archivo) document.getElementById('pdf-status').textContent = "✓ Ya tiene entrada guardada";
    document.getElementById('delete-action').style.display = 'block';
    document.getElementById('modal-evento').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-evento').style.display = 'none';
}

async function guardarEvento() {
    const titulo = document.getElementById('ev-titulo').value.trim();
    const fechaInput = document.getElementById('ev-fecha').value;
    const horario = document.getElementById('ev-horario').value.trim();
    const ubicacion = document.getElementById('ev-ubicacion').value.trim();
    const notas = document.getElementById('ev-notas').value.trim();
    const fileInput = document.getElementById('ev-imagen-file');
    const pdfInput = document.getElementById('ev-archivo-file');

    if (!titulo || !fechaInput) return alert("El título y la fecha son obligatorios");

    // Calcular estado basado en la fecha
    const hoy = new Date().toISOString().split('T')[0];
    const estado = (fechaInput >= hoy) ? 'proximo' : 'pasado';

    const btn = document.getElementById('btn-save-ev');
    btn.disabled = true;
    btn.textContent = "Guardando...";

    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('fecha', fechaInput + " 12:00:00");
    formData.append('horario', horario);
    formData.append('ubicacion', ubicacion);
    formData.append('notas', notas);
    formData.append('estado', estado);
    formData.append('user', pb.authStore.model.id);

    if (fileInput.files[0]) formData.append('imagen', fileInput.files[0]);
    if (pdfInput.files[0]) formData.append('archivo', pdfInput.files[0]);

    try {
        if (eventoAEditar) {
            await pb.collection('MisEventos').update(eventoAEditar, formData);
            mostrarToast("Evento actualizado");
        } else {
            await pb.collection('MisEventos').create(formData);
            mostrarToast("Evento creado");
        }
        cerrarModal();
        cargarEventos();
    } catch (err) {
        alert("Error al guardar: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar Evento";
    }
}

async function borrarEventoActual() {
    if (!confirm("¿Seguro que quieres eliminar este evento?")) return;

    try {
        await pb.collection('MisEventos').delete(eventoAEditar);
        mostrarToast("Evento eliminado");
        cerrarModal();
        cargarEventos();
    } catch (err) {
        alert("Error al eliminar: " + err.message);
    }
}

function mostrarToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.opacity = '1';
    setTimeout(() => t.style.opacity = '0', 2000);
}
