# IMPORTAÇÃO DE BIBLIOTECAS

import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
import os

# 2. CARREGAMENTO E TRATAMENTO DOS DADOS

files = {
    'Netflix': 'datasets/netflix_titles.csv',
    'Amazon': 'datasets/amazon_prime_titles.csv',
    'Disney+': 'datasets/disney_plus_titles.csv',
    'Hulu': 'datasets/hulu_titles.csv'
}

dfs = []

for platform, file in files.items():
    if os.path.exists(file):
        temp_df = pd.read_csv(file) # Lê o CSV e trasforma em DataFrame
        temp_df['platform'] = platform # Adiciona coluna de plataforma no DataFrame
        dfs.append(temp_df) # Adiciona o DataFrame à lista de DataFrames
    else:
        print(f"Arquivo {file} não encontrado")

if not dfs:
    raise FileNotFoundError("Nenhum arquivo CSV encontrado. Verifique os nomes e seus caminhos.")
else:
    print("Começando treinamento do KNN com os dados disponíveis...")
    df_all = pd.concat(dfs, ignore_index=True) # Concatena todos os DataFrames em um único DataFrame

    # Agrupando títulos duplicados entre plataformas
    df_grouped = df_all.groupby('title').agg({
        'type': 'first',
        'director': 'first',
        'cast': 'first',
        'release_year': 'first',
        'listed_in': 'first',
        'description': 'first',
        'platform': lambda x: list(set(x)) # Agrupa as plataformas
    }).reset_index()

    # Preparando IA (KNN) para recomendações
    df_grouped['features'] = (
        df_grouped['listed_in'].fillna('') + " " +
        df_grouped['listed_in'].fillna('') + " " + # Aumenta o peso do gênero
        df_grouped['description'].fillna('') + " " +
        df_grouped['director'].fillna('') + " " +
        df_grouped['type'].fillna('')
    )

    # Vetorização TF-IDF
    tfidf = TfidfVectorizer(stop_words='english', max_features=5000)
    tfidf_matrix = tfidf.fit_transform(df_grouped['features'])

    model_knn = NearestNeighbors(metric='cosine', algorithm='brute')
    model_knn.fit(tfidf_matrix)

    print(f"KNN treinado! {len(df_grouped)} títulos analisados.")

# 3. ROTA E SERVIDOR
app = Flask(__name__)
CORS(app)


# --- ROTA: AUTOCOMPLETE DE FILMES ---

@app.route('/lista_filmes', methods=['GET'])
def api_lista_filmes():
    return jsonify(sorted(df_grouped['title'].unique().tolist()))

# --- ROTA: AUTOCOMPLETE DE PESSOAS ---

@app.route('/lista_pessoas', methods=['GET'])
def api_lista_pessoas():
    # Extrai diretores
    diretores = df_grouped['director'].dropna().unique().tolist()

    # Extrai atores
    atores_raw = df_grouped['cast'].dropna().unique().tolist()
    todos_atores = []
    for cast in atores_raw:
        todos_atores.extend([nome.strip() for nome in cast.split(',')])

    # Remove duplicados e ordena
    lista_completa = sorted(list(set(diretores + todos_atores)))
    return jsonify(lista_completa)

# --- RETORNA A FICHA DO FILME ---

@app.route('/analisar_filme', methods=['POST'])
def api_analisar():
    dados = request.json
    titulo_busca = (dados.get('filme') or "").strip().lower()
    match = df_grouped[df_grouped['title'].str.lower() == titulo_busca]

    if match.empty:
        return jsonify({"status": "erro", "mensagem": "Filme não encontrado."}), 404

    filme = match.iloc[0] # trasfomra em um dicionário
    diretor = filme['director'] if pd.notna(filme['director']) else "Diretor desconhecido"
    elenco_raw = filme['cast'] if pd.notna(filme['cast']) else ""
    elenco = [nome.strip() for nome in elenco_raw.split(',')] if elenco_raw else []

    return jsonify({
        "status": "sucesso",
        "titulo": filme['title'],
        "diretor": diretor,
        "elenco": elenco
    })

# --- BUSCAR FILMES POR PESSOAS ---
@app.route('/buscar_pessoa', methods=['POST'])
def api_buscar_pessoa():
    dados = request.json
    nome_pesquisado = dados.get('nome', '').lower().strip()
    plataformas_usuario = dados.get('plataformas', [])

    # Busca o nome tanto no diretor quanto no elenco
    df_pessoa = df_grouped[
        (df_grouped['director'].str.lower().str.contains(nome_pesquisado, na=False)) |
        (df_grouped['cast'].str.lower().str.contains(nome_pesquisado, na=False))
    ]

    lista_filmes = []
    for _, row in df_pessoa.iterrows():
        comuns = [p for p in row['platform'] if p in plataformas_usuario]
        if comuns:
            lista_filmes.append({
                "titulo": row['title'],
                "ano": int(row['release_year']) if pd.notna(row['release_year']) else "N/A",
                "genero": row['listed_in'],
                "plataformas": comuns,
                "diretor": row['director'],
                "elenco": row['cast'],
                "sinopse": row['description'] if pd.notna(row['description']) else "Sinopse não disponível."
            })

    if not lista_filmes:
        return jsonify({"status": "vazio", "mensagem": "Nenhum filme encontrado para esta pessoa."})

    return jsonify({"status": "sucesso", "nome": nome_pesquisado.title(), "filmes": lista_filmes})

