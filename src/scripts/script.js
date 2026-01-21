// Este arquivo contém o código JavaScript do projeto. Você pode adicionar funcionalidades interativas e manipulação do DOM aqui.

let lancamentos = [];
let lancamentoSelecionado = null;
let modal = null;

// Inicializar dados do localStorage
function inicializarBancoDados() {
    carregarLancamentosJSON();
    inicializarModal();
    definirDataAtual();
}

function carregarLancamentosJSON() {
    try {
        const jsonData = localStorage.getItem('lancamentosDB');
        
        if (jsonData) {
            lancamentos = JSON.parse(jsonData);
        } else {
            lancamentos = [];
        }
        
        calcularSaldos();
        renderizarTabela();
    } catch (error) {
        console.error('Erro ao carregar lançamentos:', error);
        lancamentos = [];
        renderizarTabela();
    }
}

function salvarBancoDados() {
    localStorage.setItem('lancamentosDB', JSON.stringify(lancamentos));
}

function inicializarModal() {
    modal = new bootstrap.Modal(document.getElementById('lancamentoModal'));
}

function definirDataAtual() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('data').value = hoje;
}

// Função para gerar UUID v4
function gerarUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
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
        id: gerarUUID(),
        data: data,
        movimento: movimento,
        historico: historico,
        valor: valor,
        saldo: 0,
        selecionado: false
    };

    lancamentos.push(lancamento);
    lancamentos.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    salvarBancoDados();
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
                    <input type="checkbox" ${isChecked} onchange="toggleSelecao('${lancamento.id}')">
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
        salvarBancoDados();
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
    salvarBancoDados();
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
            id: gerarUUID(),
            data: new Date().toISOString().split('T')[0],
            movimento: novoMovimento,
            historico: `EXTORNO - ${lancamento.historico}`,
            valor: lancamento.valor,
            saldo: 0,
            selecionado: false
        };

        lancamentos.push(lancamentoExtorno);
        lancamento.selecionado = false;
    });

    lancamentos.sort((a, b) => new Date(a.data) - new Date(b.data));
    salvarBancoDados();
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