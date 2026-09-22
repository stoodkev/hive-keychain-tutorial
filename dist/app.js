(() => {
  const pages = [...document.querySelectorAll('.page')];
  const tabs = [...document.querySelectorAll('.step-tab')];
  const previous = document.querySelector('#previous');
  const next = document.querySelector('#next');
  const currentPage = document.querySelector('#current-page');
  const progressFill = document.querySelector('#progress-fill');
  const tutorial = document.querySelector('#tutorial');
  const themeToggle = document.querySelector('#theme-toggle');
  const toast = document.querySelector('#toast');
  let index = 0;
  let maxVisited = 0;
  let toastTimer;

  const labels = ['Start exploring', 'Continue', 'Continue', 'Explore apps', 'Meet Keychain', 'See how login works', 'Review safety', 'Finish', 'Restart'];
  const hashes = pages.map(page => page.id);

  function announce(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function render(nextIndex, updateHash = true) {
    index = Math.max(0, Math.min(pages.length - 1, nextIndex));
    maxVisited = Math.max(maxVisited, index);

    pages.forEach((page, pageIndex) => {
      page.classList.toggle('is-active', pageIndex === index);
      page.setAttribute('aria-hidden', pageIndex === index ? 'false' : 'true');
    });

    tabs.forEach((tab, tabIndex) => {
      tab.classList.toggle('active', tabIndex === index);
      tab.classList.toggle('done', tabIndex < index);
      tab.disabled = tabIndex > maxVisited;
      tab.setAttribute('aria-current', tabIndex === index ? 'step' : 'false');
    });

    previous.disabled = index === 0;
    next.innerHTML = `${labels[index]} <span>→</span>`;
    currentPage.textContent = String(index + 1);
    progressFill.style.width = `${(index / (pages.length - 1)) * 100}%`;
    document.title = `${pages[index].querySelector('h1,h2').textContent} · Hive Keychain`;

    if (updateHash) history.replaceState(null, '', `#${hashes[index]}`);
    tutorial.focus({ preventScroll: true });
  }

  previous.addEventListener('click', () => render(index - 1));
  next.addEventListener('click', () => render(index === pages.length - 1 ? 0 : index + 1));
  tabs.forEach(tab => tab.addEventListener('click', () => render(Number(tab.dataset.step))));

  document.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' && index < pages.length - 1) render(index + 1);
    if (event.key === 'ArrowLeft' && index > 0) render(index - 1);
  });

  const savedTheme = localStorage.getItem('hive-tutorial-theme');
  if (savedTheme === 'light') document.documentElement.classList.add('light');
  themeToggle.setAttribute('aria-label', document.documentElement.classList.contains('light') ? 'Switch to dark mode' : 'Switch to light mode');
  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('hive-tutorial-theme', isLight ? 'light' : 'dark');
    themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
  });

  const tokenExamples = {
    HIVE: 'Example: send 10 HIVE to another account or convert it into Hive Power.',
    'Hive Power': 'Example: use Hive Power to strengthen your votes and resource credits.',
    HBD: 'Example: hold HBD in savings or use it for a dollar-oriented payment.'
  };
  document.querySelectorAll('.token-action').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector('#token-demo').textContent = tokenExamples[button.dataset.token];
    });
  });

  const keychainPanel = document.querySelector('#keychain-panel');
  function setRequest(open) {
    keychainPanel.classList.toggle('open', open);
    keychainPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) document.querySelector('#approve-request').focus();
  }
  document.querySelector('#open-request').addEventListener('click', () => setRequest(true));
  document.querySelector('#close-request').addEventListener('click', () => setRequest(false));
  document.querySelector('#reject-request').addEventListener('click', () => {
    setRequest(false);
    announce('Request rejected — nothing was published.');
  });
  document.querySelector('#approve-request').addEventListener('click', () => {
    setRequest(false);
    announce('Approved! The demo comment was signed safely.');
  });

  const playLogin = document.querySelector('#play-login');
  const loginSteps = [...document.querySelectorAll('#login-flow article')];
  const loginStatus = document.querySelector('#login-status');
  let loginRunning = false;
  playLogin.addEventListener('click', async () => {
    if (loginRunning) return;
    loginRunning = true;
    playLogin.disabled = true;
    loginSteps.forEach(step => step.classList.remove('active'));
    const messages = ['App created a one-time challenge…', 'Keychain signed it locally…', 'Login verified — no private key was shared.'];
    for (let step = 0; step < loginSteps.length; step += 1) {
      loginSteps.forEach(item => item.classList.remove('active'));
      loginSteps[step].classList.add('active');
      loginStatus.textContent = messages[step];
      await new Promise(resolve => setTimeout(resolve, 700));
    }
    playLogin.textContent = 'Run again';
    playLogin.disabled = false;
    loginRunning = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && keychainPanel.classList.contains('open')) setRequest(false);
  });

  const initialIndex = Math.max(0, hashes.indexOf(location.hash.slice(1)));
  maxVisited = initialIndex;
  render(initialIndex, false);
})();
