// ===== Variáveis do app =====
let linhaAtual = null;     // linha que o usuário escolheu
let paradaAtual = null;    // parada escolhida no mapa
let previsoesOnibus = [];  // chegadas previstas, da mais próxima à mais distante
let timer = null;          // atualização automática

// ===== Elementos da página =====
const formBusca = document.getElementById("form-busca");
const inputBusca = document.getElementById("busca");
const statusTexto = document.getElementById("status");
const listaLinhas = document.getElementById("lista-linhas");
const info = document.getElementById("info");
const painelPartiu = document.getElementById("painel-partiu");
const semParada = document.getElementById("sem-parada");
const textoParada = document.getElementById("texto-parada");
const textoPrevisao = document.getElementById("texto-previsao");
const inputCaminhada = document.getElementById("minutos-caminhada");
const resultado = document.getElementById("resultado");
const botaoBusca = formBusca.querySelector("button");

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
  listaLinhas.innerHTML = "";
  botaoBusca.disabled = true;
  try {
    const linhas = await chamarApi("Linha/Buscar", { termosBusca: termo });
    mostrarLinhas(linhas);
  } catch (erro) {
    statusTexto.textContent = "Não foi possível buscar. Tente de novo.";
  } finally {
    botaoBusca.disabled = false;
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
  clearInterval(timer);
  linhaAtual = linha;
  paradaAtual = null;
  previsoesOnibus = [];
  painelPartiu.hidden = true;
  semParada.hidden = false;
  camadaParadas.clearLayers();
  camadaOnibus.clearLayers();
  listaLinhas.innerHTML = "";
  const destino = linha.sl === 1 ? linha.ts : linha.tp;
  statusTexto.textContent = "Linha " + linha.lt + "-" + linha.tl + " · Sentido: " + destino;
  info.textContent = "Carregando paradas e ônibus...";

  try {
    await carregarParadas(linha);
    if (linha !== linhaAtual) return;
    await atualizarOnibus();
  } catch (erro) {
    if (linha !== linhaAtual) return;
    statusTexto.textContent = "Erro ao carregar a linha. Busque e selecione novamente.";
  }

  // Atualiza sozinho a cada 15 segundos
  if (linha !== linhaAtual) return;
  timer = setInterval(atualizar, 15000);
}

async function carregarParadas(linha) {
  const paradas = await chamarApi("Parada/BuscarParadasPorLinha", {
    codigoLinha: linha.cl,
  });
  if (linha !== linhaAtual) return;

  const pontos = [];
  paradas.forEach((parada) => {
    const marcador = L.circleMarker([parada.py, parada.px], {
      radius: 7,
      color: "#405922",
      fillColor: "#c4f36b",
      fillOpacity: 0.9,
      weight: 2,
    }).addTo(camadaParadas);

    const nome = document.createElement("span");
    nome.textContent = parada.np;
    marcador.bindPopup(nome);
    marcador.on("click", () => selecionarParada(parada));
    pontos.push([parada.py, parada.px]);
  });

  if (pontos.length > 0) {
    mapa.fitBounds(pontos, { padding: [24, 24], maxZoom: 16 });
  } else {
    statusTexto.textContent = "Esta linha não tem paradas disponíveis na API. Tente outra linha.";
  }
}

async function atualizarOnibus() {
  const linha = linhaAtual;
  const dados = await chamarApi("Posicao/Linha", { codigoLinha: linha.cl });
  if (linha !== linhaAtual) return;
  const veiculos = dados && dados.vs ? dados.vs : [];

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

  info.textContent = veiculos.length + " ônibus ativos · Atualizado às " + (dados && dados.hr ? dados.hr : "—");
}

async function atualizar() {
  try {
    await atualizarOnibus();
  } catch (erro) {
    info.textContent = "Falha ao atualizar. Tentando de novo...";
  }
  await verificarPrevisao();
}

// ===== 3. Hora de sair =====
function selecionarParada(parada) {
  paradaAtual = parada;
  previsoesOnibus = [];
  semParada.hidden = true;
  painelPartiu.hidden = false;
  textoParada.textContent = parada.np;
  textoPrevisao.textContent = "Buscando previsão...";
  mostrarResultado();
  verificarPrevisao();
}

