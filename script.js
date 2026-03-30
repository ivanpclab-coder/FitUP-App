function obtenerFechaHoy() {
    const h = new Date();
    return `${h.getFullYear()}-${h.getMonth()+1}-${h.getDate()}`;
}

function calcularYGuardarRacha(historial) {
    let racha = 0;
    const hoy = new Date();
    for (let i = 0; i < 3650; i++) {
        const d = new Date(hoy);
        d.setDate(hoy.getDate() - i);
        const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        if (historial[key] === 'ok') racha++;
        else break;
    }
    user.racha = racha;
    localStorage.setItem('fitup_user_data', JSON.stringify(user));
    return racha;
}

function registrarDiaHidratacion() {
    const hoy = obtenerFechaHoy();
    let historial = JSON.parse(localStorage.getItem('fitup_historial') || '{}');
    const porcentaje = user.goal > 0 ? (user.current / user.goal) * 100 : 0;
    historial[hoy] = porcentaje >= 100 ? 'ok' : 'parcial';
    localStorage.setItem('fitup_historial', JSON.stringify(historial));
    calcularYGuardarRacha(historial);
}

document.addEventListener('DOMContentLoaded', () => {
    // ── SISTEMA DE AUTENTICACIÓN POR CÓDIGO DE BOTELLA ──────────
    const codigoVinculado = localStorage.getItem('fitup_autenticado');

    if (!codigoVinculado) {
        // No hay código vinculado → mostrar pantalla de login
        mostrarLogin();

        if (typeof gestionarBotonesInstalacion === 'function') gestionarBotonesInstalacion();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(() => console.log('✅ FitUP SW registrado'))
                .catch((err) => console.error('❌ SW error:', err));
        }
        return; // Detener aquí — el resto lo maneja el login
    }

    // ── YA HAY CÓDIGO VINCULADO → flujo normal ───────────────────
    const datosGuardados = localStorage.getItem('fitup_user_data');

    if (datosGuardados) {
        user = JSON.parse(datosGuardados);

        const fechaGuardada = user.fechaUltimoDia || '';
        const fechaHoy = obtenerFechaHoy();

        if (fechaGuardada && fechaGuardada !== fechaHoy) {
            let historial = JSON.parse(localStorage.getItem('fitup_historial') || '{}');
            const porcentajeAyer = user.goal > 0 ? Math.min(100, Math.round((user.current / user.goal) * 100)) : 0;
            historial[fechaGuardada] = porcentajeAyer >= 100 ? 'ok' : (porcentajeAyer > 0 ? 'parcial' : 'none');
            localStorage.setItem('fitup_historial', JSON.stringify(historial));
            calcularYGuardarRacha(historial);
            user.current = 0;
        }

        user.fechaUltimoDia = fechaHoy;
        localStorage.setItem('fitup_user_data', JSON.stringify(user));

        cargarDatosEnFormulario();
        requestAnimationFrame(() => {
            showScreen('screen-dash');
        });
    } else {
        showScreen('screen-access');
    }

    if (typeof gestionarBotonesInstalacion === 'function') gestionarBotonesInstalacion();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('✅ FitUP SW registrado'))
            .catch((err) => console.error('❌ SW error:', err));
    }
});

let user = { 
    name: "", 
    goal: 0, 
    current: 0, 
    imc: "", 
    activity: "", 
    routines: [], 
    selectedEx: "", 
    racha: 0, 
    history: [false, false, false, false, false, false, false] 
};

function showScreen(id) {
    const container = document.getElementById('app-container');

    const temas = {
        'screen-dash': '#5e9918', 
        'screen-access': '#16915e',
        'screen-hidratacion': '#c98fdb',
        'screen-data': '#f39c12',
        'screen-config': '#f8bf89',
        'screen-progreso': '#9b59b6'
    };

    const color = temas[id] || '#00d1ff';
    if(container) {
        container.style.setProperty('--chasis-color', color);
    }

    // --- MEJORA: LIMPIEZA TOTAL DE PANTALLAS ---
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none'; // Forzamos que desaparezca del flujo
    });

    const target = document.getElementById(id);
    if(target) {
        target.classList.add('active');
        target.style.display = 'block'; // Solo mostramos la pantalla actual
    }

    // 2. Controlar visibilidad de Header y Nav
    const uiHeader = document.getElementById('ui-header');
    const navBottom = document.getElementById('nav-bottom');
    const publicScreens = ['screen-dash', 'screen-progreso', 'screen-hidratacion', 'screen-data', 'screen-about'];

    if(publicScreens.includes(id)) {
        if(uiHeader) uiHeader.style.display = 'flex';
        if(navBottom) navBottom.style.display = 'flex';
    } else {
        if(uiHeader) uiHeader.style.display = 'none';
        if(navBottom) navBottom.style.display = 'none';
    }

    // --- Lógica Específica (Mantenemos tu código original) ---
    if(id === 'screen-progreso') {
        renderProgreso();
    }

    if(id === 'screen-hidratacion') {
        renderHidratacion();
    }

    if (id === 'screen-config') {
        cargarDatosEnFormulario();
    }

    if(id === 'screen-dash') {
        // Actualizar textos básicos del usuario
        if(document.getElementById('user-display')) document.getElementById('user-display').innerText = user.name || "Usuario";
        if(document.getElementById('dash-imc')) document.getElementById('dash-imc').innerText = user.imc || "--";
        if(document.getElementById('dash-goal')) document.getElementById('dash-goal').innerText = (user.goal || 0) + " ml";
        
        actualizarWidgetEjercicios();
        initCharts(); 
        updateUI();
    }

    if(id === 'screen-data') {
        mostrarTipAleatorio();
    }
}
// Nueva función independiente para no saturar showScreen
function actualizarWidgetEjercicios() {
    const actVal = document.getElementById('dash-act-val');
    const nivVal = document.getElementById('dash-niv-val');
    const listCont = document.getElementById('dash-rutinas-list');
    const barra = document.getElementById('dash-rutina-bar');
    const countTxt = document.getElementById('dash-rutina-count');
    const msgFinal = document.getElementById('msg-finalizado');
    
    if(!actVal || !listCont || !barra) return; 

    // --- DICCIONARIO UNIFICADO (Nombres exactos .png) ---
    const iconosRutinas = {
        "Caminar": "CAMINAR o TROTAR__.png",
        "Caminar en plano": "CAMINAR o TROTAR__.png",
        "Caminar en subida": "CAMINAR EN SUBIDA.png",
        "Caminar y trotar": "CAMINAR o TROTAR__.png",
        "Trotar": "CAMINAR o TROTAR__.png",
        "Correr y trotar": "CAMINAR o TROTAR__.png",
        "Carrera rápida": "carrera_rápida.png",
        "Carrera rápida ida y vuelta": "carrera_rápida_ida_y_vuelta.png",
        "Velocidad": "VELOCIDAD.png",
        "Saltos de tijera": "saltos_de_tijera.png",
        "Saltos suaves": "saltos_suaves.png",
        "Saltos cortos": "SALTOS CORTOS.png",
        "Pasos de lado": "pasos_de_lado.png",
        "Rodillas al pecho": "RODILLAS AL PECHO.png",
        "Rodillas arriba": "RODILLAS AL PECHO.png",
        "Talones al glúteo": "TALONES AL GLUTEO.png",
        "Sentadillas": "SENTADILLA.png",
        "Lagartijas": "lagartijas.png",
        "Abdominales": "ABDOMINALES.png",
        "Plancha": "PLANCHA.png",
        "Salto con lagartija": "SALTO CON LAGARTIJA.png",
        "Calentamiento": "calentamiento.png",
        "Subir cuestas cortas": "SUBIR CUESTAS CORTAS.png",
        "Subir gradas": "SUBIR GRADAS.png",
        "Pasos largos hacia arriba": "PASOSLARGOSARRIBA.png",
        "Estiramiento fijo": "estiramiento_fijo.png",
        "Círculos de hombros": "circulo_de_hombros.png",
        "Equilibrio en un pie": "EQUILIBRIO EN UN PIE.png",
        "Arqueo de espalda": "ARQUEO DE ESPALDA.png",
        "Pasos largos": "PasosLargosFlexi.png",
        "Apertura de cadera": "APERTURA DE CADERA.png",
        "Burbujas": "BURBUJAS.png",
        "Patadas tabla": "PATADAS TABLA.png",
        "Nado suave": "NADO SUAVE O CONTINUO.png",
        "Nado continuo": "nado_continuo.png",
        "Solo brazada": "BRAZADA.png"
    };

    actVal.innerText = (user.activity || "Bajo").toUpperCase();
    nivVal.innerText = (user.level || "Básico").toUpperCase();

    listCont.innerHTML = "";
    let completados = 0;

    if(!user.routines || user.routines.length === 0) {
        listCont.innerHTML = "<p style='font-size:0.7rem; color:#999; text-align:center;'>No hay rutinas activas.</p>";
        actualizarProgresoRutina(0, 0);
        return;
    }

    user.routines.forEach((rutinaNombre, i) => {
        const div = document.createElement('div');
        
        // --- LÓGICA DE BÚSQUEDA DE IMAGEN ---
        // Extraemos el nombre antes de los ":" y antes de cualquier "("
        const nombreLimpio = rutinaNombre.split(':')[0].split('(')[0].trim();
        const rutaImagen = iconosRutinas[nombreLimpio];

        const imgHTML = rutaImagen 
            ? `<img src="${rutaImagen}" style="width:35px; height:35px; border-radius:8px; object-fit:cover; margin-right:12px; border:1px solid #00D1FF; background:white;">`
            : `<div style="width:35px; margin-right:12px;"></div>`;

        div.className = "rutina-item-dash";
        div.style = `
            background: white; 
            padding: 10px; 
            border-radius: 12px; 
            border: 1px solid #AABFC1; 
            font-size: 0.75rem; 
            font-weight: 800; 
            cursor: pointer; 
            display: flex; 
            align-items: center;
            margin-bottom: 8px;
            transition: 0.3s;
        `;
        
        div.innerHTML = `
            ${imgHTML}
            <span style="flex:1;">${rutinaNombre}</span> 
            <span class="status-icon">⭕</span>
        `;
        
        div.onclick = function() {
            if(!this.dataset.done) {
                this.dataset.done = "true";
                this.style.background = "#E0F7FA"; 
                this.style.borderColor = "#00D1FF";
                this.style.opacity = "0.7";
                this.querySelector('span').style.textDecoration = "line-through";
                this.querySelector('.status-icon').innerText = "✅";
                
                completados++;
                actualizarProgresoRutina(completados, user.routines.length);
            }
        };
        listCont.appendChild(div);
    });

    function actualizarProgresoRutina(done, total) {
        const porcentaje = total > 0 ? (done / total) * 100 : 0;
        barra.style.width = porcentaje + "%";
        countTxt.innerText = `${done}/${total}`;
        
        if(total > 0 && done === total) {
            if(msgFinal) msgFinal.style.display = "block";
            barra.style.background = "linear-gradient(90deg, #00D1FF, #00FF88)";
        } else {
            if(msgFinal) msgFinal.style.display = "none";
            barra.style.background = "var(--cian)";
        }
    }

    actualizarProgresoRutina(0, user.routines.length);
}


