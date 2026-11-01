const SUPABASE_URL = 'https://eefszkqpfwwxoljauobs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZnN6a3FwZnd3eG9samF1b2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjI4MTMsImV4cCI6MjEwODkzODgxM30.xak6904GHCnq4LSJsfNdNGGZeNa7ObRsV6NhfyFE2Zs';
let supabaseClient = null, currentUser = null, isAdmin = false, userProfile = null, membersCache = [], adminUsersCache = [];
try {
  if (window.supabase && window.supabase.createClient)
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) { console.error(e); }

function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function openLoginModal() {
  var m = document.getElementById('loginModal'); if (!m) return;
  m.classList.remove('hidden'); m.classList.add('flex');
  var err = document.getElementById('loginError'), loading = document.getElementById('loginLoading');
  var form = document.getElementById('loginForm'), btn = document.getElementById('loginBtn');
  if (err) err.classList.add('hidden'); if (loading) loading.classList.add('hidden');
  if (form) form.reset(); if (btn) btn.disabled = false;
  setTimeout(function(){ var el = document.getElementById('loginEmail'); if (el) el.focus(); }, 100);
}
function closeLoginModal() {
  var m = document.getElementById('loginModal'); if (!m) return;
  m.classList.add('hidden'); m.classList.remove('flex');
}
function openRegisterModal() {
  var m = document.getElementById('registerModal'); if (!m) return;
  m.classList.remove('hidden'); m.classList.add('flex');
  var err = document.getElementById('registerError'), ok = document.getElementById('registerSuccess');
  var loading = document.getElementById('registerLoading'), form = document.getElementById('registerForm'), btn = document.getElementById('registerBtn');
  if (err) err.classList.add('hidden'); if (ok) ok.classList.add('hidden');
  if (loading) loading.classList.add('hidden'); if (form) form.reset(); if (btn) btn.disabled = false;
}
function closeRegisterModal() {
  var m = document.getElementById('registerModal'); if (!m) return;
  m.classList.add('hidden'); m.classList.remove('flex');
}
function closeAdminPanel() {
  var m = document.getElementById('adminModal'); if (!m) return;
  m.classList.add('hidden'); m.classList.remove('flex');
}
function toggleMenu() { var menu = document.getElementById('mobileMenu'); if (menu) menu.classList.toggle('open'); }
function showAdminTab(name) {
  ['content','roster','users','system','downloads','board','socio_dl','socio_board'].forEach(function(t) {
    var tab = document.getElementById('adminTab-' + t), btn = document.getElementById('tab-' + t);
    if (tab) tab.classList.toggle('hidden', t !== name);
    if (btn) btn.className = t === name
      ? 'admin-tab px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30'
      : 'admin-tab px-3 py-1.5 rounded-lg bg-slate-800/60 text-slate-400 border border-slate-700';
  });
  if (name === 'roster') renderAdminMembers();
  if (name === 'users') loadUsersAdmin();
  if (name === 'system') loadCandidatureList();
  if (name === 'downloads') loadAdminDownloads();
  if (name === 'board') loadAdminBoard();
  if (name === 'socio_dl') loadAdminSocioDownloads();
  if (name === 'socio_board') loadAdminSocioBoard();
}

async function initAuth() {
  if (!supabaseClient) return;
  try {
    var res = await supabaseClient.auth.getSession();
    currentUser = (res.data && res.data.session && res.data.session.user) || null;
    await loadUserProfile();
    updateAuthUI();
    supabaseClient.auth.onAuthStateChange(async function(_e, session) {
      currentUser = (session && session.user) || null;
      await loadUserProfile();
      updateAuthUI();
    });
  } catch (e) { console.error(e); }
}
async function loadUserProfile() {
  userProfile = null; isAdmin = false;
  if (!currentUser || !supabaseClient) return;
  try {
    var res = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    if (!res.error && res.data) {
      userProfile = res.data;
      isAdmin = userProfile.role === 'admin' && (userProfile.status === 'approved' || !userProfile.status);
      if ((currentUser.email || '').toLowerCase() === 'klaus68@hotmail.it') isAdmin = true;
    } else if ((currentUser.email || '').toLowerCase() === 'klaus68@hotmail.it') {
      isAdmin = true;
    }
  } catch (e) {
    if ((currentUser.email || '').toLowerCase() === 'klaus68@hotmail.it') isAdmin = true;
  }
}
function updateAuthUI() {
  var loggedOut = document.getElementById('authLoggedOut'), loggedIn = document.getElementById('authLoggedIn');
  var mobOut = document.getElementById('mobileAuthOut'), mobIn = document.getElementById('mobileAuthIn');
  if (!loggedOut || !loggedIn) return;

  var role = (userProfile && userProfile.role) || '';
  var status = (userProfile && userProfile.status) || '';
  var isApproved = status === 'approved' || role === 'admin' || isAdmin;
  // Area Soci: socio approvato (o admin)
  var canSeeSoci = !!(currentUser && (isAdmin || (isApproved && role === 'socio')));
  // YUMA Only: yuma approvato (o admin)
  var canSeeYuma = !!(currentUser && (isAdmin || (isApproved && role === 'yuma')));

  if (currentUser) {
    loggedOut.classList.add('hidden'); loggedOut.classList.remove('flex');
    loggedIn.classList.remove('hidden'); loggedIn.classList.add('flex');
    if (mobOut) mobOut.classList.add('hidden'); if (mobIn) mobIn.classList.remove('hidden');
    var label = document.getElementById('userEmailLabel');
    var name = (userProfile && (userProfile.nickname || userProfile.display_name)) || currentUser.email || 'Utente';
    if (label) label.textContent = name;
    document.querySelectorAll('[onclick*="openAdminPanel"]').forEach(function(b) {
      b.style.display = isAdmin ? '' : 'none';
    });

    document.querySelectorAll('.nav-area-soci').forEach(function(el) {
      el.classList.toggle('hidden', !canSeeSoci);
    });
    document.querySelectorAll('.nav-area-yuma, .nav-area-membri').forEach(function(el) {
      el.classList.toggle('hidden', !canSeeYuma);
    });

    var sociSec = document.getElementById('area-soci');
    if (sociSec) {
      if (canSeeSoci) { sociSec.classList.remove('hidden'); renderAreaSoci(); }
      else sociSec.classList.add('hidden');
    }
    var yumaSec = document.getElementById('area-yuma') || document.getElementById('area-membri');
    if (yumaSec) {
      if (canSeeYuma) { yumaSec.classList.remove('hidden'); renderAreaYuma(); }
      else yumaSec.classList.add('hidden');
    }
  } else {
    loggedOut.classList.remove('hidden'); loggedOut.classList.add('flex');
    loggedIn.classList.add('hidden'); loggedIn.classList.remove('flex');
    if (mobOut) mobOut.classList.remove('hidden'); if (mobIn) mobIn.classList.add('hidden');
    document.querySelectorAll('.nav-area-soci, .nav-area-yuma, .nav-area-membri').forEach(function(el) {
      el.classList.add('hidden');
    });
    var sociSec = document.getElementById('area-soci');
    if (sociSec) sociSec.classList.add('hidden');
    var yumaSec = document.getElementById('area-yuma') || document.getElementById('area-membri');
    if (yumaSec) yumaSec.classList.add('hidden');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  var email = document.getElementById('loginEmail').value.trim();
  var password = document.getElementById('loginPass').value;
  var errBox = document.getElementById('loginError'), loading = document.getElementById('loginLoading'), btn = document.getElementById('loginBtn');
  if (errBox) errBox.classList.add('hidden'); if (loading) loading.classList.remove('hidden'); if (btn) btn.disabled = true;
  if (!supabaseClient) {
    if (loading) loading.classList.add('hidden'); if (btn) btn.disabled = false;
    if (errBox) { errBox.textContent = 'Supabase non disponibile.'; errBox.classList.remove('hidden'); }
    return;
  }
  try {
    var res = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
    if (loading) loading.classList.add('hidden'); if (btn) btn.disabled = false;
    if (res.error) {
      var msg = (res.error.message || '').toLowerCase(), text = res.error.message || 'Accesso non riuscito.';
      if (msg.indexOf('invalid login') >= 0) text = 'Email o password non validi.';
      else if (msg.indexOf('email not confirmed') >= 0) text = 'Conferma la email (o disattiva Confirm email in Supabase Auth).';
      if (errBox) { errBox.textContent = text; errBox.classList.remove('hidden'); }
      return;
    }
    currentUser = res.data.user;
    await loadUserProfile();
    if (userProfile && userProfile.status === 'pending') {
      if (errBox) { errBox.textContent = '' + (typeof t === 'function' ? t('alert_pending') : 'Account in attesa di approvazione da parte dell\'admin.') + ''; errBox.classList.remove('hidden'); }
    } else if (userProfile && userProfile.status === 'rejected') {
      if (errBox) { errBox.textContent = 'Registrazione non approvata.'; errBox.classList.remove('hidden'); }
      await supabaseClient.auth.signOut();
      currentUser = null; userProfile = null; isAdmin = false;
      return;
    }
    closeLoginModal();
    updateAuthUI();
  } catch (err) {
    if (loading) loading.classList.add('hidden'); if (btn) btn.disabled = false;
    if (errBox) { errBox.textContent = 'Errore: ' + (err.message || err); errBox.classList.remove('hidden'); }
  }
}
async function handleRegister(e) {
  e.preventDefault();
  var firstName = (document.getElementById('regFirstName') || {}).value || '';
  var lastName = (document.getElementById('regLastName') || {}).value || '';
  var nickname = (document.getElementById('regNickname') || {}).value || '';
  var email = (document.getElementById('regEmail') || {}).value || '';
  var password = (document.getElementById('regPass') || {}).value || '';
  var notes = (document.getElementById('regNotes') || {}).value || '';
  firstName = firstName.trim(); lastName = lastName.trim(); nickname = nickname.trim();
  email = email.trim(); notes = notes.trim();
  var displayName = nickname || (firstName + ' ' + lastName).trim() || email.split('@')[0];

  var errBox = document.getElementById('registerError'), okBox = document.getElementById('registerSuccess');
  var loading = document.getElementById('registerLoading'), btn = document.getElementById('registerBtn');
  if (errBox) errBox.classList.add('hidden'); if (okBox) okBox.classList.add('hidden');
  if (loading) loading.classList.remove('hidden'); if (btn) btn.disabled = true;
  if (!supabaseClient) {
    if (loading) loading.classList.add('hidden'); if (btn) btn.disabled = false;
    if (errBox) { errBox.textContent = 'Supabase non disponibile.'; errBox.classList.remove('hidden'); }
    return;
  }
  try {
    var res = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          display_name: displayName,
          first_name: firstName,
          last_name: lastName,
          nickname: nickname,
          notes: notes
        }
      }
    });
    if (loading) loading.classList.add('hidden'); if (btn) btn.disabled = false;
    if (res.error) {
      if (errBox) { errBox.textContent = res.error.message; errBox.classList.remove('hidden'); }
      return;
    }
    if (res.data && res.data.user) {
      await supabaseClient.from('profiles').upsert({
        id: res.data.user.id,
        email: email,
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
        nickname: nickname,
        notes: notes || null,
        role: 'pending',
        status: 'pending'
      });
      await supabaseClient.auth.signOut();
      currentUser = null; userProfile = null; isAdmin = false;
      updateAuthUI();
    }
    if (okBox) {
      okBox.textContent = 'Richiesta inviata! L\'admin valuterà la registrazione. Poi potrai accedere.';
      okBox.classList.remove('hidden');
    }
    if (btn) btn.disabled = true;
  } catch (err) {
    if (loading) loading.classList.add('hidden'); if (btn) btn.disabled = false;
    if (errBox) { errBox.textContent = 'Errore: ' + (err.message || err); errBox.classList.remove('hidden'); }
  }
}

