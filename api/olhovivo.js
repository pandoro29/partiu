// Função serverless do Vercel: faz a ponte entre o nosso site e a API Olho Vivo.
// Ela guarda o token em segredo (variável de ambiente) e faz o login por nós.

const BASE = "https://api.olhovivo.sptrans.com.br/v2.1";

// Só deixamos o site chamar estes endpoints
const PERMITIDOS = [
  "Linha/Buscar",
  "Parada/BuscarParadasPorLinha",
  "Posicao/Linha",
  "Previsao/Parada",
];

module.exports = async (req, res) => {
  // "caminho" diz qual endpoint queremos; o resto vai como parâmetro
  const { caminho, ...parametros } = req.query;

  if (!PERMITIDOS.includes(caminho)) {
    return res.status(400).json({ erro: "Endpoint não permitido" });
  }

  try {
    // 1) Login: a API devolve um cookie de sessão
    const login = await fetch(
      BASE + "/Login/Autenticar?token=" + process.env.SPTRANS_TOKEN,
      { method: "POST" }
    );
    const cookie = login.headers.get("set-cookie");
    if (!cookie) {
      return res.status(401).json({ erro: "Falha no login. Confira o token." });
    }

    // 2) Chamada de verdade, enviando o cookie
    const query = new URLSearchParams(parametros).toString();
    const resposta = await fetch(BASE + "/" + caminho + "?" + query, {
      headers: { Cookie: cookie.split(";")[0] },
    });
    const dados = await resposta.json();

    res.status(200).json(dados);
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao falar com a SPTrans" });
  }
};
