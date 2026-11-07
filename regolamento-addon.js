/* YUMA – Regolamento: regole numerate (crea / modifica / cancella) gestite da Admin */
(function () {
  var regoleCache = []; // [{ id, testo }]

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseRegole(raw) {
    if (!raw) return [];
    var s = String(raw).trim();
    if (!s) return [];
    if (s.charAt(0) === '[') {
      try {
        var arr = JSON.parse(s);
        if (Array.isArray(arr)) {
          return arr
            .map(function (item, i) {
              if (typeof item === 'string') return { id: 'r' + i, testo: item };
              return {
                id: item.id || 'r' + i,
                testo: item.testo || item.text || item.rule || ''
              };
            })
            .filter(function (r) { return r.testo && r.testo.trim(); });
        }
      } catch (e) {}
    }
    return s
      .split(/\n+/)
      .map(function (line) { return line.replace(/^\s*\d+[.)\-:]\s*/, '').trim(); })
      .filter(Boolean)
      .map(function (testo, i) { return { id: 'r' + i, testo: testo }; });
  }

  function regoleToJson(list) {
    return JSON.stringify(
      (list || [])
        .map(function (r, i) {
          return { id: r.id || 'r' + i, testo: (r.testo || '').trim() };
        })
        .filter(function (r) { return r.testo; })
    );
  }

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
      '<h2 id="regolamento-title" class="text-3xl md:text-5xl font-black mt-2 font-orbitron tracking-tight">Regolamento</h2>' +
      '<p class="text-slate-400 mt-3 max-w-lg mx-auto text-sm md:text-base" data-i18n="regolamento_desc">Le regole del team YUMA: rispetto, fair play e spirito di squadra.</p>' +
      '</div>' +
      '<div class="glass-card p-8 md:p-11 rounded-3xl border border-sky-500/20">' +
      '<ol id="regolamento-body" class="text-slate-300 text-sm md:text-base leading-relaxed space-y-4 list-none pl-0"></ol>' +
      '<p id="regolamento-empty" class="text-slate-500 italic text-sm" data-i18n="regolamento_empty">Il regolamento verrà pubblicato a breve dall\'amministrazione.</p>' +
      '</div>';
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

  function renderPublicRegole() {
    var body = document.getElementById('regolamento-body');
    var empty = document.getElementById('regolamento-empty');
    if (!body) return;
    if (!regoleCache.length) {
      body.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    body.innerHTML = regoleCache
      .map(function (r, i) {
        return (
          '<li class="flex gap-4 items-start">' +
          '<span class="shrink-0 w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-orbitron font-bold text-sm flex items-center justify-center">' +
          (i + 1) +
          '</span>' +
          '<span class="pt-1 leading-relaxed">' +
          escapeHtml(r.testo) +
          '</span></li>'
        );
      })
      .join('');
  }

  function renderAdminRegole() {
    var list = document.getElementById('adminRegoleList');
    if (!list) return;
    if (!regoleCache.length) {
      list.innerHTML = '<p class="text-slate-500 text-xs">Nessuna regola. Aggiungine una sotto.</p>';
      return;
    }
    list.innerHTML = regoleCache
      .map(function (r, i) {
        return (
          '<div class="bg-slate-900/50 border border-slate-700 rounded-xl p-3 space-y-2" data-regola-id="' +
          escapeHtml(r.id) +
          '">' +
          '<div class="flex items-center gap-2">' +
          '<span class="shrink-0 w-7 h-7 rounded-md bg-amber-500/20 text-amber-400 font-orbitron font-bold text-xs flex items-center justify-center">' +
          (i + 1) +
          '</span>' +
          '<span class="text-[11px] text-slate-400 uppercase tracking-wider font-semibold flex-1">Regola ' +
          (i + 1) +
          '</span>' +
          '<button type="button" class="text-sky-400 hover:text-sky-300 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-sky-500/10 border border-sky-500/30" data-edit-regola="' +
          escapeHtml(r.id) +
          '">Modifica</button>' +
          '<button type="button" class="text-red-400 hover:text-red-300 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-red-500/10 border border-red-500/30" data-del-regola="' +
          escapeHtml(r.id) +
          '">Elimina</button>' +
          '</div>' +
          '<div class="regola-view text-slate-300 text-xs leading-relaxed px-1">' +
          escapeHtml(r.testo) +
          '</div>' +
          '<div class="regola-edit hidden space-y-2">' +
          '<textarea class="auth-input text-xs w-full min-h-[70px] resize-y regola-testo" rows="3">' +
          escapeHtml(r.testo) +
          '</textarea>' +
          '<div class="flex gap-2">' +
          '<button type="button" class="btn-secondary text-xs py-1.5 px-3 flex-1" data-save-edit="' +
          escapeHtml(r.id) +
          '">Conferma modifica</button>' +
          '<button type="button" class="text-slate-400 hover:text-slate-200 text-xs py-1.5 px-3 rounded-lg hover:bg-slate-700/50" data-cancel-edit="' +
          escapeHtml(r.id) +
          '">Annulla</button>' +
          '</div></div></div>'
        );
      })
      .join('');

    // Elimina
    list.querySelectorAll('[data-del-regola]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-del-regola');
        var idx = regoleCache.findIndex(function (x) { return x.id === id; });
        if (!confirm('Eliminare la regola n. ' + (idx + 1) + '?')) return;
        regoleCache = regoleCache.filter(function (r) { return r.id !== id; });
        renderAdminRegole();
        renderPublicRegole();
      });
    });

    // Modifica → mostra textarea
    list.querySelectorAll('[data-edit-regola]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-edit-regola');
        var row = list.querySelector('[data-regola-id="' + id + '"]');
        if (!row) return;
        // Chiudi altre edit aperte
        list.querySelectorAll('.regola-edit').forEach(function (el) { el.classList.add('hidden'); });
        list.querySelectorAll('.regola-view').forEach(function (el) { el.classList.remove('hidden'); });
        var view = row.querySelector('.regola-view');
        var edit = row.querySelector('.regola-edit');
        var ta = row.querySelector('.regola-testo');
        if (view) view.classList.add('hidden');
        if (edit) edit.classList.remove('hidden');
        if (ta) {
          ta.value = (regoleCache.find(function (r) { return r.id === id; }) || {}).testo || '';
          ta.focus();
        }
      });
    });

    // Conferma modifica
    list.querySelectorAll('[data-save-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-save-edit');
        var row = list.querySelector('[data-regola-id="' + id + '"]');
        if (!row) return;
        var ta = row.querySelector('.regola-testo');
        var testo = ta ? ta.value.trim() : '';
        if (!testo) {
          alert('Il testo della regola non può essere vuoto.');
          return;
        }
        var item = regoleCache.find(function (r) { return r.id === id; });
        if (item) item.testo = testo;
        renderAdminRegole();
        renderPublicRegole();
      });
    });

    // Annulla modifica
    list.querySelectorAll('[data-cancel-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        renderAdminRegole();
      });
    });
  }

  function syncRegoleFromAdminDom() {
    var list = document.getElementById('adminRegoleList');
    if (!list) return;
    list.querySelectorAll('[data-regola-id]').forEach(function (row) {
      var id = row.getAttribute('data-regola-id');
      var ta = row.querySelector('.regola-testo');
      var edit = row.querySelector('.regola-edit');
      if (ta && edit && !edit.classList.contains('hidden')) {
        var item = regoleCache.find(function (r) { return r.id === id; });
        if (item) item.testo = ta.value;
      }
    });
  }

  function ensureAdminFields() {
    var tab = document.getElementById('adminTab-content');
    if (!tab || document.getElementById('adminRegoleBox')) return;

    var box = document.createElement('div');
    box.id = 'adminRegoleBox';
    box.className = 'border-t border-slate-700/80 pt-4 mt-2 space-y-3';
    box.innerHTML =
      '<div class="bg-amber-500/10 border border-amber-500/25 p-3 rounded-lg text-amber-200 text-xs">' +
      '<strong>Regolamento</strong>: crea, <strong>modifica</strong> o elimina le regole una per una. Poi premi <strong>Salva</strong>.' +
      '</div>' +
      '<div>' +
      '<label class="block text-[11px] text-amber-400 mb-1 uppercase tracking-wider font-semibold">Titolo sezione</label>' +
      '<input type="text" id="inp-regolamento-title" class="auth-input text-sm" placeholder="Regolamento" value="Regolamento">' +
      '</div>' +
      '<div>' +
      '<label class="block text-[11px] text-amber-400 mb-2 uppercase tracking-wider font-semibold">Regole</label>' +
      '<div id="adminRegoleList" class="space-y-2 max-h-72 overflow-y-auto mb-3"></div>' +
      '</div>' +
      '<div class="border border-sky-500/25 rounded-xl p-3 space-y-2 bg-sky-500/5">' +
      '<h4 class="text-sky-400 font-bold text-[11px] uppercase tracking-wider">Nuova regola</h4>' +
      '<textarea id="new-regola-testo" rows="2" class="auth-input text-xs resize-y" placeholder="Scrivi il testo della nuova regola..."></textarea>' +
      '<button type="button" id="btn-add-regola" class="btn-secondary text-xs w-full py-2">+ Aggiungi regola</button>' +
      '</div>';
    tab.appendChild(box);

    var addBtn = document.getElementById('btn-add-regola');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        var ta = document.getElementById('new-regola-testo');
        var testo = ta ? ta.value.trim() : '';
        if (!testo) {
          alert('Scrivi il testo della regola prima di aggiungerla.');
          return;
        }
        syncRegoleFromAdminDom();
        regoleCache.push({
          id: 'r' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          testo: testo
        });
        if (ta) ta.value = '';
        renderAdminRegole();
        renderPublicRegole();
      });
    }

    renderAdminRegole();
  }

  var _save = window.saveChanges;
  window.saveChanges = async function () {
    if (!currentUser || !isAdmin || !supabaseClient) return;
    function val(id) {
      var el = document.getElementById(id);
      return el ? el.value : '';
    }
    syncRegoleFromAdminDom();
    var payload = {
      id: 'main',
      title: val('inp-title'),
      slogan: val('inp-slogan'),
      subtext: val('inp-subtext'),
      bg_url: val('inp-bg') || null,
      regolamento: regoleToJson(regoleCache),
      regolamento_title: val('inp-regolamento-title') || 'Regolamento',
      updated_at: new Date().toISOString(),
      updated_by: currentUser.id
    };
    var res = await supabaseClient.from('site_content').upsert(payload);
    if (res.error) {
      alert('Errore: ' + res.error.message);
      return;
    }
    applyRegolamento(payload);
    if (typeof applyContent === 'function') {
      try {
        var _apply = window.applyContent;
        // evita loop: applyContent chiama già applyRegolamento via patch
      } catch (e) {}
    }
    if (typeof closeAdminPanel === 'function') closeAdminPanel();
    alert('Salvato. Regole: ' + regoleCache.length);
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
      var inp = document.getElementById('inp-regolamento-title');
      if (inp) inp.value = data.regolamento_title;
    }
    regoleCache = parseRegole(data.regolamento);
    renderPublicRegole();
    renderAdminRegole();
  }

  var _open = window.openAdminPanel;
  window.openAdminPanel = function () {
    ensureAdminFields();
    if (_open) _open();
    setTimeout(function () {
      var rt = document.getElementById('regolamento-title');
      var inp = document.getElementById('inp-regolamento-title');
      if (inp) inp.value = rt ? rt.textContent.trim() : 'Regolamento';
      renderAdminRegole();
    }, 80);
  };

  if (typeof I18N !== 'undefined') {
    var extra = {
      it: {
        nav_regolamento: 'Regolamento',
        regolamento_label: 'Regole di Bordo',
        regolamento_title: 'Regolamento',
        regolamento_desc: 'Le regole del team YUMA: rispetto, fair play e spirito di squadra.',
        regolamento_empty: 'Il regolamento verrà pubblicato a breve dall\'amministrazione.'
      },
      en: {
        nav_regolamento: 'Rules',
        regolamento_label: 'Ship Rules',
        regolamento_title: 'Regulations',
        regolamento_desc: 'YUMA team rules: respect, fair play and team spirit.',
        regolamento_empty: 'The regulations will be published shortly by the administration.'
      },
      es: {
        nav_regolamento: 'Reglamento',
        regolamento_label: 'Reglas de a Bordo',
        regolamento_title: 'Reglamento',
        regolamento_desc: 'Las reglas del equipo YUMA: respeto, juego limpio y espíritu de equipo.',
        regolamento_empty: 'El reglamento se publicará en breve por la administración.'
      },
      fr: {
        nav_regolamento: 'Règlement',
        regolamento_label: 'Règles de Bord',
        regolamento_title: 'Règlement',
        regolamento_desc: 'Les règles de l\'équipe YUMA : respect, fair-play et esprit d\'équipe.',
        regolamento_empty: 'Le règlement sera publié prochainement par l\'administration.'
      }
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
