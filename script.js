const SUPABASE_URL = "https://xksllcfagvpccvuzwqmg.supabase.co";
const SUPABASE_KEY = "sb_publishable_5O1ZECSV-NpB8Hrl7RQtHg_7af8cgXy";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const STORAGE_KEYS = {
  app: "agrocontrol-desktop-v22",
  rememberedEmail: "agrocontrol-remembered-email"
};

const ROLE_LABEL_MAP = {
  dono: "Dono",
  owner: "Dono",
  admin: "Dono",
  gerente: "Gerente",
  manager: "Gerente",
  funcionario: "Funcionário",
  employee: "Funcionário"
};

const PAGE_META = {
  dashboard: ["Central de Comando", "Visão geral da operação, clima, mercado e desempenho da fazenda."],
  operations: ["Operações", "Cadastro, status e andamento operacional."],
  employees: ["Funcionários", "Equipe, acesso e estrutura interna."],
  financial: ["Financeiro", "Entradas, saídas, saldo e leitura do caixa."],
  market: ["Mercado", "Preço, direção e leitura tipo bolsa."],
  climate: ["Clima", "Leitura operacional do clima da fazenda."],
  plots: ["Talhões", "Áreas, cultura e produtividade."],
  inventory: ["Estoque", "Insumos e leitura operacional do estoque."],
  ai: ["IA da Fazenda", "Leituras e alertas da operação."],
  settings: ["Configurações", "Perfil, fazenda, clima e mercado."]
};

const state = {
  user: null,
  profile: null,
  settings: loadLocalState(),
  operations: [],
  employees: [],
  financial: [],
  market: [],
  climate: {},
  inventory: [],
  plots: [],
  aiInsights: []
};

function loadLocalState() {
  const saved = localStorage.getItem(STORAGE_KEYS.app);

  const defaults = {
    farm: {
      name: "Fazenda AgroControl",
      description: "Operação rural centralizada com visão premium de mercado, clima, finanças e execução.",
      banner: "imagens/dashboard_bg.jpg"
    },
    market: [
      { id: crypto.randomUUID(), name: "Soja", value: 135, unit: "R$/saca", change: 1.8, mode: "manual", visible: true },
      { id: crypto.randomUUID(), name: "Milho", value: 62, unit: "R$/saca", change: -0.9, mode: "manual", visible: true },
      { id: crypto.randomUUID(), name: "Arroz", value: 98, unit: "R$/saca", change: 0.6, mode: "manual", visible: true },
      { id: crypto.randomUUID(), name: "Diesel", value: 6.29, unit: "R$/litro", change: 0.3, mode: "manual", visible: true }
    ],
    climate: {
      city: "Dom Pedrito, RS",
      lat: "",
      lon: "",
      mode: "manual",
      source: "Manual",
      temp: 24,
      wind: 12,
      humidity: 64,
      condition: "Tempo estável",
      status: "Pode aplicar",
      windRule: 18,
      humidityRule: 55,
      updatedAt: "Manual"
    },
    inventory: [
      { id: crypto.randomUUID(), name: "Herbicida", qty: 28, unit: "bombonas", status: "Bom" },
      { id: crypto.randomUUID(), name: "Semente soja", qty: 86, unit: "sacas", status: "Bom" },
      { id: crypto.randomUUID(), name: "Diesel interno", qty: 2200, unit: "litros", status: "Atenção" }
    ],
    plots: [
      { id: crypto.randomUUID(), name: "Talhão Norte", area: 185, crop: "Soja", productivity: "64 sc/ha" },
      { id: crypto.randomUUID(), name: "Talhão Sede", area: 92, crop: "Milho", productivity: "152 sc/ha" },
      { id: crypto.randomUUID(), name: "Talhão Baixada", area: 71, crop: "Arroz", productivity: "175 sc/ha" }
    ],
    aiInsights: [
      "A combinação de vento e umidade segue favorável para aplicação no período atual.",
      "O arroz apresenta leve recuperação de preço e melhora a leitura comercial do dia.",
      "Há concentração de tarefas em andamento na frente norte. Reforço operacional pode equilibrar o ritmo."
    ]
  };

  if (!saved) return defaults;

  try {
    return { ...defaults, ...JSON.parse(saved) };
  } catch {
    return defaults;
  }
}

