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
  const loginNotice = document.querySelector('#login-notice');
  const demoLabel = document.querySelector('.demo-label');
  let keychainAvailable = false;
  let requestTimer;

  function setKeychainMode(available) {
    keychainAvailable = available;
    loginButton.disabled = false;
    loginButton.querySelector('span').textContent = 'Login with Keychain';
    if (available) {
      loginNotice.innerHTML = '<span>✓</span><p>Hive Keychain is connected. Clicking login will open a real request for your approval.</p>';
      demoLabel.innerHTML = '<i></i>Live Keychain request · no transaction is broadcast';
    } else {
      loginNotice.innerHTML = '<span>⇩</span><p>Hive Keychain isn\'t installed in this browser, so this step runs as a simulation. <a href="https://hive-keychain.com/" target="_blank" rel="noreferrer">Install Keychain</a> to try the real thing.</p>';
      demoLabel.innerHTML = '<i></i>Tutorial demonstration · not a real request';
    }
  }

  function detectKeychain() {
    loginButton.disabled = true;
    loginButton.querySelector('span').textContent = 'Checking for Keychain…';
    const injectionDeadline = Date.now() + 1500;

    function attemptHandshake() {
      const keychain = window.hive_keychain;
      if (!keychain || typeof keychain.requestHandshake !== 'function') {
        if (Date.now() < injectionDeadline) setTimeout(attemptHandshake, 100);
        else setKeychainMode(false);
        return;
      }

      let answered = false;
      const timeout = setTimeout(() => {
        if (!answered) setKeychainMode(false);
      }, 1500);
      try {
        keychain.requestHandshake(() => {
          answered = true;
          clearTimeout(timeout);
          setKeychainMode(true);
        });
      } catch (error) {
        clearTimeout(timeout);
        setKeychainMode(false);
      }
    }
    attemptHandshake();
  }

  function closeApproval() {
    clearTimeout(requestTimer);
    approvalPanel.classList.remove('open');
    approvalPanel.setAttribute('aria-hidden', 'true');
    loginProgress.textContent = '';
    loginButton.disabled = false;
    loginButton.querySelector('span').textContent = 'Login with Keychain';
  }

  function requestKeychainLogin() {
    const nonce = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const challenge = [
      'Hive Keychain tutorial login',
      `Domain: ${location.host || 'local tutorial'}`,
      `Issued: ${new Date().toISOString()}`,
      `Nonce: ${nonce}`,
    ].join('\n');

    loginButton.disabled = true;
    loginButton.querySelector('span').textContent = 'Waiting for Keychain…';
    loginProgress.textContent = 'Review the real login request in Hive Keychain.';
    try {
      window.hive_keychain.requestSignBuffer(null, challenge, 'Posting', response => {
        if (response && response.success) {
          const username = (response.data && response.data.username) || response.username;
          loginButton.querySelector('span').textContent = 'Logged in';
          loginProgress.textContent = `${username ? `Authenticated as @${username}. ` : 'Authentication approved. '}Your private key stayed in Keychain.`;
          announce('Real Keychain login approved.');
          return;
        }

        loginButton.disabled = false;
        loginButton.querySelector('span').textContent = 'Login with Keychain';
        loginProgress.textContent = response && response.message ? response.message : 'The Keychain request was cancelled.';
        announce('Keychain login was not approved.');
      }, null, 'Hive Keychain tutorial login');
    } catch (error) {
      setKeychainMode(false);
      loginProgress.textContent = 'Keychain could not open the request. The tutorial has switched to simulation mode.';
    }
  }

  loginButton.addEventListener('click', () => {
    if (keychainAvailable) {
      requestKeychainLogin();
      return;
    }
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
  detectKeychain();

  const initial = Math.max(0, hashes.indexOf(location.hash.slice(1)));
  maxVisited = initial;
  render(initial, false);
})();