async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  currentUser = null; isAdmin = false; userProfile = null;
  updateAuthUI();
  closeAdminPanel();
}


function closeUserDetail() {
  var m = document.getElementById('userDetailModal');
  if (!m) return;
  m.classList.add('hidden'); m.classList.remove('flex');
}
function openUserDetail(id) {
  if (!isAdmin) return;
  var p = (adminUsersCache || []).find(function(u) { return u.id === id; });
  if (!p) { alert('Utente non trovato.'); return; }
  var set = function(i, v) { var el = document.getElementById(i); if (el) el.value = v != null ? v : ''; };
  set('udId', p.id);
  set('udFirstName', p.first_name || '');
  set('udLastName', p.last_name || '');
  set('udNickname', p.nickname || p.display_name || '');
  set('udEmail', p.email || '');
  set('udRole', p.role || 'pending');
  set('udStatus', p.status || 'pending');
  set('udNotes', p.notes || '');
  var nick = p.nickname || p.display_name || p.email || '?';
  var av = document.getElementById('udAvatar');
  if (av) av.textContent = String(nick).charAt(0).toUpperCase();
  var title = document.getElementById('udTitle');
  if (title) title.textContent = nick;
  var sub = document.getElementById('udSubtitle');
  if (sub) sub.textContent = ((p.first_name || '') + ' ' + (p.last_name || '')).trim() || 'Scheda utente';
  var err = document.getElementById('udError'), ok = document.getElementById('udSuccess');
  if (err) err.classList.add('hidden'); if (ok) ok.classList.add('hidden');
  var m = document.getElementById('userDetailModal');
  if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
}
async function saveUserDetail(e) {
  e.preventDefault();
  if (!isAdmin || !supabaseClient) return;
  var id = document.getElementById('udId').value;
  var firstName = document.getElementById('udFirstName').value.trim();
  var lastName = document.getElementById('udLastName').value.trim();
  var nickname = document.getElementById('udNickname').value.trim();
  var role = document.getElementById('udRole').value;
  var status = document.getElementById('udStatus').value;
  var notes = document.getElementById('udNotes').value.trim();
  var displayName = nickname || (firstName + ' ' + lastName).trim();
  var err = document.getElementById('udError'), ok = document.getElementById('udSuccess');
  if (err) err.classList.add('hidden'); if (ok) ok.classList.add('hidden');
  try {
    var res = await supabaseClient.from('profiles').update({
      first_name: firstName,
      last_name: lastName,
      nickname: nickname,
      display_name: displayName,
      role: role,
      status: status,
      notes: notes || null
    }).eq('id', id).select('*');
    if (res.error) {
      if (err) { err.textContent = res.error.message; err.classList.remove('hidden'); }
      return;
    }
    if (!res.data || !res.data.length) {
      if (err) { err.textContent = 'Nessuna riga aggiornata (controlla policy RLS).'; err.classList.remove('hidden'); }
      return;
    }
    if (ok) { ok.textContent = 'Scheda salvata.'; ok.classList.remove('hidden'); }
    await loadUsersAdmin();
    // refresh cache entry for modal title
    var p = res.data[0];
    var title = document.getElementById('udTitle');
    if (title) title.textContent = p.nickname || p.display_name || 'Utente';
    var av = document.getElementById('udAvatar');
    if (av) av.textContent = String(p.nickname || p.display_name || '?').charAt(0).toUpperCase();
  } catch (ex) {
    if (err) { err.textContent = String(ex.message || ex); err.classList.remove('hidden'); }
  }
}
async function quickApproveFromDetail(role) {
  var id = document.getElementById('udId').value;
  document.getElementById('udRole').value = role;
  document.getElementById('udStatus').value = 'approved';
  await saveUserDetail({ preventDefault: function(){} });
}
async function quickRejectFromDetail() {
  if (!confirm('Rifiutare questa registrazione?')) return;
  document.getElementById('udRole').value = 'pending';
  document.getElementById('udStatus').value = 'rejected';
  await saveUserDetail({ preventDefault: function(){} });
}

