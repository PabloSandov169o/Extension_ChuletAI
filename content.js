let panelVisible = false; // Empieza oculto
let transparentMode = false;
let isDarkMode = false;

// NUEVO: controla si ya se activó alguna vez
let hasBeenActivated = false;
let tabs = [
  { id: Date.now(), name: "Principal", content: "" },
  { id: "chatgpt-tab", name: "ChatGPT", content: "" }
];
let activeTabId = tabs[0].id;

// Variables para el atajo personalizado
let shortcutType = "none"; // Puede ser: 'word', 'key', 'combo'
let shortcutValue = "";
let typedWord = ""; // Memoria para ir guardando lo que tecleas

// ===== 1. CREAR INTERFAZ =====
const panel = document.createElement("div");
panel.id = "chuleta-panel";
panel.innerHTML = `
<div id="chuleta-header">
  <div style="display:flex; gap:5px;">
    <button id="toggle-btn" title="Ocultar Panel">Ocultar</button>
    <button id="theme-toggle" title="Cambiar Tema">🌙</button>
    <button id="shortcut-btn" title="Configurar Atajo">⌨️</button>
  </div>
  <button id="add-tab">+ Pestaña</button>
</div>
<div id="tabs"></div>
<div id="editor-controls">
  <button id="boldBtn" title="Negrita"><b>B</b></button>
  <button id="underlineBtn" title="Subrayado"><u>U</u></button>
  <select id="fontSizeSelect">
    <option value="2">Pequeño</option>
    <option value="3" selected>Normal</option>
    <option value="5">Grande</option>
    <option value="7">Muy grande</option>
  </select>
  <input type="file" id="imageUpload" accept="image/*" style="width: 100px; font-size: 11px;" />
</div>
<div id="content" contenteditable="true"></div>
<button id="transparent-toggle" title="Modo Transparente">👁</button>
`;
document.body.appendChild(panel);
// Mantener el panel oculto al cargar la página
panel.style.display = "none";

const contentDiv = document.getElementById("content");
const tabsContainer = document.getElementById("tabs");
const themeToggleBtn = document.getElementById("theme-toggle");

function togglePanelGlobal() {
  // Si nunca se ha activado, mostrarlo por primera vez
  if (!hasBeenActivated) {
    panelVisible = true;
    panel.style.display = "flex";
    hasBeenActivated = true;
    return;
  }

  // Luego ya funciona normal
  panelVisible = !panelVisible;
  panel.style.display = panelVisible ? "flex" : "none";
}

// ===== 2. LÓGICA DE PESTAÑAS =====
function renderTabs() {
  tabsContainer.innerHTML = "";
  tabs.forEach((tab) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn " + (tab.id === activeTabId ? "active" : "");
    btn.innerText = tab.name;
    btn.onclick = () => switchTab(tab.id);
    tabsContainer.appendChild(btn);
  });
}

function switchTab(id) {
  saveCurrentContent();
  activeTabId = id;

  if (id === "chatgpt-tab") {
    contentDiv.innerHTML = `
      <iframe
        src="https://chat.openai.com"
        style="
          width: 100%;
          height: 100%;
          border: none;
          background: white;
        ">
      </iframe>
    `;
  } else {
    const activeTab = tabs.find(t => t.id === id);
    contentDiv.innerHTML = activeTab.content;
    reattachImageEvents();
  }

  renderTabs();
}

document.getElementById("add-tab").onclick = () => {
  const name = prompt("Nombre de la pestaña:", "Nueva Pestaña");
  if (name) {
    saveCurrentContent();
    const newTab = { id: Date.now(), name, content: "" };
    tabs.push(newTab);
    switchTab(newTab.id);
    saveData();
  }
};

// ===== 3. TEMA OSCURO / CLARO =====
function applyTheme() {
  if (isDarkMode) {
    panel.classList.add("dark-theme");
    themeToggleBtn.innerText = "☀️";
  } else {
    panel.classList.remove("dark-theme");
    themeToggleBtn.innerText = "🌙";
  }
}

themeToggleBtn.onclick = () => {
  isDarkMode = !isDarkMode;
  applyTheme();
  saveData();
};

// ===== 4. GUARDADO Y CARGA =====
function saveCurrentContent() {
  if (activeTabId === "chatgpt-tab") return;

  const tabIndex = tabs.findIndex(t => t.id === activeTabId);

  if (tabIndex !== -1) {
    tabs[tabIndex].content = contentDiv.innerHTML;
  }
}

function saveData() {
  saveCurrentContent();
  chrome.storage.local.set({ tabs, activeTabId, isDarkMode, shortcutType, shortcutValue });
}

contentDiv.addEventListener("input", saveData);

chrome.storage.local.get(["tabs", "activeTabId", "isDarkMode", "shortcutType", "shortcutValue"], (result) => {
  if (result.tabs && result.tabs.length > 0) {
    tabs = result.tabs;
    activeTabId = result.activeTabId || tabs[0].id;
  }
  if (result.isDarkMode !== undefined) isDarkMode = result.isDarkMode;
  if (result.shortcutType) shortcutType = result.shortcutType;
  if (result.shortcutValue) shortcutValue = result.shortcutValue;
  
  applyTheme();
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  contentDiv.innerHTML = activeTab.content;
  renderTabs();
  reattachImageEvents();
});

