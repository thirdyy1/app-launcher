let apps = [];
const grid = document.getElementById('grid');
const addBtn = document.getElementById('add');
const search = document.getElementById('search');
const settingsBtn = document.getElementById('settings');

// ===== Modal Elements =====
const overlay = document.createElement('div');
overlay.className = 'modal-overlay';
const modal = document.createElement('div');
modal.className = 'modal';
document.body.appendChild(overlay);
document.body.appendChild(modal);

function openModal(contentHTML) {
  modal.innerHTML = contentHTML;
  overlay.classList.add('show');
  modal.classList.add('show');
}

function closeModal() {
  overlay.classList.remove('show');
  modal.classList.remove('show');
}

// Close modal on click outside or ESC key
overlay.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ===== Load & Render Apps =====
async function loadApps() {
  apps = await window.api.getApps() || [];
  render();
}

function render() {
  grid.innerHTML = '';

  const filteredApps = apps
    .filter(app => app.name.toLowerCase().includes(search.value.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  filteredApps.forEach((app) => {
    const div = document.createElement('div');
    div.className = 'app';
    div.innerHTML = `
      <div class="icon">${app.icon ? `<img src="${app.icon}" style="max-width: 60px; max-height: 60px;" />` : '🎮'}</div>
      <div class="name">${app.name}</div>
    `;

    div.addEventListener('click', () => {
      window.api.launchApp(app.path);
    });

    // ===== Right-click context menu =====
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();

      openModal(`
        <div style="text-align:center; margin-bottom:10px; font-weight:bold; color:white;">
          Manage "${app.name}"
        </div>
        <div class="modal-buttons" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; justify-content:center;">
          <button class="btn action-btn rename">✏ Rename</button>
          <button class="btn action-btn icon">🖼 Icon</button>
          <button class="btn action-btn remove">🗑 Remove</button>
          <button class="btn action-btn cancel">❌ Cancel</button>
        </div>
      `);

      // ===== Cancel button =====
      modal.querySelector('.cancel').addEventListener('click', closeModal);

      // ===== Rename =====
      modal.querySelector('.rename').addEventListener('click', () => {
        openModal(`
          <div style="text-align:center; margin-bottom:10px; font-weight:bold; color:white;">Rename "${app.name}"</div>
          <input type="text" class="rename-input" value="${app.name}" 
            style="width:90%; padding:8px; border-radius:6px; border:none; margin-bottom:12px;">
          <div class="modal-buttons" style="display:flex; gap:10px; justify-content:center;">
            <button class="btn action-btn save-rename">💾 Save</button>
            <button class="btn action-btn cancel-rename">✖ Cancel</button>
          </div>
        `);

        modal.querySelector('.save-rename').addEventListener('click', async () => {
          const input = modal.querySelector('.rename-input').value.trim();
          if (input) {
            app.name = input;
            await window.api.saveApps(apps);
            render();
            closeModal(); // FIX: now closes modal
          }
        });

        modal.querySelector('.cancel-rename').addEventListener('click', closeModal);
      });

      // ===== Change Icon =====
      modal.querySelector('.icon').addEventListener('click', async () => {
        const iconPath = await window.api.selectIcon();
        if (iconPath) {
          app.icon = iconPath;
          await window.api.saveApps(apps);
          render();
        }
        closeModal();
      });

      // ===== Remove App =====
      modal.querySelector('.remove').addEventListener('click', async () => {
        openModal(`
          <div style="text-align:center; margin-bottom:10px; font-weight:bold; color:white;">Delete "${app.name}"?</div>
          <div class="modal-buttons" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; justify-content:center;">
            <button class="btn confirm-delete">✅ Yes</button>
            <button class="btn cancel-delete">❌ No</button>
          </div>
        `);

        modal.querySelector('.confirm-delete').addEventListener('click', async () => {
          apps.splice(apps.indexOf(app), 1);
          await window.api.saveApps(apps);
          render();
          closeModal();
        });

        modal.querySelector('.cancel-delete').addEventListener('click', closeModal);
      });
    });

    grid.appendChild(div);
  });
}

// ===== Add App =====
addBtn.onclick = async () => {
  const path = await window.api.selectApp();
  if (path) {
    const name = path.replace(/^.*[\\/]/, '');
    if (!apps.find(app => app.path === path)) {
      apps.push({ name, path });
      await window.api.saveApps(apps);
      render();
    } else {
      alert('App already added.');
    }
  }
};

search.addEventListener('input', render);

// ===== Settings Modal (live preview) =====
settingsBtn.addEventListener('click', async () => {
  const settings = await window.api.getSettings();

  openModal(`
    <h2 style="color:white; margin-bottom:10px;">Settings</h2>
    <label style="color:white; display:block; margin-top:10px;">
      Wallpaper URL:
      <input type="text" id="wallpaper" value="${settings.wallpaper || ''}" style="width:100%; padding:8px; border-radius:6px; margin-top:5px;">
    </label>
    <label style="color:white; display:block; margin-top:10px;">
      Theme Color:
      <input type="color" id="theme" value="${settings.theme || '#1e1e1e'}" style="width:100%; height:40px; margin-top:5px;">
    </label>
    <div class="modal-buttons" style="display:flex; gap:10px; margin-top:15px; justify-content:center;">
      <button class="btn save-settings">💾 Save</button>
      <button class="btn cancel-settings">✖ Cancel</button>
    </div>
  `);

  // Live preview for wallpaper
  modal.querySelector('#wallpaper').addEventListener('input', (e) => {
    document.body.style.background = `#1e1e1e url('${e.target.value}') center center no-repeat`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundAttachment = 'fixed';
  });

  // Live preview for theme
  modal.querySelector('#theme').addEventListener('input', (e) => {
    document.querySelector('header').style.backgroundColor = e.target.value;
  });

  // Save button
  modal.querySelector('.save-settings').addEventListener('click', async () => {
    const wallpaper = modal.querySelector('#wallpaper').value;
    const theme = modal.querySelector('#theme').value;
    await window.api.saveSettings({ wallpaper, theme });
    closeModal();
  });

  // Cancel button
  modal.querySelector('.cancel-settings').addEventListener('click', closeModal);
});

// ===== Apply Settings (on startup) =====
async function applySettings() {
  const settings = await window.api.getSettings();

  if (settings.wallpaper) {
    document.body.style.background = `#1e1e1e url('${settings.wallpaper}') center center no-repeat`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundAttachment = 'fixed';
  }

  if (settings.theme) {
    document.querySelector('header').style.backgroundColor = settings.theme;
  }
}

applySettings();
loadApps();
