// ============================================================
// auth-guard.js — ContentThai AI
// วางไฟล์นี้ใน repo เดียวกับ batch files
// แล้วเรียกใช้จาก batch ทุกไฟล์ (ดูคำสั่งด้านล่าง)
// ============================================================

(async function () {

  const SUPABASE_URL     = 'https://gpvhnrbhjymgeiujzbjt.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdmhucmJoanltZ2VpdWp6Ymp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjQ3NzEsImV4cCI6MjA5NDI0MDc3MX0.WWKNvrsJiOLtmBL33ze56rkJjL4yMcIBFPPez3A_D8s';

  // แพ็กเกจที่เข้า batch ได้ (free = ทดลองฟรี ยังไม่ให้เข้า batch)
  const ALLOWED_PACKAGES = ['monthly', 'yearly', 'lifetime'];

  // ── helper: แสดงหน้า Loading ขณะตรวจสอบ ──
  function showGuard(msg) {
    document.body.style.display = 'none';
    const overlay = document.createElement('div');
    overlay.id = '__guard';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999',
      'background:#0d1117', 'color:#e6edf3',
      'font-family:Sarabun,sans-serif',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'gap:16px', 'font-size:15px'
    ].join(';');
    overlay.innerHTML = `
      <div style="font-size:32px">🔐</div>
      <div>${msg}</div>
      <div style="width:40px;height:40px;border:3px solid rgba(14,165,233,.3);
        border-top-color:#0ea5e9;border-radius:50%;
        animation:spin .7s linear infinite"></div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    document.documentElement.appendChild(overlay);
  }

  // ── helper: redirect พร้อม message ──
  function redirectLogin(reason) {
    sessionStorage.setItem('guard_reason', reason);
    window.location.replace('index.html');
  }

  // ── เริ่มตรวจสอบ ──
  showGuard('กำลังตรวจสอบสิทธิ์การเข้าถึง...');

  // รอให้ Supabase โหลดเสร็จก่อน
  let attempts = 0;
  while (typeof supabase === 'undefined' && attempts < 20) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }

  if (typeof supabase === 'undefined') {
    redirectLogin('session_error');
    return;
  }

  const { createClient } = supabase;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 1. เช็ค session
    const { data: { session } } = await sb.auth.getSession();

    if (!session) {
      redirectLogin('no_session');
      return;
    }

    // 2. ดึง profile
    const { data: profile, error } = await sb
      .from('profiles')
      .select('status, package, full_name')
      .eq('id', session.user.id)
      .single();

    if (error || !profile) {
      redirectLogin('no_profile');
      return;
    }

    // 3. ตรวจสอบสถานะ approved
    if (profile.status !== 'approved') {
      redirectLogin('not_approved');
      return;
    }

    // 4. ตรวจสอบแพ็กเกจ
    if (!ALLOWED_PACKAGES.includes(profile.package)) {
      redirectLogin('upgrade_required');
      return;
    }

    // ✅ ผ่านทุกด่าน — แสดงหน้า batch
    document.body.style.display = '';
    const overlay = document.getElementById('__guard');
    if (overlay) overlay.remove();

    // inject ชื่อผู้ใช้ใน topbar (ถ้ามี element .topbar-meta)
    const meta = document.querySelector('.topbar-meta');
    if (meta && profile.full_name) {
      const nameTag = document.createElement('span');
      nameTag.innerHTML = `👤 <b>${profile.full_name}</b>`;
      meta.appendChild(nameTag);
    }

  } catch (err) {
    console.error('Guard error:', err);
    redirectLogin('error');
  }

})();