async function loadUsersAdmin() {
  if (!isAdmin || !supabaseClient) return;
  var pendingBox = document.getElementById('pendingUsersList');
  var activeBox = document.getElementById('activeUsersList');
  if (pendingBox) pendingBox.innerHTML = '<p class="text-slate-500 text-xs">Caricamento...</p>';
  if (activeBox) activeBox.innerHTML = '<p class="text-slate-500 text-xs">Caricamento...</p>';
  var res = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
  if (res.error) {
    if (pendingBox) pendingBox.innerHTML = '<p class="text-red-400 text-xs">' + res.error.message + '</p>';
    return;
  }
  adminUsersCache = res.data || [];
  var pending = adminUsersCache.filter(function(p) { return p.status === 'pending'; });
  var active = adminUsersCache.filter(function(p) { return p.status === 'approved' || p.role === 'admin'; });

  function userCard(p, isPending) {
    var nick = p.nickname || p.display_name || '—';
    var fullName = ((p.first_name || '') + ' ' + (p.last_name || '')).trim() || '—';
    var initial = (nick || fullName || p.email || '?').charAt(0).toUpperCase();
    var dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString('it-IT') : '';
    var roleLabel = p.role === 'admin' ? 'Admin' : (p.role === 'yuma' ? 'YUMA' : (p.role === 'socio' ? 'Socio' : 'In attesa'));
    var roleColor = p.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                    p.role === 'yuma' ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' :
                    p.role === 'socio' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                    'bg-slate-500/20 text-slate-300 border-slate-500/40';
    return '<div class="border border-slate-700/80 rounded-xl p-3.5 bg-slate-900/40 cursor-pointer hover:border-sky-500/40 hover:bg-slate-800/50 transition ' +
      (isPending ? 'border-amber-500/25 bg-amber-500/5' : '') + '" onclick="openUserDetail(\'' + p.id + '\')" title="Apri scheda utente">' +
      '<div class="flex gap-3">' +
        '<div class="w-11 h-11 rounded-full bg-gradient-to-br from-sky-500/30 to-blue-700/20 border border-sky-400/30 flex items-center justify-center font-orbitron font-bold text-sky-300 text-sm shrink-0">' + escapeHtml(initial) + '</div>' +
        '<div class="min-w-0 flex-1">' +
          '<div class="flex flex-wrap items-center gap-2">' +
            '<span class="text-white font-bold text-sm truncate">' + escapeHtml(nick) + '</span>' +
            '<span class="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ' + roleColor + '">' + roleLabel + '</span>' +
          '</div>' +
          '<div class="text-slate-300 text-xs mt-0.5">' + escapeHtml(fullName) + '</div>' +
          '<div class="text-sky-400/90 text-xs mt-0.5 truncate">' + escapeHtml(p.email || '') + '</div>' +
          (p.notes ? '<div class="text-slate-400 text-[11px] mt-1.5 italic border-l-2 border-slate-600 pl-2 line-clamp-2">' + escapeHtml(p.notes) + '</div>' : '') +
          '<div class="flex justify-between items-center mt-2">' +
            (dateStr ? '<span class="text-slate-600 text-[10px]">' + dateStr + '</span>' : '<span></span>') +
            '<span class="text-sky-400/70 text-[10px] font-semibold">Apri scheda →</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  if (pendingBox) {
    if (!pending.length) pendingBox.innerHTML = '<p class="text-slate-500 text-xs">Nessuna richiesta in attesa.</p>';
    else pendingBox.innerHTML = '<div class="space-y-2.5">' + pending.map(function(p) { return userCard(p, true); }).join('') + '</div>';
  }
  if (activeBox) {
    if (!active.length) activeBox.innerHTML = '<p class="text-slate-500 text-xs">Nessun utente attivo.</p>';
    else activeBox.innerHTML = '<div class="space-y-2.5">' + active.map(function(p) { return userCard(p, false); }).join('') + '</div>';
  }
}

async function approveUser(id, role) {
  if (!isAdmin || !supabaseClient) return;
  if (!id) { alert('ID utente mancante.'); return; }
  var pendingBox = document.getElementById('pendingUsersList');
  if (pendingBox) pendingBox.innerHTML = '<p class="text-slate-500 text-xs">Aggiornamento in corso...</p>';
  try {
    var res = await supabaseClient
      .from('profiles')
      .update({ status: 'approved', role: role })
      .eq('id', id)
      .select('id, status, role, display_name, email');
    if (res.error) {
      alert('Errore approvazione: ' + res.error.message + '\n\nControlla le policy RLS (funzione is_admin) in Supabase.');
      loadUsersAdmin();
      return;
    }
    if (!res.data || !res.data.length) {
      alert('Nessuna riga aggiornata. Probabile blocco RLS. Esegui di nuovo il fix SQL delle policy.');
      loadUsersAdmin();
      return;
    }
    alert('✅ Utente approvato come ' + (role === 'yuma' ? 'YUMA' : 'Socio') + '!');
    await loadUsersAdmin();
  } catch (err) {
    alert('Errore: ' + (err.message || err));
    loadUsersAdmin();
  }
}
async function rejectUser(id) {
  if (!isAdmin || !supabaseClient) return;
  if (!id) return;
  if (!confirm('Rifiutare questa registrazione?')) return;
  var pendingBox = document.getElementById('pendingUsersList');
  if (pendingBox) pendingBox.innerHTML = '<p class="text-slate-500 text-xs">Aggiornamento in corso...</p>';
  try {
    var res = await supabaseClient
      .from('profiles')
      .update({ status: 'rejected', role: 'pending' })
      .eq('id', id)
      .select('id, status');
    if (res.error) {
      alert('Errore rifiuto: ' + res.error.message);
      loadUsersAdmin();
      return;
    }
    if (!res.data || !res.data.length) {
      alert('Nessuna riga aggiornata (possibile blocco RLS).');
      loadUsersAdmin();
      return;
    }
    alert('Registrazione rifiutata.');
    await loadUsersAdmin();
  } catch (err) {
    alert('Errore: ' + (err.message || err));
    loadUsersAdmin();
  }
}
async function changeUserRole(id, role) {
  if (!isAdmin || !supabaseClient) return;
  try {
    var res = await supabaseClient
      .from('profiles')
      .update({ role: role })
      .eq('id', id)
      .select('id, role');
    if (res.error) {
      alert('Errore: ' + res.error.message);
      return;
    }
    if (!res.data || !res.data.length) {
      alert('Nessuna riga aggiornata (possibile blocco RLS).');
      return;
    }
    await loadUsersAdmin();
  } catch (err) {
    alert('Errore: ' + (err.message || err));
  }
}