let circChart = null;

function startLoading() {
    // 1. Elementos de la UI
    const btnSync = document.getElementById('btn-sync');
    const loadingArea = document.getElementById('loading-area');
    const progressBar = document.getElementById('bar');
    const screenAccess = document.getElementById('screen-access');

    // 2. Iniciar simulación de carga
    if(btnSync) btnSync.style.display = 'none';
    if(loadingArea) loadingArea.style.display = 'block';
    
    // Pequeño delay para que el CSS detecte el cambio de 0 a 100%
    setTimeout(() => {
        if(progressBar) progressBar.style.width = '100%';
    }, 100);

    // 3. Cambio de pantalla tras 3 segundos
    setTimeout(() => {
        // Ocultamos la pantalla de acceso completamente
        screenAccess.classList.remove('active');
        screenAccess.style.display = 'none'; 

        // Usamos la función global para mostrar la siguiente pantalla
        // Esto asegura que se activen los estilos y el menú superior
        showScreen('screen-config');
        
    }, 3000);
}

function handleSaveData() {
    const n   = document.getElementById('in-name').value.trim();
    const age = parseInt(document.getElementById('in-age').value);
    const w   = parseFloat(document.getElementById('in-weight').value);
    const h   = parseFloat(document.getElementById('in-height').value);
    const gen = document.getElementById('in-gen').value;
    const act = document.getElementById('in-act').value;

    // Validaciones
    const regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!regexNombre.test(n) || n === "") {
        alert("⚠️ NOMBRE: Solo se permiten letras.");
        document.getElementById('in-name').focus();
        return;
    }
    if (isNaN(age) || age < 6 || age > 80) {
        alert("⚠️ EDAD: Rango permitido 6 a 80 años.");
        document.getElementById('in-age').focus();
        return;
    }
    if (isNaN(w) || w < 30 || w > 200) {
        alert("⚠️ PESO: Rango permitido 30kg a 200kg.");
        document.getElementById('in-weight').focus();
        return;
    }
    if (isNaN(h) || h < 1.0 || h > 2.3) {
        alert("⚠️ ALTURA: Rango permitido 1.0m a 2.30m (ej: 1.75).");
        document.getElementById('in-height').focus();
        return;
    }

    // Cálculo IMC
    const imcValue = (w / (h * h)).toFixed(1);

    // Categoría IMC
    let categoria = "";
    let colorCat  = "";
    if      (imcValue < 18.5)  { categoria = "Bajo peso";       colorCat = "#3498db"; }
    else if (imcValue <= 24.9) { categoria = "Peso saludable";  colorCat = "#27ae60"; }
    else if (imcValue <= 29.9) { categoria = "Sobrepeso";       colorCat = "#f39c12"; }
    else                       { categoria = "Obesidad";         colorCat = "#e74c3c"; }

    // Nivel de entrenamiento
    let nivelEntreno = "";
    if      (act === "Bajo"  && (categoria === "Bajo peso" || categoria === "Peso saludable")) nivelEntreno = "Básico";
    else if (act === "Bajo"  && (categoria === "Sobrepeso" || categoria === "Obesidad"))       nivelEntreno = "Principiante";
    else if (act === "Medio")  nivelEntreno = "Intermedio";
    else if (act === "Alto")   nivelEntreno = "Avanzado";
    else                       nivelEntreno = "Adaptativo";

    // Meta de agua
    let extraAgua = 0;
    if (act === 'Medio') extraAgua = 400;
    if (act === 'Alto')  extraAgua = 800;
    const meta = Math.round((w * 35) + extraAgua);

    // Guardar en objeto global
    user.name      = n;
    user.age       = age;
    user.weight    = w;
    user.height    = h;
    user.gender    = gen;
    user.activity  = act;
    user.imc       = imcValue;
    user.categoria = categoria;
    user.level     = nivelEntreno;
    user.goal      = meta;

    // Guardar en localStorage
    localStorage.setItem('fitup_user_data', JSON.stringify(user));

    // Actualizar interfaz — con verificación individual de cada elemento
    const elIMC    = document.getElementById('res-imc');
    const elCat    = document.getElementById('res-cat');
    const elNivel  = document.getElementById('res-nivel-entreno');
    const elWater  = document.getElementById('res-water');
    const elLabels = document.getElementById('results-labels');
    const elBtn    = document.getElementById('btn-empezar');

    if (elIMC)    elIMC.innerText              = "IMC: " + imcValue;
    if (elCat)  { elCat.innerText              = "Categoría: " + categoria; elCat.style.color = colorCat; }
    if (elNivel)  elNivel.innerText            = nivelEntreno;
    if (elWater)  elWater.innerText            = "HIDRATACIÓN DIARIA: " + meta + " ml";
    if (elLabels) elLabels.style.display       = 'block';
    if (elBtn)  { elBtn.style.display          = 'block'; elBtn.style.opacity = '1'; }

    alert("✅ ¡Datos guardados con éxito!\nIMC: " + imcValue + " | Nivel: " + nivelEntreno + "\nMeta de agua: " + meta + " ml/día");
}

function goToExerciseSelect() {
    document.getElementById('exercise-greet').innerText = "¡Hola, " + user.name + "!";
    
    // USAR EL DATO LIMPIO QUE GUARDAMOS EN EL PASO ANTERIOR
    let nivelActual = user.level || "Básico"; 
    
    let tiempo = 0;
    if (nivelActual.includes("Básico")) tiempo = 3;
    else if (nivelActual.includes("Principiante")) tiempo = 6;
    else if (nivelActual.includes("Intermedio")) tiempo = 9;
    else if (nivelActual.includes("Avanzado")) tiempo = 12;

    const valTiempoElem = document.getElementById('val-tiempo');
    if (valTiempoElem) valTiempoElem.innerText = tiempo + " minutos";
    
    const summary = document.getElementById('summary-container');
    if (summary) {
        // Aquí solo ponemos el nivel, sin repetir "Nivel de ejercicio"
        summary.innerHTML = `<div class="info-badge">${nivelActual}</div>`;
    }
    
    showScreen('screen-exercise-select');
}


// Modificar esta parte en showScreen para capturar las rutinas seleccionadas
let rutinasCompletadas = 0;

