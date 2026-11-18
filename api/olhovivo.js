// Função serverless do Vercel: faz a ponte entre o nosso site e a API Olho Vivo.
// Ela guarda o token em segredo (variável de ambiente) e faz o login por nós.

const BASE = "https://api.olhovivo.sptrans.com.br/v2.1";

// Só deixamos o site chamar estes endpoints
const PERMITIDOS = [
  "Linha/Buscar",
  "Parada/BuscarParadasPorLinha",
  "Posicao/Linha",
  "Previsao",
  "Previsao/Parada",
];

module.exports = async (req, res) => {
  // "caminho" diz qual endpoint queremos; o resto vai como parâmetro
  const { caminho, ...parametros } = req.query;

  if (!PERMITIDOS.includes(caminho)) {
    return res.status(400).json({ erro: "Endpoint não permitido" });
  }

  if (!process.env.SPTRANS_TOKEN) {
    return res.status(500).json({ erro: "Configure SPTRANS_TOKEN no servidor." });
  }
  res.setHeader("Cache-Control", "no-store");

  try {
    // 1) Login: a API devolve um cookie de sessão
    const login = await fetch(
      BASE + "/Login/Autenticar?token=" + encodeURIComponent(process.env.SPTRANS_TOKEN),
      { method: "POST" }
    );
    const cookie = login.headers.get("set-cookie");
    const autenticado = login.ok && await login.json();
    if (autenticado !== true || !cookie) {
      return res.status(401).json({ erro: "Falha no login. Confira o token." });
    }

    // 2) Chamada de verdade, enviando o cookie
    const query = new URLSearchParams(parametros).toString();
    const resposta = await fetch(BASE + "/" + caminho + "?" + query, {
      headers: { Cookie: cookie.split(";")[0] },
    });
    if (!resposta.ok) {
      return res.status(502).json({ erro: "Não foi possível consultar a SPTrans." });
    }
    const dados = await resposta.json();

    res.status(200).json(dados);
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao falar com a SPTrans" });
  }
};