function openAdminPanel() {
  if (!currentUser) { openLoginModal(); return; }
  if (!isAdmin) { alert('Nessun permesso admin.'); return; }
  function set(id, val) { var el = document.getElementById(id); if (el) el.value = val; }
  function txt(id) { var el = document.getElementById(id); return el ? el.innerText : ''; }
  set('inp-title', txt('hero-title'));
  set('inp-slogan', txt('hero-slogan').replace(/[\u201C\u201D"]/g, ''));
  set('inp-subtext', txt('hero-subtext'));
  var info = document.getElementById('adminUserInfo'), sys = document.getElementById('sysEmail');
  if (info) info.textContent = currentUser.email || '';
  if (sys) sys.textContent = currentUser.email || '—';
  showAdminTab('content');
  var m = document.getElementById('adminModal');
  if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
}
async function saveChanges() {
  if (!currentUser || !isAdmin || !supabaseClient) return;
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  var payload = { id: 'main', title: val('inp-title'), slogan: val('inp-slogan'), subtext: val('inp-subtext'), bg_url: val('inp-bg') || null, updated_at: new Date().toISOString(), updated_by: currentUser.id };
  var res = await supabaseClient.from('site_content').upsert(payload);
  if (res.error) { alert('Errore: ' + res.error.message); return; }
  applyContent(payload); closeAdminPanel(); alert('Testi salvati.');
}
function applyContent(data) {
  if (!data) return;
  function setText(id, v) { var el = document.getElementById(id); if (el && v != null) el.innerText = v; }
  if (data.title) { setText('hero-title', data.title); setText('nav-logo', data.title); }
  if (data.slogan) setText('hero-slogan', '\u201C' + data.slogan + '\u201D');
  if (data.subtext) setText('hero-subtext', data.subtext);
  if (data.bg_url) {
    var home = document.getElementById('home');
    if (home) home.style.backgroundImage = "linear-gradient(to bottom, rgba(2,6,23,0.65) 0%, rgba(2,6,23,0.88) 55%, rgba(2,6,23,0.98) 100%), url('" + data.bg_url + "')";
  }
}
async function loadContentFromSupabase() {
  if (!supabaseClient) return;
  try {
    var res = await supabaseClient.from('site_content').select('*').eq('id', 'main').maybeSingle();
    if (!res.error && res.data) applyContent(res.data);
  } catch (e) {}
}

var AVATAR_COLORS = ['from-sky-500/25 to-sky-700/20 border-sky-400/40 text-sky-300','from-amber-500/25 to-amber-700/20 border-amber-400/40 text-amber-300','from-blue-500/25 to-blue-700/20 border-blue-400/40 text-blue-300','from-emerald-500/25 to-emerald-700/20 border-emerald-400/40 text-emerald-300','from-violet-500/25 to-violet-700/20 border-violet-400/40 text-violet-300','from-rose-500/25 to-rose-700/20 border-rose-400/40 text-rose-300'];
function memberInitials(name) {
  var parts = String(name || 'YM').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || 'YM').slice(0, 2).toUpperCase();
}
function renderRoster() {
  var box = document.getElementById('roster-container'); if (!box) return;
  if (!membersCache.length) {
    box.innerHTML = '<p class="text-slate-500 text-sm col-span-full text-center">Nessun membro. Aggiungili dal pannello Admin.</p>';
    return;
  }
  box.innerHTML = membersCache.map(function(m, i) {
    var colors = AVATAR_COLORS[i % AVATAR_COLORS.length];
    var roleClass = i % 2 === 0 ? 'text-amber-400' : 'text-sky-400';
    var avatar;
    if (m.image_url) {
      avatar = '<img src="' + escapeHtml(m.image_url) + '" alt="' + escapeHtml(m.name) + '" class="w-20 h-20 rounded-full object-cover border border-sky-400/40 mb-4 avatar-ring" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div class="w-20 h-20 bg-gradient-to-br ' + colors + ' rounded-full items-center justify-center border font-orbitron text-2xl font-bold mb-4 avatar-ring" style="display:none">' + escapeHtml(memberInitials(m.name)) + '</div>';
    } else {
      avatar = '<div class="w-20 h-20 bg-gradient-to-br ' + colors + ' rounded-full flex items-center justify-center border font-orbitron text-2xl font-bold mb-4 avatar-ring">' + escapeHtml(memberInitials(m.name)) + '</div>';
    }
    return '<div class="glass-card p-6 rounded-2xl text-center flex flex-col items-center">' + avatar +
      '<h3 class="text-xl font-bold font-orbitron text-white">' + escapeHtml(m.name) + '</h3>' +
      '<span class="' + roleClass + ' text-[11px] uppercase tracking-wider font-semibold mb-2">' + escapeHtml(m.role || '') + '</span>' +
      '<p class="text-slate-400 text-xs leading-relaxed">' + escapeHtml(m.description || '') + '</p></div>';
  }).join('');
}
async function loadMembers() {
  if (!supabaseClient) return;
  try {
    var res = await supabaseClient.from('members').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true });
    membersCache = res.error ? [] : (res.data || []);
  } catch (e) { membersCache = []; }
  renderRoster();
}
function renderAdminMembers() {
  var box = document.getElementById('adminMembersList'); if (!box) return;
  if (!membersCache.length) { box.innerHTML = '<p class="text-slate-500 text-xs">Nessun membro.</p>'; return; }
  box.innerHTML = membersCache.map(function(m) {
    return '<div class="border border-slate-700 rounded-xl p-3 space-y-2" data-id="' + m.id + '">' +
      '<div class="flex gap-2 items-start">' +
        (m.image_url ? '<img src="' + escapeHtml(m.image_url) + '" class="w-12 h-12 rounded-full object-cover border border-slate-600 shrink-0" alt="">' :
          '<div class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">' + escapeHtml(memberInitials(m.name)) + '</div>') +
        '<div class="flex-1 space-y-1.5 min-w-0">' +
          '<input type="text" value="' + escapeHtml(m.name) + '" data-field="name" class="auth-input text-xs" placeholder="Nome">' +
          '<input type="text" value="' + escapeHtml(m.role || '') + '" data-field="role" class="auth-input text-xs" placeholder="Ruolo">' +
          '<input type="text" value="' + escapeHtml(m.description || '') + '" data-field="description" class="auth-input text-xs" placeholder="Descrizione">' +
          '<input type="url" value="' + escapeHtml(m.image_url || '') + '" data-field="image_url" class="auth-input text-xs" placeholder="URL foto">' +
          '<input type="number" value="' + (m.sort_order || 0) + '" data-field="sort_order" class="auth-input text-xs" placeholder="Ordine">' +
        '</div></div>' +
      '<div class="flex gap-2">' +
        '<button type="button" onclick="saveMember(' + m.id + ')" class="btn-secondary text-[11px] px-3 py-1.5 flex-1">Salva</button>' +
        '<button type="button" onclick="deleteMember(' + m.id + ')" class="text-red-400 text-[11px] px-3 py-1.5 border border-red-500/30 rounded-lg">Elimina</button>' +
      '</div></div>';
  }).join('');
}
async function addMember() {
  if (!isAdmin || !supabaseClient) return;
  var name = (document.getElementById('new-m-name').value || '').trim();
  var role = (document.getElementById('new-m-role').value || '').trim();
  var desc = (document.getElementById('new-m-desc').value || '').trim();
  var img = (document.getElementById('new-m-img').value || '').trim();
  if (!name) { alert('Inserisci il nome.'); return; }
  var maxOrder = membersCache.reduce(function(mx, m) { return Math.max(mx, m.sort_order || 0); }, 0);
  var res = await supabaseClient.from('members').insert({ name: name, role: role, description: desc, image_url: img || null, sort_order: maxOrder + 1 });
  if (res.error) { alert('Errore: ' + res.error.message); return; }
  document.getElementById('new-m-name').value = '';
  document.getElementById('new-m-role').value = '';
  document.getElementById('new-m-desc').value = '';
  document.getElementById('new-m-img').value = '';
  await loadMembers(); renderAdminMembers();
}
async function saveMember(id) {
  if (!isAdmin || !supabaseClient) return;
  var card = document.querySelector('#adminMembersList [data-id="' + id + '"]'); if (!card) return;
  var payload = {};
  card.querySelectorAll('[data-field]').forEach(function(inp) {
    var f = inp.getAttribute('data-field'), v = inp.value;
    if (f === 'sort_order') payload[f] = parseInt(v, 10) || 0;
    else if (f === 'image_url') payload[f] = v.trim() || null;
    else payload[f] = v.trim();
  });
  if (!payload.name) { alert('Nome obbligatorio.'); return; }
  var res = await supabaseClient.from('members').update(payload).eq('id', id);
  if (res.error) { alert('Errore: ' + res.error.message); return; }
  await loadMembers(); renderAdminMembers();
}
async function deleteMember(id) {
  if (!isAdmin || !supabaseClient) return;
  if (!confirm('Eliminare?')) return;
  var res = await supabaseClient.from('members').delete().eq('id', id);
  if (res.error) { alert('Errore: ' + res.error.message); return; }
  await loadMembers(); renderAdminMembers();
}