function saveLocalState() {
  localStorage.setItem(STORAGE_KEYS.app, JSON.stringify(state.settings));
}

const el = (id) => document.getElementById(id);

function currency(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function initials(name = "Agro") {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function roleLabel(role) {
  return ROLE_LABEL_MAP[String(role || "").toLowerCase()] || "Funcionário";
}

function canManageUsers() {
  return roleLabel(state.profile?.role) === "Dono";
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>\"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[c]));
}

function toast(message) {
  console.log("[AgroControl]", message);
}

function showView(view) {
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((btn) => btn.classList.remove("active"));

  const target = document.getElementById(view);
  if (target) target.classList.add("active");

  const navButton = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navButton) navButton.classList.add("active");

  const meta = PAGE_META[view] || PAGE_META.dashboard;
  el("pageTitle").textContent = meta[0];
  el("pageSubtitle").textContent = meta[1];
}

function renderUserShell() {
  const displayName = state.profile?.full_name || state.user?.email || "Usuário";
  const farmName = state.settings.farm.name;
  const role = roleLabel(state.profile?.role);

  el("sidebarUserName").textContent = displayName;
  el("sidebarUserRole").textContent = role;
  el("topUserName").textContent = displayName;
  el("topUserMeta").textContent = `${role} · ${farmName}`;
  el("userInitials").textContent = initials(displayName);
  el("topbarInitials").textContent = initials(displayName);
  el("bannerRole").textContent = role;
  el("farmNameBanner").textContent = farmName;
  el("farmTagline").textContent = state.settings.farm.description;

  el("profileNameInput").value = state.profile?.full_name || "";
  el("profileEmailInput").value = state.user?.email || "";
  el("profileRoleInput").value = role;

  const employeeCard = el("employeeFormCard");
  employeeCard.classList.toggle("hidden", !canManageUsers());
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();

  if (s.includes("and")) return "status-andamento";
  if (s.includes("pend")) return "status-pendente";
  if (s.includes("conc")) return "status-concluida";
  return "status-bloqueada";
}

function buildSimpleAnalysis(title, values, labels) {
  const bars = values.map((value, i) => {
    const height = Math.max(12, Math.min(100, Number(value)));
    return `
      <div style="margin-top:10px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#9cb7a7;margin-bottom:6px;">
          <span>${escapeHtml(labels[i] || "")}</span>
          <span>${escapeHtml(String(value))}</span>
        </div>
        <div style="height:10px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden;">
          <div style="width:${height}%;height:100%;background:linear-gradient(135deg,#38d27c,#1faa60);"></div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div>
      <strong style="display:block;margin-bottom:6px;">${escapeHtml(title)}</strong>
      <p style="color:#9cb7a7;margin-bottom:10px;">Leitura visual rápida liberada ao clicar em Ver análise.</p>
      ${bars}
    </div>
  `;
}

function renderOperations() {
  const dashboard = el("dashboardOperationsList");
  const full = el("operationsFullList");

  const list = state.operations.length ? state.operations : [
    {
      id: "temp-1",
      title: "Pulverização talhão norte",
      status: "Em andamento",
      owner: "Equipe 1",
      date: "Hoje",
      notes: "Aplicação com clima favorável."
    },
    {
      id: "temp-2",
      title: "Revisão da plantadeira",
      status: "Pendente",
      owner: "Oficina",
      date: "Amanhã",
      notes: "Aguardando janela mecânica."
    },
    {
      id: "temp-3",
      title: "Fechamento de carga arroz",
      status: "Concluída",
      owner: "Expedição",
      date: "Hoje",
      notes: "Documentação pronta."
    }
  ];

  el("kpiInProgress").textContent = list.filter((i) => String(i.status).toLowerCase().includes("and")).length;
  el("kpiPending").textContent = list.filter((i) => String(i.status).toLowerCase().includes("pend")).length;
  el("bannerOperationsCount").textContent = list.length;

  const itemHtml = (item) => `
    <div class="list-card">
      <div class="row-between">
        <strong>${escapeHtml(item.title || item.name || "Operação")}</strong>
        <span class="${statusClass(item.status)} chip">${escapeHtml(item.status || "Pendente")}</span>
      </div>
      <div class="row-between" style="color:#9cb7a7;font-size:13px;">
        <span>Responsável: ${escapeHtml(item.owner || item.responsavel || "Equipe")}</span>
        <span>Prazo: ${escapeHtml(item.date || "—")}</span>
      </div>
      <div style="color:#d5eadc;">${escapeHtml(item.notes || "Sem observações.")}</div>
    </div>
  `;

  dashboard.innerHTML = list.slice(0, 4).map(itemHtml).join("");
  full.innerHTML = list.map(itemHtml).join("");
}

function renderEmployees() {
  const container = el("employeesList");

  const list = state.employees.length ? state.employees : [
    {
      id: "e1",
      username: "beto",
      full_name: "Beto Ferreira",
      internal_email: "beto@agrocontrol",
      role: "Gerente",
      active: true
    },
    {
      id: "e2",
      username: "lucas",
      full_name: "Lucas Martins",
      internal_email: "lucas@agrocontrol",
      role: "Funcionário",
      active: true
    }
  ];

  el("bannerEmployeesCount").textContent = list.length;

  container.innerHTML = list.map((item) => `
    <div class="employee-card">
      <div class="row-between">
        <div>
          <strong>${escapeHtml(item.full_name || item.name || item.username || "Funcionário")}</strong>
          <div style="color:#9cb7a7;font-size:13px;margin-top:4px;">${escapeHtml(item.internal_email || item.email || `${item.username}@agrocontrol`)}</div>
        </div>
        <span class="chip">${item.active === false ? "Inativo" : roleLabel(item.role)}</span>
      </div>
      <div style="color:#9cb7a7;font-size:13px;">Usuário: ${escapeHtml(item.username || "—")}</div>
    </div>
  `).join("");
}

function renderFinancial() {
  const list = state.financial;

  el("bannerTransactionsCount").textContent = list.length;

  const income = list.filter((i) => String(i.type).toLowerCase() === "income").reduce((a, b) => a + Number(b.amount || 0), 0);
  const expense = list.filter((i) => String(i.type).toLowerCase() === "expense").reduce((a, b) => a + Number(b.amount || 0), 0);
  const balance = income - expense;

  el("financeIncome").textContent = currency(income);
  el("financeExpense").textContent = currency(expense);
  el("financeBalance").textContent = currency(balance);

  const financeItems = list.length ? list : [
    { description: "Venda de soja", type: "income", amount: 18200 },
    { description: "Compra de diesel", type: "expense", amount: 4300 }
  ];

  el("financeList").innerHTML = financeItems.map((item) => `
    <div class="list-card">
      <div class="row-between">
        <div>
          <strong>${escapeHtml(item.description || "Lançamento")}</strong>
          <div style="color:#9cb7a7;font-size:13px;margin-top:4px;">${String(item.type) === "income" ? "Entrada" : "Saída"}</div>
        </div>
        <div class="${String(item.type) === "income" ? "success" : "danger"}">${currency(item.amount)}</div>
      </div>
    </div>
  `).join("");

  el("financialAnalysis").innerHTML = buildSimpleAnalysis(
    "Fluxo recente",
    [42, 68, 58, 74, 65, 82],
    ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"]
  );
}

function renderMarket() {
  state.market = state.settings.market;
  const visible = state.market.filter((i) => i.visible !== false);

  el("dashboardMarketTicker").innerHTML = visible.slice(0, 3).map((item) => `
    <div class="market-card">
      <span style="color:#9cb7a7;">${escapeHtml(item.name)}</span>
      <strong>${currency(item.value)}</strong>
      <div class="row-between" style="font-size:13px;">
        <span style="color:#9cb7a7;">${escapeHtml(item.unit)}</span>
        <span class="${Number(item.change) >= 0 ? "up" : "down"}">
          ${Number(item.change) >= 0 ? "↑" : "↓"} ${Math.abs(Number(item.change || 0)).toFixed(2)}%
        </span>
      </div>
    </div>
  `).join("");

  el("marketList").innerHTML = visible.map((item) => `
    <div class="market-card">
      <div class="row-between">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <div style="color:#9cb7a7;font-size:13px;margin-top:4px;">
            ${escapeHtml(item.unit)} · ${item.mode === "manual" ? "Manual" : item.mode === "auto" ? "Automático" : "Híbrido"}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:900;">${currency(item.value)}</div>
          <div class="${Number(item.change) >= 0 ? "up" : "down"}">
            ${Number(item.change) >= 0 ? "↑" : "↓"} ${Math.abs(Number(item.change || 0)).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  `).join("");

  el("marketSettingsList").innerHTML = state.market.map((item) => `
    <div class="list-card">
      <div class="row-between">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <div style="color:#9cb7a7;font-size:13px;margin-top:4px;">${escapeHtml(item.unit)} · modo ${escapeHtml(item.mode)}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary" onclick="toggleMarketVisibility('${item.id}')">${item.visible === false ? "Mostrar" : "Ocultar"}</button>
          <button class="btn btn-danger" onclick="removeMarketItem('${item.id}')">Remover</button>
        </div>
      </div>
    </div>
  `).join("");

  el("marketAnalysis").innerHTML = buildSimpleAnalysis(
    "Variação monitorada",
    visible.slice(0, 6).map((i) => Math.max(12, 45 + Number(i.change) * 10)),
    visible.slice(0, 6).map((i) => i.name)
  );
}

function renderClimate() {
  state.climate = state.settings.climate;
  const c = state.climate;

  const windOk = Number(c.wind || 0) <= Number(c.windRule || 18);
  const humidityOk = Number(c.humidity || 0) >= Number(c.humidityRule || 55);

  if (c.mode !== "manual") {
    c.status = windOk && humidityOk ? "Pode aplicar" : "Aplicação com atenção";
  }

  el("climateLocationLabel").textContent = c.city || "Fazenda";
  el("climateTemp").textContent = `${c.temp}°`;
  el("climateCondition").textContent = c.condition;
  el("climateWind").textContent = `${c.wind} km/h`;
  el("climateHumidity").textContent = `${c.humidity}%`;
  el("climateUpdatedAt").textContent = c.updatedAt || c.source || "Manual";
  el("applyStatusChip").textContent = c.status;

  el("climateTempLarge").textContent = `${c.temp}°`;
  el("climateConditionLarge").textContent = c.condition;
  el("climateWindLarge").textContent = `${c.wind} km/h`;
  el("climateHumidityLarge").textContent = `${c.humidity}%`;
  el("climateSourceLarge").textContent = c.source;
  el("applyStatusChipLarge").textContent = c.status;

  el("climateRulesList").innerHTML = `
    <div class="list-card"><strong>Local</strong><div style="color:#9cb7a7;">${escapeHtml(c.city || "Não definido")}</div></div>
    <div class="list-card"><strong>Modo</strong><div style="color:#9cb7a7;">${escapeHtml(c.mode)}</div></div>
    <div class="list-card"><strong>Regra de vento</strong><div style="color:#9cb7a7;">Até ${escapeHtml(String(c.windRule))} km/h</div></div>
    <div class="list-card"><strong>Regra de umidade</strong><div style="color:#9cb7a7;">A partir de ${escapeHtml(String(c.humidityRule))}%</div></div>
    <div class="list-card"><strong>Status atual</strong><div style="color:#9cb7a7;">${escapeHtml(c.status)}</div></div>
  `;
}

function renderPlots() {
  const plots = state.settings.plots;

  const html = plots.map((p) => `
    <div class="plot-card">
      <span style="color:#9cb7a7;">${escapeHtml(p.crop)}</span>
      <strong>${escapeHtml(p.name)}</strong>
      <div style="color:#9cb7a7;">Área: ${escapeHtml(String(p.area))} ha</div>
      <div style="color:#9cb7a7;">Produtividade: ${escapeHtml(p.productivity)}</div>
    </div>
  `).join("");

  el("plotsGrid").innerHTML = html;
  el("plotSummaryCards").innerHTML = html;
}

function renderInventory() {
  const list = state.settings.inventory;

  el("inventoryList").innerHTML = list.map((item) => `
    <div class="list-card">
      <div class="row-between">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <div style="color:#9cb7a7;font-size:13px;margin-top:4px;">${escapeHtml(item.status)}</div>
        </div>
        <div style="font-weight:900;">${escapeHtml(String(item.qty))} ${escapeHtml(item.unit)}</div>
      </div>
    </div>
  `).join("");

  el("inventoryAnalysis").innerHTML = buildSimpleAnalysis(
    "Nível de estoque",
    list.map((i) => Math.max(18, Number(i.qty) > 100 ? 88 : Number(i.qty))),
    list.map((i) => i.name.split(" ")[0])
  );
}

function renderAI() {
  const items = state.settings.aiInsights;
  const html = items.map((text) => `<div class="feed-card">${escapeHtml(text)}</div>`).join("");
  el("aiInsightsList").innerHTML = html;
  el("aiFullList").innerHTML = html;
}

function renderSettings() {
  el("farmNameInput").value = state.settings.farm.name;
  el("farmDescInput").value = state.settings.farm.description;
  el("farmBannerInput").value = state.settings.farm.banner;

  el("climateCityInput").value = state.settings.climate.city || "";
  el("climateLatInput").value = state.settings.climate.lat || "";
  el("climateLonInput").value = state.settings.climate.lon || "";
  el("climateModeInput").value = state.settings.climate.mode || "manual";
  el("climateWindRuleInput").value = state.settings.climate.windRule || 18;
  el("climateHumidityRuleInput").value = state.settings.climate.humidityRule || 55;
  el("climateStatusRuleInput").value = state.settings.climate.status || "Pode aplicar";
}

function syncAllViews() {
  renderUserShell();
  renderOperations();
  renderEmployees();
  renderFinancial();
  renderMarket();
  renderClimate();
  renderPlots();
  renderInventory();
  renderAI();
  renderSettings();
}

async function loadSupabaseData() {
  const userId = state.user?.id;
  if (!userId) return;

  const profileRes = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!profileRes.error && profileRes.data) {
    state.profile = profileRes.data;
  } else {
    state.profile = {
      id: userId,
      full_name: state.user.user_metadata?.full_name || state.user.email?.split("@")[0] || "Usuário",
      role: "dono"
    };
  }

  const opsRes = await supabase
    .from("operations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!opsRes.error && Array.isArray(opsRes.data)) {
    state.operations = opsRes.data.map((r) => ({
      id: r.id,
      title: r.title || r.name || "Operação",
      status: r.status || "Pendente",
      owner: r.owner || r.responsible || "Equipe",
      date: r.operation_date || r.date || "—",
      notes: r.notes || r.description || ""
    }));
  }

  const empRes = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  if (!empRes.error && Array.isArray(empRes.data)) {
    state.employees = empRes.data.map((r) => ({
      id: r.id,
      username: r.username || r.user_name || r.name?.toLowerCase().replace(/\s+/g, ".") || "usuario",
      full_name: r.full_name || r.name || "Funcionário",
      internal_email: r.internal_email || r.email || "",
      role: r.role || "Funcionário",
      active: r.active !== false
    }));
  }

  const finRes = await supabase
    .from("financial_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!finRes.error && Array.isArray(finRes.data)) {
    state.financial = finRes.data.map((r) => ({
      id: r.id,
      description: r.description || r.title || "Lançamento",
      type:
        String(r.type || r.transaction_type || "expense").toLowerCase().includes("in") ||
        String(r.type || r.transaction_type || "").toLowerCase().includes("entrada")
          ? "income"
          : "expense",
      amount: Number(r.amount || 0)
    }));
  }
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  await supabase.auth.signOut();
}

async function restoreSession() {
  const { data } = await supabase.auth.getSession();

  if (data?.session?.user) {
    state.user = data.session.user;
    await loadSupabaseData();
    showApp();
  } else {
    showLogin();
  }
}

function showApp() {
  el("login").classList.add("hidden");
  el("app").classList.remove("hidden");
  syncAllViews();
}

function showLogin() {
  el("app").classList.add("hidden");
  el("login").classList.remove("hidden");
}

async function tryFetchWeather() {
  const c = state.settings.climate;
  let url = "";

  if (c.lat && c.lon) {
    url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(c.lat)}&longitude=${encodeURIComponent(c.lon)}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;
  }

  if (!url) {
    c.updatedAt = "Manual";
    return;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data?.current) {
      c.temp = Math.round(Number(data.current.temperature_2m || c.temp));
      c.humidity = Math.round(Number(data.current.relative_humidity_2m || c.humidity));
      c.wind = Math.round(Number(data.current.wind_speed_10m || c.wind));
      c.condition = "Leitura online";
      c.updatedAt = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      c.source = c.mode === "hybrid" ? "Online + fallback manual" : "Online";
    }
  } catch (error) {
    c.source = "Fallback manual";
    c.updatedAt = "Manual";
    toast("Não foi possível atualizar o clima online.");
  }
}

