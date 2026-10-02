// Configurações iniciais
const BASE_URL = "http://127.0.0.1:5000";

const headersPadrao = {
    'Content-Type': 'application/json',
};

let filmesCache = [];
let pessoasCache = [];

// Carrega dados iniciais
async function carregarDadosIniciais() {
    try {
        //  carrega Filmes, Pessoas e também preenche os Gêneros
        const [resFilmes, resPessoas] = await Promise.all([
            fetch(`${BASE_URL}/lista_filmes`, { headers: headersPadrao }),
            fetch(`${BASE_URL}/lista_pessoas`, { headers: headersPadrao })
        ]);
        
        filmesCache = await resFilmes.json();
        pessoasCache = await resPessoas.json();
        
        configurarAutocompletes();
        carregarGeneros();
    } catch (e) {
        console.error("Erro na conexão:", e);
    }
}

// Garegar os gêneros para o select
async function carregarGeneros() {
    const selectGenero = document.getElementById('select-genero');
    if (!selectGenero) return;

    try {
        const res = await fetch(`${BASE_URL}/lista_generos`, { headers: headersPadrao });
        const generos = await res.json();
        
        selectGenero.innerHTML = '<option value="">Todos os Gêneros</option>';
        generos.forEach(g => {
            const option = document.createElement('option');
            option.value = g;
            option.innerText = g;
            selectGenero.appendChild(option);
        });
    } catch (e) {
        console.error("Erro ao carregar gêneros:", e);
    }
}

// Carrgar elenco e diretores para o autocomplete
function configurarAutocompletes() {
    const inFilme = document.getElementById('movieBase') || document.getElementById('input-filme-busca');
    const outFilme = document.getElementById('autocomplete-results') || document.getElementById('autocomplete-list-especifico');

    if (inFilme && outFilme) {
        inFilme.addEventListener('input', () => {
            const busca = inFilme.value.toLowerCase().trim();
            outFilme.innerHTML = "";
            if (busca.length >= 2) {
                const fit = filmesCache.filter(f => f.toLowerCase().includes(busca)).slice(0, 8);
                exibirSugestoes(fit, inFilme, outFilme);
            }
        });
    }

    const inPessoa = document.getElementById('input-pessoa');
    const outPessoa = document.getElementById('autocomplete-pessoa');

    if (inPessoa && outPessoa) {
        inPessoa.addEventListener('input', () => {
            const busca = inPessoa.value.toLowerCase().trim();
            outPessoa.innerHTML = "";
            if (busca.length >= 2) {
                const fit = pessoasCache.filter(p => p.toLowerCase().includes(busca)).slice(0, 8);
                exibirSugestoes(fit, inPessoa, outPessoa);
            }
        });
    }
}

// Formata e exibe as sugestões de autocomplete
function exibirSugestoes(lista, input, container) {
    if (lista.length > 0) {
        container.style.display = "block";
        lista.forEach(item => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerText = item;
            div.onclick = () => {
                input.value = item;
                container.style.display = "none";
            };
            container.appendChild(div);
        });
    } else {
        container.style.display = "none";
    }
}

// Pesquisa filmes similares por título
async function buscarFilmePorTitulo() {
    const input = document.getElementById('input-filme-busca');
    const container = document.getElementById('resultados-pesquisa');
    const checks = document.querySelectorAll('.plataforma-check:checked');
    const plataformas = Array.from(checks).map(c => c.value);

    if (!input?.value) return alert("Digite um filme!");
    if (plataformas.length === 0) return alert("Selecione um streaming!");

    container.innerHTML = "<p>A IA está analisando...</p>";

    try {
        const res = await fetch(`${BASE_URL}/recomendar`, {
            method: 'POST',
            headers: headersPadrao,
            body: JSON.stringify({ filme: input.value, plataformas: plataformas })
        });
        const data = await res.json();
        
        if (data.status === "sucesso") {
            container.innerHTML = `
                <div class="resultado-principal" style="grid-column: 1/-1; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
                    <h2 style="color: ${data.original.usuario_possui ? '#2ecc71' : '#e74c3c'}">${data.original.titulo}</h2>
                    <p>Disponível em: <strong>${data.original.plataformas.join(', ')}</strong></p>
                    <button class="btn-principal" style="width:auto;" onclick="abrirModal('${data.original.titulo}', '${data.original.sinopse.replace(/'/g, "\\'")}')">Sinopse</button>
                </div>
            `;
            data.recomendacoes.forEach(f => container.appendChild(criarCardFilme(f.titulo, f.ano, f.plataformas, f.sinopse, f.genero)));
        }
    } catch (e) { container.innerHTML = "<p>Erro na pesquisa de filme.</p>"; }
}

