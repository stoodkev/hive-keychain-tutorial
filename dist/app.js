(async () => {
  const pages = [...document.querySelectorAll(".page")];
  const tabs = [...document.querySelectorAll(".step-tab")];
  const previous = document.querySelector("#previous");
  const next = document.querySelector("#next");
  const count = document.querySelector("#current-page");
  const progress = document.querySelector("#progress-fill");
  const tutorial = document.querySelector("#tutorial");
  const themeToggle = document.querySelector("#theme-toggle");
  const languageSelect = document.querySelector("#language-select");
  const toast = document.querySelector("#toast");
  const hashes = pages.map((page) => page.id);
  const supportedLocales = ["en", "es", "fr", "de", "id", "zh-Hans", "pt-BR"];
  let messages = {};
  let currentLocale = "en";
  let index = 0;
  let maxVisited = 0;
  let toastTimer;
  let enterTimer;

  function normalizeLocale(locale) {
    if (!locale) return null;
    const exact = supportedLocales.find(
      (supported) => supported.toLowerCase() === locale.toLowerCase(),
    );
    if (exact) return exact;
    const language = locale.toLowerCase().split("-")[0];
    return (
      supportedLocales.find(
        (supported) => supported.toLowerCase().split("-")[0] === language,
      ) || null
    );
  }

  function resolveInitialLocale() {
    const requested = new URLSearchParams(location.search).get("lang");
    const saved = localStorage.getItem("hive-tutorial-language");
    const browser = navigator.languages || [navigator.language];
    return (
      normalizeLocale(requested) ||
      normalizeLocale(saved) ||
      browser.map(normalizeLocale).find(Boolean) ||
      "en"
    );
  }

  function t(key, fallback = key, values = {}) {
    const template = messages[key] || fallback;
    return Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, value),
      template,
    );
  }

  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const translation = messages[element.dataset.i18n];
      if (translation) element.textContent = translation;
    });
    document.querySelectorAll("[data-i18n-text]").forEach((element) => {
      const translation = messages[element.dataset.i18nText];
      if (!translation) return;
      const textNode = [...element.childNodes].find(
        (node) => node.nodeType === Node.TEXT_NODE,
      );
      if (textNode) textNode.textContent = translation;
      else element.append(document.createTextNode(translation));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const translation = messages[element.dataset.i18nAriaLabel];
      if (translation) element.setAttribute("aria-label", translation);
    });
    document.querySelectorAll("[data-i18n-content]").forEach((element) => {
      const translation = messages[element.dataset.i18nContent];
      if (translation) element.setAttribute("content", translation);
    });
  }

  async function setLocale(locale, persist = true) {
    currentLocale = normalizeLocale(locale) || "en";
    try {
      const response = await fetch(
        `./locales/${currentLocale}.json?v=20260924-i18n2`,
        { cache: "no-cache" },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      messages = await response.json();
    } catch (error) {
      console.error(`Could not load locale ${currentLocale}.`, error);
      currentLocale = "en";
      const fallback = await fetch("./locales/en.json?v=20260924-i18n2", {
        cache: "no-cache",
      });
      messages = fallback.ok ? await fallback.json() : {};
    }
    document.documentElement.lang = currentLocale;
    languageSelect.value = currentLocale;
    applyTranslations();
    if (persist) {
      localStorage.setItem("hive-tutorial-language", currentLocale);
      const url = new URL(location.href);
      if (currentLocale === "en") url.searchParams.delete("lang");
      else url.searchParams.set("lang", currentLocale);
      history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }

  await setLocale(resolveInitialLocale(), false);

  const brandLogo = document.querySelector(".brand-logo");
  const brandUpload = document.querySelector(".brand-upload");
  const brandFallback = document.querySelector(".brand-fallback");

  function revealOptionalAssets() {
    if (brandLogo.naturalWidth > 0) {
      brandUpload.hidden = false;
      brandFallback.hidden = true;
    }
  }

  brandLogo.addEventListener("load", revealOptionalAssets);
  revealOptionalAssets();

  function announce(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function render(nextIndex, updateHash = true) {
    index = Math.max(0, Math.min(pages.length - 1, nextIndex));
    maxVisited = Math.max(maxVisited, index);
    pages.forEach((page, i) => {
      page.classList.toggle("is-active", i === index);
      page.classList.remove("is-entering");
      page.setAttribute("aria-hidden", i === index ? "false" : "true");
    });
    clearTimeout(enterTimer);
    const activePage = pages[index];
    if (
      !document.hidden &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      activePage.classList.add("is-entering");
      enterTimer = setTimeout(
        () => activePage.classList.remove("is-entering"),
        750,
      );
    }
    tabs.forEach((tab, i) => {
      tab.classList.toggle("active", i === index);
      tab.classList.toggle("done", i < index);
      tab.disabled = i > maxVisited;
      tab.setAttribute("aria-current", i === index ? "step" : "false");
    });
    previous.style.display = index === 0 ? "none" : "";
    previous.disabled = index === 0;
    const nextLabel =
      index === 0
        ? t("nav.start", "Start exploring")
        : index === pages.length - 1
          ? t("nav.finish", "Finish")
          : t("nav.continue", "Continue");
    const nextIcon = document.createElement("span");
    nextIcon.textContent = index === pages.length - 1 ? "" : "→";
    next.replaceChildren(
      document.createTextNode(
        `${index === pages.length - 1 ? "✓ " : ""}${nextLabel} `,
      ),
      nextIcon,
    );
    next.classList.toggle("finish", index === 8);
    count.textContent = String(index + 1);
    progress.style.width = `${(index / (pages.length - 1)) * 100}%`;
    document.title = `${pages[index].querySelector("h1,h2").textContent} · Hive Keychain`;
    if (updateHash) history.replaceState(null, "", `#${hashes[index]}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    tutorial.focus({ preventScroll: true });
  }

  previous.addEventListener("click", () => render(index - 1));
  next.addEventListener("click", () => {
    if (index === pages.length - 1)
      announce(t("toast.complete", "Tutorial complete — welcome to Hive!"));
    else render(index + 1);
  });
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => render(Number(tab.dataset.step))),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" && index < pages.length - 1)
      render(index + 1);
    if (event.key === "ArrowLeft" && index > 0) render(index - 1);
  });

  if (localStorage.getItem("hive-tutorial-theme") !== "dark")
    document.documentElement.classList.add("light");
  function syncThemeLabel() {
    themeToggle.setAttribute(
      "aria-label",
      document.documentElement.classList.contains("light")
        ? t("theme.dark", "Switch to dark mode")
        : t("theme.light", "Switch to light mode"),
    );
  }
  syncThemeLabel();
  themeToggle.addEventListener("click", () => {
    const light = document.documentElement.classList.toggle("light");
    localStorage.setItem("hive-tutorial-theme", light ? "light" : "dark");
    syncThemeLabel();
  });

  document.querySelectorAll(".activity-card").forEach((card) => {
    card.addEventListener("click", () => {
      const wasOpen = card.getAttribute("aria-expanded") === "true";
      document
        .querySelectorAll(".activity-card")
        .forEach((item) => item.setAttribute("aria-expanded", "false"));
      card.setAttribute("aria-expanded", wasOpen ? "false" : "true");
    });
  });

  const loginButton = document.querySelector("#login-button");
  const loginProgress = document.querySelector("#login-progress");
  const approvalPanel = document.querySelector("#approval-panel");
  const loginNotice = document.querySelector("#login-notice");
  const demoLabel = document.querySelector(".demo-label");
  let keychainAvailable = false;
  let requestTimer;

  function setDemoLabel(message) {
    demoLabel.replaceChildren(
      document.createElement("i"),
      document.createTextNode(message),
    );
  }

  function syncKeychainModeCopy(available) {
    loginButton.querySelector("span").textContent = t(
      "login.button",
      "Login with Keychain",
    );
    if (available) {
      loginNotice.hidden = true;
      loginNotice.style.display = "none";
      setDemoLabel(
        t(
          "login.liveDemo",
          "Live Keychain request · no transaction is broadcast",
        ),
      );
      return;
    }

    loginNotice.hidden = false;
    loginNotice.style.display = "flex";
    const arrow = document.createElement("span");
    arrow.textContent = "⇩";
    const notice = document.createElement("p");
    notice.append(
      document.createTextNode(
        `${t("login.installPrompt", "Install Hive Keychain first to try the real login request.")} `,
      ),
    );
    const download = document.createElement("a");
    download.href = "https://hive-keychain.com/#download";
    download.target = "_blank";
    download.rel = "noreferrer";
    download.textContent = t("login.download", "Download Hive Keychain");
    notice.append(download, ".");
    loginNotice.replaceChildren(arrow, notice);
    setDemoLabel(
      t("login.tutorialDemo", "Tutorial demonstration · not a real request"),
    );
  }

  function setKeychainMode(available) {
    keychainAvailable = available;
    loginButton.classList.remove("is-success");
    loginButton.disabled = false;
    syncKeychainModeCopy(available);
  }

  function detectKeychain() {
    loginButton.disabled = true;
    loginButton.querySelector("span").textContent = t(
      "login.checking",
      "Checking for Keychain…",
    );
    const injectionDeadline = Date.now() + 1500;

    function attemptHandshake() {
      const keychain = window.hive_keychain;
      if (!keychain || typeof keychain.requestHandshake !== "function") {
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
    approvalPanel.classList.remove("open");
    approvalPanel.setAttribute("aria-hidden", "true");
    loginProgress.textContent = "";
    loginButton.disabled = false;
    loginButton.querySelector("span").textContent = t(
      "login.button",
      "Login with Keychain",
    );
  }

  function requestKeychainLogin() {
    const nonce =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const challenge = [
      "Hive Keychain tutorial login",
      `Domain: ${location.host || "local tutorial"}`,
      `Issued: ${new Date().toISOString()}`,
      `Nonce: ${nonce}`,
    ].join("\n");

    loginButton.classList.remove("is-success");
    loginButton.disabled = true;
    loginButton.querySelector("span").textContent = t(
      "login.waiting",
      "Waiting for Keychain…",
    );
    loginProgress.textContent = t(
      "login.reviewRequest",
      "Review the real login request in Hive Keychain.",
    );
    try {
      window.hive_keychain.requestSignBuffer(
        null,
        challenge,
        "Posting",
        (response) => {
          if (response && response.success) {
            const username =
              (response.data && response.data.username) || response.username;
            loginButton.classList.add("is-success");
            loginButton.querySelector("span").textContent = t(
              "login.loggedIn",
              "Logged in",
            );
            loginProgress.textContent = username
              ? t(
                  "login.authenticatedAs",
                  "Authenticated as @{{username}}. Your private key stayed in Keychain.",
                  { username },
                )
              : t(
                  "login.authenticationApproved",
                  "Authentication approved. Your private key stayed in Keychain.",
                );
            announce(t("login.realApproved", "Real Keychain login approved."));
            return;
          }

          loginButton.disabled = false;
          loginButton.querySelector("span").textContent = t(
            "login.button",
            "Login with Keychain",
          );
          loginProgress.textContent =
            response && response.message
              ? response.message
              : t(
                  "login.requestCancelled",
                  "The Keychain request was cancelled.",
                );
          announce(t("login.notApproved", "Keychain login was not approved."));
        },
        null,
        "Hive Keychain tutorial login",
      );
    } catch (error) {
      setKeychainMode(false);
      loginProgress.textContent = t(
        "login.openFailed",
        "Keychain could not open the request. The tutorial has switched to simulation mode.",
      );
    }
  }

  loginButton.addEventListener("click", () => {
    if (keychainAvailable) {
      requestKeychainLogin();
      return;
    }
    loginButton.disabled = true;
    loginButton.querySelector("span").textContent = t(
      "login.sending",
      "Sending request…",
    );
    loginProgress.textContent = t(
      "login.sendingToKeychain",
      "Sending request to Keychain…",
    );
    requestTimer = setTimeout(() => {
      approvalPanel.classList.add("open");
      approvalPanel.setAttribute("aria-hidden", "false");
      document.querySelector("#login-approve").focus();
    }, 700);
  });
  document.querySelector("#login-cancel").addEventListener("click", () => {
    closeApproval();
    announce(t("login.cancelled", "Login cancelled. No request was approved."));
  });
  document.querySelector("#login-approve").addEventListener("click", () => {
    closeApproval();
    loginButton.classList.add("is-success");
    loginButton.querySelector("span").textContent = t(
      "login.loggedIn",
      "Logged in",
    );
    loginButton.disabled = true;
    loginProgress.textContent = t(
      "login.simulatedApprovedDetail",
      "Authentication approved — your private key stayed on your device.",
    );
    announce(
      t(
        "login.simulatedApproved",
        "Login approved in this tutorial simulation.",
      ),
    );
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && approvalPanel.classList.contains("open"))
      closeApproval();
  });
  detectKeychain();

  languageSelect.addEventListener("change", async () => {
    await setLocale(languageSelect.value);
    syncThemeLabel();
    syncKeychainModeCopy(keychainAvailable);
    render(index, false);
  });

  const initial = Math.max(0, hashes.indexOf(location.hash.slice(1)));
  maxVisited = initial;
  render(initial, false);
})();