function toggleMarketVisibility(id) {
  const item = state.settings.market.find((i) => i.id === id);
  if (!item) return;
  item.visible = item.visible === false ? true : false;
  saveLocalState();
  renderMarket();
}

function removeMarketItem(id) {
  state.settings.market = state.settings.market.filter((i) => i.id !== id);
  saveLocalState();
  renderMarket();
}

window.toggleMarketVisibility = toggleMarketVisibility;
window.removeMarketItem = removeMarketItem;

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  document.querySelectorAll("[data-open-view]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.openView));
  });

  document.querySelectorAll(".analysis-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) target.classList.toggle("hidden");
    });
  });

  const loginForm = el("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = el("email").value.trim();
      const password = el("senha").value;

      try {
        await signIn(email, password);

        if (el("rememberLogin").checked) {
          localStorage.setItem(STORAGE_KEYS.rememberedEmail, email);
        }

        state.user = (await supabase.auth.getUser()).data.user;
        await loadSupabaseData();
        toast("Sessão iniciada com sucesso.");
        showApp();
      } catch (err) {
        alert(err.message || "Não foi possível entrar.");
      }
    });
  }

  const recoverPasswordBtn = el("recoverPasswordBtn");
  if (recoverPasswordBtn) {
    recoverPasswordBtn.addEventListener("click", async () => {
      const email = el("email").value.trim();
      if (!email) {
        alert("Digite seu email para recuperar a senha.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href
      });

      alert(error ? error.message : "Email de recuperação enviado, se a conta existir.");
    });
  }

  el("logoutBtn").addEventListener("click", async () => {
    await signOut();
    state.user = null;
    state.profile = null;
    showLogin();
  });

  el("refreshAllBtn").addEventListener("click", async () => {
    await loadSupabaseData();
    syncAllViews();
  });

  el("seedOperationsBtn").addEventListener("click", async () => {
    if (!state.user) return;

    const samples = [
      {
        title: "Adubação cobertura",
        status: "Em andamento",
        notes: "Frente leste.",
        owner: "Equipe 2"
      },
      {
        title: "Checklist colheitadeira",
        status: "Pendente",
        notes: "Aguardando oficina.",
        owner: "Mecânica"
      }
    ];

    for (const sample of samples) {
      await supabase.from("operations").insert(sample);
    }

    await loadSupabaseData();
    syncAllViews();
  });

  el("financeForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      description: el("financeDescription").value.trim(),
      amount: Number(el("financeAmount").value || 0),
      type: el("financeType").value,
      transaction_type: el("financeType").value
    };

    const { error } = await supabase.from("financial_transactions").insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    e.target.reset();
    await loadSupabaseData();
    syncAllViews();
  });

  el("employeeForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!canManageUsers()) {
      alert("Somente o Dono pode cadastrar usuários.");
      return;
    }

    const username = el("employeeUsername").value.trim().toLowerCase();
    const fullName = el("employeeFullName").value.trim();
    const selectedRole = el("employeeRole").value;
    const internalEmail = `${username}@agrocontrol`;

    const payload = {
      username,
      full_name: fullName,
      name: fullName,
      internal_email: internalEmail,
      role: selectedRole,
      active: true,
      temp_password_defined: Boolean(el("employeeTempPassword").value)
    };

    const { error } = await supabase.from("employees").insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    e.target.reset();
    await loadSupabaseData();
    syncAllViews();
  });

  el("saveProfileBtn").addEventListener("click", async () => {
    if (!state.user) return;

    const full_name = el("profileNameInput").value.trim();
    const payload = { id: state.user.id, full_name };

    const currentRole = state.profile?.role;
    if (currentRole !== undefined) payload.role = currentRole;

    const { error } = await supabase.from("profiles").upsert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    if (state.profile) state.profile.full_name = full_name;
    syncAllViews();
  });

  el("changePasswordBtn").addEventListener("click", async () => {
    const password = el("newPasswordInput").value;

    if (!password || password.length < 6) {
      alert("Use uma senha com pelo menos 6 caracteres.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      alert(error.message);
      return;
    }

    el("newPasswordInput").value = "";
    alert("Senha atualizada.");
  });

  el("farmSettingsForm").addEventListener("submit", (e) => {
    e.preventDefault();

    state.settings.farm.name = el("farmNameInput").value.trim() || "Fazenda AgroControl";
    state.settings.farm.description = el("farmDescInput").value.trim();
    state.settings.farm.banner = el("farmBannerInput").value.trim() || "imagens/dashboard_bg.jpg";

    saveLocalState();
    syncAllViews();
  });

  el("marketForm").addEventListener("submit", (e) => {
    e.preventDefault();

    state.settings.market.push({
      id: crypto.randomUUID(),
      name: el("marketNameInput").value.trim(),
      value: Number(el("marketValueInput").value || 0),
      unit: el("marketUnitInput").value.trim() || "R$/un",
      change: Number(el("marketChangeInput").value || 0),
      mode: el("marketModeInput").value,
      visible: true
    });

    saveLocalState();
    e.target.reset();
    renderMarket();
  });

  el("climateSettingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    state.settings.climate.city = el("climateCityInput").value.trim();
    state.settings.climate.lat = el("climateLatInput").value.trim();
    state.settings.climate.lon = el("climateLonInput").value.trim();
    state.settings.climate.mode = el("climateModeInput").value;
    state.settings.climate.source =
      el("climateModeInput").value === "manual" ? "Manual" : "Online";

    if (state.settings.climate.mode !== "manual") {
      await tryFetchWeather();
    }

    saveLocalState();
    renderClimate();
  });

  el("saveClimateRulesBtn").addEventListener("click", () => {
    state.settings.climate.windRule = Number(el("climateWindRuleInput").value || 18);
    state.settings.climate.humidityRule = Number(el("climateHumidityRuleInput").value || 55);
    state.settings.climate.status =
      el("climateStatusRuleInput").value.trim() || "Pode aplicar";

    saveLocalState();
    renderClimate();
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((pane) => pane.classList.remove("active"));

      btn.classList.add("active");
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add("active");
    });
  });

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      state.user = session.user;
      await loadSupabaseData();
      showApp();
    }
  });
}

function preloadRememberedEmail() {
  const remembered = localStorage.getItem(STORAGE_KEYS.rememberedEmail);
  if (remembered && el("email")) {
    el("email").value = remembered;
    if (el("rememberLogin")) el("rememberLogin").checked = true;
  }
}

async function init() {
  preloadRememberedEmail();
  bindEvents();
  await restoreSession();
  syncAllViews();
}

document.addEventListener("DOMContentLoaded", init);
