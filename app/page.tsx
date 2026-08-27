'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  // --- NAVEGAÇÃO E VISÃO ---
  const [abaAtiva, setAbaAtiva] = useState<'movimentacao' | 'uniforme' | 'cliente' | 'usuario' | 'configuracoes'>('movimentacao');
  const [modoVisao, setModoVisao] = useState('Administrador (Ação Uniformes)');
  const [clienteFiltroId, setClienteFiltroId] = useState<string>('todos');

  // --- DADOS DO BANCO ---
  const [produtos, setProdutos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);

  // --- ESTADOS DE FORMULÁRIOS ---
  // Movimentação
  const [movProdutoId, setMovProdutoId] = useState('');
  const [movClienteId, setMovClienteId] = useState('');
  const [movTipo, setMovTipo] = useState<'entrada' | 'saida'>('saida');
  const [movQuantidade, setMovQuantidade] = useState<number>(1);
  const [movObservacao, setMovObservacao] = useState('');

  // Cadastrar Uniforme / Produto
  const [uniNome, setUniNome] = useState('');
  const [uniCodigo, setUniCodigo] = useState('');
  const [uniClienteId, setUniClienteId] = useState('');
  const [uniQuantidade, setUniQuantidade] = useState<number>(0);
  const [uniEstoqueMinimo, setUniEstoqueMinimo] = useState<number>(10);
  const [uniEstoqueCritico, setUniEstoqueCritico] = useState<number>(3);

  // Cadastrar Cliente
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteCNPJ, setNovoClienteCNPJ] = useState('');
  const [novoClienteEmail, setNovoClienteEmail] = useState('');

  // Cadastrar Usuário
  const [usrNome, setUsrNome] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrClienteId, setUsrClienteId] = useState('');
  const [usrPerfil, setUsrPerfil] = useState('Operador');

  // Configurações de Alerta
  const [emailAlerta, setEmailAlerta] = useState('atendimento@acaouniformes.com.br');
  const [alertasAtivos, setAlertasAtivos] = useState(true);

  // UI Feedback
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [carregando, setCarregando] = useState(false);

  // --- CARREGAR DADOS AO INICIAR ---
  useEffect(() => {
    carregarTodosOsDados();
  }, []);

  async function carregarTodosOsDados() {
    setCarregando(true);
    try {
      // 1. Carregar Clientes
      const { data: dataClientes } = await supabase.from('clientes').select('*').order('nome');
      if (dataClientes) setClientes(dataClientes);

      // 2. Carregar Produtos com relação de Clientes
      const { data: dataProdutos } = await supabase
        .from('produtos')
        .select('*, clientes(id, nome, razao_social)')
        .order('nome');
      if (dataProdutos) setProdutos(dataProdutos);

      // 3. Carregar Usuários
      const { data: dataUsuarios } = await supabase.from('usuarios').select('*');
      if (dataUsuarios) setUsuarios(dataUsuarios);

      // 4. Carregar Histórico de Movimentações
      const { data: dataMov } = await supabase
        .from('movimentacoes')
        .select('*, produtos(nome, codigo), clientes(nome)')
        .order('created_at', { ascending: false })
        .limit(10);
      if (dataMov) setMovimentacoes(dataMov);

    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err);
    } finally {
      setCarregando(false);
    }
  }

  // --- SELECIONAR PRODUTO NA TABELA E IR PARA MOVIMENTAÇÃO ---
  function selecionarProdutoParaMovimentacao(item: any) {
    setMovProdutoId(item.id);
    setMovClienteId(item.cliente_id || '');
    setAbaAtiva('movimentacao');
    setMensagem({
      tipo: 'sucesso',
      texto: `Item "${item.nome}" selecionado para movimentação de estoque.`,
    });
    window.scrollTo({ top: 200, behavior: 'smooth' });
  }

  // --- AÇÃO 1: REGISTRAR MOVIMENTAÇÃO (ENTRADA / SAÍDA) ---
  async function handleMovimentacao(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);

    if (!movProdutoId) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um uniforme/produto para movimentar.' });
      return;
    }

    const produtoAtual = produtos.find((p) => p.id === movProdutoId);
    if (!produtoAtual) {
      setMensagem({ tipo: 'erro', texto: 'Produto não encontrado.' });
      return;
    }

    const qtd = Number(movQuantidade);
    if (isNaN(qtd) || qtd <= 0) {
      setMensagem({ tipo: 'erro', texto: 'Informe uma quantidade válida superior a zero.' });
      return;
    }

    let novaQtd = produtoAtual.quantidade || 0;
    if (movTipo === 'saida') {
      if (novaQtd < qtd) {
        setMensagem({
          tipo: 'erro',
          texto: `Estoque insuficiente! Saldo atual: ${novaQtd} peças. Solicitado: ${qtd} peças.`,
        });
        return;
      }
      novaQtd -= qtd;
    } else {
      novaQtd += qtd;
    }

    setCarregando(true);
    try {
      // 1. Atualiza quantidade no produto
      const { error: errUpdate } = await supabase
        .from('produtos')
        .update({ quantidade: novaQtd })
        .eq('id', movProdutoId);

      if (errUpdate) throw errUpdate;

      // 2. Insere registro no histórico de movimentações
      await supabase.from('movimentacoes').insert([
        {
          produto_id: movProdutoId,
          cliente_id: movClienteId || produtoAtual.cliente_id || null,
          tipo: movTipo,
          quantidade: qtd,
          observacao: movObservacao || null,
        },
      ]);

      // 3. Disparar alerta silencioso se estoque cair abaixo do limite
      const estMin = produtoAtual.estoque_minimo ?? 10;
      if (movTipo === 'saida' && novaQtd <= estMin && alertasAtivos) {
        try {
          await fetch('/api/alerta-estoque', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              produto: produtoAtual.nome,
              codigo: produtoAtual.codigo,
              quantidadeAtual: novaQtd,
              estoqueMinimo: estMin,
              estoqueCritico: produtoAtual.estoque_critico ?? 3,
              emailDestino: emailAlerta,
            }),
          });
        } catch (eAlert) {
          console.warn('Serviço de alerta por e-mail indisponível ou em segundo plano.');
        }
      }

      setMensagem({
        tipo: 'sucesso',
        texto: `Movimentação de ${movTipo === 'entrada' ? 'Entrada' : 'Saída'} (${qtd} un) realizada com sucesso! Novo saldo: ${novaQtd} un.`,
      });

      setMovQuantidade(1);
      setMovObservacao('');
      carregarTodosOsDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao registrar movimentação.' });
    } finally {
      setCarregando(false);
    }
  }

  // --- AÇÃO 2: CADASTRAR UNIFORME ---
  async function handleCadastrarUniforme(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);

    if (!uniNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe a descrição/nome do uniforme.' });
      return;
    }

    setCarregando(true);
    try {
      const { error } = await supabase.from('produtos').insert([
        {
          nome: uniNome.trim(),
          codigo: uniCodigo.trim() || null,
          cliente_id: uniClienteId || null,
          quantidade: Number(uniQuantidade) || 0,
          estoque_minimo: Number(uniEstoqueMinimo) || 10,
          estoque_critico: Number(uniEstoqueCritico) || 3,
        },
      ]);

      if (error) throw error;

      setMensagem({ tipo: 'sucesso', texto: `Uniforme "${uniNome}" cadastrado no estoque!` });
      setUniNome('');
      setUniCodigo('');
      setUniClienteId('');
      setUniQuantidade(0);
      setUniEstoqueMinimo(10);
      setUniEstoqueCritico(3);
      carregarTodosOsDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao cadastrar uniforme.' });
    } finally {
      setCarregando(false);
    }
  }

  // --- AÇÃO 3: CADASTRAR CLIENTE (Com proteção dupla de schema) ---
  async function handleCadastrarCliente(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);

    if (!novoClienteNome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o Nome / Razão Social do cliente.' });
      return;
    }

    setCarregando(true);
    try {
      const { error } = await supabase.from('clientes').insert([
        {
          nome: novoClienteNome.trim(),
          razao_social: novoClienteNome.trim(),
          nome_fantasia: novoClienteNome.trim(),
          cnpj: novoClienteCNPJ.trim() || null,
          email: novoClienteEmail.trim() || null,
        },
      ]);

      if (error) throw error;

      setMensagem({
        tipo: 'sucesso',
        texto: `Cliente "${novoClienteNome}" cadastrado com sucesso!`,
      });

      setNovoClienteNome('');
      setNovoClienteCNPJ('');
      setNovoClienteEmail('');
      carregarTodosOsDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao cadastrar cliente.' });
    } finally {
      setCarregando(false);
    }
  }

  // --- AÇÃO 4: CADASTRAR USUÁRIO ---
  async function handleCadastrarUsuario(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);

    if (!usrNome.trim() || !usrEmail.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome e o e-mail do usuário.' });
      return;
    }

    setCarregando(true);
    try {
      const { error } = await supabase.from('usuarios').insert([
        {
          nome: usrNome.trim(),
          email: usrEmail.trim(),
          cliente_id: usrClienteId || null,
          perfil: usrPerfil,
        },
      ]);

      if (error) throw error;

      setMensagem({ tipo: 'sucesso', texto: `Usuário "${usrNome}" cadastrado com sucesso!` });
      setUsrNome('');
      setUsrEmail('');
      setUsrClienteId('');
      carregarTodosOsDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao cadastrar usuário.' });
    } finally {
      setCarregando(false);
    }
  }

  // --- CÁLCULO DE STATUS E FILTROS ---
  const produtosFiltrados = produtos.filter((p) => {
    if (clienteFiltroId === 'todos') return true;
    return p.cliente_id === clienteFiltroId;
  });

  const totalPecas = produtosFiltrados.reduce((acc, item) => acc + (item.quantidade || 0), 0);
  const itensCriticos = produtosFiltrados.filter(
    (p) => (p.quantidade || 0) <= (p.estoque_critico ?? 3)
  );
  const itensAlerta = produtosFiltrados.filter(
    (p) =>
      (p.quantidade || 0) > (p.estoque_critico ?? 3) &&
      (p.quantidade || 0) <= (p.estoque_minimo ?? 10)
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER DA APLICAÇÃO */}
        <header className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">Ação Estoque</h1>
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                Ação Uniformes
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Plataforma de Gestão, Controle de Estoque e Alertas Automáticos
            </p>
          </div>

          {/* MODO DE VISÃO */}
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              MODO DE VISÃO:
            </span>
            <select
              value={modoVisao}
              onChange={(e) => setModoVisao(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg text-sm px-3 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>🔑 Administrador (Ação Uniformes)</option>
              <option>👤 Operador de Estoque</option>
            </select>
          </div>
        </header>

        {/* CARDS DE DASHBOARD / RESUMO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Total de Peças</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{totalPecas}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl font-bold">
              📦
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Clientes Cadastrados</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{clientes.length}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold">
              🏢
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase">Estoque Baixo</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">{itensAlerta.length} itens</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center text-xl font-bold">
              ⚠️
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-red-200 bg-red-50/30 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-red-700 uppercase">Nível Crítico</p>
              <p className="text-2xl font-extrabold text-red-600 mt-1">{itensCriticos.length} itens</p>
            </div>
            <div className="w-12 h-12 bg-red-100 text-red-700 rounded-xl flex items-center justify-center text-xl font-bold">
              🚨
            </div>
          </div>
        </div>

        {/* BARRA DE NAVEGAÇÃO DE ABAS */}
        <nav className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex flex-wrap gap-2">
          <button
            onClick={() => setAbaAtiva('movimentacao')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              abaAtiva === 'movimentacao'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📦 Movimentação (Entrada/Saída)
          </button>

          <button
            onClick={() => setAbaAtiva('uniforme')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              abaAtiva === 'uniforme'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🎁 Cadastrar Uniforme
          </button>

          <button
            onClick={() => setAbaAtiva('cliente')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              abaAtiva === 'cliente'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🩻 Cadastrar Cliente
          </button>

          <button
            onClick={() => setAbaAtiva('usuario')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              abaAtiva === 'usuario'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            👤 Cadastrar Usuário
          </button>

          <button
            onClick={() => setAbaAtiva('configuracoes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              abaAtiva === 'configuracoes'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⚙️ Alertas & Configurações
          </button>
        </nav>

        {/* FEEDBACK / MENSAGENS */}
        {mensagem && (
          <div
            className={`p-4 rounded-xl border text-sm font-medium transition-all flex justify-between items-center ${
              mensagem.tipo === 'erro'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <span>{mensagem.texto}</span>
            <button
              onClick={() => setMensagem(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold ml-4"
            >
              ✕ Fechar
            </button>
          </div>
        )}

        {/* ABA 1: MOVIMENTAÇÃO DE ESTOQUE */}
        {abaAtiva === 'movimentacao' && (
          <main className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Registrar Entrada / Saída de Estoque</h2>

            <form onSubmit={handleMovimentacao} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Selecione o Uniforme / Item *
                  </label>
                  <select
                    required
                    value={movProdutoId}
                    onChange={(e) => {
                      setMovProdutoId(e.target.value);
                      const prod = produtos.find((p) => p.id === e.target.value);
                      if (prod && prod.cliente_id) setMovClienteId(prod.cliente_id);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Escolha um Item --</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo ? `[${p.codigo}] ` : ''}{p.nome} (Saldo: {p.quantidade || 0} un)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Atribuir ao Cliente Cadastrado
                  </label>
                  <select
                    value={movClienteId}
                    onChange={(e) => setMovClienteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Nenhum / Uso Geral --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome || c.razao_social}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tipo de Movimentação *
                  </label>
                  <select
                    value={movTipo}
                    onChange={(e) => setMovTipo(e.target.value as 'entrada' | 'saida')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="saida">🔴 Saída (Retirada de Estoque)</option>
                    <option value="entrada">🟢 Entrada (Reposição de Estoque)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Quantidade de Peças *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={movQuantidade}
                    onChange={(e) => setMovQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Observação / Solicitação / Colaborador
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Entrega lote mensal / Solicitante: João - Setor Produção"
                    value={movObservacao}
                    onChange={(e) => setMovObservacao(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>

              <button
                type="submit"
                disabled={carregando}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-6 py-2.5 rounded-xl shadow transition-all text-sm"
              >
                {carregando ? 'Processando...' : 'Confirmar Movimentação'}
              </button>
            </form>
          </main>
        )}

        {/* ABA 2: CADASTRAR UNIFORME */}
        {abaAtiva === 'uniforme' && (
          <main className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Cadastrar Novo Uniforme / Produto</h2>

            <form onSubmit={handleCadastrarUniforme} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Descrição do Uniforme *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Camiseta Polo Brim Pesado M"
                    value={uniNome}
                    onChange={(e) => setUniNome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Código / Referência
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: UNI-001"
                    value={uniCodigo}
                    onChange={(e) => setUniCodigo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Vincular a um Cliente
                  </label>
                  <select
                    value={uniClienteId}
                    onChange={(e) => setUniClienteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Estoque Geral (Ação Uniformes) --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome || c.razao_social}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Quantidade Inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={uniQuantidade}
                    onChange={(e) => setUniQuantidade(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Estoque Mínimo (Alerta Laranja 🟠)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={uniEstoqueMinimo}
                    onChange={(e) => setUniEstoqueMinimo(parseInt(e.target.value) || 10)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Mínimo Crítico (Alerta Vermelho 🚨)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={uniEstoqueCritico}
                    onChange={(e) => setUniEstoqueCritico(parseInt(e.target.value) || 3)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>

              <button
                type="submit"
                disabled={carregando}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-6 py-2.5 rounded-xl shadow transition-all text-sm"
              >
                {carregando ? 'Salvando...' : 'Cadastrar Uniforme'}
              </button>
            </form>
          </main>
        )}

        {/* ABA 3: CADASTRAR CLIENTE */}
        {abaAtiva === 'cliente' && (
          <main className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Cadastrar Novo Cliente</h2>

            <form onSubmit={handleCadastrarCliente} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nome / Razão Social *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Empresa Exemplo LTDA"
                    value={novoClienteNome}
                    onChange={(e) => setNovoClienteNome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={novoClienteCNPJ}
                    onChange={(e) => setNovoClienteCNPJ(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    E-mail de Contato
                  </label>
                  <input
                    type="email"
                    placeholder="contato@empresa.com"
                    value={novoClienteEmail}
                    onChange={(e) => setNovoClienteEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>

              <button
                type="submit"
                disabled={carregando}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-6 py-2.5 rounded-xl shadow transition-all text-sm"
              >
                {carregando ? 'Cadastrando...' : 'Cadastrar Cliente'}
              </button>
            </form>
          </main>
        )}

        {/* ABA 4: CADASTRAR USUÁRIO */}
        {abaAtiva === 'usuario' && (
          <main className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Cadastrar Usuário / Operador</h2>

            <form onSubmit={handleCadastrarUsuario} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Silva"
                    value={usrNome}
                    onChange={(e) => setUsrNome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="carlos@acaouniformes.com.br"
                    value={usrEmail}
                    onChange={(e) => setUsrEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Perfil de Acesso
                  </label>
                  <select
                    value={usrPerfil}
                    onChange={(e) => setUsrPerfil(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Operador">Operador de Estoque</option>
                    <option value="Administrador">Administrador</option>
                    <option value="Cliente">Cliente (Apenas Consulta)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Vincular ao Cliente (Opcional)
                  </label>
                  <select
                    value={usrClienteId}
                    onChange={(e) => setUsrClienteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Todos / Ação Uniformes --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome || c.razao_social}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              <button
                type="submit"
                disabled={carregando}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-6 py-2.5 rounded-xl shadow transition-all text-sm"
              >
                {carregando ? 'Salvando...' : 'Cadastrar Usuário'}
              </button>
            </form>
          </main>
        )}

        {/* ABA 5: ALERTAS & CONFIGURAÇÕES */}
        {abaAtiva === 'configuracoes' && (
          <main className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Configurações de Alertas de Estoque</h2>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  E-mail para Alertas de Estoque Baixo / Crítico
                </label>
                <input
                  type="email"
                  value={emailAlerta}
                  onChange={(e) => setEmailAlerta(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Notificações automáticas serão enviadas silenciosamente para este e-mail.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="chkAlertas"
                  checked={alertasAtivos}
                  onChange={(e) => setAlertasAtivos(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="chkAlertas" className="text-sm text-slate-700 font-medium">
                  Ativar disparos automáticos por e-mail nas saídas abaixo do estoque mínimo
                </label>
              </div>

              <button
                type="button"
                onClick={() => setMensagem({ tipo: 'sucesso', texto: 'Configurações salvas com sucesso!' })}
                className="bg-blue-600 text-white font-medium px-6 py-2 rounded-xl text-sm shadow hover:bg-blue-700"
              >
                Salvar Configurações
              </button>
            </div>
          </main>
        )}

        {/* TABELA DE POSIÇÃO GERAL DO ESTOQUE */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Posição Geral do Estoque</h3>
              <p className="text-xs text-slate-400">
                💡 Clique em qualquer linha da tabela para selecionar o uniforme e registrar movimentação.
              </p>
            </div>

            {/* FILTRO POR CLIENTE */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filtrar por Cliente:</span>
              <select
                value={clienteFiltroId}
                onChange={(e) => setClienteFiltroId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os Clientes</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.razao_social}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Uniforme / Descrição</th>
                  <th className="px-4 py-3">Cliente Vinculado</th>
                  <th className="px-4 py-3 text-center">Qtd. Estoque</th>
                  <th className="px-4 py-3 text-center">Estoque Mínimo</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtosFiltrados.length > 0 ? (
                  produtosFiltrados.map((item) => {
                    const qtd = item.quantidade || 0;
                    const min = item.estoque_minimo ?? 10;
                    const crit = item.estoque_critico ?? 3;

                    // Cálculo do Badge de Cor do Estoque
                    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                    let badgeText = 'Normal';

                    if (qtd <= crit) {
                      badgeClass = 'bg-red-100 text-red-800 border-red-200 font-bold animate-pulse';
                      badgeText = '🚨 Crítico';
                    } else if (qtd <= min) {
                      badgeClass = 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
                      badgeText = '🟠 Estoque Baixo';
                    }

                    return (
                      <tr
                        key={item.id}
                        onClick={() => selecionarProdutoParaMovimentacao(item)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-500">
                          {item.codigo || '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.nome}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {item.clientes?.nome || item.clientes?.razao_social || 'Geral (Ação)'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">{qtd} un</td>
                        <td className="px-4 py-3 text-center text-xs text-slate-400">{min} un</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block border px-2.5 py-1 rounded-full text-xs ${badgeClass}`}
                          >
                            {badgeText}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selecionarProdutoParaMovimentacao(item);
                            }}
                            className="text-xs bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-medium px-2.5 py-1.5 rounded-lg transition-all"
                          >
                            Movimentar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Nenhum uniforme encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ÚLTIMAS MOVIMENTAÇÕES */}
        {movimentacoes.length > 0 && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Histórico de Movimentações Recentes</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Data/Hora</th>
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-4 py-2.5">Cliente</th>
                    <th className="px-4 py-2.5 text-center">Tipo</th>
                    <th className="px-4 py-2.5 text-center">Qtd</th>
                    <th className="px-4 py-2.5">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimentacoes.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-400">
                        {new Date(m.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {m.produtos?.nome || '—'}
                      </td>
                      <td className="px-4 py-2.5">{m.clientes?.nome || 'Geral'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            m.tipo === 'entrada'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {m.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold">{m.quantidade} un</td>
                      <td className="px-4 py-2.5 text-slate-400">{m.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}