/* YUMA – Addon sezione Regolamento (gestibile da Admin) */
(function () {
  function ensureSection() {
    if (document.getElementById('regolamento')) return;
    var unisciti = document.getElementById('unisciti');
    if (!unisciti) return;
    var sec = document.createElement('section');
    sec.id = 'regolamento';
    sec.className = 'py-20 md:py-28 px-5 max-w-4xl mx-auto';
    sec.innerHTML =
      '<div class="section-divider mb-16 md:mb-20"></div>' +
      '<div class="text-center mb-10">' +
      '<span class="text-sky-400 font-orbitron uppercase tracking-[0.2em] text-xs font-semibold" data-i18n="regolamento_label">Regole di Bordo</span>' +
      '<h2 id="regolamento-title" class="text-3xl md:text-5xl font-black mt-2 font-orbitron tracking-tight" data-i18n="regolamento_title">Regolamento</h2>' +
      '<p class="text-slate-400 mt-3 max-w-lg mx-auto text-sm md:text-base" data-i18n="regolamento_desc">Le regole del team YUMA: rispetto, fair play e spirito di squadra.</p>' +
      '</div>' +
      '<div class="glass-card p-8 md:p-11 rounded-3xl border border-sky-500/20">' +
      '<div id="regolamento-body" class="text-slate-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap">' +
      '<p class="text-slate-500 italic" data-i18n="regolamento_empty">Il regolamento verrà pubblicato a breve dall\'amministrazione.</p>' +
      '</div></div>';
    unisciti.parentNode.insertBefore(sec, unisciti);
  }

  function ensureNav() {
    document.querySelectorAll('a[href="#roster"]').forEach(function (a) {
      if (a.parentNode && !a.parentNode.querySelector('a[href="#regolamento"]')) {
        var link = document.createElement('a');
        link.href = '#regolamento';
        link.className = a.className.replace('hover:text-amber-400', 'hover:text-sky-400');
        link.setAttribute('data-i18n', 'nav_regolamento');
        link.textContent = 'Regolamento';
        if (a.getAttribute('onclick')) link.setAttribute('onclick', a.getAttribute('onclick'));
        a.parentNode.insertBefore(link, a.nextSibling);
      }
    });
  }

  function ensureAdminFields() {
    var tab = document.getElementById('adminTab-content');
    if (!tab || document.getElementById('inp-regolamento')) return;
    var box = document.createElement('div');
    box.className = 'border-t border-slate-700/80 pt-4 mt-2';
    box.innerHTML =
      '<label class="block text-[11px] text-amber-400 mb-1 uppercase tracking-wider font-semibold">Titolo sezione Regolamento</label>' +
      '<input type="text" id="inp-regolamento-title" class="auth-input text-sm mb-3" placeholder="Regolamento">' +
      '<label class="block text-[11px] text-amber-400 mb-1 uppercase tracking-wider font-semibold">Testo Regolamento (gestibile interamente da qui)</label>' +
      '<textarea id="inp-regolamento" rows="10" class="auth-input text-sm resize-y min-h-[160px] font-sans" placeholder="Scrivi qui tutto il regolamento..."></textarea>' +
      '<p class="text-[10px] text-slate-500 mt-1.5">Gli a capo vengono rispettati. Modificabile solo dagli admin.</p>';
    tab.appendChild(box);
  }

  var _save = window.saveChanges;
  window.saveChanges = async function () {
    if (!currentUser || !isAdmin || !supabaseClient) return;
    function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
    var payload = {
      id: 'main',
      title: val('inp-title'),
      slogan: val('inp-slogan'),
      subtext: val('inp-subtext'),
      bg_url: val('inp-bg') || null,
      regolamento: val('inp-regolamento') || '',
      regolamento_title: val('inp-regolamento-title') || 'Regolamento',
      updated_at: new Date().toISOString(),
      updated_by: currentUser.id
    };
    var res = await supabaseClient.from('site_content').upsert(payload);
    if (res.error) { alert('Errore: ' + res.error.message); return; }
    if (typeof applyContent === 'function') applyContent(payload);
    else applyRegolamento(payload);
    if (typeof closeAdminPanel === 'function') closeAdminPanel();
    alert('Testi salvati.');
  };

  var _apply = window.applyContent;
  window.applyContent = function (data) {
    if (_apply) _apply(data);
    applyRegolamento(data);
  };

  function applyRegolamento(data) {
    if (!data) return;
    if (data.regolamento_title) {
      var rt = document.getElementById('regolamento-title');
      if (rt) rt.textContent = data.regolamento_title;
    }
    var body = document.getElementById('regolamento-body');
    if (body) {
      var txt = (data.regolamento || '').trim();
      if (txt) {
        body.textContent = txt;
      }
    }
  }

  var _open = window.openAdminPanel;
  window.openAdminPanel = function () {
    ensureAdminFields();
    if (_open) _open();
    setTimeout(function () {
      function set(id, val) { var el = document.getElementById(id); if (el) el.value = val != null ? val : ''; }
      var rt = document.getElementById('regolamento-title');
      set('inp-regolamento-title', rt ? rt.textContent.trim() : 'Regolamento');
      var rb = document.getElementById('regolamento-body');
      var t = rb ? rb.textContent.trim() : '';
      if (/regolamento verrà pubblicato|will be published|se publicará|sera publié/i.test(t)) t = '';
      set('inp-regolamento', t);
    }, 50);
  };

  if (typeof I18N !== 'undefined') {
    var extra = {
      it: { nav_regolamento: 'Regolamento', regolamento_label: 'Regole di Bordo', regolamento_title: 'Regolamento', regolamento_desc: 'Le regole del team YUMA: rispetto, fair play e spirito di squadra.', regolamento_empty: 'Il regolamento verrà pubblicato a breve dall\'amministrazione.' },
      en: { nav_regolamento: 'Rules', regolamento_label: 'Ship Rules', regolamento_title: 'Regulations', regolamento_desc: 'YUMA team rules: respect, fair play and team spirit.', regolamento_empty: 'The regulations will be published shortly by the administration.' },
      es: { nav_regolamento: 'Reglamento', regolamento_label: 'Reglas de a Bordo', regolamento_title: 'Reglamento', regolamento_desc: 'Las reglas del equipo YUMA: respeto, juego limpio y espíritu de equipo.', regolamento_empty: 'El reglamento se publicará en breve por la administración.' },
      fr: { nav_regolamento: 'Règlement', regolamento_label: 'Règles de Bord', regolamento_title: 'Règlement', regolamento_desc: 'Les règles de l\'équipe YUMA : respect, fair-play et esprit d\'équipe.', regolamento_empty: 'Le règlement sera publié prochainement par l\'administration.' }
    };
    Object.keys(extra).forEach(function (lang) {
      if (I18N[lang]) Object.assign(I18N[lang], extra[lang]);
    });
  }

  function boot() {
    ensureSection();
    ensureNav();
    ensureAdminFields();
    if (typeof loadContentFromSupabase === 'function') loadContentFromSupabase();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
