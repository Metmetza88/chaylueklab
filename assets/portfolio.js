(async function () {
  const status = document.getElementById('stats-status');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('https://api.github.com/users/Metmetza88', {signal:controller.signal, credentials:'omit', referrerPolicy:'no-referrer'});
    if (!response.ok) throw new Error('GitHub unavailable');
    const data = await response.json();
    const fields = {repos:'public_repos',followers:'followers',following:'following'};
    if (Object.values(fields).some(key => !Number.isSafeInteger(data[key]) || data[key] < 0)) throw new Error('Invalid response');
    for (const [id,key] of Object.entries(fields)) document.getElementById(id).textContent = data[key].toLocaleString('en-US');
    status.textContent = 'ข้อมูลสาธารณะล่าสุดที่ได้รับจาก GitHub API';
  } catch {
    status.textContent = 'ไม่สามารถโหลดสถิติได้ในขณะนี้ กรุณาดูข้อมูลผ่านลิงก์ GitHub';
  } finally { clearTimeout(timeout); }
})();
