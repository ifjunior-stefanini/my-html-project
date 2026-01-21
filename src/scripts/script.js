// Este arquivo contém o código JavaScript do projeto. Você pode adicionar funcionalidades interativas e manipulação do DOM aqui.

let lancamentos = [];
let lancamentoSelecionado = null;
let modal = null;
let extornoModal = null;
let importacaoModal = null;
let dadosImportacao = null;

// Inicializar dados do localStorage
function inicializarBancoDados() {
    carregarLancamentosJSON();
    inicializarModal();
    inicializarExtornoModal();
    inicializarImportacaoModal();
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

function inicializarExtornoModal() {
    extornoModal = new bootstrap.Modal(document.getElementById('extornoModal'));
}

function inicializarImportacaoModal() {
    importacaoModal = new bootstrap.Modal(document.getElementById('importacaoModal'));
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
    const valorInput = document.getElementById('valor').value;
    const valor = parseFloat(valorInput.replace(',', '.'));
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
                <td class="text-right">R$ ${valorFormatado}</td>
                <td class="text-right"><strong class="${saldoClasse}">R$ ${saldoFormatado}</strong></td>
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

function abrirModalExtorno() {
    const selecionados = lancamentos.filter(l => l.selecionado);
    
    if (selecionados.length === 0) {
        alert('Selecione um lançamento para extornar!');
        return;
    }

    // Montar lista de lançamentos a serem extornados
    const listaHTML = selecionados.map(lancamento => {
        const dataFormatada = new Date(lancamento.data).toLocaleDateString('pt-BR');
        const valorFormatado = lancamento.valor.toFixed(2).replace('.', ',');
        const movimentoTexto = lancamento.movimento === 'entrada' ? 'Entrada' : 'Saída';
        
        return `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-1"><strong>Data:</strong> ${dataFormatada}</p>
                            <p class="mb-1"><strong>Movimento:</strong> ${movimentoTexto}</p>
                        </div>
                        <div class="col-md-6">
                            <p class="mb-1"><strong>Histórico:</strong> ${lancamento.historico}</p>
                            <p class="mb-1"><strong>Valor:</strong> R$ ${valorFormatado}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('listaExtorno').innerHTML = listaHTML;
    extornoModal.show();
}

function confirmarExtorno() {
    const selecionados = lancamentos.filter(l => l.selecionado);
    
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
    
    // Fechar modal de extorno
    extornoModal.hide();
    
    // Resetar checkbox "Selecionar Todos"
    document.getElementById('selectAll').checked = false;
}

// Função para exibir notificações
function exibirNotificacao(mensagem, tipo = 'sucesso', duracao = 5000) {
    const container = document.getElementById('notificacaoContainer');
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao ${tipo}`;
    
    // Definir ícone baseado no tipo
    let icone = '✓';
    if (tipo === 'erro') icone = '✕';
    if (tipo === 'aviso') icone = '⚠️';
    if (tipo === 'info') icone = 'ℹ️';
    
    notificacao.innerHTML = `<span>${icone}</span><span>${mensagem}</span>`;
    container.appendChild(notificacao);
    
    // Remover notificação após o tempo especificado
    setTimeout(() => {
        notificacao.classList.add('saindo');
        setTimeout(() => {
            notificacao.remove();
        }, 400);
    }, duracao);
}

function exportarDados() {
    // Obter informações do navegador
    const navegador = obterNomeNavegador();
    
    // Obter data e hora atual
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const hora = agora.toLocaleTimeString('pt-BR').replace(/:/g, '-');
    
    const dados = {
        exportadoEm: new Date().toISOString(),
        navegador: navegador,
        lancamentos: lancamentos
    };
    
    const dataStr = JSON.stringify(dados, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `lancamentos_${data}_${hora}_${navegador}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    exibirNotificacao('Dados exportados com sucesso!', 'sucesso');
}

// Função auxiliar para obter o nome do navegador
function obterNomeNavegador() {
    const userAgent = navigator.userAgent;
    
    if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
        return 'Chrome';
    } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
        return 'Safari';
    } else if (userAgent.indexOf('Firefox') > -1) {
        return 'Firefox';
    } else if (userAgent.indexOf('Edg') > -1) {
        return 'Edge';
    } else if (userAgent.indexOf('Trident') > -1) {
        return 'IE';
    } else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
        return 'Opera';
    } else {
        return 'Desconhecido';
    }
}

function importarDados(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const conteudo = JSON.parse(e.target.result);
            
            if (!conteudo.lancamentos || !Array.isArray(conteudo.lancamentos)) {
                alert('Arquivo inválido! O arquivo deve conter um array de lançamentos.');
                return;
            }
            
            dadosImportacao = conteudo.lancamentos;
            document.getElementById('quantidadeLancamentos').textContent = dadosImportacao.length;
            importacaoModal.show();
            
        } catch (error) {
            alert('Erro ao processar o arquivo: ' + error.message);
        }
    };
    
    reader.readAsText(file);
    
    // Resetar o input para permitir selecionar o mesmo arquivo novamente
    event.target.value = '';
}

function confirmarImportacao() {
    if (dadosImportacao && Array.isArray(dadosImportacao)) {
        lancamentos = dadosImportacao;
        salvarBancoDados();
        calcularSaldos();
        renderizarTabela();
        
        // Resetar checkboxes
        document.getElementById('selectAll').checked = false;
        atualizarBotaoExtorno();
        
        importacaoModal.hide();
        exibirNotificacao('Dados importados com sucesso!', 'sucesso');
    }
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
    
    // Adicionar máscara de digitação no campo de valor
    const inputValor = document.getElementById('valor');
    inputValor.addEventListener('input', function(e) {
        let valor = e.target.value.replace(/\D/g, '');
        
        if (valor.length > 0) {
            valor = (parseInt(valor) / 100).toFixed(2);
            valor = valor.replace('.', ',');
            e.target.value = valor;
        }
    });
});