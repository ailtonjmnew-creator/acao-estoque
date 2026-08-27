'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PainelAdmin() {
  const [abaAtiva, setAbaAtiva] = useState<
    'movimentacao' | 'historico' | 'uniforme' | 'cliente' | 'usuario' | 'relatorio'
  >('movimentacao');

  // DADOS DO SUPABASE
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);

  // FILTROS DE TELA & DASHBOARD
  const [clienteFiltro, setClienteFiltro] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [statusFiltro, setStatusFiltro] = useState<string>('todos');

  // ESTADOS DE FEEDBACK
  const [erroSupabase, setErroSupabase] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // FORMULÁRIO: MOVIMENTAÇÃO / ATRIBUIÇÃO
  const [movItem, setMovItem] = useState('');
  const [movCliente, setMovCliente] = useState('');
  const [movTipo, setMovTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [movQtd, setMovQtd] = useState<number | string>(1);
  const [movEstoqueMinimo, setMovEstoqueMinimo] = useState<number | string>(10);
  const [movMinimoCritico, setMovMinimoCritico] = useState<number | string>(3);
  const [movObs, setMovObs] = useState('');

  // FORMULÁRIOS DE CADASTRO
  const [novoUniforme, setNovoUniforme] = useState({ descricao: '', codigo: '', quantidade: 0 });
  const [novoCliente, setNovoCliente] = useState({ nome: '', cnpj: '' });
  const [novoUsuario, setNovoUsuario] = useState({ nome: '', email: '', perfil: 'operador', cliente_id: '' });

  // FUNÇÕES AUXILIARES DE TRATAMENTO DE CAMPOS DO BANCO
  const getQtd = (p: any) => Number(p?.quantidade ?? p?.qtd ?? p?.estoque ?? p?.saldo ?? 0);
  const getNome = (p: any) => p?.descricao || p?.nome || p?.titulo || 'Uniforme Sem Nome';
  const getMin = (p: any) => Number(p?.estoque_minimo ?? p?.minimo ?? 10);
  const getCrit = (p: any) => Number(p?.minimo_critico ?? p?.critico ?? 3);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (clienteFiltro) {
      setMovCliente(clienteFiltro);
    }
  }, [clienteFiltro]);

  useEffect(() => {
    if (movItem) {
      const prod = produtos.find((p) => String(p.id) === String(movItem) || p.codigo === movItem);
      if (prod) {
        if (prod.cliente_id) setMovCliente(prod.cliente_id);
        setMovEstoqueMinimo(getMin(prod));
        setMovMinimoCritico(getCrit(prod));
      }
    }
  }, [movItem, produtos]);

  async function carregarDados() {
    setErroSupabase(null);
    try {
      const { data: dClientes, error: errC } = await supabase.from('clientes').select('*');
      if (errC) setErroSupabase(`Clientes: ${errC.message}`);
      else if (dClientes) setClientes(dClientes);

      const { data: dProdutos, error: errP } = await supabase.from('produtos').select('*');
      if (errP) setErroSupabase(`Produtos: ${errP.message}`);
      else if (dProdutos) setProdutos(dProdutos);

      const { data: dUsuarios, error: errU } = await supabase.from('usuarios').select('*');
      if (errU) console.error('Erro Usuários:', errU);
      if (dUsuarios) setUsuarios(dUsuarios);

      const { data: dHistorico, error: errH } = await supabase
        .from('estoque')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (errH) console.error('Erro Histórico:', errH);
      if (dHistorico) setHistorico(dHistorico);
    } catch (err: any) {
      setErroSupabase(`Falha de conexão: ${err?.message || 'Erro desconhecido'}`);
    }
  }

  const mostrarAlerta = (texto: string, tipo = 'sucesso') => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);
  };

  const gerarCodigoAuto = () => `UNI-${Math.floor(1000 + Math.random() * 9000)}`;

  // REGRAS E CÁLCULOS DOS FILTROS E DASHBOARD
  const clienteAtualObjeto = clientes.find((c) => String(c.id) === String(clienteFiltro));

  const baseProdutosParaMetrica = clienteFiltro
    ? produtos.filter((p) => String(p.cliente_id) === String(clienteFiltro))
    : produtos;

  let produtosFiltrados = baseProdutosParaMetrica;
  if (statusFiltro === 'critico') {
    produtosFiltrados = produtosFiltrados.filter((p) => getQtd(p) <= getCrit(p));
  } else if (statusFiltro === 'baixo') {
    produtosFiltrados = produtosFiltrados.filter((p) => getQtd(p) <= getMin(p));
  } else if (statusFiltro === 'normal') {
    produtosFiltrados = produtosFiltrados.filter((p) => getQtd(p) > getMin(p));
  }

  const totalPecas = baseProdutosParaMetrica.reduce((acc, item) => acc + getQtd(item), 0);
  const produtosOk = baseProdutosParaMetrica.filter((p) => getQtd(p) > getMin(p));
  const produtosBaixo = baseProdutosParaMetrica.filter((p) => getQtd(p) <= getMin(p));
  const produtosCritico = baseProdutosParaMetrica.filter((p) => getQtd(p) <= getCrit(p));

  // ALERTAS POR CLIENTE PARA O BANNER
  const clientesComAlerta = clientes.map((cli) => {
    const prodsDoCliente = produtos.filter((p) => String(p.cliente_id) === String(cli.id));
    const qtdBaixo = prodsDoCliente.filter((p) => getQtd(p) <= getMin(p)).length;
    return { cliente: cli, qtdBaixo };
  }).filter((c) => c.qtdBaixo > 0);

  // HISTÓRICO FILTRADO POR CLIENTE E DATAS
  let historicoFiltrado = clienteFiltro
    ? historico.filter((h) => String(h.cliente_id) === String(clienteFiltro))
    : historico;

  if (dataInicio) {
    historicoFiltrado = historicoFiltrado.filter(
      (h) => new Date(h.created_at) >= new Date(`${dataInicio}T00:00:00`)
    );
  }
  if (dataFim) {
    historicoFiltrado = historicoFiltrado.filter(
      (h) => new Date(h.created_at) <= new Date(`${dataFim}T23:59:59`)
    );
  }

  // MÉTRICAS DO RELATÓRIO
  const totalEntradas = historicoFiltrado
    .filter((h) => h.tipo_movimento === 'ENTRADA')
    .reduce((acc, h) => acc + (Number(h.quantidade) || 0), 0);

  const totalSaidas = historicoFiltrado
    .filter((h) => h.tipo_movimento === 'SAIDA')
    .reduce((acc, h) => acc + (Number(h.quantidade) || 0), 0);

  // AGRUPAMENTO DOS MAIS SOLICITADOS (TOP 5 CONSUMO)
  const consumoMap: { [key: string]: { nome: string; qtd: number } } = {};
  historicoFiltrado
    .filter((h) => h.tipo_movimento === 'SAIDA')
    .forEach((h) => {
      const prod = produtos.find((p) => String(p.id) === String(h.produto_id));
      const nome = prod ? getNome(prod) : 'Produto Desconhecido';
      if (!consumoMap[nome]) {
        consumoMap[nome] = { nome, qtd: 0 };
      }
      consumoMap[nome].qtd += Number(h.quantidade) || 0;
    });

  const topConsumidos = Object.values(consumoMap)
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5);

  const maxConsumo = topConsumidos.length > 0 ? Math.max(...topConsumidos.map((i) => i.qtd)) : 1;

  // HANDLERS DE CADASTRO E MOVIMENTAÇÃO
  const handleCadastrarUniforme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoUniforme.descricao) return;

    const payload = {
      descricao: novoUniforme.descricao,
      nome: novoUniforme.descricao,
      codigo: novoUniforme.codigo.trim() || gerarCodigoAuto(),
      quantidade: Number(novoUniforme.quantidade) || 0,
      cliente_id: null,
      estoque_minimo: 10,
      minimo_critico: 3
    };

    const { error } = await supabase.from('produtos').insert([payload]);
    if (error) {
      mostrarAlerta(`Erro: ${error.message}`, 'erro');
    } else {
      mostrarAlerta(`Modelo "${novoUniforme.descricao}" cadastrado no Catálogo Geral!`);
      setNovoUniforme({ descricao: '', codigo: '', quantidade: 0 });
      await carregarDados();
      setAbaAtiva('movimentacao');
    }
  };

  const handleCadastrarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCliente.nome) return;

    const { error } = await supabase.from('clientes').insert([novoCliente]);
    if (error) {
      mostrarAlerta(`Erro: ${error.message}`, 'erro');
    } else {
      mostrarAlerta('Empresa cadastrada com sucesso!');
      setNovoCliente({ nome: '', cnpj: '' });
      await carregarDados();
      setAbaAtiva('movimentacao');
    }
  };

  const handleCadastrarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoUsuario.nome || !novoUsuario.email) return;

    const payload = {
      nome: novoUsuario.nome,
      email: novoUsuario.email,
      perfil: novoUsuario.perfil,
      cliente_id: novoUsuario.cliente_id || null
    };

    const { error } = await supabase.from('usuarios').insert([payload]);
    if (error) {
      mostrarAlerta(`Erro ao cadastrar usuário: ${error.message}`, 'erro');
    } else {
      mostrarAlerta('Usuário cadastrado com sucesso!');
      setNovoUsuario({ nome: '', email: '', perfil: 'operador', cliente_id: '' });
      await carregarDados();
    }
  };

  const handleConfirmarMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movItem) {
      mostrarAlerta('Selecione um uniforme do catálogo.', 'erro');
      return;
    }

    const prodSelecionado = produtos.find((p) => String(p.id) === String(movItem) || p.codigo === movItem);
    if (!prodSelecionado) {
      mostrarAlerta('Produto não encontrado.', 'erro');
      return;
    }

    const qtdMovida = Number(movQtd) || 0;
    const clienteDestinoId = movCliente || prodSelecionado.cliente_id;

    if (!clienteDestinoId) {
      mostrarAlerta('Selecione um cliente para vincular esta movimentação.', 'erro');
      return;
    }

    let produtoAlvoId = prodSelecionado.id;
    let novaQuantidade = getQtd(prodSelecionado);
    let mensagemSucesso = '';

    // Se o item for do Catálogo Geral (cliente_id nulo), vincula ou atualiza a cópia do cliente
    if (!prodSelecionado.cliente_id && movCliente) {
      const nomeItem = getNome(prodSelecionado);
      const itemExistenteDoCliente = produtos.find(
        (p) =>
          String(p.cliente_id) === String(movCliente) &&
          (p.codigo === prodSelecionado.codigo || getNome(p).trim().toLowerCase() === nomeItem.trim().toLowerCase())
      );

      if (itemExistenteDoCliente) {
        produtoAlvoId = itemExistenteDoCliente.id;
        const saldoAtual = getQtd(itemExistenteDoCliente);
        novaQuantidade = movTipo === 'SAIDA' ? Math.max(0, saldoAtual - qtdMovida) : saldoAtual + qtdMovida;

        const { error: errUpdate } = await supabase
          .from('produtos')
          .update({
            quantidade: novaQuantidade,
            estoque_minimo: movEstoqueMinimo !== '' ? Number(movEstoqueMinimo) : getMin(itemExistenteDoCliente),
            minimo_critico: movMinimoCritico !== '' ? Number(movMinimoCritico) : getCrit(itemExistenteDoCliente)
          })
          .eq('id', produtoAlvoId);

        if (errUpdate) {
          mostrarAlerta(`Erro na atualização: ${errUpdate.message}`, 'erro');
          return;
        }
        mensagemSucesso = `Estoque de "${nomeItem}" atualizado para o cliente!`;
      } else {
        const saldoInicial = movTipo === 'ENTRADA' ? qtdMovida : 0;
        const payloadNovoProdCliente = {
          descricao: nomeItem,
          nome: nomeItem,
          codigo: prodSelecionado.codigo || gerarCodigoAuto(),
          quantidade: saldoInicial,
          cliente_id: movCliente,
          estoque_minimo: movEstoqueMinimo !== '' ? Number(movEstoqueMinimo) : 10,
          minimo_critico: movMinimoCritico !== '' ? Number(movMinimoCritico) : 3
        };

        const { data: dataNovoProd, error: errInsertProd } = await supabase
          .from('produtos')
          .insert([payloadNovoProdCliente])
          .select('*')
          .single();

        if (errInsertProd) {
          mostrarAlerta(`Erro ao vincular item ao cliente: ${errInsertProd.message}`, 'erro');
          return;
        }

        produtoAlvoId = dataNovoProd.id;
        novaQuantidade = saldoInicial;
        mensagemSucesso = `Modelo "${nomeItem}" vinculado ao cliente com sucesso!`;
      }
    } else {
      if (movTipo === 'SAIDA') {
        if (novaQuantidade < qtdMovida) {
          mostrarAlerta(`Estoque insuficiente! Saldo atual do cliente: ${novaQuantidade} un.`, 'erro');
          return;
        }
        novaQuantidade -= qtdMovida;
      } else {
        novaQuantidade += qtdMovida;
      }

      const updatePayload: any = {
        quantidade: novaQuantidade,
        cliente_id: clienteDestinoId
      };
      if (movEstoqueMinimo !== '') updatePayload.estoque_minimo = Number(movEstoqueMinimo);
      if (movMinimoCritico !== '') updatePayload.minimo_critico = Number(movMinimoCritico);

      const { error: errProd } = await supabase.from('produtos').update(updatePayload).eq('id', prodSelecionado.id);
      if (errProd) {
        mostrarAlerta(`Erro: ${errProd.message}`, 'erro');
        return;
      }
      mensagemSucesso = `Movimentação de estoque concluída!`;
    }

    await supabase.from('estoque').insert([
      {
        produto_id: produtoAlvoId,
        cliente_id: clienteDestinoId,
        tipo_movimento: movTipo,
        quantidade: qtdMovida,
        observacao: movObs || '',
        created_at: new Date().toISOString()
      }
    ]);

    mostrarAlerta(mensagemSucesso);
    setMovItem('');
    setMovQtd(1);
    setMovObs('');
    await carregarDados();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 print:p-0 print:bg-white">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* CABEÇALHO */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-none print:shadow-none print:p-0 print:mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Ação Estoque</h1>
              <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase print:hidden">
                Painel Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Ação Uniformes • Gestão de Clientes, Estoque e Lançamentos</p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => {
                setAbaAtiva('relatorio');
                setTimeout(() => window.print(), 500);
              }}
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow"
            >
              🖨️ Gerar PDF / Imprimir
            </button>
            <button
              onClick={carregarDados}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow"
            >
              🔄 Recarregar Dados
            </button>
          </div>
        </div>

        {/* SELETOR DE CLIENTE */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:bg-none print:text-black print:p-0 print:border-b print:pb-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 print:text-slate-500">
              Filtro de Visualização & Relatórios
            </span>
            <h2 className="text-base font-bold">
              {clienteFiltro
                ? `🏢 Cliente: ${clienteAtualObjeto?.nome || clienteAtualObjeto?.razao_social}`
                : '🌐 Visão Geral (Todos os Clientes)'}
            </h2>
          </div>

          <div className="w-full md:w-auto min-w-[280px] print:hidden">
            <select
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              className="w-full p-3 rounded-lg text-xs font-bold bg-white text-slate-900 border border-blue-300 focus:outline-none"
            >
              <option value="">-- Todos os Clientes (Visão Geral Admin) --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 {c.nome || c.razao_social}
                </option>
              ))}
            </select>
          </div>
        </div>

        {erroSupabase && (
          <div className="p-4 rounded-xl text-xs font-bold bg-red-100 text-red-800 border border-red-300 print:hidden">
            ⚠️ <strong>Erro no Supabase:</strong> {erroSupabase}
          </div>
        )}

        {/* MÉTRICAS EM CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase">
              {clienteFiltro ? 'Peças do Cliente' : 'Total Geral de Peças'}
            </p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalPecas}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase">Clientes Cadastrados</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{clientes.length}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-amber-600 uppercase">Estoque Baixo</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{produtosBaixo.length} itens</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-red-600 uppercase">Nível Crítico</p>
            <p className="text-2xl font-black text-red-600 mt-1">{produtosCritico.length} itens</p>
          </div>
        </div>

        {/* BANNER DE ALERTAS POR CLIENTE */}
        {clientesComAlerta.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center gap-2 text-xs font-bold text-amber-800 print:hidden">
            <span>⚠️ CLIENTES COM ALERTA DE REPOSIÇÃO ({clientesComAlerta.length}):</span>
            {clientesComAlerta.map((item) => (
              <span
                key={item.cliente.id}
                onClick={() => setClienteFiltro(String(item.cliente.id))}
                className="bg-amber-200 text-amber-900 px-2 py-1 rounded cursor-pointer hover:bg-amber-300 transition-colors"
              >
                {item.cliente.nome || item.cliente.razao_social} ({item.itemBaixo || item.qtdBaixo} item baixo)
              </span>
            ))}
          </div>
        )}

        {/* NAVEGAÇÃO ENTRE ABAS */}
        <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-2 print:hidden">
          <button
            onClick={() => setAbaAtiva('movimentacao')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'movimentacao' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📦 Lançar Entrada/Saída
          </button>
          <button
            onClick={() => setAbaAtiva('relatorio')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'relatorio' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📊 Relatório & Dashboard
          </button>
          <button
            onClick={() => setAbaAtiva('historico')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'historico' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📜 Histórico
          </button>
          <button
            onClick={() => setAbaAtiva('uniforme')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'uniforme' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            👕 Cadastrar Uniforme
          </button>
          <button
            onClick={() => setAbaAtiva('cliente')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'cliente' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🏢 Cadastrar Cliente
          </button>
          <button
            onClick={() => setAbaAtiva('usuario')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'usuario' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            👤 Cadastrar Usuário
          </button>
        </div>

        {mensagem.texto && (
          <div
            className={`p-4 rounded-xl text-xs font-bold border print:hidden ${
              mensagem.tipo === 'erro' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        {/* ABA 1: LANÇAR MOVIMENTAÇÃO */}
        {abaAtiva === 'movimentacao' && (
          <div className="space-y-6">
            <form onSubmit={handleConfirmarMovimentacao} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 print:hidden">
              <h3 className="text-base font-bold text-slate-800 mb-4">
                Registrar Entrada / Saída de Estoque & Atribuir ao Cliente
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Selecione o Item do Catálogo Geral ou de Cliente *
                  </label>
                  <select
                    value={movItem}
                    onChange={(e) => setMovItem(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-xs bg-white font-medium text-slate-800"
                    required
                  >
                    <option value="">-- Selecione o Item --</option>
                    {produtos.map((p) => {
                      const cli = clientes.find((c) => String(c.id) === String(p.cliente_id));
                      const nomeItem = getNome(p);
                      const codigoStr = p.codigo ? ` (${p.codigo})` : '';
                      const clienteStr = cli ? ` — [${cli.nome || cli.razao_social}]` : ' — [Catálogo Geral]';
                      const saldoStr = ` (Saldo: ${getQtd(p)} un)`;

                      return (
                        <option key={p.id} value={p.id}>
                          {nomeItem}{codigoStr}{clienteStr}{saldoStr}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Atribuir / Movimentar para o Cliente *
                  </label>
                  <select
                    value={movCliente}
                    onChange={(e) => setMovCliente(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-xs bg-white font-medium text-slate-800"
                    required
                  >
                    <option value="">-- Selecione o Cliente --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.nome || c.razao_social}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Movimentação *</label>
                  <select
                    value={movTipo}
                    onChange={(e) => setMovTipo(e.target.value as 'ENTRADA' | 'SAIDA')}
                    className="w-full p-2.5 border rounded-lg text-xs font-bold"
                  >
                    <option value="ENTRADA">🟢 Entrada (Abastecer / Atribuir Lote)</option>
                    <option value="SAIDA">🔴 Saída (Retirada)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Quantidade de Peças * <span className="text-[10px] text-slate-400 font-normal">(Aceita 0 para apenas vincular)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={movQtd}
                    onChange={(e) => setMovQtd(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Estoque Mínimo para este Cliente (Alerta Amarelo)
                  </label>
                  <input
                    type="number"
                    value={movEstoqueMinimo}
                    onChange={(e) => setMovEstoqueMinimo(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-xs font-bold border-amber-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Mínimo Crítico para este Cliente (Alerta Vermelho)
                  </label>
                  <input
                    type="number"
                    value={movMinimoCritico}
                    onChange={(e) => setMovMinimoCritico(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-xs font-bold border-red-300"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1">Observação / Solicitante / Observação Lote</label>
                <input
                  type="text"
                  value={movObs}
                  onChange={(e) => setMovObs(e.target.value)}
                  placeholder="Ex: Lote inicial atribuído / Pedido do gestor Pedro"
                  className="w-full p-2.5 border rounded-lg text-xs"
                />
              </div>

              <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs hover:bg-blue-700 shadow">
                Confirmar Atribuição / Movimentação
              </button>
            </form>

            {/* TABELA POSIÇÃO DO ESTOQUE */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-800">
                  Posição de Estoque {clienteFiltro ? `— ${clienteAtualObjeto?.nome || clienteAtualObjeto?.razao_social}` : 'Geral'}
                </h3>
                {clienteFiltro && (
                  <button
                    onClick={() => setClienteFiltro('')}
                    className="text-xs text-blue-600 font-bold hover:underline print:hidden"
                  >
                    ✖ Limpar filtro (Ver todos)
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b text-[11px] text-slate-400 uppercase font-bold">
                      <th className="p-3">CÓDIGO</th>
                      <th className="p-3">UNIFORME / DESCRIÇÃO</th>
                      <th className="p-3">CLIENTE VINCULADO</th>
                      <th className="p-3">ESTOQUE MÍNIMO</th>
                      <th className="p-3">QTD. ESTOQUE</th>
                      <th className="p-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {baseProdutosParaMetrica.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400 font-medium">
                          Nenhum produto cadastrado ou encontrado.
                        </td>
                      </tr>
                    ) : (
                      baseProdutosParaMetrica.map((item, idx) => {
                        const qtd = getQtd(item);
                        const min = getMin(item);
                        const crit = getCrit(item);
                        const clienteRel = clientes.find((c) => String(c.id) === String(item.cliente_id));

                        let statusBadge = (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            Normal
                          </span>
                        );

                        if (qtd <= crit) {
                          statusBadge = (
                            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              🚨 Crítico ({qtd})
                            </span>
                          );
                        } else if (qtd <= min) {
                          statusBadge = (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              ⚠️ Baixo ({qtd})
                            </span>
                          );
                        }

                        return (
                          <tr key={item.id || idx}>
                            <td className="p-3 font-mono font-bold text-blue-600">{item.codigo || '—'}</td>
                            <td className="p-3 font-bold text-slate-800">{getNome(item)}</td>
                            <td className="p-3 font-medium text-slate-600">
                              {clienteRel ? (clienteRel.nome || clienteRel.razao_social) : '🌐 Catálogo Geral'}
                            </td>
                            <td className="p-3 text-slate-500 font-medium">
                              Mín: {min} / Crítico: {crit}
                            </td>
                            <td className="p-3 font-bold text-slate-700">{qtd} un</td>
                            <td className="p-3">{statusBadge}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: RELATÓRIO & DASHBOARD */}
        {abaAtiva === 'relatorio' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Data Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="p-1.5 border rounded-lg text-xs font-semibold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Data Fim</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="p-1.5 border rounded-lg text-xs font-semibold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Status de Estoque</label>
                  <select
                    value={statusFiltro}
                    onChange={(e) => setStatusFiltro(e.target.value)}
                    className="p-1.5 border rounded-lg text-xs font-semibold text-slate-700 bg-white"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="critico">🚨 Apenas Críticos</option>
                    <option value="baixo">⚠️ Apenas Baixos (inclui críticos)</option>
                    <option value="normal">✅ Normal</option>
                  </select>
                </div>
              </div>

              {(dataInicio || dataFim || statusFiltro !== 'todos') && (
                <button
                  onClick={() => {
                    setDataInicio('');
                    setDataFim('');
                    setStatusFiltro('todos');
                  }}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Limpar Filtros
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 print:shadow-none print:border-none">
              <div className="flex justify-between items-start border-b pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase">
                    Consumos e Posição do Estoque
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cliente: <strong className="text-slate-800">{clienteFiltro ? (clienteAtualObjeto?.nome || clienteAtualObjeto?.razao_social) : 'Todas as Empresas (Consolidado)'}</strong>
                    {clienteAtualObjeto?.cnpj && ` • CNPJ: ${clienteAtualObjeto.cnpj}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Data da Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                  </p>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow print:hidden"
                >
                  🖨️ Imprimir / Salvar PDF
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Movimentado</span>
                  <div className="mt-2">
                    <span className="text-3xl font-black text-slate-800">{totalEntradas + totalSaidas}</span>
                    <span className="text-xs text-slate-500 ml-1">peças</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Entradas (Abastecimento)</span>
                  <div className="mt-2">
                    <span className="text-3xl font-black text-emerald-700">+{totalEntradas}</span>
                    <span className="text-xs text-slate-500 ml-1">peças</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-rose-600 uppercase">Saídas (Entregues ao Cliente)</span>
                  <div className="mt-2">
                    <span className="text-3xl font-black text-rose-700">-{totalSaidas}</span>
                    <span className="text-xs text-slate-500 ml-1">peças</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-red-600 uppercase">Ação Urgente Necessária</span>
                  <div className="mt-2">
                    <span className="text-3xl font-black text-red-600">{produtosBaixo.length}</span>
                    <span className="text-xs font-bold text-slate-500 ml-2">
                      ({produtosCritico.length} {produtosCritico.length === 1 ? 'crítico' : 'críticos'} / {produtosBaixo.length} {produtosBaixo.length === 1 ? 'baixo' : 'baixos'})
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>🏆 Top 5 Itens Mais Solicitados</span>
                    <span className="text-[10px] text-slate-400 font-normal">Baseado nas Saídas</span>
                  </h3>

                  {topConsumidos.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhuma saída de produto registrada neste período.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topConsumidos.map((item, idx) => {
                        const percent = Math.round((item.qtd / maxConsumo) * 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-800">
                              <span className="truncate max-w-[200px]">{item.nome}</span>
                              <span className="text-blue-700">{item.qtd} peças</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                      📊 Saúde e Proporção do Estoque
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-emerald-700">✅ Estoque em Nível Normal</span>
                          <span>{produtosOk.length} itens ({baseProdutosParaMetrica.length ? Math.round((produtosOk.length / baseProdutosParaMetrica.length) * 100) : 0}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${baseProdutosParaMetrica.length ? (produtosOk.length / baseProdutosParaMetrica.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-amber-700">⚠️ Estoque em Nível Baixo</span>
                          <span>{produtosBaixo.length} itens ({baseProdutosParaMetrica.length ? Math.round((produtosBaixo.length / baseProdutosParaMetrica.length) * 100) : 0}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{ width: `${baseProdutosParaMetrica.length ? (produtosBaixo.length / baseProdutosParaMetrica.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-red-700">🚨 Estoque Crítico (Urgente)</span>
                          <span>{produtosCritico.length} itens ({baseProdutosParaMetrica.length ? Math.round((produtosCritico.length / baseProdutosParaMetrica.length) * 100) : 0}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-red-600 h-full rounded-full"
                            style={{ width: `${baseProdutosParaMetrica.length ? (produtosCritico.length / baseProdutosParaMetrica.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-4 italic">
                    * Nota: Itens classificados como críticos são automaticamente contemplados no alerta de estoque baixo.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-800 uppercase mb-3">
                  📋 Sugestão de Reposição Personalizada
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200">
                    <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="p-2 border">CÓDIGO</th>
                        <th className="p-2 border">UNIFORME</th>
                        <th className="p-2 border">ESTOQUE ATUAL</th>
                        <th className="p-2 border">MÍNIMO DEFINIDO</th>
                        <th className="p-2 border">STATUS</th>
                        <th className="p-2 border">SUGESTÃO DE FABRICAÇÃO</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-medium">
                      {produtosFiltrados.map((p, idx) => {
                        const qtd = getQtd(p);
                        const min = getMin(p);
                        const crit = getCrit(p);
                        const reposicaoSugerida = Math.max(0, min * 2 - qtd);

                        let statusText = 'OK';
                        let badgeColor = 'bg-emerald-100 text-emerald-800';

                        if (qtd <= crit) {
                          statusText = 'CRÍTICO / BAIXO';
                          badgeColor = 'bg-red-100 text-red-800 font-bold';
                        } else if (qtd <= min) {
                          statusText = 'BAIXO';
                          badgeColor = 'bg-amber-100 text-amber-800 font-bold';
                        }

                        return (
                          <tr key={p.id || idx} className="border-b">
                            <td className="p-2 border font-mono font-bold text-blue-600">{p.codigo || '—'}</td>
                            <td className="p-2 border font-bold text-slate-800">{getNome(p)}</td>
                            <td className="p-2 border font-bold">{qtd} un</td>
                            <td className="p-2 border text-slate-500">{min} un</td>
                            <td className="p-2 border">
                              <span className={`text-[10px] px-2 py-0.5 rounded ${badgeColor}`}>
                                {statusText}
                              </span>
                            </td>
                            <td className="p-2 border font-bold text-indigo-700">
                              {reposicaoSugerida > 0 ? `+${reposicaoSugerida} un (Sugerido)` : 'Sem necessidade'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-12 pt-6 border-t grid grid-cols-2 gap-8 text-center print:block">
                <div>
                  <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase">Ação Uniformes • Gestão de Estoque</p>
                </div>
                <div>
                  <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase">Recebido e De Acordo (Cliente)</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ABA 3: HISTÓRICO DE MOVIMENTAÇÕES */}
        {abaAtiva === 'historico' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              Extrato de Movimentações {clienteFiltro ? `— ${clienteAtualObjeto?.nome || clienteAtualObjeto?.razao_social}` : 'Geral'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-[11px] text-slate-400 uppercase font-bold">
                    <th className="p-3">DATA/HORA</th>
                    <th className="p-3">TIPO</th>
                    <th className="p-3">PRODUTO</th>
                    <th className="p-3">CLIENTE</th>
                    <th className="p-3">QUANTIDADE</th>
                    <th className="p-3">OBSERVAÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {historicoFiltrado.map((h, idx) => {
                    const prodRel = produtos.find((p) => String(p.id) === String(h.produto_id));
                    const cliRel = clientes.find((c) => String(c.id) === String(h.cliente_id));
                    const dataFmt = h.created_at ? new Date(h.created_at).toLocaleString('pt-BR') : '—';
                    const isEntrada = h.tipo_movimento === 'ENTRADA';

                    return (
                      <tr key={h.id || idx}>
                        <td className="p-3 text-slate-500 font-medium">{dataFmt}</td>
                        <td className="p-3 font-bold">
                          {isEntrada ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded">
                              🟢 ENTRADA
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded">
                              🔴 SAÍDA
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          {prodRel ? getNome(prodRel) : 'Produto'}
                        </td>
                        <td className="p-3 text-slate-600">{cliRel ? (cliRel.nome || cliRel.razao_social) : '—'}</td>
                        <td className="p-3 font-bold text-slate-800">
                          {isEntrada ? `+${h.quantidade}` : `-${h.quantidade}`} un
                        </td>
                        <td className="p-3 text-slate-500 italic">{h.observacao || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 4: CADASTRAR UNIFORME */}
        {abaAtiva === 'uniforme' && (
          <form onSubmit={handleCadastrarUniforme} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-1">Cadastrar Novo Uniforme / Produto</h3>
            <p className="text-xs text-slate-500 mb-4">Adiciona o modelo ao Catálogo Geral de peças disponíveis da empresa.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Descrição do Uniforme *</label>
                <input
                  type="text"
                  value={novoUniforme.descricao}
                  onChange={(e) => setNovoUniforme({ ...novoUniforme, descricao: e.target.value })}
                  placeholder="Ex: Calça Brim Profissional"
                  className="w-full p-2.5 border rounded-lg text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Código / Referência (Vazio = Gerar Auto)</label>
                <input
                  type="text"
                  value={novoUniforme.codigo}
                  onChange={(e) => setNovoUniforme({ ...novoUniforme, codigo: e.target.value })}
                  placeholder="Ex: UNI-1049"
                  className="w-full p-2.5 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Estoque Inicial no Catálogo</label>
                <input
                  type="number"
                  value={novoUniforme.quantidade}
                  onChange={(e) => setNovoUniforme({ ...novoUniforme, quantidade: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-lg text-xs"
                />
              </div>
            </div>

            <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs hover:bg-blue-700 transition-colors">
              Cadastrar no Catálogo Geral
            </button>
          </form>
        )}

        {/* ABA 5: CADASTRAR CLIENTE */}
        {abaAtiva === 'cliente' && (
          <form onSubmit={handleCadastrarCliente} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4">Cadastrar Novo Cliente / Empresa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome da Empresa / Cliente *</label>
                <input
                  type="text"
                  value={novoCliente.nome}
                  onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                  placeholder="Ex: Alimentos Liderança LTDA"
                  className="w-full p-2.5 border rounded-lg text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">CNPJ (Opcional)</label>
                <input
                  type="text"
                  value={novoCliente.cnpj}
                  onChange={(e) => setNovoCliente({ ...novoCliente, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="w-full p-2.5 border rounded-lg text-xs"
                />
              </div>
            </div>

            <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs hover:bg-blue-700 transition-colors">
              Cadastrar Cliente
            </button>
          </form>
        )}

        {/* ABA 6: CADASTRAR USUÁRIO */}
        {abaAtiva === 'usuario' && (
          <form onSubmit={handleCadastrarUsuario} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4">Cadastrar Usuário / Operador</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={novoUsuario.nome}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
                  placeholder="Ex: Pedro Silva"
                  className="w-full p-2.5 border rounded-lg text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">E-mail *</label>
                <input
                  type="email"
                  value={novoUsuario.email}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                  placeholder="pedro@email.com"
                  className="w-full p-2.5 border rounded-lg text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Perfil de Acesso</label>
                <select
                  value={novoUsuario.perfil}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, perfil: e.target.value })}
                  className="w-full p-2.5 border rounded-lg text-xs bg-white"
                >
                  <option value="operador">Operador de Estoque</option>
                  <option value="admin">Administrador</option>
                  <option value="cliente">Cliente</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Vincular ao Cliente (Opcional)</label>
                <select
                  value={novoUsuario.cliente_id}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, cliente_id: e.target.value })}
                  className="w-full p-2.5 border rounded-lg text-xs bg-white"
                >
                  <option value="">-- Selecione o Cliente --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome || c.razao_social}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs hover:bg-blue-700 transition-colors">
              Cadastrar Usuário
            </button>
          </form>
        )}

      </div>
    </div>
  );
}