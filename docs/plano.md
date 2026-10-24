# Plano técnico

Decisões e pesquisa sobre as próximas integrações (24/10/2026).

1. Importação de dados: precisa de LLM?
Planilha (CSV): não precisa. Já funciona hoje, tudo no navegador.
Foto da ficha: precisa de um modelo de visão que leia a imagem, inclusive letra de mão, e devolva os campos preenchidos. Recomendo a API da Claude com o modelo Haiku, que é o mais barato. Com saída estruturada, ele devolve exatamente nome, telefone, nascimento e endereço. O custo por ficha é baixo, mas é cobrado por uso, então eu limitaria a quantidade de fotos por plano.
Alternativa grátis: o Tesseract (OCR). Ele lê bem texto impresso e mal letra de mão, que é o normal em fichas de igreja. Não vale a pena.
2. Posição no mapa: tem API gratuita?
Tem, e dá para combinar duas:

BrasilAPI, que é grátis: https://brasilapi.com.br/api/cep/v2/{cep} devolve o endereço e, quando tem, latitude e longitude. Nem todo CEP vem com coordenada.
Nominatim (OpenStreetMap), que também é grátis, como plano B quando o CEP vier sem coordenada. O limite é 1 requisição por segundo, então não serve para geocodificar em massa a cada acesso.
O jeito certo é calcular a coordenada uma vez, ao salvar o membro, e gravar no banco. Na importação de centenas de fichas, isso roda em fila, aos poucos.

Um detalhe: os servidores de mapa do OpenStreetMap, que o mapa usa hoje para desenhar as imagens, também têm política de uso justo. Para produção com muitas igrejas, vale um provedor com plano grátis, como o MapTiler. É uma troca de uma linha.

3. Neon + Clerk
Boa combinação. Uma vantagem do Clerk aqui são as Organizations: cada igreja vira uma organização, e os usuários dela (secretaria, tesouraria, pastor) são membros com papéis. Isso resolve o multi-igreja e os níveis de acesso que já aparecem na tela de Configurações.

4. WhatsApp com Evolution API: ainda é instável?
Resumindo o que encontrei:

A Evolution tem dois modos. O modo Baileys é o grátis, conectado por QR Code. Ele não é oficial, viola os termos do WhatsApp e corre risco de banimento do número. Os relatos de 2026 indicam que a Meta está mais rigorosa com esse tipo de ferramenta.
Ele também quebra quando a Meta atualiza o protocolo e exige o celular conectado.
A Evolution também funciona com a Cloud API oficial da Meta. Ela é estável e sem risco de banimento, mas cobra por conversa e as mensagens automáticas precisam de modelos aprovados.
A Evolution precisa de servidor próprio (Docker, numa VPS). Não roda na Vercel junto com o Next.
Minha recomendação: fazer a integração com a Evolution, que suporta os dois modos, e começar no Baileys com limites conservadores. Para um sistema de igreja, isso significa poucas mensagens por dia, enviadas para contatos que conhecem o número, o que reduz o risco. Na tela de WhatsApp eu deixaria um aviso claro de que o número da igreja pode ser bloqueado. Para igrejas maiores, ou num plano mais caro, ofereceríamos a API oficial. A troca é só de configuração, não de código.
Ordem que sugiro

Neon + Prisma: schema, migrations e seed.
Clerk: login, organizações (igrejas) e papéis.
Trocar a store por Server Actions lendo e gravando no banco.
Geocodificação: BrasilAPI com Nominatim de reserva.
Importação por foto com a API da Claude.
WhatsApp via Evolution.