async function submitCandidatura(event) {
  event.preventDefault();
  if (!supabaseClient) { alert('Supabase non disponibile'); return; }
  var nome = document.getElementById('cand-nome').value.trim();
  var contatto = document.getElementById('cand-email').value.trim();
  var messaggio = document.getElementById('cand-msg').value.trim();
  var res = await supabaseClient.from('candidature').insert({ nome: nome, contatto: contatto, messaggio: messaggio || null });
  if (res.error) { alert('Invio non riuscito: ' + res.error.message); return; }
  document.getElementById('candidaturaForm').reset();
  var s = document.getElementById('candidaturaSuccess');
  if (s) { s.classList.remove('hidden'); setTimeout(function(){ s.classList.add('hidden'); }, 5000); }
}
async function loadCandidatureList() {
  var box = document.getElementById('candidatureList');
  if (!box || !isAdmin || !supabaseClient) return;
  box.innerHTML = '<p class="text-slate-500 text-xs">Caricamento...</p>';
  var res = await supabaseClient.from('candidature').select('*').order('created_at', { ascending: false }).limit(50);
  if (res.error) { box.innerHTML = '<p class="text-red-400 text-xs">' + res.error.message + '</p>'; return; }
  if (!res.data || !res.data.length) { box.innerHTML = '<p class="text-slate-500 text-xs">Nessuna candidatura.</p>'; return; }
  box.innerHTML = res.data.map(function(c) {
    var actions = '';
    if (!c.letto) {
      actions = '<button type="button" onclick="markCandidaturaLetta(' + c.id + ')" class="mt-1.5 text-amber-400 text-[11px] hover:underline">Segna come letta</button>';
    } else {
      actions = '<span class="text-slate-600 text-[11px] mr-2">Letta</span>' +
        '<button type="button" onclick="deleteCandidatura(' + c.id + ')" class="mt-1.5 text-red-400 text-[11px] hover:underline">Elimina</button>';
    }
    return '<div class="border border-slate-700 rounded-lg p-2.5 text-xs ' + (c.letto ? 'opacity-70' : '') + '">' +
      '<div class="flex justify-between gap-2"><strong class="text-white">' + escapeHtml(c.nome) + '</strong><span class="text-slate-500">' + new Date(c.created_at).toLocaleDateString('it-IT') + '</span></div>' +
      '<div class="text-sky-400 mt-0.5">' + escapeHtml(c.contatto) + '</div>' +
      (c.messaggio ? '<p class="text-slate-400 mt-1">' + escapeHtml(c.messaggio) + '</p>' : '') +
      '<div class="flex items-center gap-2 mt-1">' + actions + '</div>' +
      '</div>';
  }).join('');
}
async function markCandidaturaLetta(id) {
  if (!supabaseClient || !isAdmin) return;
  var res = await supabaseClient.from('candidature').update({ letto: true }).eq('id', id);
  if (res.error) { alert('Errore: ' + res.error.message); return; }
  loadCandidatureList();
}
async function deleteCandidatura(id) {
  if (!supabaseClient || !isAdmin) return;
  if (!confirm('Eliminare definitivamente questa candidatura?')) return;
  var res = await supabaseClient.from('candidature').delete().eq('id', id);
  if (res.error) {
    alert('Errore eliminazione: ' + res.error.message + '\n\nSe compare un errore di policy, esegui in Supabase lo SQL per permettere DELETE all\'admin.');
    return;
  }
  loadCandidatureList();
}


async function loadApprovedMembers() {
  if (!supabaseClient) return [];
  try {
    var res = await supabaseClient.from('profiles')
      .select('id, display_name, email, role, status')
      .eq('status', 'approved')
      .order('display_name', { ascending: true });
    if (res.error) return [];
    return res.data || [];
  } catch (e) { return []; }
}


function renderAreaSoci() {
  var box = document.getElementById('areaSociContent');
  if (!box) return;
  var name = (userProfile && (userProfile.nickname || userProfile.display_name)) || (currentUser && currentUser.email) || 'Socio';
  var fullName = ((userProfile && userProfile.first_name) || '') + ' ' + ((userProfile && userProfile.last_name) || '');
  fullName = fullName.trim();
  box.innerHTML =
    '<div class="text-center mb-8">' +
      '<div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold mb-4 text-emerald-400 border-emerald-500/40 bg-emerald-500/10">' +
        '<span class="w-2 h-2 rounded-full bg-current"></span> Socio' +
      '</div>' +
      '<h3 class="text-2xl md:text-3xl font-black font-orbitron text-white">Benvenuto, ' + escapeHtml(name) + '</h3>' +
      (fullName ? '<p class="text-slate-400 mt-1 text-sm">' + escapeHtml(fullName) + '</p>' : '') +
      '<p class="text-slate-400 mt-2 text-sm">Area riservata ai Soci della community YUMA.</p>' +
    '</div>' +
    '<div class="grid lg:grid-cols-2 gap-5">' +
      '<div class="glass-card p-5 rounded-2xl border border-emerald-500/25">' +
        '<h4 class="text-sm font-bold font-orbitron text-emerald-300 uppercase tracking-wider mb-3">Download</h4>' +
        '<div id="socioDownloadsBox"><p class="text-slate-500 text-xs">Caricamento...</p></div>' +
      '</div>' +
      '<div class="rounded-2xl border border-emerald-500/30 p-5 relative overflow-hidden" style="background:linear-gradient(145deg,rgba(20,40,30,0.95),rgba(15,28,22,0.98));box-shadow:inset 0 0 40px rgba(0,0,0,0.35)">' +
        '<div class="absolute inset-0 opacity-[0.07] pointer-events-none" style="background-image:repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(255,255,255,0.12) 28px)"></div>' +
        '<h4 class="text-sm font-bold font-orbitron text-emerald-300/90 uppercase tracking-wider mb-3 relative">Bacheca</h4>' +
        '<div id="socioBoardBox" class="relative space-y-3 max-h-80 overflow-y-auto pr-1"><p class="text-emerald-200/50 text-xs">Caricamento...</p></div>' +
      '</div>' +
    '</div>';
  loadSocioDownloads();
  loadSocioBoard();
}

async function loadSocioDownloads() {
  var box = document.getElementById('socioDownloadsBox');
  if (!box || !supabaseClient) return;
  try {
    var res = await supabaseClient.from('socio_downloads').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
    if (res.error) { box.innerHTML = '<p class="text-red-400 text-xs">' + escapeHtml(res.error.message) + '</p>'; return; }
    var list = res.data || [];
    if (!list.length) { box.innerHTML = '<p class="text-slate-500 text-xs">Nessun file al momento.</p>'; return; }
    box.innerHTML = '<div class="space-y-2">' + list.map(function(d) {
      return '<a href="' + escapeHtml(d.file_url) + '" target="_blank" rel="noopener" class="block p-3 rounded-xl border border-slate-700/80 bg-slate-900/50 hover:border-emerald-500/40 hover:bg-slate-800/60 transition">' +
        '<div class="text-white text-sm font-semibold">' + escapeHtml(d.title) + '</div>' +
        (d.description ? '<div class="text-slate-400 text-[11px] mt-0.5">' + escapeHtml(d.description) + '</div>' : '') +
        '<div class="text-emerald-400 text-[10px] mt-1.5 font-semibold">Scarica →</div></a>';
    }).join('') + '</div>';
  } catch (e) {
    box.innerHTML = '<p class="text-red-400 text-xs">Errore caricamento</p>';
  }
}

async function loadSocioBoard() {
  var box = document.getElementById('socioBoardBox');
  if (!box || !supabaseClient) return;
  try {
    var res = await supabaseClient.from('socio_board').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
    if (res.error) { box.innerHTML = '<p class="text-red-300/80 text-xs">' + escapeHtml(res.error.message) + '</p>'; return; }
    var list = res.data || [];
    if (!list.length) { box.innerHTML = '<p class="text-emerald-200/40 text-xs italic">La lavagna è vuota.</p>'; return; }
    box.innerHTML = list.map(function(m) {
      var dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString('it-IT') : '';
      return '<div class="pb-3 border-b border-emerald-500/10 last:border-0">' +
        (m.pinned ? '<span class="text-[10px] text-emerald-400/80 font-semibold uppercase">Fissato · </span>' : '') +
        (m.title ? '<div class="text-emerald-100 font-semibold text-sm">' + escapeHtml(m.title) + '</div>' : '') +
        '<div class="text-emerald-50/85 text-sm leading-relaxed whitespace-pre-wrap mt-0.5">' + escapeHtml(m.body) + '</div>' +
        (dateStr ? '<div class="text-emerald-200/30 text-[10px] mt-1">' + dateStr + '</div>' : '') +
      '</div>';
    }).join('');
  } catch (e) {
    box.innerHTML = '<p class="text-red-300/80 text-xs">Errore caricamento</p>';
  }
}

