document.addEventListener('DOMContentLoaded', () => {
    verificarAcceso();
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
    'screen-dash': '#5e9918',        // Verde desvanecido
    'screen-access': '#16915e', // Azul desvanecido
    'screen-hidratacion': '#c98fdb',
    'screen-data': '#f39c12',        // Naranja desvanecido
    'screen-config': '#f8bf89',        // Naranja desvanecido
    'screen-progreso': '#9b59b6'     // Morado desvanecido
    
};

const color = temas[id] || '#00d1ff';

if(container) {
    container.style.setProperty('--chasis-color', color);
}

    // 1. Ocultar todas las pantallas y mostrar la actual
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');

    // 2. Controlar visibilidad de Header y Nav (Solo en pantallas públicas)
    const uiHeader = document.getElementById('ui-header');
    const navBottom = document.getElementById('nav-bottom');
    const publicScreens = ['screen-dash', 'screen-progreso', 'screen-hidratacion', 'screen-data', 'screen-about'];

    if(publicScreens.includes(id)) {
        if(uiHeader) uiHeader.style.display = 'flex';
        if(navBottom) navBottom.style.display = 'flex';
    } else {
        // Ocultar si estamos en pantallas de configuración o carga
        if(uiHeader) uiHeader.style.display = 'none';
        if(navBottom) navBottom.style.display = 'none';
    }

    // --- Lógica Específica para la pantalla de PROGRESO ---
    if(id === 'screen-progreso') {
        // Ejecuta la función que dibuja el calendario, racha y stats
        renderProgreso();
    }

    if(id === 'screen-hidratacion') {
    renderHidratacion();
    }

    // --- Lógica Específica para la pantalla de DASHBOARD ---
    if(id === 'screen-dash') {
        // Actualizar textos básicos del usuario
        document.getElementById('user-display').innerText = user.name || "Usuario";
        document.getElementById('dash-imc').innerText = user.imc || "--";
        document.getElementById('dash-goal').innerText = (user.goal || 0) + " ml";
        
        // Cargar Widget de Ejercicios y Gráficos
        actualizarWidgetEjercicios();
        initCharts(); 
        updateUI();
    }

    // Dentro de tu función showScreen(id)
    if(id === 'screen-data') {
    mostrarTipAleatorio(); // <--- Aquí lanzamos el cambio de tip
    // Aquí también podrías actualizar los datos de IMC y metas del usuario
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
    
    // Seguridad: Si no encuentra los elementos en el HTML, detiene la función para no dar error
    if(!actVal || !listCont || !barra) return; 

    // 1. Mostrar Actividad y Nivel Limpios (provenientes del objeto user)
    actVal.innerText = (user.activity || "Bajo").toUpperCase();
    nivVal.innerText = (user.level || "Básico").toUpperCase();

    // 2. Limpiar el contenedor de la lista antes de llenarlo
    listCont.innerHTML = "";
    let completados = 0;

    // 3. Validar si hay rutinas seleccionadas
    if(!user.routines || user.routines.length === 0) {
        listCont.innerHTML = "<p style='font-size:0.7rem; color:#999; text-align:center;'>No hay rutinas activas.</p>";
        barra.style.width = "0%";
        countTxt.innerText = "0/0";
        msgFinal.style.display = "none";
        return;
    }

    // 4. Crear los elementos de la lista uno por uno
    user.routines.forEach((rutinaNombre, i) => {
        const div = document.createElement('div');
        // Estilo de cada fila de ejercicio
        div.style = `
            background: white; 
            padding: 12px; 
            border-radius: 12px; 
            border: 1px solid #AABFC1; 
            font-size: 0.8rem; 
            font-weight: 800; 
            cursor: pointer; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            transition: 0.3s;
            box-shadow: 0 2px 5px rgba(0,0,0,0.02);
        `;
        
        div.innerHTML = `<span>${rutinaNombre}</span> <span class="status-icon">⭕</span>`;
        
        // Evento al hacer clic en el ejercicio (Marcar como completado)
        div.onclick = function() {
            if(!this.dataset.done) {
                this.dataset.done = "true"; // Marcador interno
                this.style.background = "#E0F7FA"; // Color cian clarito
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

    // 5. Función interna para mover la barra y mostrar el mensaje final
    function actualizarProgresoRutina(done, total) {
        const porcentaje = (done / total) * 100;
        barra.style.width = porcentaje + "%";
        countTxt.innerText = `${done}/${total}`;
        
        if(done === total) {
            msgFinal.style.display = "block";
            // Efecto visual de éxito en la barra
            barra.style.background = "linear-gradient(90deg, #00D1FF, #00FF88)";
        }
    }

    // Reset inicial de la barra y contador al cargar la pantalla
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
    // 1. Obtener valores de los inputs
    const n = document.getElementById('in-name').value.trim();
    const age = parseInt(document.getElementById('in-age').value); // Añadida la edad
    const w = parseFloat(document.getElementById('in-weight').value);
    const h = parseFloat(document.getElementById('in-height').value);
    const act = document.getElementById('in-act').value; // Bajo, Medio, Alto
        
    // 2. VALIDACIÓN DE ALTA CONCENTRACIÓN (Modificado)
    
    // Validar Nombre: Solo letras
    const regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!regexNombre.test(n) || n === "") {
        alert("⚠️ ERROR EN NOMBRE: Solo se permiten letras.\nAlternativa: Escribe un nombre real sin números ni símbolos.");
        document.getElementById('in-name').focus();
        return;
    }

    // Validar Edad: 8 a 80
    if (isNaN(age) || age < 6 || age > 80) {
        alert("⚠️ ERROR EN EDAD: El rango permitido es de 6 a 80 años.\nAlternativa: Ingresa una edad válida para ajustar tus necesidades.");
        document.getElementById('in-age').focus();
        return;
    }

    // Validar Peso: 30 a 200kg
    if (isNaN(w) || w < 30 || w > 200) {
        alert("⚠️ ERROR EN PESO: El rango permitido es de 30kg a 200kg.\nAlternativa: Revisa el peso ingresado (debe ser un número).");
        document.getElementById('in-weight').focus();
        return;
    }

    // Validar Altura: 1.0 a 2.3m
    if (isNaN(h) || h < 1.0 || h > 2.3) {
        alert("⚠️ ERROR EN ALTURA: El rango permitido es de 1.0m a 2.30m.\nAlternativa: Usa el formato de punto para decimales (ej: 1.70).");
        document.getElementById('in-height').focus();
        return;
    }

    // 3. Cálculo de IMC (Continúa el proceso original)
    const imcValue = (w / (h * h)).toFixed(1);
    user.imc = imcValue;
    user.name = n;
    user.age = age; // Guardamos la edad en el objeto user
    user.activity = act;

    // 4. Determinar Categoría de IMC
    let categoria = "";
    let colorCat = "";
    if (imcValue < 18.5) { categoria = "Bajo peso"; colorCat = "#3498db"; }
    else if (imcValue <= 24.9) { categoria = "Peso saludable"; colorCat = "#27ae60"; }
    else if (imcValue <= 29.9) { categoria = "Sobrepeso"; colorCat = "#f39c12"; }
    else { categoria = "Obesidad"; colorCat = "#e74c3c"; }
    
    // 5. Lógica de Nivel de Entrenamiento
    let nivelEntreno = ""; 
    if (act === "Bajo" && (categoria === "Bajo peso" || categoria === "Peso saludable" )) {
        nivelEntreno = "Básico";        
    } else if (act === "Bajo" && (categoria === "Sobrepeso" || categoria === "Obesidad")) {
        nivelEntreno = "Principiante";
    } else if (act === "Medio") {
        nivelEntreno = "Intermedio";
    } else if (act === "Alto") {
        nivelEntreno = "Avanzado";
    } else {
        nivelEntreno = "Adaptativo";
    }

    user.level = nivelEntreno; 

    // 6. Cálculo de meta de agua
    let extraAgua = 0;
    if(act === 'Medio') extraAgua = 400;
    if(act === 'Alto') extraAgua = 800;
    user.goal = Math.round((w * 35) + extraAgua);

    // 7. ACTUALIZAR LA INTERFAZ
    try {
        document.getElementById('res-imc').innerText = "IMC: " + user.imc;
        
        const catElement = document.getElementById('res-cat');
        if(catElement) {
            catElement.innerText = "Categoría: " + categoria;
            catElement.style.color = colorCat;
        }

        const nivelElem = document.getElementById('res-nivel-entreno');
        if (nivelElem) {
            nivelElem.innerText = "Nivel de Ejercicio: " + user.level;
        }

        document.getElementById('res-water').innerText = "HIDRATACIÓN DIARIA: " + user.goal + " ml";
        
        document.getElementById('results-labels').style.display = 'block';
        document.getElementById('btn-empezar').style.display = 'block';
        
        alert("¡Datos guardados con éxito!");
    } catch (error) {
        console.error("Error al actualizar la UI:", error);
    }
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

   
}

// Función para sumar 500ml
function drinkBottle() {
    if(user.goal > 0) {
        user.current = Math.min(user.current + 500, user.goal);
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


function renderProgreso() {
    // 1. Obtener Fecha Actual
    const ahora = new Date();
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('mes-actual').innerText = nombresMeses[ahora.getMonth()];

    // 2. Vincular Datos de Registro y Selección
    document.getElementById('prog-imc').innerText = user.imc || "--";
    document.getElementById('prog-act').innerText = (user.activity || "--").toUpperCase();
    document.getElementById('prog-meta').innerText = (user.goal || 0) + " ml";
    
    // El tipo de ejercicio se toma de la selección en la pantalla de categorías
    document.getElementById('prog-tipo').innerText = (user.selectedEx || "Pendiente").toUpperCase();

    // 3. Calcular Racha y Porcentaje Actual
    const porcentajeHoy = (user.current / user.goal) * 100 || 0;
    user.racha = (porcentajeHoy >= 100) ? 1 : 0; // Incremento lógico basado en el Dashboard
    document.getElementById('prog-racha-val').innerText = user.racha + (user.racha === 1 ? " DÍA" : " DÍAS");

    // 4. Generar Calendario Mensual Dinámico
    const calBody = document.getElementById('calendar-body');
    calBody.innerHTML = "";
    const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();
    const diaHoy = ahora.getDate();

    for (let i = 1; i <= ultimoDiaMes; i++) {
        let contenido = i;
        let colorFondo = "white";
        let colorTexto = "var(--text-dark)";
        let borde = "1px solid var(--border)";

        if (i < diaHoy) {
            // Días pasados: Simulación de cumplimiento (puedes vincularlo a un historial real luego)
            contenido = "✘";
            colorTexto = "#ff4444";
        } else if (i === diaHoy) {
            // Día actual: Basado en el consumo del Dashboard
            if (porcentajeHoy >= 100) {
                contenido = "✔";
                colorFondo = "#2ecc71";
                colorTexto = "white";
                borde = "none";
            } else {
                colorFondo = "rgba(0, 209, 255, 0.1)";
                borde = "2px solid var(--cian)";
            }
        }

        calBody.innerHTML += `
            <div class="cal-day" style="background:${colorFondo}; color:${colorTexto}; border:${borde}; font-weight:900; display:flex; align-items:center; justify-content:center; height:35px; border-radius:8px;">
                ${contenido}
            </div>`;
    }

    // 5. Consumo Semanal (Widget de Barras/Botellas)
    const botContainer = document.getElementById('bottle-container');
    botContainer.innerHTML = "";
    const diasletras = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const diaSemanaHoy = (ahora.getDay() + 6) % 7; // Ajuste para que Lunes sea 0

    diasletras.forEach((l, index) => {
        let altura = 0;
        if (index < diaSemanaHoy) altura = 100; // Días pasados llenos
        if (index === diaSemanaHoy) altura = Math.min(100, porcentajeHoy); // Hoy progresa con el agua bebida

        botContainer.innerHTML += `
            <div class="bottle-wrapper">
                <div class="bottle-frame" style="background:#eee;">
                    <div class="bottle-fill" style="height: ${altura}%; transition: height 0.5s ease;"></div>
                </div>
                <div class="bottle-label">${l}</div>
            </div>`;
    });
}

function previewPhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Actualizar la vista previa en la configuración
            document.getElementById('profile-img-preview').src = e.target.result;
            
            // Guardar la imagen en el objeto user (opcional, para usarla en otras pantallas)
            user.photo = e.target.result;
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

    // 3. Buscar datos en la DB
    const cat = categoryName.toUpperCase();
    const data = rutinasDB[nivelActual] ? rutinasDB[nivelActual][cat] : null;

    if (data) {
        // 4. Generar HTML en LISTA VERTICAL (Sin Grid)
        let html = `<h3 style="text-align:center; color:#0055ff; margin:15px 0; font-size:1.1rem;">Seleccione las rutinas</h3>`;
        
        // Contenedor principal en bloque para evitar columnas
        html += `<div id="lista-rutinas-vertical" style="display: block !important; width: 100%;">`;
        
        data.ej.forEach((item, index) => {
            // Creamos cada opción como una fila completa
            html += `
                <div class="rutina-fila" 
                     onclick="toggleRutinaCheck(this)" 
                     style="display: flex; align-items: center; justify-content: space-between; background: white; padding: 15px; margin-bottom: 10px; border-radius: 12px; border: 2px solid #cceeff; cursor: pointer; transition: 0.2s;">
                    
                    <span style="font-weight: bold; color: #102A2D; font-size: 0.95rem;">${item}</span>
                    
                    <div class="check-indicador" style="width: 24px; height: 24px; border: 2px solid #00D1FF; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: transparent; font-weight: bold;">
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
    
    validateSelections();
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

/*Usuario-Código*/

// Función para verificar el código al iniciar la app
async function verificarAcceso() {
    // IMPORTANTE: Asegúrate de que el nombre coincide: 'fitup_autenticado'
    /*const accesoAutorizado = localStorage.getItem('fitup_autenticado');

    if (accesoAutorizado === 'true') {
        // Si ya está validado, ocultamos la pantalla de bloqueo
        const lockScreen = document.getElementById('screen-lock');
        if(lockScreen) lockScreen.style.display = 'none';
    } else {
        // Si no está validado, nos aseguramos de que la pantalla de bloqueo sea visible
        const lockScreen = document.getElementById('screen-lock');
        if(lockScreen) lockScreen.style.display = 'flex';
    }
        */

    document.getElementById('screen-lock').style.display = 'flex';
}


async function validarCodigoConGoogleSheets(codigoIngresado) {
    // Aquí llamarías a tu Google Apps Script que busca en el Sheet
    // Ejemplo de endpoint ficticio:
    const response = await fetch(`https://script.google.com/macros/s/TU_ID_SCRIPT/exec?codigo=${codigoIngresado}`);
    const resultado = await response.json();

    if (resultado.valido) {
        localStorage.setItem('app_acceso_autorizado', 'true');
        alert("¡Acceso concedido! Bienvenido.");
        mostrarPantallaPrincipal();
    } else {
        alert("Código incorrecto o ya utilizado. Contacta a tu vendedor.");
    }
}


// Al cargar la página, verificamos si ya está validada
window.onload = function() {
    if (localStorage.getItem('fitup_autenticado') === 'true') {
        document.getElementById('screen-lock').style.display = 'none';
    }
};

async function validarAcceso() {
    const codigoInput = document.getElementById('input-codigo').value.trim();
    const urlScript = "https://script.google.com/macros/s/AKfycbxqz0sybOKMOInqgmKmfikmnQA26bXXRdqSqqcHUPREc1OAkuGNXP1ogAkmy72PzwK8/exec";

    if (!codigoInput) {
        alert("Por favor, ingresa un código.");
        return;
    }

    // 1. REVISAR VINCULACIÓN PREVIA EN ESTE CELULAR
    const codigoVinculado = localStorage.getItem('fitup_codigo_vinculado');

    if (codigoVinculado) {
        // Si ya hay una botella vinculada, solo dejamos pasar si el código coincide
        if (codigoInput === codigoVinculado) {
            console.log("Acceso por vinculación local exitosa.");
            ejecutarEfectoDesbloqueo("¡Bienvenido de nuevo! Acceso por vinculación.");
            return;
        } else {
            alert("⚠️ Este celular ya está vinculado a otra botella.\nUsa el código original o contacta a soporte.");
            return;
        }
    }

    // 2. SI NO HAY VINCULACIÓN, CONSULTAR A GOOGLE SHEETS (Primera vez)
    try {
        const response = await fetch(`${urlScript}?codigo=${encodeURIComponent(codigoInput)}`);
        const resultado = await response.json();

        if (resultado.valido) {
            // Guardamos que está autenticado y VINCULAMOS el código permanentemente
            localStorage.setItem('fitup_autenticado', 'true');
            localStorage.setItem('fitup_codigo_vinculado', codigoInput);
            
            ejecutarEfectoDesbloqueo("¡Acceso concedido! Tu FitUP ha quedado vinculada a este celular.");
            
        } else {
            // Manejo de errores del servidor
            if (resultado.msg === "Ya usado") {
                alert("❌ Este código ya fue activado en otro dispositivo.\nSi cambiaste de celular, solicita un reset de tu clave.");
            } else {
                alert("❌ Código incorrecto. Verifica los datos proporcionados por el vendedor.");
            }
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Hubo un problema de conexión. Verifica tu internet.");
    }
}

// Función auxiliar para no repetir código del efecto visual
function ejecutarEfectoDesbloqueo(mensaje) {
    const lockScreen = document.getElementById('screen-lock');
    lockScreen.style.transition = "all 0.5s ease";
    lockScreen.style.opacity = "0";
    setTimeout(() => {
        lockScreen.style.display = 'none';
        alert(mensaje);
    }, 500);
}
// Resetear clave

function resetearAcceso() {
    // Un toque de vibración si es móvil
    if (navigator.vibrate) navigator.vibrate(50);

    const confirmar = confirm("⚠️ ATENCIÓN: Se cerrará el acceso y necesitarás un nuevo código. ¿Continuar?");
    
    if (confirmar) {
        // Efecto de parpadeo antes de salir
        document.body.style.transition = "0.3s";
        document.body.style.opacity = "0";
        
        setTimeout(() => {
            localStorage.removeItem('fitup_autenticado');
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
    
    if (!img) return;

    img.style.opacity = "0";
    img.style.transform = "scale(0.85)";

    setTimeout(() => {
        currentEx++;
        
        if (currentEx > totalEx) {
            img.src = "siluetadep.png";
            if(texto) texto.innerText = "FITUP CORE";
            currentEx = 0; 
        } else {
            img.src = `ex${currentEx}.png`;
            const labels = ["NATACIÓN", "RUNNING", "FÚTBOL", "ESCALADA", "CICLISMO", "PESAS", "YOGA", "BASKET", "ARQUERÍA"];
            if(texto) texto.innerText = labels[currentEx - 1];
        }

        img.style.opacity = "1";
        img.style.transform = "scale(1)";
    }, 400);
}

// Mantenemos el intervalo de 3 segundos para que sea cómodo de leer
if(!window.trainerInterval) {
    window.trainerInterval = setInterval(rotarEntrenador, 1500);
}