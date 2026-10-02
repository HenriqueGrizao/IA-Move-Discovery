# IA-Movie-Discovery

Um sistema que integra os catálogos das plataformas Netflix, Amazon Prime Video, Disney+ e Hulu, sugerindo títulos com base na compatibilidade entre sinopses e gêneros.

## 1. INTRODUÇÃO

Um problema enfrentado por muitos usuários de streaming é gastar mais tempo navegando entre catálogos e menus para decidir o que assistir do que, de fato, aproveitando os filmes e séries. Com o crescimento de plataformas de streaming e títulos disponíveis, encontrar algo interessante tornou-se uma tarefa cansativa.

Para solucionar esse problema, desenvolvemos o IA Movie Discovery, uma aplicação inteligente que utiliza análise de dados e técnicas de Aprendizado de Máquina para mapear conexões entre filmes e séries, assim oferecendo recomendações personalizadas. O sistema integra os catálogos das plataformas Netflix, Amazon Prime Video, Disney+ e Hulu, sugerindo títulos com base na compatibilidade entre sinopses e gêneros, garantindo uma experiência de descoberta mais rápida, prática e eficiente para os usuários.

## 2. DESENVOLVIMENTO

### 2.1 Arquitetura do Sistema

O sistema foi desenvolvido conforme o modelo Cliente-Servidor, dividido em frontend, backend e módulo de inteligência artificial. A interface do usuário foi desenvolvida utilizando as tecnologias HTML5, CSS3 e JavaScript, que foram responsáveis pela interação visual e comunicação com o servidor.

No backend, foi utilizada uma API REST desenvolvida em Python. Para a manipulação e tratamento dos dados, utilizou-se a biblioteca Pandas, viabilizando o cruzamento e a organização de múltiplos datasets de filmes.

O motor de inteligência artificial foi configurado com a biblioteca Scikit-Learn, responsável pelo processamento vetorial dos dados e cálculo de proximidade entre os filmes. Além disso, foi utilizado o Ngrok para configurar o tunelamento entre o frontend e o backend executado no Google Colab, possibilitando a comunicação por meio de chamadas assíncronas utilizando Fetch API.

### 2.2 Processamento de Dados

O sistema realiza a integração de quatro bases de dados, referentes às plataformas Netflix, Amazon Prime Video, Disney+ e Hulu, no formato CSV. Ao longo da execução, os títulos duplicados são unificados em um único registro, conservando as informações de todas as plataformas em que se encontra o conteúdo escolhido.

Para o processamento textual, foi aplicada a técnica de Processamento de Linguagem Natural (PLN) denominada TF-IDF (Term Frequency – Inverse Document Frequency). Essa técnica transforma descrições e gêneros dos filmes e séries, em matrizes numéricas de relevância, facilitando a identificação de relações entre os dados textuais. Além disso, palavras irrelevantes, conhecidas como stop words (por exemplo: “the”, “a” e “is”), são removidas para aprimorar a eficiência dessa análise.

### 2.3 IA - Algoritmo de Recomendação

O sistema de sugestões, a IA, utiliza o algoritmo KNN (K-Nearest Neighbors). Esse algoritmo é responsável pela identificação de filmes e séries semelhantes, através das características textuais analisadas pelo TF-IDF.

Para medir o grau de proximidade entre os filmes, foi implementada a Similaridade de Cosseno, técnica amplamente adotada em sistemas de recomendação textual. Essa abordagem foi escolhida pela sua eficiência na comparação de conteúdos textuais, visto que considera a direção dos vetores e diminui o impacto do tamanho das sinopses, possibilitando analisar similaridades de contexto mesmo entre descrições de tamanhos variados.

Assim, ao escrever um filme na nossa barra de pesquisa, o sistema faz o cálculo entre a proximidade em relação aos demais títulos da base de dados e retorna os filmes com maior grau de similaridade.

### 2.4 Referência da API (Endpoints)

| Endpoint | Método | Descrição | Parâmetros Esperados (JSON/Query) |
|---|---|---|---|
| `/lista_filmes` | GET | Retorna uma lista de todos os títulos únicos para alimentar o autocomplete. | N/A |
| `/lista_pessoas` | GET | Retorna uma lista unificada de todos os diretores e atores da base de dados para alimentar o autocomplete. | N/A |
| `/lista_generos` | GET | Retorna todos os gêneros únicos disponíveis no catálogo para alimentar o autocomplete | N/A |
| `/analisar_filme` | POST | Busca detalhes específicos (diretor e elenco) de um filme exato. | `{"filme": "Nome do Filme"}` |
| `/buscar_pessoa` | POST | Retorna filmes onde a pessoa buscada é diretor ou faz parte do elenco, filtrado por streaming. | `{"nome": "Nome", "plataformas": ["Netflix", ...]}` |
| `/recomendar` | POST | Motor de IA: Retorna 5 recomendações baseadas em similaridade de cosseno (KNN) + filtro de gênero. | `{"filme": "Nome", "plataformas": [...], "genero": "Opcional"}` |
| `/buscar_sinopse` | POST | Realiza uma busca textual simples dentro das descrições/enredos de todos os filmes. | `{"texto": "termo de busca"}` |
| `/buscar_ano_genero` | POST | Filtra produções por um intervalo de anos e uma categoria específica. | `{"ano_inicio": 2010, "ano_fim": 2024, "genero": "Ação"}` |

### 2.5 Guia de Instalação e Execução

Para a instalação e execução do AI Movie Discovery, devem ser seguidos os seguintes passos:

1. Clonar o repositório do projeto ou realizar o download dos arquivos;
2. Adicionar os arquivos no formato CSV condizentes as plataformas Netflix, Amazon Prime Video, Disney+ e Hulu no ambiente do Google Colab; 
3.  Executar o código em Python (arquivo  Knn.py) e esperar pela finalização do treinamento do modelo de inteligência artificial;;
4. Abrir o  arquivo indeex.html:

### 2.6 Funções adicionais

Além da recomendação de filmes e séries similares, através no título sugerido pelo usuário, o sistema também disponibiliza funcionalidades adicionais, tais como:

- Recomendação de títulos semelhantes filtrados por um gênero específico;
- Procura de filmes e séries por ator ou diretor;
- Pesquisa por gênero e período de lançamento;
- Busca com base em temas presentes na sinopse do filme ou série;
- Identificação do ator ou diretor relacionado a determinado título.

## 3. CONCLUSÃO 
O presente projeto teve como objetivo o desenvolvimento do IA Movie Discovery, um sistema de recomendação de filmes baseado em técnicas de Aprendizado de Máquina e Processamento de Linguagem Natural. A solução desenvolvida buscou melhorar a descoberta de conteúdos em plataformas de streaming, reduzindo o tempo gasto pelos usuários na busca por títulos e oferecendo recomendações rápidas e relevantes.
A partir da integração de diferentes bases de dados e do uso de técnicas como TF-IDF e Similaridade de Cosseno em conjunto com o algoritmo KNN, foi possível o desenvolvimento de um modelo qualificado para identificar relações entre os títulos a partir de suas características textuais. Apesar de pequenos desafios pontuais relacionados à integração de dados, o sistema foi finalizado com sucesso.
Dessa forma, conclui-se que o sistema atende aos objetivos propostos, oferecendo uma solução eficiente e prática para a recomendação de filmes e séries em plataformas de streaming.