// ===== 5. EDITOR Y CONTROLES DEL PANEL =====
document.getElementById("boldBtn").onclick = () => document.execCommand("bold");
document.getElementById("underlineBtn").onclick = () => document.execCommand("underline");
document.getElementById("fontSizeSelect").onchange = (e) => {
  document.execCommand("fontSize", false, e.target.value);
};

document.getElementById("transparent-toggle").onclick = () => {
  transparentMode = !transparentMode;
  panel.classList.toggle("transparent");
};

document.getElementById("toggle-btn").onclick = () => {
  togglePanelGlobal();
};

// ===== 6. LÓGICA DEL ATAJO PERSONALIZADO =====
document.getElementById("shortcut-btn").onclick = () => {
  const option = prompt("Configurar apertura mágica:\n1 - Palabra secreta\n2 - Tecla única (ej. F4)\n3 - Combinación (ej. ctrl+shift+m)\n\nEscribe 1, 2 o 3:");
  
  if (option === "1") {
    const word = prompt("Escribe tu palabra secreta:");
    if (word) { shortcutType = "word"; shortcutValue = word; }
  } else if (option === "2") {
    const key = prompt("Pulsa/Escribe la tecla (ej. F4, Escape):");
    if (key) { shortcutType = "key"; shortcutValue = key; }
  } else if (option === "3") {
    const combo = prompt("Escribe la combinación separada por + (ej. ctrl+shift+q):");
    if (combo) { shortcutType = "combo"; shortcutValue = combo; }
  }

  if (option >= 1 && option <= 3 && shortcutValue) {
    saveData();
    alert(`¡Guardado! Tipo: ${shortcutType} -> Valor: ${shortcutValue}`);
  }
};

document.addEventListener("keydown", (e) => {
  // Evitamos que se active el atajo de palabra si estás escribiendo dentro de la misma chuleta
  const isTypingInEditor = e.target.id === 'content';

  if (shortcutType === "word" && !isTypingInEditor) {
    if (e.key.length === 1) typedWord += e.key.toLowerCase();
    if (typedWord.length > 30) typedWord = typedWord.slice(-30); // Limita la memoria
    
    if (typedWord.endsWith(shortcutValue.toLowerCase())) {
      togglePanelGlobal();
      typedWord = ""; // Reinicia la memoria
    }
  } 
  else if (shortcutType === "key") {
    if (e.key.toLowerCase() === shortcutValue.toLowerCase()) {
      e.preventDefault();
      togglePanelGlobal();
    }
  } 
  else if (shortcutType === "combo") {
    const keys = shortcutValue.toLowerCase().split("+").map(k => k.trim());
    const reqCtrl = keys.includes("ctrl") || keys.includes("control");
    const reqShift = keys.includes("shift");
    const reqAlt = keys.includes("alt");
    const mainKey = keys.find(k => !["ctrl", "control", "shift", "alt"].includes(k));

    if (
      !!e.ctrlKey === reqCtrl &&
      !!e.shiftKey === reqShift &&
      !!e.altKey === reqAlt &&
      (mainKey ? e.key.toLowerCase() === mainKey : true)
    ) {
      e.preventDefault();
      togglePanelGlobal();
    }
  }
});

// ===== 7. MANEJO DE IMÁGENES (Manteniendo tu código intacto) =====
document.getElementById("imageUpload").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();

  reader.onload = function (event) {
    const wrapper = document.createElement("div");
    wrapper.className = "img-wrapper";
    wrapper.style.left = "10px";
    wrapper.style.top = "10px";
    wrapper.contentEditable = "false"; 

    const img = document.createElement("img");
    img.src = event.target.result;

    const resizer = document.createElement("div");
    resizer.className = "resizer";

    wrapper.appendChild(img);
    wrapper.appendChild(resizer);
    contentDiv.appendChild(wrapper);

    makeDraggable(wrapper);
    makeResizable(wrapper, resizer);
    saveData();
  };

  reader.readAsDataURL(file);
});

function reattachImageEvents() {
  const images = contentDiv.querySelectorAll('.img-wrapper');
  images.forEach(wrapper => {
    wrapper.contentEditable = "false";
    const resizer = wrapper.querySelector('.resizer');
    makeDraggable(wrapper);
    if (resizer) makeResizable(wrapper, resizer);
  });
}

function makeDraggable(el) {
  let isDragging = false;
  let shiftX, shiftY;

  el.onmousedown = function(e) {
    if (e.target.classList.contains("resizer")) return;
    isDragging = true;
    
    const rect = el.getBoundingClientRect();
    const contentRect = contentDiv.getBoundingClientRect();
    
    shiftX = e.clientX - rect.left;
    shiftY = e.clientY - rect.top;

    function move(e) {
      if (!isDragging) return;
      let newLeft = e.clientX - shiftX - contentRect.left + contentDiv.scrollLeft;
      let newTop = e.clientY - shiftY - contentRect.top + contentDiv.scrollTop;
      el.style.left = newLeft + "px";
      el.style.top = newTop + "px";
    }

    function stop() {
      isDragging = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      saveData(); 
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };
  el.ondragstart = () => false; 
}

function makeResizable(wrapper, resizer) {
  resizer.onmousedown = function(e) {
    e.stopPropagation();
    let startX = e.clientX;
    let startWidth = wrapper.offsetWidth;

    function resize(e) {
      wrapper.style.width = startWidth + (e.clientX - startX) + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stop);
      saveData(); 
    }

    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stop);
  };
}

// Escucha del atajo por defecto del Manifest
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "toggle") {
    togglePanelGlobal();
  }
});