// pesquisa filmes similares por título e gênero específico
async function buscarSimilarPorGenero() {
    const inputFilme = document.getElementById('input-filme-busca');
    const selectGenero = document.getElementById('select-genero');
    const container = document.getElementById('resultados-pesquisa');
    const checks = document.querySelectorAll('.plataforma-check:checked');
    const plataformas = Array.from(checks).map(c => c.value);

    if (!inputFilme?.value) return alert("Digite um filme de referência!");
    if (plataformas.length === 0) return alert("Selecione pelo menos um streaming!");

    container.innerHTML = "<p>Buscando títulos similares com seu gênero preferido...</p>";

    try {
        const res = await fetch(`${BASE_URL}/recomendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                filme: inputFilme.value, 
                plataformas: plataformas,
                genero: selectGenero.value
            })
        });
        
        const data = await res.json();
        
        if (data.status === "sucesso") {
            if (data.recomendacoes.length === 0) {
                container.innerHTML = "<p>Não encontramos filmes similares neste gênero específico nas suas plataformas.</p>";
                return;
            }

            container.innerHTML = `
                <div class="resultado-principal" style="grid-column: 1/-1; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
                    <h2 style="color: ${data.original.usuario_possui ? '#2ecc71' : '#e74c3c'}">${data.original.titulo}</h2>
                    <p>Referência original disponível em: <strong>${data.original.plataformas.join(', ')}</strong></p>
                </div>
            `;
            
            data.recomendacoes.forEach(f => {
                container.appendChild(criarCardFilme(f.titulo, f.ano, f.plataformas, f.sinopse, f.genero));
            });
        } else {
            container.innerHTML = `<p>Erro: ${data.mensagem}</p>`;
        }
    } catch (e) { 
        console.error(e);
        container.innerHTML = "<p>Erro na conexão com o servidor.</p>"; 
    }
}

// Busca em qual filmes/series um ator ou diretor aparece
async function executarBuscaPessoa() {
    const nome = document.getElementById('input-pessoa')?.value.trim();
    const container = document.getElementById('resultados-pessoa');

    if (!nome) return alert("Digite um nome!");
    container.innerHTML = "<p>Buscando...</p>";

    try {
        const res = await fetch(`${BASE_URL}/buscar_pessoa`, {
            method: 'POST',
            headers: headersPadrao,
            body: JSON.stringify({ nome: nome, plataformas: ["Netflix", "Amazon", "Disney+", "Hulu"] })
        });
        const data = await res.json();

        if (data.status === "sucesso") {
            let eDiretor = data.filmes.some(f => f.diretor?.toLowerCase().includes(nome.toLowerCase()));
            let profissao = eDiretor ? "Diretor(a) e Ator/Atriz" : "Ator/Atriz";
            
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; margin-bottom: 20px;">
                <h2 style="color: #4facfe;">A pessoa "${data.nome}" é ${profissao}</h2></div>`;
            data.filmes.forEach(f => container.appendChild(criarCardFilme(f.titulo, f.ano, f.plataformas, f.sinopse, f.genero)));
        }
    } catch (e) { container.innerHTML = "<p>Erro ao buscar pessoa.</p>"; }
}

// Exibe os filmes lançados em um período específico e de um gênero específico
async function executarBuscaAnoGenero() {
    const anoInicio = document.getElementById('ano-inicio')?.value;
    const anoFim = document.getElementById('ano-fim')?.value;
    const genero = document.getElementById('select-genero')?.value;
    const container = document.getElementById('resultados-ano');

    if (!container) return;
    container.innerHTML = "<p>Filtrando filmes...</p>";

    try {
        const res = await fetch(`${BASE_URL}/buscar_ano_genero`, {
            method: 'POST',
            headers: headersPadrao,
            body: JSON.stringify({
                ano_inicio: anoInicio,
                ano_fim: anoFim,
                genero: genero
            })
        });
        const data = await res.json();

        if (data.status === "sucesso") {
            container.innerHTML = "";
            if (data.filmes.length === 0) {
                container.innerHTML = "<p>Nenhum filme encontrado para esse período/gênero.</p>";
                return;
            }
            data.filmes.forEach(f => container.appendChild(criarCardFilme(f.titulo, f.ano, f.plataformas, f.sinopse, f.genero)));
        }
    } catch (e) {
        container.innerHTML = "<p>Erro ao filtrar anos.</p>";
    }
}

