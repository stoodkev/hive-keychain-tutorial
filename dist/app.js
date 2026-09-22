(() => {
  const pages = [...document.querySelectorAll('.page')];
  const tabs = [...document.querySelectorAll('.step-tab')];
  const previous = document.querySelector('#previous');
  const next = document.querySelector('#next');
  const count = document.querySelector('#current-page');
  const progress = document.querySelector('#progress-fill');
  const tutorial = document.querySelector('#tutorial');
  const themeToggle = document.querySelector('#theme-toggle');
  const toast = document.querySelector('#toast');
  const hashes = pages.map(page => page.id);
  const nextLabels = ['Start exploring', 'Continue', 'Continue', 'Continue', 'Continue', 'Continue', 'Continue', 'Continue', 'Finish'];
  let index = 0;
  let maxVisited = 0;
  let toastTimer;

  function announce(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function render(nextIndex, updateHash = true) {
    index = Math.max(0, Math.min(pages.length - 1, nextIndex));
    maxVisited = Math.max(maxVisited, index);
    pages.forEach((page, i) => {
      page.classList.toggle('is-active', i === index);
      page.setAttribute('aria-hidden', i === index ? 'false' : 'true');
    });
    tabs.forEach((tab, i) => {
      tab.classList.toggle('active', i === index);
      tab.classList.toggle('done', i < index);
      tab.disabled = i > maxVisited;
      tab.setAttribute('aria-current', i === index ? 'step' : 'false');
    });
    previous.disabled = index === 0;
    next.innerHTML = `${index === 8 ? '✓&nbsp; ' : ''}${nextLabels[index]} <span>${index === 8 ? '' : '→'}</span>`;
    next.classList.toggle('finish', index === 8);
    count.textContent = String(index + 1);
    progress.style.width = `${(index / (pages.length - 1)) * 100}%`;
    document.title = `${pages[index].querySelector('h1,h2').textContent} · Hive Keychain`;
    if (updateHash) history.replaceState(null, '', `#${hashes[index]}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    tutorial.focus({ preventScroll: true });
  }

  previous.addEventListener('click', () => render(index - 1));
  next.addEventListener('click', () => {
    if (index === pages.length - 1) announce('Tutorial complete — welcome to Hive!');
    else render(index + 1);
  });
  tabs.forEach(tab => tab.addEventListener('click', () => render(Number(tab.dataset.step))));
  document.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' && index < pages.length - 1) render(index + 1);
    if (event.key === 'ArrowLeft' && index > 0) render(index - 1);
  });

  if (localStorage.getItem('hive-tutorial-theme') === 'light') document.documentElement.classList.add('light');
  function syncThemeLabel() { themeToggle.setAttribute('aria-label', document.documentElement.classList.contains('light') ? 'Switch to dark mode' : 'Switch to light mode'); }
  syncThemeLabel();
  themeToggle.addEventListener('click', () => {
    const light = document.documentElement.classList.toggle('light');
    localStorage.setItem('hive-tutorial-theme', light ? 'light' : 'dark');
    syncThemeLabel();
  });

  document.querySelectorAll('.activity-card').forEach(card => {
    card.addEventListener('click', () => {
      const wasOpen = card.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.activity-card').forEach(item => item.setAttribute('aria-expanded', 'false'));
      card.setAttribute('aria-expanded', wasOpen ? 'false' : 'true');
    });
  });

  const loginButton = document.querySelector('#login-button');
  const loginProgress = document.querySelector('#login-progress');
  const approvalPanel = document.querySelector('#approval-panel');
  let requestTimer;
  function closeApproval() {
    clearTimeout(requestTimer);
    approvalPanel.classList.remove('open');
    approvalPanel.setAttribute('aria-hidden', 'true');
    loginProgress.textContent = '';
    loginButton.disabled = false;
    loginButton.querySelector('span').textContent = 'Login with Keychain';
  }
  loginButton.addEventListener('click', () => {
    loginButton.disabled = true;
    loginButton.querySelector('span').textContent = 'Sending request…';
    loginProgress.textContent = 'Sending request to Keychain…';
    requestTimer = setTimeout(() => {
      approvalPanel.classList.add('open');
      approvalPanel.setAttribute('aria-hidden', 'false');
      document.querySelector('#login-approve').focus();
    }, 700);
  });
  document.querySelector('#login-cancel').addEventListener('click', () => {
    closeApproval();
    announce('Login cancelled. No request was approved.');
  });
  document.querySelector('#login-approve').addEventListener('click', () => {
    closeApproval();
    loginButton.querySelector('span').textContent = 'Logged in';
    loginButton.disabled = true;
    loginProgress.textContent = 'Authentication approved — your private key stayed on your device.';
    announce('Login approved in this tutorial simulation.');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && approvalPanel.classList.contains('open')) closeApproval();
  });

  const initial = Math.max(0, hashes.indexOf(location.hash.slice(1)));
  maxVisited = initial;
  render(initial, false);
})();