inputCaminhada.addEventListener("input", mostrarResultado);

async function verificarPrevisao() {
  if (paradaAtual === null) return;
  const parada = paradaAtual;
  const linha = linhaAtual;

  try {
    const dados = await chamarApi("Previsao", {
      codigoParada: parada.cp,
      codigoLinha: linha.cl,
    });
    // Ignora respostas antigas se a pessoa já trocou a linha ou a parada.
    if (parada !== paradaAtual || linha !== linhaAtual) return;
    const linhasDaParada = dados && dados.p && dados.p.l ? dados.p.l : [];
    const veiculos = linhasDaParada
      .filter((l) => String(l.cl) === String(linha.cl))
      .flatMap((l) => l.vs || []);

    previsoesOnibus = veiculos
      .map((veiculo) => ({ minutos: minutosAte(dados.hr, veiculo.t), chegada: veiculo.t }))
      .filter((previsao) => Number.isFinite(previsao.minutos))
      .sort((a, b) => a.minutos - b.minutos);

    textoPrevisao.textContent = previsoesOnibus.length === 0
      ? "A SPTrans ainda não informou horários de chegada para esta linha nesta parada. Nova consulta em 15 segundos."
      : previsoesOnibus.slice(0, 2).map((previsao, indice) =>
        (indice === 0 ? "Próximo ônibus em " : "Seguinte em ") +
        previsao.minutos + " min (" + previsao.chegada + ")."
      ).join(" ");
  } catch (erro) {
    if (parada !== paradaAtual || linha !== linhaAtual) return;
    previsoesOnibus = [];
    textoPrevisao.textContent = "Não foi possível consultar a previsão. Tentaremos novamente em 15 segundos.";
  }
  mostrarResultado();
}

function mostrarResultado() {
  resultado.className = "resultado";
  if (previsoesOnibus.length === 0) {
    resultado.textContent = "Aguardando uma previsão para calcular a hora de sair.";
    return;
  }

  const caminhada = Number(inputCaminhada.value);
  if (inputCaminhada.value.trim() === "" || !Number.isInteger(caminhada) || caminhada < 0) {
    resultado.textContent = "Informe um tempo de caminhada válido: 0 ou mais minutos inteiros.";
    return;
  }

  // Escolhe o primeiro ônibus que dê tempo de pegar com 2 minutos de segurança.
  const previsao = previsoesOnibus.find((onibus) => onibus.minutos >= caminhada + 2);
  if (!previsao) {
    resultado.textContent = previsoesOnibus.length === 1
      ? "Não dá tempo de pegar este ônibus com os 2 minutos de segurança. A SPTrans ainda não informou a chegada do seguinte para calcular sua saída."
      : "Não dá tempo de pegar os ônibus previstos com os 2 minutos de segurança. Aguardando o horário do próximo que dê tempo de pegar para calcular sua saída.";
    return;
  }

  const tempoParaSair = previsao.minutos - caminhada - 2;
  const proximo = " para pegar o próximo ônibus (" + previsao.chegada + ").";
  resultado.classList.add("pronto");
  if (tempoParaSair <= 0) {
    resultado.textContent = "SAIA AGORA" + proximo;
    resultado.classList.add("agora");
  } else {
    resultado.textContent = "Saia daqui a " + tempoParaSair + (tempoParaSair === 1 ? " minuto" : " minutos") + proximo;
  }
}

// Diferença em minutos entre dois horários no formato "HH:MM"
function minutosAte(horaAtual, horaChegada) {
  const formato = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!formato.test(horaAtual) || !formato.test(horaChegada)) return NaN;
  const [h1, m1] = horaAtual.split(":").map(Number);
  const [h2, m2] = horaChegada.split(":").map(Number);
  let diferenca = h2 * 60 + m2 - (h1 * 60 + m1);
  if (diferenca < -12 * 60) {
    diferenca += 24 * 60; // passou da meia-noite
  }
  return Math.max(0, diferenca); // uma previsão recém-passada pede saída imediata
}