// Traz o elenco e diretores de um filme/serie selecionado
async function analisarFilme() {
    const titulo = document.getElementById('movieBase')?.value;
    const container = document.getElementById('elenco-container');
    const areaElenco = document.getElementById('area-elenco');

    if (!titulo || !container) return alert("Selecione um filme!");

    try {
        const res = await fetch(`${BASE_URL}/analisar_filme`, {
            method: 'POST',
            headers: headersPadrao,
            body: JSON.stringify({ filme: titulo })
        });
        const data = await res.json();

        if (data.status === "sucesso") {
            container.innerHTML = "";
            areaElenco.style.display = "block";
            container.appendChild(criarTagPessoa(data.diretor + " (Diretor)", data.diretor));
            data.elenco.forEach(n => container.appendChild(criarTagPessoa(n, n)));
        }
    } catch (e) { console.error(e); }
}

// Busca em qual filmes/series um ator ou diretor aparece para o FILTRO.HTML
async function buscarFilmesPorPessoa(nome) {
    const checks = document.querySelectorAll('.streaming-options input:checked');
    const plataformas = Array.from(checks).map(c => c.value);
    const resultadoDiv = document.getElementById('conexoes-container');

    if (plataformas.length === 0) return alert("Selecione um streaming!");
    resultadoDiv.innerHTML = "<p>Buscando conexões...</p>";

    try {
        const res = await fetch(`${BASE_URL}/buscar_pessoa`, {
            method: 'POST',
            headers: headersPadrao,
            body: JSON.stringify({ nome: nome, plataformas: plataformas })
        });
        const data = await res.json();
        if (data.status === "sucesso") {
            resultadoDiv.innerHTML = "";
            data.filmes.forEach(f => resultadoDiv.appendChild(criarCardFilme(f.titulo, f.ano, f.plataformas, f.sinopse, f.genero)));
        }
    } catch (e) { console.error(e); }
}

// Executa a busca por uma palavra contida na sinopse
async function executarBuscaSinopse() {
    const textoInput = document.getElementById('input-sinopse')?.value.trim();
    const container = document.getElementById('resultados-sinopse');

    if (!textoInput) return alert("Digite uma palavra-chave!");

    container.innerHTML = "<p>Vasculhando nossa biblioteca...</p>";

    try {
        const res = await fetch(`${BASE_URL}/buscar_sinopse`, {
            method: 'POST',
            headers: headersPadrao,
            body: JSON.stringify({ texto: textoInput }) // Enviamos apenas o texto
        });
        const data = await res.json();

        if (data.status === "sucesso") {
            container.innerHTML = "";
            if (data.filmes.length === 0) {
                container.innerHTML = "<p>Nenhum filme encontrado com esse termo.</p>";
                return;
            }
            data.filmes.forEach(f => container.appendChild(criarCardFilme(f.titulo, f.ano, f.plataformas, f.sinopse, f.genero)));
        }
    } catch (e) {
        container.innerHTML = "<p>Erro na conexão.</p>";
    }
}

// Cria uma tag clicável para atores/diretores que, ao ser clicada, mostra os filmes em que essa pessoa aparece
function criarTagPessoa(label, nomeReal) {
    const span = document.createElement('span');
    span.className = 'actor-tag';
    span.innerText = label;
    span.onclick = () => {
        const area = document.getElementById('area-streamings');
        if(area) area.style.display = "block";
        const txt = document.getElementById('nome-artista-selecionado');
        if(txt) txt.innerText = nomeReal;
        const btn = document.getElementById('btn-buscar-conexoes');
        if(btn) btn.onclick = () => buscarFilmesPorPessoa(nomeReal);
    };
    return span;
}

// Cria um card de filme para exibir nos resultados de pesquisa
function criarCardFilme(titulo, ano, plataformas, sinopse, genero) {
    const div = document.createElement('div');
    div.className = 'movie-card';
    div.onclick = () => abrirModal(titulo, sinopse);
    div.innerHTML = `<h3>${titulo}</h3><p><small>${ano} | ${genero}</small></p><p style="color:#4facfe;">${plataformas.join(', ')}</p>`;
    return div;
}

// Abre um modal com a sinopse do filme
function abrirModal(t, s) {
    const m = document.getElementById('modal-sinopse');
    if (!m) return;
    document.getElementById('modal-titulo').innerText = t;
    document.getElementById('modal-corpo').innerText = s;
    m.style.display = "block";
}

// Fecha o modal de sinopse
function fecharModal() { document.getElementById('modal-sinopse').style.display = "none"; }

// Alterna a visibilidade do menu lateral
function toggleMenu() {
    document.getElementById('sidebar')?.classList.toggle('active');
    document.getElementById('menuOverlay')?.classList.toggle('active');
}

// Fechar autocomplete ao clicar fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-wrapper')) {
        document.querySelectorAll('.autocomplete-items').forEach(c => c.style.display = "none");
    }
});

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosIniciais();
});