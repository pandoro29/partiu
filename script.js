// ===== Variáveis do app =====
let linhaAtual = null;     // linha que o usuário escolheu
let paradaAtual = null;    // parada escolhida para o alerta
let alertaAtivo = false;   // o alerta está ligado?
let timer = null;          // atualização automática

// ===== Elementos da página =====
const formBusca = document.getElementById("form-busca");
const inputBusca = document.getElementById("busca");
const statusTexto = document.getElementById("status");
const listaLinhas = document.getElementById("lista-linhas");
const info = document.getElementById("info");
const painelAlerta = document.getElementById("painel-alerta");
const textoParada = document.getElementById("texto-parada");
const textoPrevisao = document.getElementById("texto-previsao");
const selectMinutos = document.getElementById("minutos");
const botaoAlerta = document.getElementById("botao-alerta");

// ===== Mapa (Leaflet) =====
const mapa = L.map("mapa").setView([-23.55, -46.63], 12); // centro de São Paulo
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
}).addTo(mapa);

// Camadas separadas para poder limpar ônibus sem apagar as paradas
const camadaParadas = L.layerGroup().addTo(mapa);
const camadaOnibus = L.layerGroup().addTo(mapa);

// ===== Falar com a API (através da nossa função em /api) =====
async function chamarApi(caminho, parametros) {
  const params = new URLSearchParams({ caminho: caminho, ...parametros });
  const resposta = await fetch("/api/olhovivo?" + params);
  if (!resposta.ok) {
    throw new Error("Erro " + resposta.status);
  }
  return resposta.json();
}

// ===== 1. Buscar linhas =====
formBusca.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // não recarregar a página
  const termo = inputBusca.value.trim();
  if (termo === "") return;

  statusTexto.textContent = "Buscando linhas...";
  try {
    const linhas = await chamarApi("Linha/Buscar", { termosBusca: termo });
    mostrarLinhas(linhas);
  } catch (erro) {
    statusTexto.textContent = "Não foi possível buscar. Tente de novo.";
  }
});

function mostrarLinhas(linhas) {
  listaLinhas.innerHTML = "";

  if (linhas.length === 0) {
    statusTexto.textContent = "Nenhuma linha encontrada.";
    return;
  }

  statusTexto.textContent = "Escolha uma linha:";
  linhas.forEach((linha) => {
    // sl = 1: do terminal principal ao secundário; sl = 2: o contrário
    const origem = linha.sl === 1 ? linha.tp : linha.ts;
    const destino = linha.sl === 1 ? linha.ts : linha.tp;

    const item = document.createElement("li");
    const botao = document.createElement("button");
    botao.textContent = linha.lt + "-" + linha.tl + "  " + origem + " → " + destino;
    botao.addEventListener("click", () => escolherLinha(linha));

    item.appendChild(botao);
    listaLinhas.appendChild(item);
  });
}

// ===== 2. Escolher a linha e mostrar no mapa =====
async function escolherLinha(linha) {
  linhaAtual = linha;
  paradaAtual = null;
  alertaAtivo = false;
  painelAlerta.hidden = true;
  camadaParadas.clearLayers();
  camadaOnibus.clearLayers();
  listaLinhas.innerHTML = "";
  statusTexto.textContent = "Linha " + linha.lt + "-" + linha.tl;

  try {
    await carregarParadas();
    await atualizarOnibus();
  } catch (erro) {
    statusTexto.textContent = "Erro ao carregar a linha.";
  }

  // Atualiza sozinho a cada 15 segundos
  clearInterval(timer);
  timer = setInterval(atualizar, 15000);
}

async function carregarParadas() {
  const paradas = await chamarApi("Parada/BuscarParadasPorLinha", {
    codigoLinha: linhaAtual.cl,
  });

  const pontos = [];
  paradas.forEach((parada) => {
    const marcador = L.circleMarker([parada.py, parada.px], {
      radius: 5,
      color: "#1565c0",
    }).addTo(camadaParadas);

    marcador.bindPopup(parada.np);
    marcador.on("click", () => selecionarParada(parada));
    pontos.push([parada.py, parada.px]);
  });

  if (pontos.length > 0) {
    mapa.fitBounds(pontos); // enquadra todas as paradas na tela
  }
}

async function atualizarOnibus() {
  const dados = await chamarApi("Posicao/Linha", { codigoLinha: linhaAtual.cl });
  const veiculos = dados.vs || [];

  camadaOnibus.clearLayers();
  veiculos.forEach((v) => {
    // v.a = true quando o ônibus é acessível
    const icone = L.divIcon({
      html: v.a ? "🚌♿" : "🚌",
      className: "icone-onibus",
      iconSize: [40, 20],
    });
    L.marker([v.py, v.px], { icon: icone }).addTo(camadaOnibus);
  });

  info.textContent = veiculos.length + " ônibus ativos | atualizado às " + dados.hr;
}

async function atualizar() {
  try {
    await atualizarOnibus();
    await verificarPrevisao();
  } catch (erro) {
    info.textContent = "Falha ao atualizar. Tentando de novo...";
  }
}

// ===== 3. Alerta de chegada =====
function selecionarParada(parada) {
  paradaAtual = parada;
  alertaAtivo = false;
  botaoAlerta.textContent = "Avisar-me";
  painelAlerta.hidden = false;
  textoParada.textContent = "Parada: " + parada.np;
  textoPrevisao.textContent = "Buscando previsão...";
  verificarPrevisao();
}

botaoAlerta.addEventListener("click", () => {
  alertaAtivo = !alertaAtivo; // liga ou desliga
  botaoAlerta.textContent = alertaAtivo ? "Cancelar aviso" : "Avisar-me";
  verificarPrevisao();
});

async function verificarPrevisao() {
  if (paradaAtual === null) return;

  const dados = await chamarApi("Previsao/Parada", { codigoParada: paradaAtual.cp });
  const linhasDaParada = dados.p && dados.p.l ? dados.p.l : [];

  // A parada pode ter várias linhas; queremos só a que escolhemos
  const daLinha = linhasDaParada.find((l) => l.cl === linhaAtual.cl);

  if (!daLinha || daLinha.vs.length === 0) {
    textoPrevisao.textContent = "Sem previsão para esta linha agora.";
    return;
  }

  const chegada = daLinha.vs[0].t; // horário previsto do próximo ônibus
  const minutos = minutosAte(dados.hr, chegada);
  textoPrevisao.textContent = "Próximo ônibus em " + minutos + " min (" + chegada + ")";

  if (alertaAtivo && minutos <= Number(selectMinutos.value)) {
    alertaAtivo = false;
    botaoAlerta.textContent = "Avisar-me";
    alert("Seu ônibus " + linhaAtual.lt + "-" + linhaAtual.tl + " chega em " + minutos + " min!");
  }
}

// Diferença em minutos entre dois horários no formato "HH:MM"
function minutosAte(horaAtual, horaChegada) {
  const [h1, m1] = horaAtual.split(":").map(Number);
  const [h2, m2] = horaChegada.split(":").map(Number);
  let diferenca = h2 * 60 + m2 - (h1 * 60 + m1);
  if (diferenca < 0) {
    diferenca += 24 * 60; // passou da meia-noite
  }
  return diferenca;
}