function renderAreaYuma() {
  var box = document.getElementById('areaYumaContent') || document.getElementById('areaMembriContent');
  if (!box) return;
  var name = (userProfile && (userProfile.nickname || userProfile.display_name)) || (currentUser && currentUser.email) || 'YUMA';
  box.innerHTML =
    '<div class="text-center mb-8">' +
      '<div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold mb-4 text-sky-400 border-sky-500/40 bg-sky-500/10">' +
        '<span class="w-2 h-2 rounded-full bg-current"></span> YUMA Only' +
      '</div>' +
      '<h3 class="text-2xl md:text-3xl font-black font-orbitron text-white">Benvenuto a bordo, ' + escapeHtml(name) + '</h3>' +
      '<p class="text-slate-400 mt-2 text-sm">Area riservata al team YUMA.</p>' +
    '</div>' +
    '<div class="grid lg:grid-cols-2 gap-5">' +
      '<div class="glass-card p-5 rounded-2xl border border-sky-500/25">' +
        '<h4 class="text-sm font-bold font-orbitron text-sky-300 uppercase tracking-wider mb-3">Download</h4>' +
        '<div id="yumaDownloadsBox"><p class="text-slate-500 text-xs">Caricamento...</p></div>' +
      '</div>' +
      '<div class="rounded-2xl border border-amber-500/30 p-5 relative overflow-hidden" style="background:linear-gradient(145deg,rgba(41,37,20,0.95),rgba(28,25,15,0.98));box-shadow:inset 0 0 40px rgba(0,0,0,0.35)">' +
        '<div class="absolute inset-0 opacity-[0.07] pointer-events-none" style="background-image:repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(255,255,255,0.15) 28px)"></div>' +
        '<h4 class="text-sm font-bold font-orbitron text-amber-300/90 uppercase tracking-wider mb-3 relative">Bacheca</h4>' +
        '<div id="yumaBoardBox" class="relative space-y-3 max-h-80 overflow-y-auto pr-1"><p class="text-amber-200/50 text-xs">Caricamento...</p></div>' +
      '</div>' +
    '</div>';
  loadYumaDownloads();
  loadYumaBoard();
}

async function loadYumaDownloads() {
  var box = document.getElementById('yumaDownloadsBox');
  if (!box || !supabaseClient) return;
  try {
    var res = await supabaseClient.from('yuma_downloads').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
    if (res.error) { box.innerHTML = '<p class="text-red-400 text-xs">' + escapeHtml(res.error.message) + '</p>'; return; }
    var list = res.data || [];
    if (!list.length) { box.innerHTML = '<p class="text-slate-500 text-xs">Nessun file al momento.</p>'; return; }
    box.innerHTML = '<div class="space-y-2">' + list.map(function(d) {
      return '<a href="' + escapeHtml(d.file_url) + '" target="_blank" rel="noopener" class="block p-3 rounded-xl border border-slate-700/80 bg-slate-900/50 hover:border-sky-500/40 hover:bg-slate-800/60 transition">' +
        '<div class="text-white text-sm font-semibold">' + escapeHtml(d.title) + '</div>' +
        (d.description ? '<div class="text-slate-400 text-[11px] mt-0.5">' + escapeHtml(d.description) + '</div>' : '') +
        '<div class="text-sky-400 text-[10px] mt-1.5 font-semibold">Scarica →</div></a>';
    }).join('') + '</div>';
  } catch (e) {
    box.innerHTML = '<p class="text-red-400 text-xs">Errore caricamento</p>';
  }
}

async function loadYumaBoard() {
  var box = document.getElementById('yumaBoardBox');
  if (!box || !supabaseClient) return;
  try {
    var res = await supabaseClient.from('yuma_board').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
    if (res.error) { box.innerHTML = '<p class="text-red-300/80 text-xs">' + escapeHtml(res.error.message) + '</p>'; return; }
    var list = res.data || [];
    if (!list.length) { box.innerHTML = '<p class="text-amber-200/40 text-xs italic">La lavagna è vuota.</p>'; return; }
    box.innerHTML = list.map(function(m) {
      var dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString('it-IT') : '';
      return '<div class="pb-3 border-b border-amber-500/10 last:border-0">' +
        (m.pinned ? '<span class="text-[10px] text-amber-400/80 font-semibold uppercase">Fissato · </span>' : '') +
        (m.title ? '<div class="text-amber-100 font-semibold text-sm">' + escapeHtml(m.title) + '</div>' : '') +
        '<div class="text-amber-50/85 text-sm leading-relaxed whitespace-pre-wrap mt-0.5">' + escapeHtml(m.body) + '</div>' +
        (dateStr ? '<div class="text-amber-200/30 text-[10px] mt-1">' + dateStr + '</div>' : '') +
      '</div>';
    }).join('');
  } catch (e) {
    box.innerHTML = '<p class="text-red-300/80 text-xs">Errore caricamento</p>';
  }
}

