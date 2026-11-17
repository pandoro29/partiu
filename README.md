# Onde está meu ônibus?

App web simples que mostra no mapa, em tempo real, os ônibus de uma linha de São Paulo e avisa quando o ônibus estiver chegando a uma parada.

## O que faz
1. Busca linhas pelo número ou nome (ex: `8000`, `Lapa`).
2. Mostra no mapa as paradas da linha e a posição dos ônibus (♿ = acessível), atualizando a cada 15 segundos.
3. Ao tocar numa parada, mostra a previsão do próximo ônibus e permite ligar um aviso para quando faltarem 3, 5 ou 10 minutos.

## Tecnologias
HTML, CSS e JavaScript, mapa com Leaflet. Uma função em `api/olhovivo.js` faz o login na API da SPTrans e guarda o token em segredo.

## Como executar
1. Gere um token na área de desenvolvedores da SPTrans.
2. Crie um arquivo `.env` na raiz com: `SPTRANS_TOKEN=seu_token`
3. Rode `npx vercel dev` e abra o endereço mostrado no terminal.

## Deploy no Vercel
Importe o repositório e, em *Settings > Environment Variables*, crie `SPTRANS_TOKEN` com o seu token. Depois faça o deploy.

## Créditos
Dados: SPTrans (API Olho Vivo). Mapa: OpenStreetMap e Leaflet.