function renderDashActivity() {
    // 1. Mostrar Textos de Actividad y Nivel
    document.getElementById('dash-act-val').innerText = user.activity.toUpperCase();
    
    const nivelTexto = document.getElementById('res-nivel-entreno').innerText.replace("Nivel de Ejercicio: ", "");
    document.getElementById('dash-niv-val').innerText = nivelTexto.toUpperCase();

    // 2. Renderizar la lista de rutinas como botones de check
    const container = document.getElementById('dash-rutinas-list');
    container.innerHTML = "";
    
    if (user.routines.length === 0) {
        container.innerHTML = "<p style='font-size:0.7rem; color:#999;'>No hay rutinas seleccionadas.</p>";
        return;
    }

    rutinasCompletadas = 0;
    updateRutinaBar();

    user.routines.forEach((rutina, index) => {
        const item = document.createElement('div');
        item.className = 'rutina-item-dash';
        item.style = "background:white; padding:10px; border-radius:10px; border:1px solid var(--border); font-size:0.8rem; font-weight:700; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition: 0.3s;";
        item.innerHTML = `<span>${rutina}</span> <span class="check-mark">⭕</span>`;
        
        item.onclick = function() {
            if(!this.classList.contains('done')) {
                this.classList.add('done');
                this.style.background = "#e0f7fa";
                this.style.borderColor = "var(--cian)";
                this.querySelector('.check-mark').innerText = "✅";
                rutinasCompletadas++;
                updateRutinaBar();
            }
        };
        container.appendChild(item);
    });
}

function updateRutinaBar() {
    const total = user.routines.length;
    const porcentaje = total > 0 ? (rutinasCompletadas / total) * 100 : 0;
    
    document.getElementById('dash-rutina-bar').style.width = porcentaje + "%";
    document.getElementById('dash-rutina-count').innerText = `${rutinasCompletadas}/${total} Completado`;

    // Mostrar mensaje final
    const msg = document.getElementById('msg-finalizado');
    if(total > 0 && rutinasCompletadas === total) {
        msg.style.display = "block";
    } else {
        msg.style.display = "none";
    }
}

// Asegúrate de llamar a renderDashActivity() dentro de showScreen('screen-dash')