async function loadAdminDownloads() {
  var box = document.getElementById('adminDownloadsList');
  if (!box || !supabaseClient) return;
  box.innerHTML = '<p class="text-slate-500">Caricamento...</p>';
  var res = await supabaseClient.from('yuma_downloads').select('*').order('sort_order').order('created_at', { ascending: false });
  if (res.error) { box.innerHTML = '<p class="text-red-400">' + escapeHtml(res.error.message) + '</p>'; return; }
  var list = res.data || [];
  if (!list.length) { box.innerHTML = '<p class="text-slate-500">Nessun download.</p>'; return; }
  box.innerHTML = list.map(function(d) {
    return '<div class="border border-slate-700 rounded-lg p-2.5 space-y-1.5" id="dl-row-' + d.id + '">' +
      '<div class="flex justify-between gap-2 items-start">' +
        '<div class="min-w-0">' +
          '<div class="text-white font-semibold truncate" id="dl-view-title-' + d.id + '">' + escapeHtml(d.title) + '</div>' +
          '<div class="text-slate-500 truncate text-[10px]" id="dl-view-url-' + d.id + '">' + escapeHtml(d.file_url) + '</div>' +
          '<div class="text-slate-400 text-[11px]" id="dl-view-desc-' + d.id + '">' + escapeHtml(d.description || '') + '</div>' +
        '</div>' +
        '<div class="flex gap-2 shrink-0">' +
          '<button type="button" onclick="editYumaDownload(' + d.id + ')" class="text-sky-400 text-[11px] hover:underline">Modifica</button>' +
          '<button type="button" onclick="deleteYumaDownload(' + d.id + ')" class="text-red-400 text-[11px] hover:underline">Elimina</button>' +
        '</div>' +
      '</div>' +
      '<div id="dl-edit-' + d.id + '" class="hidden space-y-1.5 pt-1 border-t border-slate-700">' +
        '<input type="text" id="dl-edit-title-' + d.id + '" class="auth-input text-xs" value="' + escapeHtml(d.title).replace(/"/g, '&quot;') + '">' +
        '<input type="text" id="dl-edit-url-' + d.id + '" class="auth-input text-xs" value="' + escapeHtml(d.file_url).replace(/"/g, '&quot;') + '">' +
        '<input type="text" id="dl-edit-desc-' + d.id + '" class="auth-input text-xs" value="' + escapeHtml(d.description || '').replace(/"/g, '&quot;') + '">' +
        '<div class="flex gap-2">' +
          '<button type="button" onclick="saveYumaDownload(' + d.id + ')" class="px-2 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px]">Salva</button>' +
          '<button type="button" onclick="cancelEditYumaDownload(' + d.id + ')" class="px-2 py-1 rounded text-slate-400 text-[11px]">Annulla</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function editYumaDownload(id) {
  var ed = document.getElementById('dl-edit-' + id);
  if (ed) ed.classList.remove('hidden');
}
function cancelEditYumaDownload(id) {
  var ed = document.getElementById('dl-edit-' + id);
  if (ed) ed.classList.add('hidden');
}
async function saveYumaDownload(id) {
  if (!isAdmin || !supabaseClient) return;
  var title = (document.getElementById('dl-edit-title-' + id) || {}).value || '';
  var url = (document.getElementById('dl-edit-url-' + id) || {}).value || '';
  var desc = (document.getElementById('dl-edit-desc-' + id) || {}).value || '';
  title = title.trim(); url = url.trim(); desc = desc.trim();
  if (!title || !url) { alert('Titolo e URL obbligatori.'); return; }
  var res = await supabaseClient.from('yuma_downloads').update({
    title: title, file_url: url, description: desc || ''
  }).eq('id', id).select('id');
  if (res.error) { alert(res.error.message); return; }
  if (!res.data || !res.data.length) { alert('Nessuna riga aggiornata (policy RLS?).'); return; }
  loadAdminDownloads();
}

async function addYumaDownload() {
  if (!isAdmin || !supabaseClient) return;
  var title = (document.getElementById('dlTitle') || {}).value || '';
  var url = (document.getElementById('dlUrl') || {}).value || '';
  var desc = (document.getElementById('dlDesc') || {}).value || '';
  title = title.trim(); url = url.trim(); desc = desc.trim();
  if (!title || !url) { alert('Titolo e URL obbligatori.'); return; }
  var res = await supabaseClient.from('yuma_downloads').insert({
    title: title, file_url: url, description: desc,
    created_by: currentUser && currentUser.id
  });
  if (res.error) { alert(res.error.message); return; }
  document.getElementById('dlTitle').value = '';
  document.getElementById('dlUrl').value = '';
  document.getElementById('dlDesc').value = '';
  loadAdminDownloads();
}

async function deleteYumaDownload(id) {
  if (!isAdmin || !supabaseClient) return;
  if (!confirm('Eliminare questo download?')) return;
  var res = await supabaseClient.from('yuma_downloads').delete().eq('id', id);
  if (res.error) { alert(res.error.message); return; }
  loadAdminDownloads();
}

async function loadAdminBoard() {
  var box = document.getElementById('adminBoardList');
  if (!box || !supabaseClient) return;
  box.innerHTML = '<p class="text-slate-500">Caricamento...</p>';
  var res = await supabaseClient.from('yuma_board').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
  if (res.error) { box.innerHTML = '<p class="text-red-400">' + escapeHtml(res.error.message) + '</p>'; return; }
  var list = res.data || [];
  if (!list.length) { box.innerHTML = '<p class="text-slate-500">Nessun messaggio.</p>'; return; }
  box.innerHTML = list.map(function(m) {
    return '<div class="border border-slate-700 rounded-lg p-2.5 space-y-1.5" id="bd-row-' + m.id + '">' +
      '<div class="flex justify-between gap-2 items-start">' +
        '<div class="min-w-0">' +
          '<div class="text-white font-semibold" id="bd-view-title-' + m.id + '">' + escapeHtml(m.title || '(senza titolo)') +
            (m.pinned ? ' <span class="text-amber-400 text-[10px]">PIN</span>' : '') + '</div>' +
          '<div class="text-slate-400 mt-0.5 whitespace-pre-wrap text-[11px]" id="bd-view-body-' + m.id + '">' + escapeHtml(m.body) + '</div>' +
        '</div>' +
        '<div class="flex gap-2 shrink-0">' +
          '<button type="button" onclick="editYumaBoardPost(' + m.id + ')" class="text-sky-400 text-[11px] hover:underline">Modifica</button>' +
          '<button type="button" onclick="deleteYumaBoardPost(' + m.id + ')" class="text-red-400 text-[11px] hover:underline">Elimina</button>' +
        '</div>' +
      '</div>' +
      '<div id="bd-edit-' + m.id + '" class="hidden space-y-1.5 pt-1 border-t border-slate-700">' +
        '<input type="text" id="bd-edit-title-' + m.id + '" class="auth-input text-xs" value="' + escapeHtml(m.title || '').replace(/"/g, '&quot;') + '">' +
        '<textarea id="bd-edit-body-' + m.id + '" rows="3" class="auth-input text-xs resize-none">' + escapeHtml(m.body) + '</textarea>' +
        '<label class="flex items-center gap-2 text-[11px] text-slate-400"><input type="checkbox" id="bd-edit-pin-' + m.id + '"' + (m.pinned ? ' checked' : '') + '> Fissa in alto</label>' +
        '<div class="flex gap-2">' +
          '<button type="button" onclick="saveYumaBoardPost(' + m.id + ')" class="px-2 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px]">Salva</button>' +
          '<button type="button" onclick="cancelEditYumaBoardPost(' + m.id + ')" class="px-2 py-1 rounded text-slate-400 text-[11px]">Annulla</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function editYumaBoardPost(id) {
  var ed = document.getElementById('bd-edit-' + id);
  if (ed) ed.classList.remove('hidden');
}
function cancelEditYumaBoardPost(id) {
  var ed = document.getElementById('bd-edit-' + id);
  if (ed) ed.classList.add('hidden');
}
async function saveYumaBoardPost(id) {
  if (!isAdmin || !supabaseClient) return;
  var title = ((document.getElementById('bd-edit-title-' + id) || {}).value || '').trim();
  var body = ((document.getElementById('bd-edit-body-' + id) || {}).value || '').trim();
  var pinned = !!(document.getElementById('bd-edit-pin-' + id) || {}).checked;
  if (!body) { alert('Il testo del messaggio è obbligatorio.'); return; }
  var res = await supabaseClient.from('yuma_board').update({
    title: title, body: body, pinned: pinned, updated_at: new Date().toISOString()
  }).eq('id', id).select('id');
  if (res.error) { alert(res.error.message); return; }
  if (!res.data || !res.data.length) { alert('Nessuna riga aggiornata (policy RLS?).'); return; }
  loadAdminBoard();
}

async function addYumaBoardPost() {
  if (!isAdmin || !supabaseClient) return;
  var title = ((document.getElementById('boardTitle') || {}).value || '').trim();
  var body = ((document.getElementById('boardBody') || {}).value || '').trim();
  var pinned = !!(document.getElementById('boardPinned') || {}).checked;
  if (!body) { alert('Scrivi un messaggio.'); return; }
  var res = await supabaseClient.from('yuma_board').insert({
    title: title, body: body, pinned: pinned,
    created_by: currentUser && currentUser.id
  });
  if (res.error) { alert(res.error.message); return; }
  document.getElementById('boardTitle').value = '';
  document.getElementById('boardBody').value = '';
  document.getElementById('boardPinned').checked = false;
  loadAdminBoard();
}

async function deleteYumaBoardPost(id) {
  if (!isAdmin || !supabaseClient) return;
  if (!confirm('Eliminare questo messaggio?')) return;
  var res = await supabaseClient.from('yuma_board').delete().eq('id', id);
  if (res.error) { alert(res.error.message); return; }
  loadAdminBoard();
}



async function loadAdminSocioDownloads() {
  var box = document.getElementById('adminSocioDownloadsList');
  if (!box || !supabaseClient) return;
  box.innerHTML = '<p class="text-slate-500">Caricamento...</p>';
  var res = await supabaseClient.from('socio_downloads').select('*').order('sort_order').order('created_at', { ascending: false });
  if (res.error) { box.innerHTML = '<p class="text-red-400">' + escapeHtml(res.error.message) + '</p>'; return; }
  var list = res.data || [];
  if (!list.length) { box.innerHTML = '<p class="text-slate-500">Nessun download.</p>'; return; }
  box.innerHTML = list.map(function(d) {
    return '<div class="border border-slate-700 rounded-lg p-2.5 space-y-1.5">' +
      '<div class="flex justify-between gap-2 items-start">' +
        '<div class="min-w-0"><div class="text-white font-semibold truncate">' + escapeHtml(d.title) + '</div>' +
        '<div class="text-slate-500 truncate text-[10px]">' + escapeHtml(d.file_url) + '</div>' +
        '<div class="text-slate-400 text-[11px]">' + escapeHtml(d.description || '') + '</div></div>' +
        '<div class="flex gap-2 shrink-0">' +
          '<button type="button" onclick="editSocioDownload(' + d.id + ')" class="text-sky-400 text-[11px] hover:underline">Modifica</button>' +
          '<button type="button" onclick="deleteSocioDownload(' + d.id + ')" class="text-red-400 text-[11px] hover:underline">Elimina</button>' +
        '</div></div>' +
      '<div id="sdl-edit-' + d.id + '" class="hidden space-y-1.5 pt-1 border-t border-slate-700">' +
        '<input type="text" id="sdl-edit-title-' + d.id + '" class="auth-input text-xs" value="' + escapeHtml(d.title).replace(/"/g, '&quot;') + '">' +
        '<input type="text" id="sdl-edit-url-' + d.id + '" class="auth-input text-xs" value="' + escapeHtml(d.file_url).replace(/"/g, '&quot;') + '">' +
        '<input type="text" id="sdl-edit-desc-' + d.id + '" class="auth-input text-xs" value="' + escapeHtml(d.description || '').replace(/"/g, '&quot;') + '">' +
        '<div class="flex gap-2">' +
          '<button type="button" onclick="saveSocioDownload(' + d.id + ')" class="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px]">Salva</button>' +
          '<button type="button" onclick="cancelEditSocioDownload(' + d.id + ')" class="px-2 py-1 rounded text-slate-400 text-[11px]">Annulla</button>' +
        '</div></div></div>';
  }).join('');
}
function editSocioDownload(id) { var el = document.getElementById('sdl-edit-' + id); if (el) el.classList.remove('hidden'); }
function cancelEditSocioDownload(id) { var el = document.getElementById('sdl-edit-' + id); if (el) el.classList.add('hidden'); }
async function saveSocioDownload(id) {
  if (!isAdmin || !supabaseClient) return;
  var title = ((document.getElementById('sdl-edit-title-' + id) || {}).value || '').trim();
  var url = ((document.getElementById('sdl-edit-url-' + id) || {}).value || '').trim();
  var desc = ((document.getElementById('sdl-edit-desc-' + id) || {}).value || '').trim();
  if (!title || !url) { alert('Titolo e URL obbligatori.'); return; }
  var res = await supabaseClient.from('socio_downloads').update({ title: title, file_url: url, description: desc }).eq('id', id).select('id');
  if (res.error) { alert(res.error.message); return; }
  if (!res.data || !res.data.length) { alert('Nessuna riga aggiornata.'); return; }
  loadAdminSocioDownloads();
}
async function addSocioDownload() {
  if (!isAdmin || !supabaseClient) return;
  var title = ((document.getElementById('sdlTitle') || {}).value || '').trim();
  var url = ((document.getElementById('sdlUrl') || {}).value || '').trim();
  var desc = ((document.getElementById('sdlDesc') || {}).value || '').trim();
  if (!title || !url) { alert('Titolo e URL obbligatori.'); return; }
  var res = await supabaseClient.from('socio_downloads').insert({ title: title, file_url: url, description: desc, created_by: currentUser && currentUser.id });
  if (res.error) { alert(res.error.message); return; }
  document.getElementById('sdlTitle').value = '';
  document.getElementById('sdlUrl').value = '';
  document.getElementById('sdlDesc').value = '';
  loadAdminSocioDownloads();
}
async function deleteSocioDownload(id) {
  if (!isAdmin || !supabaseClient) return;
  if (!confirm('Eliminare questo download?')) return;
  var res = await supabaseClient.from('socio_downloads').delete().eq('id', id);
  if (res.error) { alert(res.error.message); return; }
  loadAdminSocioDownloads();
}

async function loadAdminSocioBoard() {
  var box = document.getElementById('adminSocioBoardList');
  if (!box || !supabaseClient) return;
  box.innerHTML = '<p class="text-slate-500">Caricamento...</p>';
  var res = await supabaseClient.from('socio_board').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
  if (res.error) { box.innerHTML = '<p class="text-red-400">' + escapeHtml(res.error.message) + '</p>'; return; }
  var list = res.data || [];
  if (!list.length) { box.innerHTML = '<p class="text-slate-500">Nessun messaggio.</p>'; return; }
  box.innerHTML = list.map(function(m) {
    return '<div class="border border-slate-700 rounded-lg p-2.5 space-y-1.5">' +
      '<div class="flex justify-between gap-2 items-start">' +
        '<div class="min-w-0"><div class="text-white font-semibold">' + escapeHtml(m.title || '(senza titolo)') +
          (m.pinned ? ' <span class="text-emerald-400 text-[10px]">PIN</span>' : '') + '</div>' +
        '<div class="text-slate-400 mt-0.5 whitespace-pre-wrap text-[11px]">' + escapeHtml(m.body) + '</div></div>' +
        '<div class="flex gap-2 shrink-0">' +
          '<button type="button" onclick="editSocioBoardPost(' + m.id + ')" class="text-sky-400 text-[11px] hover:underline">Modifica</button>' +
          '<button type="button" onclick="deleteSocioBoardPost(' + m.id + ')" class="text-red-400 text-[11px] hover:underline">Elimina</button>' +
        '</div></div>' +
      '<div id="sbd-edit-' + m.id + '" class="hidden space-y-1.5 pt-1 border-t border-slate-700">' +
        '<input type="text" id="sbd-edit-title-' + m.id + '" class="auth-input text-xs" value="' + escapeHtml(m.title || '').replace(/"/g, '&quot;') + '">' +
        '<textarea id="sbd-edit-body-' + m.id + '" rows="3" class="auth-input text-xs resize-none">' + escapeHtml(m.body) + '</textarea>' +
        '<label class="flex items-center gap-2 text-[11px] text-slate-400"><input type="checkbox" id="sbd-edit-pin-' + m.id + '"' + (m.pinned ? ' checked' : '') + '> Fissa in alto</label>' +
        '<div class="flex gap-2">' +
          '<button type="button" onclick="saveSocioBoardPost(' + m.id + ')" class="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px]">Salva</button>' +
          '<button type="button" onclick="cancelEditSocioBoardPost(' + m.id + ')" class="px-2 py-1 rounded text-slate-400 text-[11px]">Annulla</button>' +
        '</div></div></div>';
  }).join('');
}
function editSocioBoardPost(id) { var el = document.getElementById('sbd-edit-' + id); if (el) el.classList.remove('hidden'); }
function cancelEditSocioBoardPost(id) { var el = document.getElementById('sbd-edit-' + id); if (el) el.classList.add('hidden'); }
async function saveSocioBoardPost(id) {
  if (!isAdmin || !supabaseClient) return;
  var title = ((document.getElementById('sbd-edit-title-' + id) || {}).value || '').trim();
  var body = ((document.getElementById('sbd-edit-body-' + id) || {}).value || '').trim();
  var pinned = !!(document.getElementById('sbd-edit-pin-' + id) || {}).checked;
  if (!body) { alert('Il testo è obbligatorio.'); return; }
  var res = await supabaseClient.from('socio_board').update({ title: title, body: body, pinned: pinned, updated_at: new Date().toISOString() }).eq('id', id).select('id');
  if (res.error) { alert(res.error.message); return; }
  if (!res.data || !res.data.length) { alert('Nessuna riga aggiornata.'); return; }
  loadAdminSocioBoard();
}
async function addSocioBoardPost() {
  if (!isAdmin || !supabaseClient) return;
  var title = ((document.getElementById('sboardTitle') || {}).value || '').trim();
  var body = ((document.getElementById('sboardBody') || {}).value || '').trim();
  var pinned = !!(document.getElementById('sboardPinned') || {}).checked;
  if (!body) { alert('Scrivi un messaggio.'); return; }
  var res = await supabaseClient.from('socio_board').insert({ title: title, body: body, pinned: pinned, created_by: currentUser && currentUser.id });
  if (res.error) { alert(res.error.message); return; }
  document.getElementById('sboardTitle').value = '';
  document.getElementById('sboardBody').value = '';
  document.getElementById('sboardPinned').checked = false;
  loadAdminSocioBoard();
}
async function deleteSocioBoardPost(id) {
  if (!isAdmin || !supabaseClient) return;
  if (!confirm('Eliminare questo messaggio?')) return;
  var res = await supabaseClient.from('socio_board').delete().eq('id', id);
  if (res.error) { alert(res.error.message); return; }
  loadAdminSocioBoard();
}


document.addEventListener('DOMContentLoaded', async function() {
  // i18n init
  if (typeof setLanguage === 'function') {
    setLanguage(localStorage.getItem('yuma_lang') || 'it');
  }
  var loginModal = document.getElementById('loginModal');
  var registerModal = document.getElementById('registerModal');
  var adminModal = document.getElementById('adminModal');
  if (loginModal) loginModal.addEventListener('click', function(e) { if (e.target.id === 'loginModal') closeLoginModal(); });
  if (registerModal) registerModal.addEventListener('click', function(e) { if (e.target.id === 'registerModal') closeRegisterModal(); });
  if (adminModal) adminModal.addEventListener('click', function(e) { if (e.target.id === 'adminModal') closeAdminPanel(); });
  var userDetailModal = document.getElementById('userDetailModal');
  if (userDetailModal) userDetailModal.addEventListener('click', function(e) { if (e.target.id === 'userDetailModal') closeUserDetail(); });
  window.addEventListener('scroll', function() {
    var nav = document.getElementById('mainNav'); if (!nav) return;
    if (window.scrollY > 40) nav.classList.add('nav-scrolled'); else nav.classList.remove('nav-scrolled');
  });
  await loadContentFromSupabase();
  await loadMembers();
  await initAuth();
});
