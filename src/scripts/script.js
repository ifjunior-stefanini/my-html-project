// Este arquivo contém o código JavaScript do projeto. Você pode adicionar funcionalidades interativas e manipulação do DOM aqui.

let lancamentos = [];
let lancamentoSelecionado = null;
let db = null;
let modal = null;

// Inicializar SQLite
async function inicializarBancoDados() {
    const SQL = await initSqlJs();
    
    // Tentar carregar banco de dados do localStorage
    const dbData = localStorage.getItem('lancamentosDB');
    
    if (dbData) {
        // Banco de dados existe, carregar do localStorage
        const binary = new Uint8Array(dbData.split(',').map(x => parseInt(x)));
        db = new SQL.Database(binary);
    } else {
        // Criar novo banco de dados
        db = new SQL.Database();
        criarTabelaLancamentos();
    }
    
    carregarLancamentosDB();
}

function criarTabelaLancamentos() {
    const sql = `
        CREATE TABLE IF NOT EXISTS lancamentos (
            id INTEGER PRIMARY KEY,
            data TEXT NOT NULL,
            movimento TEXT NOT NULL,
            historico TEXT NOT NULL,
            valor REAL NOT NULL,
            selecionado INTEGER DEFAULT 0
        )
    `;
    db.run(sql);
    salvarBancoDados();
}

function carregarLancamentosDB() {
    try {
        const sql = 'SELECT * FROM lancamentos ORDER BY data ASC';
        const result = db.exec(sql);
        
        lancamentos = [];
        
        if (result.length > 0) {
            const rows = result[0].values;
            rows.forEach(row => {
                lancamentos.push({
                    id: row[0],
                    data: row[1],
                    movimento: row[2],
                    historico: row[3],
                    valor: row[4],
                    saldo: 0,
                    selecionado: row[5] === 1
                });
            });
        }
        
        calcularSaldos();
        renderizarTabela();
        inicializarModal();
        definirDataAtual();
    } catch (error) {
        console.error('Erro ao carregar lançamentos:', error);
        lancamentos = [];
        renderizarTabela();
    }
}

function salvarBancoDados() {
    const data = db.export();
    const arr = Array.from(data);
    localStorage.setItem('lancamentosDB', arr.join(','));
}