# ---RECOMENDAÇÃO IA ---
@app.route('/recomendar', methods=['POST'])
def api_recomendar():
    dados = request.json
    nome_filme = (dados.get('filme') or "").strip().lower()
    plataformas_usuario = dados.get('plataformas', [])
    genero_alvo = (dados.get('genero') or "").lower()

    match = df_grouped[df_grouped['title'].str.lower() == nome_filme]
    if match.empty:
        return jsonify({"status": "erro", "mensagem": "Filme não encontrado."}), 404

    idx_alvo = match.index[0]
    # Buscamos mais vizinhos para garantir que acharemos o gênero dentro deles
    distancias, indices = model_knn.kneighbors(tfidf_matrix[idx_alvo], n_neighbors=150)

    recomendacoes = []
    for idx in indices.flatten()[1:]: # Ignora o primeiro, que é o próprio filme
        rec = df_grouped.iloc[idx]

        # FILTRO 1: Plataforma / retorna true ou false
        comuns = [p for p in rec['platform'] if p in plataformas_usuario]

        # FILTRO 2: Gênero (se o usuário escolheu um) / retorna true ou false
        passou_genero = not genero_alvo or (genero_alvo in rec['listed_in'].lower())

        if comuns and passou_genero:
            recomendacoes.append({
                "titulo": rec['title'],
                "ano": int(rec['release_year']) if pd.notna(rec['release_year']) else "N/A",
                "plataformas": comuns,
                "genero": rec['listed_in'],
                "sinopse": rec['description']
            })

        if len(recomendacoes) == 5:
            break

    return jsonify({
        "status": "sucesso",
        "original": {
            "titulo": match.iloc[0]['title'],
            "sinopse": match.iloc[0]['description'],
            "plataformas": match.iloc[0]['platform'],
            "usuario_possui": any(p in plataformas_usuario for p in match.iloc[0]['platform'])
        },
        "recomendacoes": recomendacoes
    })

# --- BUSCAR POR SINOPSE ---
@app.route('/buscar_sinopse', methods=['POST'])
def api_buscar_sinopse():
    dados = request.json
    termo_busca = (dados.get('texto') or "").strip().lower()

    if not termo_busca:
        return jsonify({"status": "erro", "mensagem": "Digite algo!"})

    # Busca em todas as linhas do dataset
    mask = df_grouped['description'].str.lower().str.contains(termo_busca, na=False)
    df_res = df_grouped[mask]

    lista_filmes = []
    for _, row in df_res.head(30).iterrows():  # Limite de 30 para ser rápido
        lista_filmes.append({
            "titulo": row['title'],
            "ano": int(row['release_year']) if pd.notna(row['release_year']) else "N/A",
            "genero": row['listed_in'],
            "plataformas": row['platform'],  # Mostra em quais ele está disponível
            "sinopse": row['description']
        })

    return jsonify({"status": "sucesso", "filmes": lista_filmes})

# --- LISTAR GÊNEROS ÚNICOS (UTILIZADO NO SELECT DO SITE) ---
@app.route('/lista_generos', methods=['GET'])
def api_lista_generos():
    if 'listed_in' in df_grouped.columns:
        generos_raw = df_grouped['listed_in'].dropna().str.split(', ')
        # Explode a lista de listas em uma lista única e remove duplicatas
        todos_generos = sorted(list(set([item for sublist in generos_raw for item in sublist])))
        return jsonify(todos_generos)
    return jsonify([])

# --- BUSCAR POR INTERVALO DE ANO E GÊNERO ---
@app.route('/buscar_ano_genero', methods=['POST'])
def api_buscar_ano_genero():
    dados = request.json
    try:
        ano_i = int(dados.get('ano_inicio', 1900))
        ano_f = int(dados.get('ano_fim', 2026))
        genero_alvo = dados.get('genero', '').lower()

        # Filtro por Ano
        mask = (df_grouped['release_year'] >= ano_i) & (df_grouped['release_year'] <= ano_f)

        # Filtro por Gênero (se selecionado)
        if genero_alvo:
            mask &= df_grouped['listed_in'].str.lower().str.contains(genero_alvo, na=False)

        df_filtrado = df_grouped[mask].sort_values(by='release_year', ascending=False)

        lista_filmes = []
        for _, row in df_filtrado.head(30).iterrows():
            lista_filmes.append({
                "titulo": row['title'],
                "ano": int(row['release_year']) if pd.notna(row['release_year']) else 0,
                "genero": row['listed_in'],
                "plataformas": row['platform'],
                "sinopse": row['description'] if pd.notna(row['description']) else ""
            })
        return jsonify({"status": "sucesso", "filmes": lista_filmes})
    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)})

# EXECUÇÃO

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)