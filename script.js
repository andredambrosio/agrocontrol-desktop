const SUPABASE_URL = "https://xksllcfagvpccvuzwqmg.supabase.co";
const SUPABASE_KEY = "sb_publishable_5O1ZECSV-NpB8Hrl7RQtHg_7af8cgXy";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const climaState = {
  cidade: "Dom Pedrito, RS",
  latitude: -30.98,
  longitude: -54.67,
  temp: "--",
  umidade: "--",
  vento: "--",
  status: "Pode aplicar"
};

const mercadoState = [
  { nome: "Soja", valor: 135.0, unidade: "R$/saca", variacao: 1.8 },
  { nome: "Milho", valor: 62.0, unidade: "R$/saca", variacao: -0.9 },
  { nome: "Arroz", valor: 98.0, unidade: "R$/saca", variacao: 0.6 }
];

document.addEventListener("DOMContentLoaded", () => {
  restaurarSessao();
  montarDashboard();
  carregarClima();

  const lembrar = localStorage.getItem("agrocontrol_email");
  if (lembrar) {
    const emailInput = document.getElementById("email");
    if (emailInput) emailInput.value = lembrar;
  }
});

async function login() {
  const email = document.getElementById("email")?.value.trim();
  const senha = document.getElementById("senha")?.value;

  if (!email || !senha) {
    alert("Preencha email e senha.");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) {
      alert("Erro no login: " + error.message);
      return;
    }

    localStorage.setItem("agrocontrol_email", email);

    await carregarPerfil(data.user);
    mostrarApp();
  } catch (err) {
    alert("Falha ao entrar no sistema.");
    console.error(err);
  }
}

async function restaurarSessao() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Erro ao restaurar sessão:", error.message);
      return;
    }

    if (data?.session?.user) {
      await carregarPerfil(data.session.user);
      mostrarApp();
    }
  } catch (err) {
    console.error("Erro ao restaurar sessão:", err);
  }
}

async function carregarPerfil(user) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar profile:", error.message);
      aplicarPerfilFallback(user);
      return;
    }

    if (data) {
      aplicarPerfilNaTela({
        nome: data.full_name || user.email || "Usuário",
        funcao: normalizarFuncao(data.role),
        email: user.email || ""
      });
    } else {
      aplicarPerfilFallback(user);
    }
  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
    aplicarPerfilFallback(user);
  }
}

function aplicarPerfilFallback(user) {
  aplicarPerfilNaTela({
    nome: user?.email || "Usuário",
    funcao: "Dono",
    email: user?.email || ""
  });
}

function aplicarPerfilNaTela(perfil) {
  const topUserMeta = document.getElementById("topUserMeta");
  const topUserName = document.getElementById("topUserName");
  const sidebarUserName = document.getElementById("sidebarUserName");
  const sidebarUserRole = document.getElementById("sidebarUserRole");
  const bannerRole = document.getElementById("bannerRole");
  const userInitials = document.getElementById("userInitials");

  if (topUserName) topUserName.textContent = perfil.nome;
  if (sidebarUserName) sidebarUserName.textContent = perfil.nome;
  if (sidebarUserRole) sidebarUserRole.textContent = perfil.funcao;
  if (bannerRole) bannerRole.textContent = perfil.funcao;
  if (topUserMeta) topUserMeta.textContent = `${perfil.funcao} · Fazenda AgroControl`;
  if (userInitials) userInitials.textContent = gerarIniciais(perfil.nome);
}

function mostrarApp() {
  const login = document.getElementById("login");
  const app = document.getElementById("app");

  if (login) login.style.display = "none";
  if (app) app.style.display = "block";
}

function abrir(id) {
  const views = document.querySelectorAll(".view");
  views.forEach((view) => view.classList.add("hidden"));

  const alvo = document.getElementById(id);
  if (alvo) alvo.classList.remove("hidden");

  if (id === "mercado") renderMercadoCompleto();
  if (id === "clima") renderClimaCompleto();
  if (id === "financeiro") renderFinanceiroBase();
  if (id === "config") renderConfiguracoesBase();
}

function montarDashboard() {
  renderMercadoResumo();
  renderClimaResumo();
}

function renderMercadoResumo() {
  const mercadoCard = document.querySelector("#dashboard .card:nth-child(2)");
  if (!mercadoCard) return;

  const linhas = mercadoState
    .map((item) => {
      const seta = item.variacao >= 0 ? "↑" : "↓";
      return `<p>${item.nome} ${seta}</p>`;
    })
    .join("");

  mercadoCard.innerHTML = `
    <h3>Mercado</h3>
    ${linhas}
  `;
}

