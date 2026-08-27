'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PainelAdmin() {
  const [abaAtiva, setAbaAtiva] = useState<'movimentacao' | 'historico' | 'uniforme' | 'cliente' | 'usuario'>('movimentacao');

  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);

  const [erroSupabase, setErroSupabase] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Filtro de Cliente na Tabela de Estoque
  const [filtroClienteEstoque, setFiltroClienteEstoque] = useState('');

  // Formulário Movimentação
  const [movItem, setMovItem] = useState('');
  const [movCliente, setMovCliente] = useState('');
  const [movTipo, setMovTipo] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [movQtd, setMovQtd] = useState<number | string>(1);
  const [movObs, setMovObs] = useState('');

  // Formulário Novo Uniforme
  const [novoUniforme, setNovoUniforme] = useState({
    descricao: '',
    codigo: '',
    cliente_id: '',
    quantidade: 20,
    estoque_minimo: 10,
    minimo_critico: 3
  });

  // Formulário Novo Cliente
  const [novoCliente, setNovoCliente] = useState({ nome: '', cnpj: '' });

  // Formulário Novo Usuário
  const [novoUsuario, setNovoUsuario] = useState({
    nome: '',
    email: '',
    perfil: 'operador',
    cliente_id: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setErroSupabase(null);
    try {
      // 1. Busca Clientes
      const { data: dClientes, error: errC } = await supabase.from('clientes').select('*');
      if (errC) console.error('Erro Clientes:', errC);
      if (dClientes) setClientes(dClientes);

      // 2. Busca Produtos
      const { data: dProdutos, error: errP } = await supabase.from('produtos').select('*');
      if (errP) {
        console.error('Erro Produtos:', errP);
        setErroSupabase(`Erro ao buscar produtos: ${errP.message}`);
      } else if (dProdutos) {
        setProdutos(dProdutos);
      }

      // 3. Busca Usuários
      const { data: dUsuarios, error: errU } = await supabase.from('usuarios').select('*');
      if (errU) console.error('Erro Usuários:', errU);
      if (dUsuarios) setUsuarios(dUsuarios);

      // 4. Busca Histórico de Estoque
      const { data: dHistorico, error: errH } = await supabase
        .from('estoque')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (errH) console.error('Erro Histórico:', errH);
      if (dHistorico) setHistorico(dHistorico);

    } catch (err: any) {
      console.error('Erro geral:', err);
      setErroSupabase(`Falha de conexão: ${err?.message || 'Erro desconhecido'}`);
    }
  }

  const mostrarAlerta = (texto: string, tipo = 'sucesso') => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);
  };

  const gerarCodigoAuto = () => `UNI-${Math.floor(1000 + Math.random() * 9000)}`;

  // --- CÁLCULOS AUTOMÁTICOS DE ESTOQUE E ALERTAS DE CLIENTES ---
  const totalPecas = produtos.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0);

  const produtosCritico = produtos.filter(
    (p) => (Number(p.quantidade) || 0) <= (Number(p.minimo_critico) || 3)
  );

  const produtosBaixo = produtos.filter(
    (p) =>
      (Number(p.quantidade) || 0) <= (Number(p.estoque_minimo) || 10) &&
      (Number(p.quantidade) || 0) > (Number(p.minimo_critico) || 3)
  );

  const clienteIdsComAlerta = Array.from(
    new Set(
      produtos
        .filter((p) => (Number(p.quantidade) || 0) <= (Number(p.estoque_minimo) || 10) && p.cliente_id)
        .map((p) => p.cliente_id)
    )
  );

  const clientesEmAlerta = clientes.filter((c) => clienteIdsComAlerta.includes(c.id));

  // Produtos filtrados para exibição na tabela
  const produtosExibidos = filtroClienteEstoque
    ? produtos.filter((p) => p.cliente_id === filtroClienteEstoque)
    : produtos;

  // --- HANDLERS ---
  const handleCadastrarUniforme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoUniforme.descricao) return;

    const codigoFinal = novoUniforme.codigo.trim() || gerarCodigoAuto();

    const payload = {
      descricao: novoUniforme.descricao,
      nome: novoUniforme.descricao,
      codigo: codigoFinal,
      cliente_id: novoUniforme.cliente_id || null,
      quantidade: Number(novoUniforme.quantidade) || 0,
      estoque_minimo: Number(novoUniforme.estoque_minimo) || 10,
      minimo_critico: Number(novoUniforme.minimo_critico) || 3
    };

    const { error } = await supabase.from('produtos').insert([payload]);

    if (error) {
      mostrarAlerta(`Erro ao cadastrar uniforme: ${error.message}`, 'erro');
    } else {
      mostrarAlerta(`Uniforme "${novoUniforme.descricao}" cadastrado com sucesso!`);
      setNovoUniforme({
        descricao: '',
        codigo: '',
        cliente_id: '',
        quantidade: 20,
        estoque_minimo: 10,
        minimo_critico: 3
      });
      await carregarDados();
      setAbaAtiva('movimentacao');
    }
  };

  const handleCadastrarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCliente.nome) return;

    const { error } = await supabase.from('clientes').insert([novoCliente]);
    if (error) {
      mostrarAlerta(`Erro ao cadastrar cliente: ${error.message}`, 'erro');
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
      mostrarAlerta('Selecione um uniforme da lista.', 'erro');
      return;
    }

    const prodSelecionado = produtos.find((p) => p.id === movItem || p.codigo === movItem);
    const qtdMovida = Number(movQtd) || 0;

    if (!prodSelecionado) {
      mostrarAlerta('Produto não encontrado no banco.', 'erro');
      return;
    }

    let novaQuantidade = Number(prodSelecionado.quantidade) || 0;
    if (movTipo === 'SAIDA') {
      if (novaQuantidade < qtdMovida) {
        mostrarAlerta(`Estoque insuficiente! Saldo atual: ${novaQuantidade} un.`, 'erro');
        return;
      }
      novaQuantidade -= qtdMovida;
    } else {
      novaQuantidade += qtdMovida;
    }

    // 1. Registra no histórico de estoque
    const payloadHist = {
      produto_id: prodSelecionado.id || movItem,
      cliente_id: movCliente || prodSelecionado.cliente_id || null,
      tipo_movimento: movTipo,
      quantidade: qtdMovida,
      observacao: movObs,
      created_at: new Date().toISOString()
    };

    const { error: errHist } = await supabase.from('estoque').insert([payloadHist]);

    if (errHist) {
      mostrarAlerta(`Erro ao registrar histórico: ${errHist.message}`, 'erro');
      return;
    }

    // 2. Atualiza o saldo real na tabela produtos
    const { error: errProd } = await supabase
      .from('produtos')
      .update({ quantidade: novaQuantidade })
      .eq('id', prodSelecionado.id);

    if (errProd) {
      mostrarAlerta(`Erro ao atualizar quantidade do produto: ${errProd.message}`, 'erro');
    } else {
      mostrarAlerta(`Movimentação de ${movTipo} efetuada! Novo saldo: ${novaQuantidade} peças.`);
      setMovItem('');
      setMovQtd(1);
      setMovObs('');
      await carregarDados();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* CABEÇALHO ADMIN */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Ação Estoque</h1>
              <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                Painel Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ação Uniformes • Gestão de Clientes, Estoque e Lançamentos
            </p>
          </div>

          <button
            onClick={carregarDados}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow flex items-center gap-1"
          >
            🔄 Recarregar Dados
          </button>
        </div>

        {erroSupabase && (
          <div className="p-4 rounded-xl text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            ⚠️ <strong>Erro no Supabase:</strong> {erroSupabase}
          </div>
        )}

        {/* MÉTRICAS PRINCIPAIS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase">Total de Peças</p>
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

        {/* PAINEL DE ALERTA DE CLIENTES */}
        {clientesEmAlerta.length > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase mb-2">
              <span>⚠️</span>
              <span>Clientes com Alerta de Reposição ({clientesEmAlerta.length}):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {clientesEmAlerta.map((c) => {
                const prodsDoCliente = produtos.filter((p) => p.cliente_id === c.id);
                const qtdAlertas = prodsDoCliente.filter(
                  (p) => (Number(p.quantidade) || 0) <= (Number(p.estoque_minimo) || 10)
                ).length;

                return (
                  <div
                    key={c.id}
                    className="bg-white border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-900 shadow-sm flex items-center gap-2"
                  >
                    <span>🏢 {c.nome || c.razao_social}</span>
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px]">
                      {qtdAlertas} {qtdAlertas === 1 ? 'item baixo' : 'itens baixos'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <span>✅</span>
            <span>Todos os clientes estão com níveis de estoque regulares.</span>
          </div>
        )}

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-2">
          <button
            onClick={() => setAbaAtiva('movimentacao')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'movimentacao' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📦 Lançar Entrada/Saída
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
            className={`p-4 rounded-xl text-xs font-bold border ${
              mensagem.tipo === 'erro' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        {/* ABA 1: MOVIMENTAÇÃO */}
        {abaAtiva === 'movimentacao' && (
          <div className="space-y-6">
            <form onSubmit={handleConfirmarMovimentacao} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <h3 className="text-base font-bold text-slate-800 mb-4">Registrar Entrada / Saída de Estoque</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Selecione o Uniforme / Item * ({produtos.length} cadastrados)
                  </label>
                  <select
                    value={movItem}
                    onChange={(e) => {
                      const idSel = e.target.value;
                      setMovItem(idSel);
                      const prod = produtos.find((p) => p.id === idSel);
                      if (prod && prod.cliente_id) setMovCliente(prod.cliente_id);
                    }}
                    className="w-full p-2.5 border rounded-lg text-xs bg-white font-medium text-slate-800"
                    required
                  >
                    <option value="">
                      {produtos.length === 0
                        ? '-- Nenhum produto encontrado --'
                        : `-- Escolha um Item (${produtos.length} disponíveis) --`}
                    </option>
                    {produtos.map((p, idx) => {
                      const idVal = p.id || p.codigo || idx;
                      const nomeExibicao = p.descricao || p.nome || `Produto #${idx + 1}`;
                      const codExibicao = p.codigo ? `(${p.codigo})` : '';
                      const saldo = p.quantidade ?? 0;
                      return (
                        <option key={idVal} value={idVal}>
                          {nomeExibicao} {codExibicao} — Saldo: {saldo} un
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Atribuir ao Cliente Cadastrado</label>
                  <select
                    value={movCliente}
                    onChange={(e) => setMovCliente(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-xs bg-white font-medium text-slate-800"
                  >
                    <option value="">-- Nenhum / Uso Geral --</option>
                    {clientes.map((c, idx) => (
                      <option key={c.id || idx} value={c.id || idx}>
                        {c.nome || c.razao_social || 'Cliente'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Movimentação *</label>
                  <select
                    value={movTipo}
                    onChange={(e) => setMovTipo(e.target.value as 'ENTRADA' | 'SAIDA')}
                    className="w-full p-2.5 border rounded-lg text-xs bg-white font-bold"
                  >
                    <option value="SAIDA">🔴 Saída (Retirada / Entrega)</option>
                    <option value="ENTRADA">🟢 Entrada (Lançamento / Compra)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Quantidade de Peças *</label>
                  <input
                    type="number"
                    min="1"
                    value={movQtd}
                    onChange={(e) => setMovQtd(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-xs font-bold"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Observação / Solicitação / Colaborador</label>
                  <input
                    type="text"
                    value={movObs}
                    onChange={(e) => setMovObs(e.target.value)}
                    placeholder="Ex: Entrega lote mensal / Solicitante: João - Produção"
                    className="w-full p-2.5 border rounded-lg text-xs"
                  />
                </div>
              </div>

              <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs hover:bg-blue-700 transition-colors shadow">
                Confirmar Movimentação
              </button>
            </form>

            {/* TABELA POSIÇÃO GERAL DO ESTOQUE */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h3 className="text-base font-bold text-slate-800">Posição Geral do Estoque</h3>
                
                {/* Filtro de Cliente */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Filtrar Cliente:</span>
                  <select
                    value={filtroClienteEstoque}
                    onChange={(e) => setFiltroClienteEstoque(e.target.value)}
                    className="p-1.5 border rounded-lg text-xs bg-white font-medium text-slate-800"
                  >
                    <option value="">-- Todos os Clientes --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome || c.razao_social}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b text-[11px] text-slate-400 uppercase font-bold">
                      <th className="p-3">CÓDIGO</th>
                      <th className="p-3">UNIFORME / DESCRIÇÃO</th>
                      <th className="p-3">CLIENTE VINCULADO</th>
                      <th className="p-3">QTD. ESTOQUE</th>
                      <th className="p-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {produtosExibidos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 font-medium">
                          Nenhum produto encontrado para o filtro selecionado.
                        </td>
                      </tr>
                    ) : (
                      produtosExibidos.map((item, idx) => {
                        const qtd = Number(item.quantidade) || 0;
                        const min = Number(item.estoque_minimo) || 10;
                        const crit = Number(item.minimo_critico) || 3;
                        const clienteRel = clientes.find((c) => c.id === item.cliente_id);

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
                            <td className="p-3 font-bold text-slate-800">{item.descricao || item.nome || '—'}</td>
                            <td className="p-3 font-medium text-slate-600">
                              {clienteRel ? clienteRel.nome : '— (Geral)'}
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

        {/* ABA 2: HISTÓRICO DE MOVIMENTAÇÕES */}
        {abaAtiva === 'historico' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4">Extrato de Movimentações Recentes</h3>
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
                  {historico.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400 font-medium">
                        Nenhuma movimentação registrada até o momento.
                      </td>
                    </tr>
                  ) : (
                    historico.map((h, idx) => {
                      const prodRel = produtos.find((p) => p.id === h.produto_id);
                      const cliRel = clientes.find((c) => c.id === h.cliente_id);
                      const dataFmt = h.created_at
                        ? new Date(h.created_at).toLocaleString('pt-BR')
                        : '—';

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
                            {prodRel ? prodRel.descricao || prodRel.nome : 'Produto'}
                          </td>
                          <td className="p-3 text-slate-600">
                            {cliRel ? cliRel.nome : '—'}
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            {isEntrada ? `+${h.quantidade}` : `-${h.quantidade}`} un
                          </td>
                          <td className="p-3 text-slate-500 italic">{h.observacao || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 3: CADASTRAR UNIFORME */}
        {abaAtiva === 'uniforme' && (
          <form onSubmit={handleCadastrarUniforme} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4">Cadastrar Novo Uniforme / Produto</h3>
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
                <label className="block text-xs font-bold text-slate-600 mb-1">Código / Referência (Vazio = Gerar Automático)</label>
                <input
                  type="text"
                  value={novoUniforme.codigo}
                  onChange={(e) => setNovoUniforme({ ...novoUniforme, codigo: e.target.value })}
                  placeholder="Ex: UNI-1049"
                  className="w-full p-2.5 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Vincular a um Cliente</label>
                <select
                  value={novoUniforme.cliente_id}
                  onChange={(e) => setNovoUniforme({ ...novoUniforme, cliente_id: e.target.value })}
                  className="w-full p-2.5 border rounded-lg text-xs bg-white"
                >
                  <option value="">-- Selecione um Cliente --</option>
                  {clientes.map((c, idx) => (
                    <option key={c.id || idx} value={c.id || idx}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Quantidade Inicial</label>
                <input
                  type="number"
                  value={novoUniforme.quantidade}
                  onChange={(e) => setNovoUniforme({ ...novoUniforme, quantidade: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Estoque Mínimo (Alerta Amarelo)</label>
                <input
                  type="number"
                  value={novoUniforme.estoque_minimo}
                  onChange={(e) => setNovoUniforme({ ...novoUniforme, estoque_minimo: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mínimo Crítico (Alerta Vermelho)</label>
                <input
                  type="number"
                  value={novoUniforme.minimo_critico}
                  onChange={(e) => setNovoUniforme({ ...novoUniforme, minimo_critico: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-lg text-xs"
                />
              </div>
            </div>

            <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs hover:bg-blue-700 transition-colors">
              Cadastrar Uniforme
            </button>
          </form>
        )}

        {/* ABA 4: CADASTRAR CLIENTE */}
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

        {/* ABA 5: CADASTRAR USUÁRIO */}
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
                  {clientes.map((c, idx) => (
                    <option key={c.id || idx} value={c.id || idx}>
                      {c.nome}
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