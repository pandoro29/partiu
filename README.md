# partiu!

Trabalho acadêmico de Application Development da FIAP. Um app simples para acompanhar ônibus de São Paulo e saber quando sair para o ponto.

## O que faz
1. Busca linhas pelo número ou nome (ex: `8000`, `Lapa`).
2. Mostra no mapa as paradas da linha e a posição dos ônibus (♿ = acessível), atualizando a cada 15 segundos.
3. Ao tocar em uma parada, consulta a previsão da linha selecionada e mostra as duas primeiras chegadas, quando disponíveis.
4. Você informa os minutos de caminhada, e o app escolhe, entre todas as chegadas informadas, o primeiro ônibus que permita chegar com 2 minutos de segurança. O cálculo é: **tempo para sair = minutos até o ônibus escolhido − caminhada − 2 minutos de segurança**.
5. Se o tempo para sair for zero, mostra **SAIA AGORA**. Se for positivo, mostra **Saia daqui a X minutos**, com o horário do ônibus escolhido. Quando não dá tempo de pegar o primeiro, considera os seguintes.
6. Se não houver previsão ou nenhum dos ônibus informados puder ser alcançado com a margem de segurança, avisa e aguarda novas previsões, sem sugerir um horário de saída.

Exemplo: ônibus em 12 minutos e caminhada de 5 minutos → **Saia daqui a 5 minutos**. Se o primeiro chegar em 3 minutos e o seguinte em 17 minutos, com a mesma caminhada → **Saia daqui a 10 minutos**, para pegar o seguinte. O resultado muda ao editar a caminhada e nas consultas automáticas a cada 15 segundos.

O app não calcula o tempo do ônibus pela distância nem pela quantidade de pontos: utiliza os horários fornecidos pela SPTrans. A posição de um veículo no mapa não garante uma previsão de chegada para a parada selecionada. Se a API não informar a chegada do seguinte, ainda não é possível calcular quando sair para pegá-lo.

## Tecnologias
HTML, CSS e JavaScript, mapa com Leaflet. Uma função em `api/olhovivo.js` faz o login na API da SPTrans e guarda o token em segredo.

## Como executar
1. Instale o Node.js (versão 20 ou superior) e obtenha um token na [área de desenvolvedores da SPTrans](https://www.sptrans.com.br/desenvolvedores/).
2. No arquivo `.env` da raiz, configure `SPTRANS_TOKEN=seu_token` com o token autorizado.
3. Na pasta do projeto, rode `npx vercel dev` e abra o endereço mostrado no terminal. A CLI pode pedir login e a vinculação a um projeto Vercel no primeiro uso; o comando inicia o ambiente local, sem publicar.

É necessário usar esse servidor para executar `api/olhovivo.js`. Abrir `index.html` diretamente ou usar apenas o Live Server não executa a função da API.

O `.env` está no `.gitignore`. O frontend só chama `/api/olhovivo`; o token fica no servidor e nunca deve ser colocado no HTML ou no `script.js`.

## Entrega
1. Preencha `participantes.txt` com os nomes reais e a parte feita por cada integrante (grupo de até 3 pessoas). O modelo também tem espaço para o RM.
2. Envie a versão final dos arquivos para o [repositório no GitHub](https://github.com/pandoro29/CadeMeuOnibus), incluindo este README e o arquivo de participantes.
3. Na Vercel, importe esse repositório em **Add New → Project**, se ainda não estiver vinculado. Este projeto utiliza HTML/CSS/JavaScript e uma função em `api/olhovivo.js`.
4. Configure a variável de ambiente `SPTRANS_TOKEN` no projeto da Vercel para Production, com o token autorizado da SPTrans. Para testar versões Preview, configure-a também nesse ambiente. O `.env` local não é enviado ao GitHub.
5. Faça o deploy. Se alterar a variável depois de publicar, faça um novo deploy para aplicar a configuração. Consulte a [documentação de variáveis de ambiente da Vercel](https://vercel.com/docs/environment-variables).
6. Abra a URL publicada e teste a busca, a seleção de parada, o mapa, a previsão e o cálculo de saída, também no celular. Confira que o professor consegue acessar o link sem precisar entrar na sua conta.
7. Entregue os dois links: **repositório do GitHub** e **aplicativo funcionando na Vercel**.

Cada integrante deve saber explicar qualquer parte do código, conforme o enunciado. Os créditos da SPTrans já aparecem no rodapé do app.

## Créditos
Dados: SPTrans (API Olho Vivo). Mapa: OpenStreetMap e Leaflet.
