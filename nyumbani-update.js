/* Nyumbani Bill update layer. Load with: <script defer src="nyumbani-update.js"></script> */
(function () {
  var FEE = 30000;
  function rm(sel, test) {
    [].forEach.call(document.querySelectorAll(sel), function (e) { if (!test || test(e)) e.remove(); });
  }

  /* 1. Public website: no landlord/tenant access, no 30,000 shown */
  rm('#nav button[data-t="landlords"],#nav button[data-t="tenants"],#t-landlords,#t-tenants');
  rm('#t-home button[data-go="app"]');
  rm('#t-pricing .card', function (e) { return /20,000|deposit/i.test(e.textContent); });
  rm('#t-help details', function (e) { return /landlord deposit/i.test(e.textContent); });
  if (/^#(landlords|tenants)$/.test(location.hash)) location.hash = '#home';
  var _ab = aiBuild;
  aiBuild = function (c, g) { return _ab(c.filter(function (x) { return !/deposit/i.test(x); }), g); };

  /* 2. DK Global Tech partner (logo file: assets/partners/dkglobaltech.png) */
  PARTNERS.push(["DK Global Tech", "Technology partner", "building", "dkglobaltech.png"]);
  ptile = function (p) {
    var s = p[3] ? 'assets/partners/' + p[3] + (p[3].indexOf('.') > 0 ? '' : '.svg') : '';
    return "<div class='lg'>" + (s ? "<img class='pl' alt='' src='" + s + "' style='display:none'>" : "") +
      "<span class='ico'>" + ic(p[2]) + "</span><span><b>" + esc(p[0]) + "</b><small>" + esc(p[1]) + "</small></span></div>";
  };

  /* 3. Demo portals: one-time system fee of KSh 30,000 */
  function dec(b) { return new TextDecoder().decode(Uint8Array.from(atob(b), function (c) { return c.charCodeAt(0); })); }
  function enc(s) {
    var u = new TextEncoder().encode(s), r = '';
    for (var i = 0; i < u.length; i += 8192) r += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return btoa(r);
  }
  try {
    Object.keys(window.__P).forEach(function (n) {
      var s = dec(window.__P[n])
        .replace(/DEP=\[\[12000,8000\]/, 'DEP=[[18000,12000]')
        .replace(/20,000/g, '30,000').replace(/20000/g, '30000')
        .replace(/platform deposit/gi, function (m) { return m.charAt(0) == 'P' ? 'One-time system fee' : 'one-time system fee'; })
        .replace(/Landlord deposits/g, 'System fees paid');
      window.__P[n] = enc(s);
    });
  } catch (e) {}

  /* 4. Live system: sign-in only, accounts issued by the platform admin */
  authForm = function () {
    $("appbox").innerHTML = "<div class='card' style='max-width:420px;margin:auto'><h3>Sign in</h3>" +
      "<p class='mut'>Accounts are issued by Nyumbani Bill after your one-time system fee is received. Call 0780 490 437 to get started.</p>" +
      "<div class='f' style='flex-direction:column;align-items:stretch'><input id='le' type='email' placeholder='Email'>" +
      "<input id='lp' type='password' placeholder='Password'><button class='btn' id='lin'>Sign in</button><p class='msg' id='lm'></p></div></div>";
    $("lin").onclick = async function () {
      var r = await sb.auth.signInWithPassword({ email: $("le").value.trim(), password: $("lp").value });
      if (r.error) $("lm").textContent = "Wrong email or password.";
    };
  };

  async function call(b) {
    var s = (await sb.auth.getSession()).data.session;
    var r = await fetch('/api/admin-users', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify(b) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(j.error || 'Failed');
    return j;
  }
  function msg(t, ok) { var m = $('nu_m'); if (m) { m.style.color = ok ? 'var(--pri)' : 'var(--bad)'; m.textContent = t; } }
  function hdr() {
    return "<div class='card'><div class='u'><span><b>" + esc(me.full_name || me.email) + "</b> <span class='pill'>" + esc(me.role) +
      "</span><br><span class='mut'>" + esc(me.email) + "</span></span><button class='btn s' id='out'>Sign out</button></div></div>";
  }
  function form(extra) {
    return "<div class='f' style='flex-direction:column;align-items:stretch'><input id='nu_n' placeholder='Full name'><input id='nu_p' placeholder='Phone 07XX...'>" +
      "<input id='nu_e' type='email' placeholder='Email (login)'><input id='nu_w' placeholder='Temporary password (min 8)'>" + extra +
      "<button class='btn y' id='nu_go'>Create login</button><p class='msg' id='nu_m'></p></div>";
  }

  async function adminV() {
    var L = (await sb.from('profiles').select('id,full_name,phone,suspended,system_fee_paid').eq('role', 'landlord').order('created_at')).data || [];
    return "<div class='card'><h3>Create landlord login</h3><p class='mut'>Only the platform admin can create landlords. Create the login after the one-time system fee of " + k(FEE) +
      " is received, then give the landlord the email and temporary password.</p>" +
      form("<input id='nu_f' type='number' value='" + FEE + "' placeholder='System fee received (KSh)'>") + "</div>" +
      "<div class='card'><h3>Landlords</h3>" + (L.map(function (x) {
        return "<div class='u'><span><b>" + esc(x.full_name || 'Landlord') + "</b> <span class='pill " + (x.suspended ? "r" : "") + "'>" + (x.suspended ? "Suspended" : "Active") +
          "</span><br><span class='mut'>" + esc(x.phone || '') + " · system fee received " + k(x.system_fee_paid) + " of " + k(FEE) + "</span></span>" +
          "<span class='f'><input type='number' data-fee='" + x.id + "' value='" + x.system_fee_paid + "' style='width:100px'>" +
          "<button class='btn s' data-savefee='" + x.id + "'>Save fee</button>" +
          "<button class='btn s " + (x.suspended ? "y" : "bad") + "' data-susp='" + x.id + "' data-v='" + (x.suspended ? 0 : 1) + "'>" + (x.suspended ? "Reactivate" : "Suspend") + "</button></span></div>";
      }).join('') || "<p class='mut'>No landlords yet.</p>") + "</div>" + await adminView();
  }

  async function landlordV() {
    var owner = me.role == 'landlord', h = '';
    if (owner && (me.system_fee_paid || 0) < FEE)
      return "<div class='card'><h3>One-time system fee</h3><p class='mut'>Received " + k(me.system_fee_paid || 0) + " of " + k(FEE) + ". Your tools unlock once the fee is complete. Call 0780 490 437.</p></div>";
    if (owner) {
      h += "<div class='card'><div class='u'><span><b>One-time system fee</b><br><span class='mut'>Paid as per your agreement. Monthly fees continue as agreed; accounts with unpaid monthly fees may be suspended.</span></span><span class='pill'>" + k(FEE) + " paid ✓</span></div></div>";
      var T = (await sb.from('profiles').select('id,role,full_name,phone,super_user').eq('parent_id', me.id)).data || [];
      h += "<div class='card'><h3>My team and tenants</h3><p class='mut'>Assistants can view and allocate only. Give super user rights to let an assistant add apartments and units.</p>" +
        form("<select id='nu_r'><option value='assistant'>Assistant (limited)</option><option value='tenant'>Tenant</option></select>") +
        (T.map(function (x) {
          return "<div class='u'><span><b>" + esc(x.full_name || x.role) + "</b> <span class='pill o'>" + esc(x.role) + (x.super_user ? " · super user" : "") + "</span><br><span class='mut'>" + esc(x.phone || '') + "</span></span>" +
            (x.role == 'assistant' ? "<button class='btn s y' data-sup='" + x.id + "' data-v='" + (x.super_user ? 0 : 1) + "'>" + (x.super_user ? "Limit access" : "Make super user") + "</button>" : "") + "</div>";
        }).join('')) + "</div>";
    }
    return h + await landlordView();
  }

  loadApp = async function () {
    if (!sb) return;
    if (!me) { authForm(); return; }
    var b = $('appbox'), h = hdr();
    if (me.suspended) h += "<div class='card'><h3>Account suspended</h3><p class='mut'>Please contact Nyumbani Bill on 0780 490 437 to settle your account and restore access.</p></div>";
    else if (me.role == 'admin') h += await adminV();
    else if (me.role == 'tenant') h += "<div class='card'><h3>Welcome</h3><p class='mut'>Your landlord will link your unit. Rent payments and statements will appear here.</p></div>";
    else h += await landlordV();
    b.innerHTML = h;
    $('out').onclick = async function () { await sb.auth.signOut(); tab('home'); };
    if (me.suspended || me.role == 'tenant') return;
    wire();
    var oid = me.role == 'assistant' ? me.parent_id : me.id, can = me.role == 'landlord' || me.super_user;
    [].forEach.call(document.querySelectorAll('#appbox .card'), function (c) {
      var t = c.querySelector('h3');
      if (!can && t && /^Add (apartment|unit)/.test(t.textContent)) c.remove();
    });
    var ab = document.getElementById('ab');
    if (ab) ab.onclick = async function () {
      var n = $('an').value.trim(), l = $('al').value.trim();
      if (!n || !l) return;
      await sb.from('apartments').insert({ landlord_id: oid, name: n, location: l + ', ' + $('alc').value });
      loadApp();
    };
  };

  document.addEventListener('click', async function (e) {
    var t = e.target;
    if (!t.closest || !t.closest('#appbox')) return;
    try {
      if (t.id == 'nu_go') {
        var a = me.role == 'admin';
        await call({ action: 'create', full_name: $('nu_n').value, phone: $('nu_p').value, email: $('nu_e').value.trim(), password: $('nu_w').value, role: a ? 'landlord' : $('nu_r').value, fee: a ? +$('nu_f').value : 0 });
        await loadApp(); msg('Login created. Share the email and temporary password.', 1);
      } else if (t.dataset.savefee) {
        await call({ action: 'fee', id: t.dataset.savefee, amount: +document.querySelector('[data-fee="' + t.dataset.savefee + '"]').value }); loadApp();
      } else if (t.dataset.susp) {
        await call({ action: 'suspend', id: t.dataset.susp, value: t.dataset.v == '1' }); loadApp();
      } else if (t.dataset.sup) {
        await call({ action: 'super', id: t.dataset.sup, value: t.dataset.v == '1' }); loadApp();
      }
    } catch (err) { msg(err.message); }
  });
})();