function inserirLancamentoDB(lancamento) {
    const sql = `
        INSERT INTO lancamentos (id, data, movimento, historico, valor, selecionado)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.run(sql, [lancamento.id, lancamento.data, lancamento.movimento, lancamento.historico, lancamento.valor, lancamento.selecionado ? 1 : 0]);
    salvarBancoDados();
}

function atualizarSelecionadoDB() {
    const sql = 'UPDATE lancamentos SET selecionado = ? WHERE id = ?';
    lancamentos.forEach(lancamento => {
        db.run(sql, [lancamento.selecionado ? 1 : 0, lancamento.id]);
    });
    salvarBancoDados();
}

function deletarLancamentoDB(id) {
    const sql = 'DELETE FROM lancamentos WHERE id = ?';
    db.run(sql, [id]);
    salvarBancoDados();
}

function inicializarModal() {
    modal = new bootstrap.Modal(document.getElementById('lancamentoModal'));
}

function definirDataAtual() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('data').value = hoje;
}

function adicionarLancamento() {
    const data = document.getElementById('data').value;
    const movimento = document.getElementById('movimento').value;
    const historico = document.getElementById('historico').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const mensagemErro = document.getElementById('mensagemErro');

    // Validar se o valor é diferente de zero
    if (valor === 0 || isNaN(valor) || valor < 0) {
        mensagemErro.textContent = 'O valor deve ser maior que zero!';
        mensagemErro.classList.remove('d-none');
        return;
    }

    if (!data || !movimento || !historico) {
        mensagemErro.textContent = 'Preencha todos os campos!';
        mensagemErro.classList.remove('d-none');
        return;
    }

    mensagemErro.classList.add('d-none');

    const lancamento = {
        id: Date.now(),
        data: data,
        movimento: movimento,
        historico: historico,
        valor: valor,
        saldo: 0,
        selecionado: false
    };

    lancamentos.push(lancamento);
    lancamentos.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    inserirLancamentoDB(lancamento);
    calcularSaldos();
    renderizarTabela();
    limparFormulario();
    modal.hide();
}

function calcularSaldos() {
    let saldo = 0;
    lancamentos.forEach(lancamento => {
        if (lancamento.movimento === 'entrada') {
            saldo += lancamento.valor;
        } else {
            saldo -= lancamento.valor;
        }
        lancamento.saldo = saldo;
    });
    atualizarSaldoAtual(saldo);
}

function atualizarSaldoAtual(saldo) {
    const saldoAtualElement = document.getElementById('saldoAtual');
    const valor = saldo.toFixed(2).replace('.', ',');
    saldoAtualElement.textContent = `R$ ${valor}`;
    saldoAtualElement.className = saldo >= 0 ? 'text-success' : 'text-danger';
}

function renderizarTabela() {
    const tbody = document.getElementById('tabelaLancamentos');
    
    if (lancamentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhum lançamento adicionado</td></tr>';
        return;
    }

    tbody.innerHTML = lancamentos.map(lancamento => {
        const dataFormatada = new Date(lancamento.data).toLocaleDateString('pt-BR');
        const valorFormatado = lancamento.valor.toFixed(2).replace('.', ',');
        const saldoFormatado = lancamento.saldo.toFixed(2).replace('.', ',');
        const saldoClasse = lancamento.saldo >= 0 ? 'saldo-positivo' : 'saldo-negativo';
        const movimentoClasse = lancamento.movimento === 'entrada' ? 'entrada' : 'saida';
        const movimentoTexto = lancamento.movimento === 'entrada' ? '▲ Entrada' : '▼ Saída';
        const isChecked = lancamento.selecionado ? 'checked' : '';

        return `
            <tr class="${lancamento.selecionado ? 'row-selected' : ''}">
                <td>
                    <input type="checkbox" ${isChecked} onchange="toggleSelecao(${lancamento.id})">
                </td>
                <td>${dataFormatada}</td>
                <td><span class="${movimentoClasse}">${movimentoTexto}</span></td>
                <td>${lancamento.historico}</td>
                <td>R$ ${valorFormatado}</td>
                <td><strong class="${saldoClasse}">R$ ${saldoFormatado}</strong></td>
            </tr>
        `;
    }).join('');
}

function toggleSelecao(id) {
    const lancamento = lancamentos.find(l => l.id === id);
    if (lancamento) {
        lancamento.selecionado = !lancamento.selecionado;
        lancamentoSelecionado = lancamento.selecionado ? lancamento : null;
        atualizarSelecionadoDB();
        atualizarBotaoExtorno();
        renderizarTabela();
    }
}

function selecionarTodos() {
    const checkbox = document.getElementById('selectAll');
    const estaChecked = checkbox.checked;
    
    lancamentos.forEach(lancamento => {
        lancamento.selecionado = estaChecked;
    });
    
    lancamentoSelecionado = estaChecked && lancamentos.length > 0 ? lancamentos[lancamentos.length - 1] : null;
    atualizarSelecionadoDB();
    atualizarBotaoExtorno();
    renderizarTabela();
}

function atualizarBotaoExtorno() {
    const btnExtornar = document.getElementById('btnExtornar');
    const temSelecionado = lancamentos.some(l => l.selecionado);
    btnExtornar.disabled = !temSelecionado;
}

function extornarLancamento() {
    const selecionados = lancamentos.filter(l => l.selecionado);
    
    if (selecionados.length === 0) {
        alert('Selecione um lançamento para extornar!');
        return;
    }

    if (!confirm(`Tem certeza que deseja extornar ${selecionados.length} lançamento(s)?`)) {
        return;
    }

    selecionados.forEach(lancamento => {
        const novoMovimento = lancamento.movimento === 'entrada' ? 'saida' : 'entrada';
        const lancamentoExtorno = {
            id: Date.now() + Math.random(),
            data: new Date().toISOString().split('T')[0],
            movimento: novoMovimento,
            historico: `EXTORNO - ${lancamento.historico}`,
            valor: lancamento.valor,
            saldo: 0,
            selecionado: false
        };

        lancamentos.push(lancamentoExtorno);
        inserirLancamentoDB(lancamentoExtorno);
        lancamento.selecionado = false;
    });

    lancamentos.sort((a, b) => new Date(a.data) - new Date(b.data));
    atualizarSelecionadoDB();
    calcularSaldos();
    renderizarTabela();
    atualizarBotaoExtorno();
}

function limparFormulario() {
    document.getElementById('formLancamento').reset();
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('data').value = hoje;
    document.getElementById('mensagemErro').classList.add('d-none');
}

// Inicializar aplicação quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    inicializarBancoDados();
});