function renderMercadoCompleto() {
  const mercado = document.getElementById("mercado");
  if (!mercado) return;

  const itens = mercadoState
    .map((item) => {
      const seta = item.variacao >= 0 ? "↑" : "↓";
      const classe = item.variacao >= 0 ? "up" : "down";

      return `
        <div class="card" style="width:100%; margin-bottom:15px;">
          <h3>${item.nome}</h3>
          <p><strong>Valor:</strong> ${formatarMoeda(item.valor)} ${item.unidade}</p>
          <p class="${classe}"><strong>Variação:</strong> ${seta} ${Math.abs(item.variacao).toFixed(2)}%</p>
          <button onclick="verAnaliseMercado('${item.nome}')">Ver análise</button>
          <div id="analise-${slug(item.nome)}" class="hidden" style="margin-top:10px;">
            <p>Leitura de tendência de ${item.nome} ativada.</p>
          </div>
        </div>
      `;
    })
    .join("");

  mercado.innerHTML = `
    <h1>Mercado completo</h1>
    ${itens}
  `;
}

function verAnaliseMercado(nome) {
  const el = document.getElementById(`analise-${slug(nome)}`);
  if (el) el.classList.toggle("hidden");
}

function renderClimaResumo() {
  const temp = document.getElementById("temp");
  if (temp) temp.textContent = climaState.temp === "--" ? "--°" : `${climaState.temp}°`;
}

function renderClimaCompleto() {
  const clima = document.getElementById("clima");
  if (!clima) return;

  clima.innerHTML = `
    <h1>Clima detalhado</h1>
    <div class="card" style="width:100%; background: rgba(8,20,13,0.75);">
      <h3>${climaState.cidade}</h3>
      <p><strong>Temperatura:</strong> ${climaState.temp === "--" ? "--" : `${climaState.temp}°`}</p>
      <p><strong>Umidade:</strong> ${climaState.umidade === "--" ? "--" : `${climaState.umidade}%`}</p>
      <p><strong>Vento:</strong> ${climaState.vento === "--" ? "--" : `${climaState.vento} km/h`}</p>
      <p><strong>Status:</strong> ${climaState.status}</p>
      <button onclick="carregarClima(true)">Atualizar clima</button>
    </div>
  `;
}

async function carregarClima(mostrarAviso = false) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${climaState.latitude}&longitude=${climaState.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data?.current) {
      throw new Error("Sem dados de clima");
    }

    climaState.temp = Math.round(Number(data.current.temperature_2m));
    climaState.umidade = Math.round(Number(data.current.relative_humidity_2m));
    climaState.vento = Math.round(Number(data.current.wind_speed_10m));
    climaState.status = definirStatusAplicacao(climaState.vento, climaState.umidade);

    renderClimaResumo();

    const climaViewAberta = !document.getElementById("clima")?.classList.contains("hidden");
    if (climaViewAberta) renderClimaCompleto();

    if (mostrarAviso) {
      alert("Clima atualizado.");
    }
  } catch (err) {
    console.error("Erro ao carregar clima:", err);
    if (mostrarAviso) {
      alert("Não foi possível atualizar o clima agora.");
    }
  }
}

function definirStatusAplicacao(vento, umidade) {
  if (vento <= 18 && umidade >= 55) return "Pode aplicar";
  if (vento <= 22 && umidade >= 45) return "Aplicar com atenção";
  return "Não recomendado agora";
}

function renderFinanceiroBase() {
  const financeiro = document.getElementById("financeiro");
  if (!financeiro) return;

  financeiro.innerHTML = `
    <h1>Financeiro</h1>
    <div class="card" style="width:100%;">
      <p><strong>Entradas:</strong> R$ 0,00</p>
      <p><strong>Saídas:</strong> R$ 0,00</p>
      <p><strong>Saldo:</strong> R$ 0,00</p>
      <button onclick="alert('Área financeira pronta para integrar com financial_transactions.')">Ver análise</button>
    </div>
  `;
}

function renderConfiguracoesBase() {
  const config = document.getElementById("config");
  if (!config) return;

  config.innerHTML = `
    <h1>Configurações</h1>

    <div class="card" style="width:100%; margin-bottom:15px;">
      <h3>Mercado</h3>
      <p>Área pronta para alterar valores, adicionar itens e controlar o que aparece no dashboard.</p>
    </div>

    <div class="card" style="width:100%; margin-bottom:15px;">
      <h3>Clima</h3>
      <p>Área pronta para mudar cidade, coordenadas e regras de aplicação.</p>
    </div>

    <div class="card" style="width:100%;">
      <h3>Fazenda</h3>
      <p>Área pronta para editar nome da fazenda, banner e perfil do sistema.</p>
    </div>
  `;
}

function normalizarFuncao(role) {
  const valor = String(role || "").toLowerCase();

  if (valor === "dono" || valor === "owner" || valor === "admin") return "Dono";
  if (valor === "gerente" || valor === "manager") return "Gerente";
  return "Funcionário";
}

function gerarIniciais(nome) {
  return String(nome)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() || "")
    .join("");
}

function slug(texto) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
