(() => {
  const $ = (id) => document.getElementById(id);

  // Theme toggle
  const themeBtn = $("themeBtn");
  const savedTheme = localStorage.getItem("wipe_theme");
  if (savedTheme)
    document.documentElement.setAttribute("data-theme", savedTheme);
  themeBtn?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "" : "dark";
    if (next) document.documentElement.setAttribute("data-theme", next);
    else document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("wipe_theme", next || "");
  });

  // Year
  const yearEl = $("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Config
  const state = { endpoint: null, links: [] };

  async function loadConfig() {
    try {
      const res = await fetch("./data/config.json", { cache: "no-store" });
      if (!res.ok) return;
      const cfg = await res.json();

      state.endpoint = cfg?.discordWorkerEndpoint || null;
      if (cfg?.hudStatus) $("hudStatus").textContent = cfg.hudStatus;
      if (cfg?.wipeStatusText)
        $("wipeStatusText").textContent = cfg.wipeStatusText;
      if (cfg?.wipeDateText) $("wipeDateText").textContent = cfg.wipeDateText;

      state.links = Array.isArray(cfg?.links) ? cfg.links : [];
      renderLinks();
    } catch {
      renderLinks(); // defaults
    }
  }

  function renderLinks() {
    const wrap = $("streamLinks");
    if (!wrap) return;
    wrap.innerHTML = "";

    const defaults = [
      {
        title: "TWITCH",
        sub: "Viens sur le stream",
        img: "assets/icons/twitch.png",
        href: "https://www.twitch.tv/irbas1er",
      },
      {
        title: "DISCORD",
        sub: "Rejoindre la commu",
        img: "assets/icons/discord.png",
        href: "https://discord.com/invite/tzPGaWaEgf",
      },
      {
        title: "TIKTOK",
        sub: "Clips & extraits",
        img: "assets/icons/tiktok.png",
        href: "https://www.tiktok.com/@irbas1er?lang=fr",
      },
      {
        title: "YOUTUBE",
        sub: "Vidéos",
        img: "assets/icons/youtube.png",
        href: "https://www.youtube.com/@irbas1er",
      },
    ];


    const links = state.links.length ? state.links : defaults;

    links.forEach((l) => {
      const a = document.createElement("a");
      a.className = "linkBtn";
      a.href = l.href || "#";
      a.target = l.href && l.href !== "#" ? "_blank" : "";
      a.rel = "noopener";

      a.innerHTML = `
        <span class="linkLeft">
          <span class="linkIcon">
  <img src="${l.img || ""}" alt="${escapeHtml(l.title)} logo" />
</span>

          <span>
            <span class="linkTitle">${escapeHtml(l.title || "LINK")}</span>
            <span class="linkSub">${escapeHtml(l.sub || "")}</span>
          </span>
        </span>
        <span class="linkArrow">➜</span>
      `;
      wrap.appendChild(a);
    });
  }

  // Timer target: 19 March 11:00 (local time)
  const WIPE_MONTH_INDEX = 2; // March
  const WIPE_DAY = 19;
  const WIPE_HOUR = 16;
  const WIPE_MIN = 0;

  const timeEl = $("time");
  const bootStatusEl = $("bootStatus");

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function getNextWipeDate() {
    const now = new Date();
    let target = new Date(
      now.getFullYear(),
      WIPE_MONTH_INDEX,
      WIPE_DAY,
      WIPE_HOUR,
      WIPE_MIN,
      0,
      0,
    );
    if (target.getTime() <= now.getTime()) {
      target = new Date(
        now.getFullYear() + 1,
        WIPE_MONTH_INDEX,
        WIPE_DAY,
        WIPE_HOUR,
        WIPE_MIN,
        0,
        0,
      );
    }
    return target;
  }

  const wipeTarget = getNextWipeDate();

  function updateCrateTimer() {
    const now = new Date();
    const diffMs = wipeTarget.getTime() - now.getTime();

    if (diffMs <= 0) {
      timeEl.textContent = "00:00:00";
      bootStatusEl.textContent = "» WIPE STARTED — good luck, sailor.";
      $("wipeStatusText").textContent = "🔥 WIPE EN COURS";
      $("hudStatus").textContent = "WIPE EN COURS";
      timeEl.classList.add("pulse");
      return;
    }

    const totalSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    timeEl.textContent = `${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`;

    if (secs === 0) {
      timeEl.classList.remove("pulse");
      void timeEl.offsetWidth;
      timeEl.classList.add("pulse");
    }
  }

  updateCrateTimer();
  setInterval(updateCrateTimer, 1000);

  // WithWho conditional
  const withWhoWrap = $("withWhoWrap");
  const withWhoInput = $("withWho");
  function setWithWhoVisibility(value) {
    const show = value === "oui";
    withWhoWrap.classList.toggle("hidden", !show);
    if (!show) withWhoInput.value = "";
  }
  document.querySelectorAll('input[name="wipeVillage"]').forEach((r) => {
    r.addEventListener("change", (e) => setWithWhoVisibility(e.target.value));
  });

  // Form submit -> Worker endpoint
  const form = $("applyForm");
  const statusEl = $("status");
  const btn = $("sendBtn");
  const btnText = $("btnText");

  function setStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = "status " + (type || "");
  }
  function setLoading(v) {
    btn.disabled = v;
    btn.classList.toggle("loading", v);
    btnText.textContent = v ? "ENVOI..." : "ENVOYER";
  }
  function getRadioValue(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("", "");
    setLoading(true);

    const payload = {
      type: "wipe_village_application",
      twitchName: $("twitchName").value.trim(),
      discordName: $("discordName").value.trim(),
      hours: $("hours").value.trim(),
      steamId: $("steamId").value.trim(),
      whyWipe: $("whyWipe").value.trim(),
      aboutYou: $("aboutYou").value.trim(),
      wipeVillage: getRadioValue("wipeVillage"),
      withWho: $("withWho").value.trim(),
      rulesAccepted: !!$("rulesAccept").checked,
      website: $("website").value.trim(),
      submittedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    if (
      !payload.twitchName ||
      !payload.discordName ||
      !payload.hours ||
      !payload.steamId ||
      !payload.whyWipe ||
      !payload.aboutYou ||
      !payload.wipeVillage ||
      !payload.rulesAccepted
    ) {
      setLoading(false);
      setStatus("Remplis tous les champs (*) + accepte le règlement.", "err");
      return;
    }
    if (payload.wipeVillage === "oui" && !payload.withWho) {
      setLoading(false);
      setStatus("Tu as coché OUI → indique avec qui.", "err");
      return;
    }

    // honeypot bot
    if (payload.website) {
      setLoading(false);
      setStatus("✅ Envoyé.", "ok");
      form.reset();
      setWithWhoVisibility("non");
      return;
    }

    if (!state.endpoint) {
      setLoading(false);
      setStatus(
        "Endpoint Discord manquant (data/config.json → discordWorkerEndpoint).",
        "err",
      );
      return;
    }

    try {
      const res = await fetch(state.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const txt = await res.text().catch(() => "");
      if (!res.ok) {
        setLoading(false);
        setStatus("Erreur : " + (txt || res.status), "err");
        return;
      }

      setLoading(false);
      setStatus("✅ Candidature envoyée (Discord).", "ok");
      form.reset();
      setWithWhoVisibility("non");
    } catch {
      setLoading(false);
      setStatus("Erreur réseau.", "err");
    }
  });

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  loadConfig();
})();
