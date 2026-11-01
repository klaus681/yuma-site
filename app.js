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
  ['content','roster','users','system'].forEach(function(t) {
    var tab = document.getElementById('adminTab-' + t), btn = document.getElementById('tab-' + t);
    if (tab) tab.classList.toggle('hidden', t !== name);
    if (btn) btn.className = t === name
      ? 'admin-tab px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30'
      : 'admin-tab px-3 py-1.5 rounded-lg bg-slate-800/60 text-slate-400 border border-slate-700';
  });
  if (name === 'roster') renderAdminMembers();
  if (name === 'users') loadUsersAdmin();
  if (name === 'system') loadCandidatureList();
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
  var isApprovedMember = !!(currentUser && (isAdmin || (userProfile && userProfile.role === 'yuma' && (userProfile.status === 'approved' || !userProfile.status))));
  if (currentUser) {
    loggedOut.classList.add('hidden'); loggedOut.classList.remove('flex');
    loggedIn.classList.remove('hidden'); loggedIn.classList.add('flex');
    if (mobOut) mobOut.classList.add('hidden'); if (mobIn) mobIn.classList.remove('hidden');
    var label = document.getElementById('userEmailLabel');
    var name = (userProfile && userProfile.display_name) || currentUser.email || 'Utente';
    if (label) label.textContent = name;
    document.querySelectorAll('[onclick*="openAdminPanel"]').forEach(function(b) {
      b.style.display = isAdmin ? '' : 'none';
    });
    // YUMA Only links
    document.querySelectorAll('.nav-area-membri').forEach(function(el) {
      el.classList.toggle('hidden', !isApprovedMember);
    });
    var areaSection = document.getElementById('area-membri');
    if (areaSection) {
      if (isApprovedMember) {
        areaSection.classList.remove('hidden');
        renderAreaMembri();
      } else {
        areaSection.classList.add('hidden');
      }
    }
  } else {
    loggedOut.classList.remove('hidden'); loggedOut.classList.add('flex');
    loggedIn.classList.add('hidden'); loggedIn.classList.remove('flex');
    if (mobOut) mobOut.classList.remove('hidden'); if (mobIn) mobIn.classList.add('hidden');
    document.querySelectorAll('.nav-area-membri').forEach(function(el) {
      el.classList.add('hidden');
    });
    var areaSection = document.getElementById('area-membri');
    if (areaSection) areaSection.classList.add('hidden');
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

function renderAreaMembri() {
  var _t = typeof t === 'function' ? t : function(k, v) {
    var s = k;
    if (v && v.name) s = 'Benvenuto a bordo, ' + v.name + '!';
    return s;
  };
  var box = document.getElementById('areaMembriContent');
  if (!box) return;
  var name = (userProfile && userProfile.display_name) || (currentUser && currentUser.email) || 'Membro';
  var role = (userProfile && userProfile.role) || 'membro';
  var roleLabel = role === 'admin' ? 'Admin' : (role === 'yuma' ? 'YUMA' : (role === 'socio' ? 'Socio' : role));
  var roleColor = role === 'admin' ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' :
                  role === 'yuma' ? 'text-sky-400 border-sky-500/40 bg-sky-500/10' :
                  'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';

  box.innerHTML = '<div class="text-center mb-8">' +
    '<div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold mb-4 ' + roleColor + '">' +
      '<span class="w-2 h-2 rounded-full bg-current"></span> ' + escapeHtml(roleLabel) +
    '</div>' +
    '<h3 class="text-2xl md:text-3xl font-black font-orbitron text-white">' + escapeHtml(_t('area_welcome', {name: name})) + '</h3>' +
    '<p class="text-slate-400 mt-2 text-sm md:text-base">' + escapeHtml(_t('area_welcome_sub')) + '</p>' +
  '</div>' +
  '<div class="grid sm:grid-cols-2 gap-4 mb-8">' +
    '<div class="glass-card p-5 rounded-2xl border border-sky-500/20">' +
      '<div class="text-sky-400 text-xs font-semibold uppercase tracking-wider mb-1">' + escapeHtml(_t('area_role')) + '</div>' +
      '<div class="text-xl font-bold font-orbitron text-white">' + escapeHtml(roleLabel) + '</div>' +
      '<p class="text-slate-400 text-xs mt-2">' +
        (role === 'yuma' ? _t('area_role_yuma') :
         role === 'socio' ? _t('area_role_socio') :
         _t('area_role_admin')) +
      '</p>' +
    '</div>' +
    '<div class="glass-card p-5 rounded-2xl border border-amber-500/20">' +
      '<div class="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">' + escapeHtml(_t('area_next')) + '</div>' +
      '<ul class="text-slate-300 text-sm space-y-1.5 mt-2">' +
        '<li>' + escapeHtml(_t('area_next1')) + '</li>' +
        '<li>' + escapeHtml(_t('area_next2')) + '</li>' +
        '<li>' + escapeHtml(_t('area_next3')) + '</li>' +
      '</ul>' +
    '</div>' +
  '</div>' +
  '<div id="areaMembriList" class="glass-card p-5 rounded-2xl">' +
    '<h4 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">' + escapeHtml(_t('area_members')) + '</h4>' +
    '<p class="text-slate-500 text-xs">Caricamento...</p>' +
  '</div>';

  loadApprovedMembers().then(function(list) {
    var listBox = document.getElementById('areaMembriList');
    if (!listBox) return;
    if (!list.length) {
      listBox.innerHTML = '<h4 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">' + escapeHtml(_t('area_members')) + '</h4><p class="text-slate-500 text-xs">' + escapeHtml(_t('area_members_none')) + '</p>';
      return;
    }
    listBox.innerHTML = '<h4 class="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">' + escapeHtml(_t('area_members')) + ' (' + list.length + ')</h4>' +
      '<div class="flex flex-wrap gap-2">' +
      list.map(function(p) {
        var r = p.role === 'admin' ? 'Admin' : (p.role === 'yuma' ? 'YUMA' : 'Socio');
        var col = p.role === 'admin' ? 'border-amber-500/30 text-amber-300' : (p.role === 'yuma' ? 'border-sky-500/30 text-sky-300' : 'border-emerald-500/30 text-emerald-300');
        return '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs bg-slate-900/60 ' + col + '">' +
          escapeHtml(p.display_name || p.email || '?') +
          '<span class="opacity-60 text-[10px]">' + r + '</span></span>';
      }).join('') +
      '</div>';
  });
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