function renderHidratacion() {

   
    // 1. Datos de texto
    document.getElementById('hid-meta-ml').innerText = user.goal + " ml";
    document.getElementById('hid-act').innerText = (user.activity || "BAJO").toUpperCase();
    document.getElementById('hid-ex').innerText = (user.selectedEx || "NINGUNO").toUpperCase();
    
    // 2. Cálculos de botellas (500ml cada una)
    const metaBotellas = Math.ceil(user.goal / 500);
    const faltanML = Math.max(0, user.goal - user.current);
    const faltanBotellas = (faltanML / 500).toFixed(1);
    
    document.getElementById('hid-meta-botellas').innerText = metaBotellas;
    document.getElementById('hid-faltan-botellas').innerText = faltanBotellas;
    
    // 3. Llenado visual de la botella
    
    

    const porcentaje = Math.round((user.current / user.goal) * 100) || 0;
    
    // Actualizamos el líquido dentro de la nueva forma
    const liquid = document.getElementById('widget-bottle-fill');
    const text = document.getElementById('widget-perc-txt');
    
    if (liquid) liquid.style.height = Math.min(100, porcentaje) + "%";
    if (text) text.innerText = porcentaje + "%";

   // Localiza donde se genera el HTML de la hidratación y usa esto:
let htmlHidratacion = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: transparent !important; border: none !important; box-shadow: none !important;">
        <img src="boteverde.png" alt="Botellas" 
             style="width: 120px; 
                    height: auto; 
                    display: block; 
                    margin: 0 auto; 
                    filter: none !important; 
                    background: transparent !important; 
                    border: none !important;">
    </div>
`;
}

// Función para sumar 400ml
function drinkBottle() {
    if(user.goal > 0) {
        user.current = Math.min(user.current + 400, user.goal);
        renderHidratacion(); // Actualiza esta pantalla
        updateUI();          // Actualiza el Dashboard (Gota y Gráfico)
    }
}

// Función para sumar 250ml
function addWater() {
    if(user.goal > 0) { 
        user.current = Math.min(user.current + 250, user.goal); 
        renderHidratacion();
        updateUI(); 
    }
}



function updateUI() {
    if(user.goal === 0) return;
    
    const p = Math.round((user.current / user.goal) * 100);
    const percentage = Math.min(100, p); // Asegura que no pase de 100
    
    // 1. Actualizar texto de porcentaje
    document.getElementById('txt-perc').innerText = percentage + "%";
    
    // 2. Actualizar el FONDO DE AGUA (El efecto que pediste)
    const waterFill = document.getElementById('dash-water-fill');
    if(waterFill) {
        waterFill.style.height = percentage + "%";
    }
    
    // 3. Cambiar imagen de la gota según progreso
    const img = document.getElementById('status-drop');
    if(percentage <= 30) img.src = 'GotaLlora.png'; 
    else if(percentage <= 70) img.src = 'Gotacansada.png'; 
    else img.src = 'gotalegre.png';
    
    // Marcar fecha del día activo
    user.fechaUltimoDia = obtenerFechaHoy();

    // Registrar automáticamente cuando se completa la meta
    if (percentage >= 100) {
        registrarDiaHidratacion();
    }

    // Guardar consumo actual del día
    localStorage.setItem('fitup_user_data', JSON.stringify(user));

    // 4. Actualizar el anillo de Chart.js
    if(circChart) { 
        circChart.data.datasets[0].data = [user.current, Math.max(0, user.goal - user.current)]; 
        circChart.update(); 
    }
}


function initCharts() {
    if(circChart) {
        // Si ya existe, solo actualizamos los datos
        circChart.data.datasets[0].data = [user.current, Math.max(0, user.goal - user.current)];
        circChart.update();
        return;
    }
    
    const ctx = document.getElementById('circleChart').getContext('2d');
    circChart = new Chart(ctx, { 
        type: 'doughnut', 
        data: { 
            datasets: [{ 
                data: [user.current, user.goal - user.current || 100], 
                backgroundColor: ['#62db6d', 'rgba(170, 191, 193, 0.2)'], 
                borderWidth: 0,
                borderRadius: 10,
                hoverOffset: 4
            }] 
        }, 
        options: { 
            cutout: '85%', 
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            animation: { duration: 2000, animateRotate: true }
        } 
    });
}


// ── SISTEMA DE RACHAS Y PROGRESO PERSISTENTE ─────────────────



function renderProgreso() {
    const ahora = new Date();
    const nombresMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                          "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

    // Cargar historial guardado
    let historial = JSON.parse(localStorage.getItem('fitup_historial') || '{}');

    // Registrar consumo de hoy automáticamente
    const hoy = obtenerFechaHoy();
    const porcentajeHoy = user.goal > 0 ? Math.min(100, Math.round((user.current / user.goal) * 100)) : 0;
    historial[hoy] = porcentajeHoy >= 100 ? 'ok' : (porcentajeHoy > 0 ? 'parcial' : 'none');
    localStorage.setItem('fitup_historial', JSON.stringify(historial));

    // Calcular racha
    const racha = calcularYGuardarRacha(historial);

    // Calcular totales históricos
    const diasTotales   = Object.values(historial).filter(v => v === 'ok').length;
    const semanas       = Math.floor(diasTotales / 7);
    const meses         = Math.floor(diasTotales / 30);
    const años          = Math.floor(diasTotales / 365);
    const litrosTotales = (diasTotales * (user.goal || 0) / 1000).toFixed(1);

    // ── RENDER DEL HTML ──────────────────────────────────────
    const screen = document.getElementById('screen-progreso');
    if (!screen) return;

    screen.innerHTML = `
    <style>
        .prog-hero {
            background: linear-gradient(135deg, #0a0f19 0%, #0d2137 100%);
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 16px;
            text-align: center;
            border: 1px solid rgba(0,209,255,0.2);
            box-shadow: 0 8px 32px rgba(0,209,255,0.1);
            width: 100%;
        }
        .prog-title {
            font-size: 1.4rem;
            font-weight: 900;
            letter-spacing: 3px;
            background: linear-gradient(90deg, #00D1FF, #0077FF);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 4px;
        }
        .prog-subtitle {
            font-size: 0.65rem;
            color: #a3d4f3;
            font-weight: 700;
            letter-spacing: 2px;
        }
        .racha-ring {
            width: 130px;
            height: 130px;
            border-radius: 50%;
            background: conic-gradient(#ff4500 0%, #ff8c00 40%, #ffbe24 70%, #ff4500 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 16px auto;
            box-shadow: 0 0 30px rgba(255,69,0,0.5);
            animation: rachaPulse 2s ease-in-out infinite;
            position: relative;
        }
        .racha-ring::before {
            content: '';
            position: absolute;
            width: 110px;
            height: 110px;
            border-radius: 50%;
            background: #0a0f19;
        }
        .racha-inner {
            position: relative;
            z-index: 2;
            text-align: center;
        }
        .racha-num {
            font-size: 2.2rem;
            font-weight: 900;
            color: #ffbe24;
            line-height: 1;
            display: block;
        }
        .racha-label {
            font-size: 0.55rem;
            color: #ff8c00;
            font-weight: 800;
            letter-spacing: 1px;
        }
        @keyframes rachaPulse {
            0%, 100% { box-shadow: 0 0 20px rgba(255,69,0,0.4); }
            50%       { box-shadow: 0 0 40px rgba(255,140,0,0.8); }
        }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            width: 100%;
            margin-bottom: 16px;
        }
        .stat-card {
            background: linear-gradient(135deg, #0d2137, #0a0f19);
            border-radius: 16px;
            padding: 14px 10px;
            text-align: center;
            border: 1px rgba(0,209,255,0.15);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    
            /* CAMBIOS AQUÍ */
            color: #ffffff; 
            font-family: arial; /* Fuente limpia */
            
        }
        .stat-icon { font-size: 1.4rem; margin-bottom: 4px; }
        .stat-val  { font-size: 1.5rem; font-weight: 900; color: #00D1FF; line-height: 1; }
        .stat-lbl  { font-size: 0.55rem; color: #55eae7; font-weight: 800; letter-spacing: 1px; margin-top: 3px; }
        .prog-section {
            background: #fff;
            border-radius: 18px;
            padding: 16px;
            margin-bottom: 14px;
            width: 100%;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            border: 1px solid #eef2f7;
        }
        .prog-section-title {
            font-size: 0.7rem;
            font-weight: 900;
            color: #1575d5;
            letter-spacing: 2px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .cal-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }
        .cal-header {
            font-size: 0.55rem;
            font-weight: 900;
            color: #aaa;
            text-align: center;
            padding-bottom: 4px;
        }
        .cal-cell {
            aspect-ratio: 1;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.6rem;
            font-weight: 800;
        }
        .week-bar-row {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 6px;
            height: 80px;
        }
        .week-bar-wrap {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            height: 100%;
            justify-content: flex-end;
        }
        .week-bar-bg {
            width: 100%;
            background: #f0f0f0;
            border-radius: 6px;
            height: 100%;
            display: flex;
            align-items: flex-end;
            overflow: hidden;
        }
        .week-bar-fill {
            width: 100%;
            border-radius: 6px;
            transition: height 0.8s ease;
        }
        .week-bar-lbl {
            font-size: 0.55rem;
            font-weight: 900;
            color: #aaa;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
            font-size: 0.75rem;
        }
        .info-row:last-child { border-bottom: none; }
        .info-row-key { color: #999; font-weight: 700; }
        .info-row-val { color: #1575d5; font-weight: 900; }
        .meta-bar-wrap { margin-top: 10px; }
        .meta-bar-bg {
            height: 10px;
            background: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 6px;
        }
        .meta-bar-fill {
            height: 100%;
            border-radius: 10px;
            background: linear-gradient(90deg, #00D1FF, #0077FF);
            transition: width 1s ease;
        }
    </style>

    <!-- HERO -->
    <div class="prog-hero">
        <div class="prog-title">📈 MI PROGRESO</div>
        
        <div class="racha-ring">
            <div class="racha-inner">
                <span class="racha-num">${racha}</span>
                <span class="racha-label">🔥 DÍAS</span>
            </div>
        </div>
        <div style="font-size:0.8rem; color: #cdd4d5; font-weight:800;">RACHA ACTUAL DE HIDRATACIÓN</div>
        <div style="font-size:0.7rem; color: #d1cbcb; margin-top:4px;">
            ${racha === 0 ? '¡Comienza hoy tu racha! 💧' : racha < 7 ? '¡Vas muy bien! Sigue así 💪' : racha < 30 ? '¡Eres imparable! 🚀' : '¡Leyenda de la hidratación! 🏆'}
        </div>
    </div>

    <!-- ESTADÍSTICAS GLOBALES -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-val">${diasTotales}</div>
            <div style="font-size:0.7rem; color: #eceeef; margin-top:4px;">
            Días completados</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📆</div>
            <div class="stat-val">${semanas}</div>
            <div style="font-size:0.7rem; color: #eceeef; margin-top:4px;">
            Semana</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🗓️</div>
            <div class="stat-val">${meses}</div>
            <div style="font-size:0.7rem; color: #eceeef; margin-top:4px;">
            Meses</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">💧</div>
            <div class="stat-val">${litrosTotales}L</div>
            <div style="font-size:0.7rem; color: #eceeef; margin-top:4px;">
           Litros totales</div>
        </div>
    </div>

    <!-- META DE HOY -->
    <div class="prog-section">
        <div class="prog-section-title">💧 META DE HOY</div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.75rem; font-weight:700; color:#333;">${user.current || 0} ml / ${user.goal || 0} ml</span>
            <span style="font-size:0.75rem; font-weight:900; color:${porcentajeHoy>=100?'#27ae60':'#1575d5'};">${porcentajeHoy}%</span>
        </div>
        <div class="meta-bar-bg">
            <div class="meta-bar-fill" style="width:${porcentajeHoy}%; background:${porcentajeHoy>=100?'linear-gradient(90deg,#27ae60,#2ecc71)':'linear-gradient(90deg,#00D1FF,#0077FF)'};"></div>
        </div>
    </div>

    <!-- CONSUMO SEMANAL -->
    <div class="prog-section">
        <div class="prog-section-title">📊 ESTA SEMANA</div>
        <div class="week-bar-row" id="prog-week-bars"></div>
    </div>

    <!-- CALENDARIO MENSUAL -->
    <div class="prog-section">
        <div class="prog-section-title">📅 ${nombresMeses[ahora.getMonth()].toUpperCase()} ${ahora.getFullYear()}</div>
        <div class="cal-grid">
            ${['L','M','X','J','V','S','D'].map(d=>`<div class="cal-header">${d}</div>`).join('')}
            <div id="prog-cal-body" style="display:contents;"></div>
        </div>
    </div>

    <!-- DATOS DEL PERFIL -->
    <div class="prog-section">
        <div class="prog-section-title">👤 MI PERFIL</div>
        <div class="info-row"><span class="info-row-key">IMC</span><span class="info-row-val">${user.imc || '--'}</span></div>
        <div class="info-row"><span class="info-row-key">Categoría</span><span class="info-row-val">${user.categoria || '--'}</span></div>
        <div class="info-row"><span class="info-row-key">Nivel</span><span class="info-row-val">${user.level || '--'}</span></div>
        <div class="info-row"><span class="info-row-key">Actividad</span><span class="info-row-val">${(user.activity||'--').toUpperCase()}</span></div>
        <div class="info-row"><span class="info-row-key">Meta diaria</span><span class="info-row-val">${user.goal || 0} ml</span></div>
        <div class="info-row"><span class="info-row-key">Ejercicio</span><span class="info-row-val">${(user.selectedEx||'Pendiente').toUpperCase()}</span></div>
    </div>
    `;

    // ── BARRAS SEMANALES ─────────────────────────────────────
    const diasLetras = ['L','M','X','J','V','S','D'];
    const diaSemana  = (ahora.getDay() + 6) % 7;
    const barsEl     = document.getElementById('prog-week-bars');

    diasLetras.forEach((letra, i) => {
        const d = new Date(ahora);
        d.setDate(ahora.getDate() - diaSemana + i);
        const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        const estado = historial[key];

        let altura = 0;
        let color  = '#00D1FF';
        if (estado === 'ok')      { altura = 100; color = '#27ae60'; }
        else if (estado === 'parcial') { altura = 50;  color = '#f39c12'; }
        else if (i < diaSemana)   { altura = 0;   color = '#e74c3c'; }

        const isHoy = i === diaSemana;

        barsEl.innerHTML += `
        <div class="week-bar-wrap">
            <div class="week-bar-bg" style="border: ${isHoy?'2px solid #00D1FF':'none'}; border-radius:6px;">
                <div class="week-bar-fill" style="height:${altura}%; background:${color};"></div>
            </div>
            <div class="week-bar-lbl" style="color:${isHoy?'#00D1FF':'#aaa'}">${letra}</div>
        </div>`;
    });

    // ── CALENDARIO MENSUAL ───────────────────────────────────
    const calEl        = document.getElementById('prog-cal-body');
    const primerDia    = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const offsetInicio = (primerDia.getDay() + 6) % 7;
    const totalDias    = new Date(ahora.getFullYear(), ahora.getMonth()+1, 0).getDate();
    const diaHoyNum    = ahora.getDate();

    let calHTML = '';
    for (let e = 0; e < offsetInicio; e++) calHTML += `<div></div>`;

    for (let d = 1; d <= totalDias; d++) {
        const key    = `${ahora.getFullYear()}-${ahora.getMonth()+1}-${d}`;
        const estado = historial[key];
        const esHoy  = d === diaHoyNum;

        let bg   = '#f5f5f5';
        let color= '#ccc';
        let txt  = d;

        if (estado === 'ok')           { bg = '#27ae60'; color = 'white'; txt = '✔'; }
        else if (estado === 'parcial') { bg = '#f39c12'; color = 'white'; txt = '~'; }
        else if (d < diaHoyNum)        { bg = '#fce4e4'; color = '#e74c3c'; txt = '✘'; }

        const borde = esHoy ? 'border:2px solid #00D1FF;' : '';
        calHTML += `<div class="cal-cell" style="background:${bg}; color:${color}; ${borde}">${txt}</div>`;
    }
    calEl.innerHTML = calHTML;
}
// ─────────────────────────────────────────────────────────────

function previewPhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            document.getElementById('profile-img-preview').src = e.target.result;
            user.photo = e.target.result;
            localStorage.setItem('fitup_user_data', JSON.stringify(user)); // ← línea nueva
        }
        
        reader.readAsDataURL(input.files[0]);
    }
}


// --- BASE DE DATOS MÁSTER ---
const rutinasDB = {
    "Básico": {
        "CANCHA": { ej: ["Caminar: 3x1min", "Saltos de tijera: 3x15", "Rodillas al pecho: 3x20", "Pasos de lado: 3x10m", "Saltos cortos: 3x15", "Carrera rápida ida y vuelta: 3x20m"], desc: "Descanso: 30-45 segundos." },
        "PISTA": { ej: ["Caminar y trotar: 3x1min", "Carrera rápida: 4x30m", "Correr y trotar: 3x1min", "Rodillas arriba: 3x20", "Trotar: 3x2min", "Talones al glúteo: 3x30"], desc: "Descanso: 1 minuto (en velocidad)." },
        "MONTAÑA": { ej: ["Caminar en plano: 3x2min", "Subir cuestas cortas (completas): 3 veces", "Subir gradas (completas): 3 subidas", "Saltos suaves: 3x10", "Caminar en subida: 3x2min", "Pasos largos hacia arriba: 2x10m"], desc: "Descanso: 1 minuto." },
        "FUERZA": { ej: ["Sentadillas: 3x10", "Lagartijas: 3x8", "Abdominales: 3x10", "Plancha: 3x20seg", "Calentamiento: 3x1min", "Salto con lagartija: 3x5"], desc: "Descanso: 40-60 seg." },
        "FLEXIBILIDAD": { ej: ["Estiramiento fijo: 2x15", "Círculos de hombros: 2x10", "Pasos largos: 2x10", "Equilibrio en un pie: 2x15 c/pie", "Arqueo de espalda: 2x10", "Apertura de cadera: 2x15seg cada lado"], desc: "Descanso: 20-30 seg." },
        "ACUÁTICO": { ej: ["Burbujas: 3x30", "Patadas tabla: 3x50m", "Nado suave: 3x15min", "Nado continuo (rápido): 2x5min", "Solo brazada: 3x50m", "Velocidad: 2x100m"], desc: "Descanso: 30-60 seg." }
    },
    "Principiante": {
        "CANCHA": { ej: ["Caminar: 3x2min", "Saltos de tijera: 3x25", "Rodillas al pecho: 3x40", "Pasos de lado: 3x15m", "Saltos cortos: 3x20", "Carrera rápida ida y vuelta: 3x40m"], desc: "Descanso: 30-45 segundos." },
        "PISTA": { ej: ["Caminar y trotar: 3x2min", "Correr y trotar: 3x3min", "Carrera rápida: 6x40m", "Rodillas arriba: 3x40", "Trotar: 4x2min", "Talones al glúteo: 3x4"], desc: "Descanso: 1 minuto (en velocidad)." },
        "MONTAÑA": { ej: ["Caminar en plano: 3x3min", "Subir cuestas cortas(completas): 4 veces", "Subir gradas (completas): 4 subidas", "Saltos suaves: 3x15", "Caminar en subida: 3x4min", "Pasos largos hacia arriba: 2x12m"], desc: "Descanso: 1 minuto." },
        "FUERZA": { ej: ["Sentadillas: 3x15", "Lagartijas: 3x12", "Abdominales: 3x15", "Plancha: 3x30seg", "Calentamiento: 3x2min", "Salto con lagartija: 3x8"], desc: "Descanso: 40-60 seg." },
        "FLEXIBILIDAD": { ej: ["Estiramiento fijo: 2x20", "Círculos de hombros: 2x15", "Pasos largos: 2x12", "Equilibrio: 2x20min", "Arqueo de espalda: 3x10", "Apertura de cadera: 2x20seg cada lado"], desc: "Descanso: 20-30 seg." },
        "ACUÁTICO": { ej: ["Burbujas: 3x2", "Patadas tabla: 3x15m", "Nado suave: 3x25min", "Nado continuo (ráìdo): 2x4min", "Solo brazada: 2x100m", "Velocidad: 3x50m"], desc: "Descanso: 30-60 seg." }
    },
    "Intermedio": {
        "CANCHA": { ej: ["Caminar: 3x3min", "Saltos de tijera: 4x30", "Rodillas al pecho: 4x45", "Pasos de lado: 4x20m", "Saltos cortos: 4x25", "Carrera rápida ida y vuelta: 4x45m"], desc: "Descanso: 30-45 segundos." },
        "PISTA": { ej: ["Caminar y trotar: 3x3m", "Correr y trotar: 3x5min", "Carrera rápida: 5x40m", "Rodillas arriba: 4x45", "Trotar: 5x2min", "Talones al glúteo: 4x25"], desc: "Descanso: 1 minuto (en velocidad)." },
        "MONTAÑA": { ej: ["Caminar en plano: 3x5min", "Subir cuestas cortas (completas): 5 veces", "Subir gradas (completas): 5 subidas", "Saltos suaves: 4x20", "Caminar en subida: 3x4min", "Pasos largos hacia arriba: 3x15m"], desc: "Descanso: 1 minuto." },
        "FUERZA": { ej: ["Sentadillas: 4x20", "Lagartijas: 4x15", "Abdominales: 4x20", "Plancha: 4x40seg", "Calentamiento: 3x3min", "Salto con lagartija: 4x12"], desc: "Descanso: 40-60 seg." },
        "FLEXIBILIDAD": { ej: ["Estiramiento fijo: 3x25", "Círculos de hombros: 3x15", "Pasos largos: 3x15", "Equilibrio en un pie: 3x15seg (c/pie)", "Arqueo de espalda: 3x12", "Apertura de cadera: 3x25seg cada lado"], desc: "Descanso: 20-30 seg." },
        "ACUÁTICO": { ej: ["Burbujas: 4x30", "Patadas tabla: 3x100m", "Nado suave: 4x5min", "Nado continuo (rápido): 3x5min", "Solo brazada: 3x100m", "Velocidad: 3x100m"], desc: "Descanso: 30-60 seg." }
    },
    "Avanzado": {
        "CANCHA": { ej: ["Caminar: 4x3min", "Saltos de tijera: 4x40", "Rodillas al pecho: 5x35", "Pasos de lado: 4x25m", "Saltos cortos: 5x25", "Carrera rápida ida y vuelta: 4x1m"], desc: "Descanso: 30-45 segundos." },
        "PISTA": { ej: ["Caminar y trotar: 4x4min", "Correr y trotar: 3x8min", "Carrera rápida: 8x40m", "Rodillas arriba: 5x40", "Trotar: 6x2min", "Talones al glúteo: 4x35"], desc: "Descanso: 1 minuto (en velocidad)." },
        "MONTAÑA": { ej: ["Caminar en plano: 3x8min", "Subir cuestas cortas (completas): 6 veces", "Subir gradas (completas): 6 subidas", "Saltos suaves: 4x35", "Caminar en subida: 3x6min", "Pasos largos hacia arriba: 4x20m"], desc: "Descanso: 1 minuto." },
        "FUERZA": { ej: ["Sentadillas: 4x25", "Lagartijas: 4x20", "Abdominales: 4x25", "Plancha: 4x1min", "Calentamiento: 4x3min", "Salto con lagartija: 4x15"], desc: "Descanso: 40-60 seg." },
        "FLEXIBILIDAD": { ej: ["Estiramiento fijo: 3x35", "Círculos de hombros: 3x20", "Pasos largos: 4x15", "Equilibrio en cada pie: 3x30seg (c/pie)", "Arqueo de espalda: 3x15", "Apertura de cadera: 3x30seg cada lado"], desc: "Descanso: 20-30 seg." },
        "ACUÁTICO": { ej: ["Burbujas: 3x40", "Patadas tabla: 4x100m", "Nado suave: 3x10min", "Nado continuo (rápido): 3x10min", "Solo brazada: 4x100m", "Velocidad: 4x100m"], desc: "Descanso: 30-60 seg." }
    }
};



// --- FUNCIÓN PRINCIPAL ---
// --- FUNCIÓN PRINCIPAL ---
// --- FUNCIÓN PRINCIPAL ---
// --- FUNCIÓN PRINCIPAL ---
function selectEx(el, categoryName) {
    // 1. Resaltar selección visual de la categoría
    user.selectedEx = categoryName;
    document.querySelectorAll('.ex-card-mini').forEach(card => card.classList.remove('selected'));
    if(el) el.classList.add('selected');

    const panel = document.getElementById('panel-rutinas');
    
    // 2. Obtener Nivel actual
    let nivelActual = "Básico";
    const elemNivel = document.getElementById('res-nivel-entreno');
    if (elemNivel) {
        const txt = elemNivel.innerText.trim();
        if (txt.includes("Principiante")) nivelActual = "Principiante";
        else if (txt.includes("Intermedio")) nivelActual = "Intermedio";
        else if (txt.includes("Avanzado")) nivelActual = "Avanzado";
    }

    // --- DICCIONARIO DE IMÁGENES CORREGIDO CON NOMBRES EXACTOS ---
    // --- DICCIONARIO DE IMÁGENES CORREGIDO (TODOS .PNG) ---
    const iconosRutinas = {
        // --- CARRERA Y CAMINATA ---
        "Caminar": "CAMINAR o TROTAR__.png",
        "Caminar en plano": "CAMINAR o TROTAR__.png",
        "Caminar en subida": "CAMINAR EN SUBIDA.png",
        "Caminar y trotar": "CAMINAR o TROTAR__.png",
        "Trotar": "CAMINAR o TROTAR__.png",
        "Correr y trotar": "CAMINAR o TROTAR__.png",
        "Carrera rápida": "carrera_rápida.png",
        "Carrera rápida ida y vuelta": "carrera_rápida_ida_y_vuelta.png",
        "Velocidad": "VELOCIDAD.png",
        
        // --- SALTOS Y AGILIDAD ---
        "Saltos de tijera": "saltos_de_tijera.png",
        "Saltos suaves": "saltos_suaves.png",
        "Saltos cortos": "SALTOS CORTOS.png",
        "Pasos de lado": "pasos_de_lado.png",
        "Rodillas al pecho": "RODILLAS AL PECHO.png",
        "Rodillas arriba": "RODILLAS AL PECHO.png",
        "Talones al glúteo": "TALONES AL GLUTEO.png",

        // --- FUERZA Y CALENTAMIENTO ---
        "Sentadillas": "SENTADILLA.png",
        "Lagartijas": "lagartijas.png",
        "Abdominales": "ABDOMINALES.png",
        "Plancha": "PLANCHA.png",
        "Salto con lagartija": "SALTO CON LAGARTIJA.png",
        "Calentamiento": "calentamiento.png",

        // --- MONTAÑA ---
        "Subir cuestas cortas": "SUBIR CUESTAS CORTAS.png",
        "Subir gradas": "SUBIR GRADAS.png",
        "Pasos largos hacia arriba": "PASOSLARGOSARRIBA.png",

        // --- FLEXIBILIDAD ---
        "Estiramiento fijo": "estiramiento_fijo.png",
        "Círculos de hombros": "circulo_de_hombros.png",
        "Pasos largos": "PasosLargosFlexi.png",
        "Equilibrio en un pie": "EQUILIBRIO EN UN PIE.png",
        "Arqueo de espalda": "ARQUEO DE ESPALDA.png",
        "Apertura de cadera": "APERTURA DE CADERA.png",

        // --- ACUÁTICO ---
        "Burbujas": "BURBUJAS.png",
        "Patadas tabla": "PATADAS TABLA.png",
        "Nado suave": "NADO SUAVE O CONTINUO.png",
        "Nado continuo": "nado_continuo.png",
        "Solo brazada": "BRAZADA.png"
    };

    // 3. Buscar datos en la DB
    const cat = categoryName.toUpperCase();
    const data = rutinasDB[nivelActual] ? rutinasDB[nivelActual][cat] : null;

    if (data) {
        let html = `<h3 style="text-align:center; color:#0055ff; margin:15px 0; font-size:1.1rem;">Seleccione las rutinas</h3>`;
        
        html += `<div id="lista-rutinas-vertical" style="display: block !important; width: 100%;">`;
        
        data.ej.forEach((item) => {
            // --- LÓGICA DE BÚSQUEDA CORREGIDA ---
            // Quitamos los ":" y también lo que esté entre paréntesis para encontrar la imagen
            const nombreLimpio = item.split(':')[0].split('(')[0].trim();
            const rutaImagen = iconosRutinas[nombreLimpio];

            // Crear el HTML de la imagen
            const imgHTML = rutaImagen 
                ? `<img src="${rutaImagen}" style="width:40px; height:40px; object-fit:cover; border-radius:8px; border:1px solid #00D1FF; margin-right:12px; background:white; flex-shrink:0;">` 
                : `<div style="width:40px; margin-right:12px;"></div>`;

            html += `
                <div class="rutina-fila" 
                     onclick="toggleRutinaCheck(this)" 
                     style="display: flex; align-items: center; background: white; padding: 10px; margin-bottom: 10px; border-radius: 12px; border: 2px solid #cceeff; cursor: pointer; transition: 0.2s;">
                    
                    ${imgHTML}

                    <div style="flex: 1;">
                        <span style="font-weight: bold; color: #102A2D; font-size: 0.85rem;">${item}</span>
                    </div>
                    
                    <div class="check-indicador" style="width: 24px; height: 24px; border: 2px solid #00D1FF; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: transparent; font-weight: bold; flex-shrink:0;">
                        ✓
                    </div>
                    
                    <input type="checkbox" class="rutina-check" style="display: none;">
                </div>`;
        });
        
        html += `</div>`;
        
        // Cuadro de descanso
        html += `<div style="margin-top:20px; padding:12px; background:#fff3e0; color:#e65100; font-weight:bold; border-radius:10px; text-align:center; border:1px solid #ffe0b2; font-size: 0.85rem;">
                    ⏱️ ${data.desc}
                </div>`;

        panel.innerHTML = html;
        panel.style.display = 'block';
    } else {
        panel.innerHTML = `<p style="text-align:center; color:red;">No se encontraron ejercicios</p>`;
    }
    
    if(typeof validateSelections === 'function') validateSelections();
}

// Función auxiliar para manejar la selección visual y el checkbox oculto
function toggleRutinaCheck(elemento) {
    const checkbox = elemento.querySelector('.rutina-check');
    const indicador = elemento.querySelector('.check-indicador');
    
    checkbox.checked = !checkbox.checked;
    
    if (checkbox.checked) {
        elemento.style.borderColor = "#00D1FF";
        elemento.style.backgroundColor = "#E0F7FA";
        indicador.style.backgroundColor = "#00D1FF";
        indicador.style.color = "white";
    } else {
        elemento.style.borderColor = "#cceeff";
        elemento.style.backgroundColor = "white";
        indicador.style.backgroundColor = "transparent";
        indicador.style.color = "transparent";
    }
    
    validateSelections(); // Llamamos a tu función de validación existente
}

// ════════════════════════════════════════════════════════════════
//  SISTEMA DE AUTENTICACIÓN FITUP — CÓDIGO DE BOTELLA
//  Verifica contra Google Apps Script (tu Sheet en tiempo real)
// ════════════════════════════════════════════════════════════════

// ⚠️ Pega aquí tu URL del Apps Script desplegado
const FITUP_API_URL = 'https://script.google.com/macros/s/AKfycbzgULRUPbAmiknTg-byFG1w9x-N0thvtILfZ_GyYwTWORvLI1t9pMOHZwPG_zY28CWx/exec';

// Columnas de tu Sheet (fila 5 en adelante):
// A=Código  B=Cliente  C=Correo  D=Teléfono
// E=Fecha de compra  F=Activado(SI/NO)  G=Fecha activación  H=Device ID

let loginBuffer = ''; // Almacena dígitos del PIN ingresado (hasta 6 dígitos)

function loginKey(digit) {
    if (loginBuffer.length >= 4) return;
    loginBuffer += digit;
    actualizarDisplayLogin();

    // Verifica automáticamente al completar los 4 dígitos
    if (loginBuffer.length === 4) {
        setTimeout(() => loginVerificar(), 300);
    }
}

function loginClear() {
    loginBuffer = loginBuffer.slice(0, -1);
    actualizarDisplayLogin();
    const manualInput = document.getElementById('login-input-manual');
    if (manualInput) manualInput.value = '';
}

function loginSyncManual(valor) {
    const limpio = valor.toUpperCase().replace(/[^A-Z0-9\-]/g, '').substring(0, 10);
    document.getElementById('login-input-manual').value = limpio;
    loginBuffer = limpio.replace('-', '').substring(0, 6);
    actualizarDisplayLogin();
}

function actualizarDisplayLogin() {
    const chars = document.querySelectorAll('.code-char');

    chars.forEach((el, i) => {
        const letra = loginBuffer[i] || '';
        el.innerText = letra || '_';
        el.classList.toggle('filled', !!letra);
        el.classList.toggle('active-cursor', i === loginBuffer.length && loginBuffer.length < 4);
    });
}

function mostrarMsgLogin(tipo, texto) {
    const msg = document.getElementById('login-msg');
    if (!msg) return;
    msg.className = 'login-msg ' + tipo;
    msg.innerText = texto;
    msg.style.display = 'block';
}

function ocultarMsgLogin() {
    const msg = document.getElementById('login-msg');
    if (msg) msg.style.display = 'none';
}

async function loginVerificar() {
    const codigoRaw = loginBuffer.trim().toUpperCase();

    if (codigoRaw.length < 3) {
        mostrarMsgLogin('error', '⚠️ Ingresa tu código completo (ej: F03).');
        sacudirDisplay();
        return;
    }

    // ══════════════════════════════════════════
    //  CLAVE MAESTRA — Solo para pruebas
    //  Cambia 'JAH' por la clave que quieras
    // ══════════════════════════════════════════
    const CLAVE_MAESTRA = 'F00';

    if (codigoRaw === CLAVE_MAESTRA) {
        mostrarMsgLogin('info', '🔑 Acceso maestro activado...');
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
        localStorage.setItem('fitup_autenticado', CLAVE_MAESTRA);

        setTimeout(() => {
            ocultarLogin();
            const datosGuardados = localStorage.getItem('fitup_user_data');
            if (datosGuardados) {
                user = JSON.parse(datosGuardados);
                cargarDatosEnFormulario();
                showScreen('screen-dash');
            } else {
                showScreen('screen-access');
            }
        }, 1000);
        return; // ← No va al servidor
    }
    // ══════════════════════════════════════════

    const loader = document.getElementById('login-loader');
    const btnEnter = document.getElementById('btn-login-enter');
    if (loader) loader.style.display = 'block';
    if (btnEnter) { btnEnter.disabled = true; btnEnter.style.opacity = '0.5'; }
    ocultarMsgLogin();

    try {
        const resultado = await verificarCodigoEnSheets(codigoRaw);

        if (resultado.valido) {
            mostrarMsgLogin('success', '✅ ¡Código verificado! Iniciando FitUP...');
            if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
            localStorage.setItem('fitup_autenticado', codigoRaw);

            setTimeout(() => {
                ocultarLogin();
                const datosGuardados = localStorage.getItem('fitup_user_data');
                if (datosGuardados) {
                    user = JSON.parse(datosGuardados);
                    cargarDatosEnFormulario();
                    showScreen('screen-dash');
                } else {
                    showScreen('screen-access');
                }
            }, 1500);

        } else if (resultado.razon === 'inactivo') {
            mostrarMsgLogin('error', '❌ Código no activado. Contacta a tu distribuidor FitUP.');
            sacudirDisplay();

        } else if (resultado.razon === 'no_encontrado') {
            mostrarMsgLogin('error', '❌ Código no encontrado. Verifica e intenta de nuevo.');
            sacudirDisplay();
            if (navigator.vibrate) navigator.vibrate(300);

        } else {
            mostrarMsgLogin('error', '⚠️ Error inesperado. Intenta de nuevo.');
            sacudirDisplay();
        }

    } catch (err) {
        console.error('Error FitUP:', err);
        mostrarMsgLogin('error', '⚠️ Sin conexión al servidor. Verifica tu internet.');
        sacudirDisplay();
    } finally {
        if (loader) loader.style.display = 'none';
        if (btnEnter) { btnEnter.disabled = false; btnEnter.style.opacity = '1'; }
    }
}

async function verificarCodigoEnSheets(codigoIngresado) {
    const codigoLimpio = codigoIngresado.toString().trim().toUpperCase();

    const url = `${FITUP_API_URL}?accion=verificar&codigo=${encodeURIComponent(codigoLimpio)}`;

    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) throw new Error('Error de conexión con el servidor FitUP.');

    const data = await response.json();
    return data;
}

function sacudirDisplay() {
    const display = document.getElementById('login-display');
    if (!display) return;
    display.classList.remove('shake');
    void display.offsetWidth;
    display.classList.add('shake');
    setTimeout(() => display.classList.remove('shake'), 500);

    setTimeout(() => {
        loginBuffer = '';
        actualizarDisplayLogin();
        const manualInput = document.getElementById('login-input-manual');
        if (manualInput) manualInput.value = '';
    }, 600);
}




// Resetear clave

function resetearAcceso() {
    if (navigator.vibrate) navigator.vibrate(50);

    const confirmar = confirm("⚠️ CERRAR ACCESO\n\nSe borrarán todos tus datos y necesitarás ingresar tu código de botella nuevamente.\n\n¿Continuar?");
    
    if (confirmar) {
        document.body.style.transition = "0.3s";
        document.body.style.opacity = "0";
        
        setTimeout(() => {
            // Borrar TODOS los datos de la sesión
            localStorage.removeItem('fitup_autenticado');
            localStorage.removeItem('fitup_user_data');
            localStorage.removeItem('fitup_historial');
            // Mantener fitup_device_id para que el código siga vinculado al dispositivo
            location.reload();
        }, 300);
    }
}

//llamar tips diferentes
// --- BASE DE DATOS DE CONSEJOS PARA FITUP ---
const tipsFitUP = [
    "El agua transporta nutrientes y oxígeno a las células. ¡No olvides tu meta!",
    "Beber agua antes de comer puede ayudar a mejorar tu digestión.",
    "¿Sabías que la fatiga es uno de los primeros signos de deshidratación?",
    "El agua ayuda a mantener la piel hidratada y con un aspecto más joven.",
    "Para un mejor rendimiento en tus rutinas de Jahibé-Labs, mantente hidratado.",
    "Beber agua ayuda a tus riñones a eliminar toxinas de tu cuerpo.",
    "Si sientes hambre, intenta beber un vaso de agua; a veces el cerebro confunde sed con hambre.",
    "La hidratación constante mejora la concentración y la memoria a corto plazo.",
    "Tu cerebro es 75% agua. ¡Dale lo que necesita para brillar!",
    "Un cuerpo bien hidratado regula mejor su temperatura durante el ejercicio."
];

function mostrarTipAleatorio() {
    const txtTip = document.getElementById('txt-tip');
    if (txtTip) {
        // Elegimos un índice al azar de la lista
        const indice = Math.floor(Math.random() * tipsFitUP.length);
        txtTip.innerText = tipsFitUP[indice];
    }
}


function ejecutarAccionBeber() {
    const btn = document.getElementById('btn-beber-dash');
    
    // 1. Bloquear botón y sumar agua inmediatamente
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.innerText = "PROCESANDO...";

    // Actualiza el nivel del widget
    if (typeof addWater === "function") {
        addWater(250);
    }

    // 2. Esperar 4 segundos para activar la alarma y el mensaje
    setTimeout(() => {
        // Restaurar botón
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.innerText = "BEBER AGUA 250ml";

        // 3. Lanzar el TRIPLE PITIDO
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        function emitirPitido(delay) {
            setTimeout(() => {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.1); // Duración corta por pitido
            }, delay);
        }

        // Ejecutar los 3 pitidos con intervalos de 200ms
        emitirPitido(0);
        emitirPitido(200);
        emitirPitido(400);

        // 4. Vibración (opcional, para reforzar la alerta)
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);

        // 5. Mostrar el mensaje de emergencia
        // Se pone un pequeño delay extra para que el navegador no bloquee el sonido con el alert
        setTimeout(() => {
            alert("🚨 ALERTA DE HIDRATACIÓN 🚨\n¡Tiempo cumplido! No olvides beber tus 250ml de agua para mantener tu ritmo.");
        }, 500);

    }, 4000); // Los 4 segundos de espera
}

function renderizarRutinas(lista) {
    const container = document.getElementById('panel-rutinas');
    if (!container) return;
    
    container.innerHTML = ""; // Limpieza total
    container.style.display = "block"; // Asegura que el contenedor sea bloque

    lista.forEach(nombre => {
        const div = document.createElement('div');
        div.className = 'rutina-fila-unica'; // Clase nueva para evitar el Grid
        div.dataset.nombre = nombre;
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${nombre}</span>
                <div class="check-visual">➕</div>
            </div>
        `;

        div.onclick = function() {
            this.classList.toggle('seleccionada');
            const check = this.querySelector('.check-visual');
            if(this.classList.contains('seleccionada')) {
                check.innerText = "✅";
            } else {
                check.innerText = "➕";
            }
        };

        container.appendChild(div);
    });
}

function iniciarRutina() {
    // 1. Creamos una lista para guardar los nombres seleccionados
    const seleccionados = [];
    
    // 2. Buscamos todas las filas que tienen el fondo azul/seleccionado
    // Nota: Usamos la lógica de los estilos que aplicamos anteriormente
    const filas = document.querySelectorAll('.rutina-fila');
    
    filas.forEach(fila => {
        // Verificamos si el checkbox interno está marcado
        const cb = fila.querySelector('.rutina-check');
        if (cb && cb.checked) {
            // Extraemos el nombre de la rutina del span
            const nombre = fila.querySelector('span').innerText;
            seleccionados.push(nombre);
        }
    });

    // 3. Validación de seguridad
    if (seleccionados.length === 0) {
        alert("⚠️ Por favor, selecciona al menos una rutina para comenzar.");
        return;
    }

    // 4. Guardar en el perfil del usuario y avanzar
    user.routines = seleccionados;
    
    // Feedback visual opcional antes de cambiar de pantalla
    console.log("Rutinas guardadas:", user.routines);
    
    // Cambiar a la pantalla principal
    showScreen('screen-dash');
}

let currentEx = 0; 
const totalEx = 9;

function rotarEntrenador() {
    const img = document.getElementById('img-entrenador');
    const texto = document.getElementById('texto-ejercicio');
    
    // Cambiamos el total a 8 para excluir ex9.png (Arqueria)
    const totalEx = 8; 

    if (!img) return;

    img.style.opacity = "0";
    img.style.transform = "scale(0.85)";

    setTimeout(() => {
        currentEx++;
        
        // Si el contador pasa de 8, vuelve a la silueta inicial
        if (currentEx > totalEx) {
            img.src = "siluetadep.png";
            if(texto) texto.innerText = "FITUP CORE";
            currentEx = 0; 
        } else {
            // Carga solo de ex1.png a ex8.png
            img.src = `ex${currentEx}.png`;
            
            // Lista de 8 etiquetas que coinciden con tus 8 imágenes
            const labels = ["NATACIÓN", "RUNNING", "FÚTBOL", "ESCALADA", "CICLISMO", "PESAS", "YOGA", "BASKET"];
            
            if(texto && labels[currentEx - 1]) {
                texto.innerText = labels[currentEx - 1];
            }
        }

        img.style.opacity = "1";
        img.style.transform = "scale(1)";
    }, 400);
}
// Mantenemos el intervalo de 3 segundos para que sea cómodo de leer
if(!window.trainerInterval) {
    window.trainerInterval = setInterval(rotarEntrenador, 1500);
}

// ── PWA INSTALACIÓN ──────────────────────────────────────────
window._deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window._deferredPrompt = e;
    console.log('✅ Prompt de instalación listo');
    const btnInstalar = document.getElementById('btn-instalar');
    if (btnInstalar) {
        btnInstalar.disabled = false;
        btnInstalar.style.opacity = '1';
        btnInstalar.style.pointerEvents = 'auto';
    }
});

window.addEventListener('appinstalled', () => {
    console.log('✅ FitUP instalado correctamente');
    window._deferredPrompt = null;
    gestionarBotonesInstalacion();
});

async function instalarApp() {
    if (window._deferredPrompt) {
        window._deferredPrompt.prompt();
        const { outcome } = await window._deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            window._deferredPrompt = null;
        }
    } else {
        alert("Para instalar FitUP:\n📱 iPhone: toca 'Compartir' → 'Añadir a pantalla de inicio'.\n🤖 Android/PC: toca los 3 puntos del navegador → 'Instalar aplicación'.");
        const btnInstalar = document.getElementById('btn-instalar');
        const btnVincular = document.getElementById('btn-vincular');
        if (btnInstalar) {
            btnInstalar.disabled = true;
            btnInstalar.style.opacity = '0.3';
            btnInstalar.style.pointerEvents = 'none';
            btnInstalar.innerHTML = '✅ FITUP INSTALADO';
        }
        if (btnVincular) {
            btnVincular.disabled = false;
            btnVincular.style.opacity = '1';
            btnVincular.style.pointerEvents = 'auto';
        }
    }
}

function gestionarBotonesInstalacion() {
    const btnInstalar = document.getElementById('btn-instalar');
    const btnVincular = document.getElementById('btn-vincular');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isStandalone) {
        if (btnInstalar) {
            btnInstalar.disabled = true;
            btnInstalar.style.opacity = '0.3';
            btnInstalar.style.pointerEvents = 'none';
            btnInstalar.innerHTML = '✅ FITUP INSTALADO';
        }
        if (btnVincular) {
            btnVincular.disabled = false;
            btnVincular.style.opacity = '1';
            btnVincular.style.pointerEvents = 'auto';
        }
    } else {
        if (btnInstalar) {
            btnInstalar.disabled = false;
            btnInstalar.style.opacity = '1';
            btnInstalar.style.pointerEvents = 'auto';
        }
        if (btnVincular) {
            btnVincular.disabled = true;
            btnVincular.style.opacity = '0.3';
            btnVincular.style.pointerEvents = 'none';
        }
    }
}
// ─────────────────────────────────────────────────────────────
async function instalarApp() {
    if (window._deferredPrompt) {
        window._deferredPrompt.prompt();
        const { outcome } = await window._deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            window._deferredPrompt = null;
        }
    } else {
        // Fallback para iOS o cuando el prompt aún no está listo
        alert("Para instalar FitUP:\n📱 iPhone: toca 'Compartir' → 'Añadir a pantalla de inicio'.\n🤖 Android/PC: toca los 3 puntos del navegador → 'Instalar aplicación'.");

        const btnInstalar = document.getElementById('btn-instalar');
        const btnVincular = document.getElementById('btn-vincular');
        if (btnInstalar) {
            btnInstalar.disabled = true;
            btnInstalar.style.opacity = '0.3';
            btnInstalar.style.pointerEvents = 'none';
            btnInstalar.innerHTML = '✅ FITUP INSTALADO';
        }
        if (btnVincular) {
            btnVincular.disabled = false;
            btnVincular.style.opacity = '1';
            btnVincular.style.pointerEvents = 'auto';
        }
    }
}

// ── CARGA DE DATOS GUARDADOS EN EL FORMULARIO ────────────────
function cargarDatosEnFormulario() {
    if (!user || !user.name) return;

    // Campos de texto y número
    const inName   = document.getElementById('in-name');
    const inAge    = document.getElementById('in-age');
    const inWeight = document.getElementById('in-weight');
    const inHeight = document.getElementById('in-height');
    const inGen    = document.getElementById('in-gen');
    const inAct    = document.getElementById('in-act');

    if (inName)   inName.value   = user.name     || '';
    if (inAge)    inAge.value    = user.age       || '';
    if (inWeight) inWeight.value = user.weight    || '';
    if (inHeight) inHeight.value = user.height    || '';
    if (inGen)    inGen.value    = user.gender    || 'M';
    if (inAct)    inAct.value    = user.activity  || 'Bajo';

    // Foto de perfil
    if (user.photo) {
        const img = document.getElementById('profile-img-preview');
        if (img) img.src = user.photo;
    }

    // Mostrar resultados calculados si ya existen
    if (user.imc) {
        const resImc   = document.getElementById('res-imc');
        const resCat   = document.getElementById('res-cat');
        const resNivel = document.getElementById('res-nivel-entreno');
        const resWater = document.getElementById('res-water');
        const resLabels = document.getElementById('results-labels');
        const btnEmpezar = document.getElementById('btn-empezar');

        if (resImc)    resImc.innerText   = 'IMC: ' + user.imc;
        if (resCat)    resCat.innerText   = 'Categoría: ' + (user.categoria || '');
        if (resNivel)  resNivel.innerText = 'Nivel de Ejercicio: ' + (user.level || '');
        if (resWater)  resWater.innerText = 'HIDRATACIÓN DIARIA: ' + user.goal + ' ml';
        if (resLabels) resLabels.style.display = 'block';
        if (btnEmpezar) btnEmpezar.style.display = 'block';
    }
}
// ─────────────────────────────────────────────────────────────
function mostrarLogin() {
    document.getElementById('screen-login').style.display = 'block';
    document.getElementById('app-container').style.display = 'none';
}

function ocultarLogin() {
    document.getElementById('screen-login').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
}