'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function Home() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [produtosAtribuidos, setProdutosAtribuidos] = useState<any[]>([]);
  
  // Abas de navegação
  const [abaAtiva, setAbaAtiva] = useState<string>('lancar');
  const [clienteFiltro, setClienteFiltro] = useState<string>('todos');

  // Formulário
  const [itemSelecionado, setItemSelecionado] = useState<string>('');
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [tipoMovimentacao, setTipoMovimentacao] = useState<string>('entrada');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [minEstoque, setMinEstoque] = useState<number>(10);
  const [criticoEstoque, setCriticoEstoque] = useState<number>(3);
  const [observacao, setObservacao] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    
    const { data: dataClientes } = await supabase.from('clientes').select('*');
    const { data: dataCatalogo } = await supabase.from('produtos_mestre').select('*');
    const { data: dataProdutos } = await supabase
      .from('produtos')
      .select('*, clientes(nome)');

    if (dataClientes) setClientes(dataClientes);
    if (dataCatalogo) setCatalogo(dataCatalogo);
    if (dataProdutos) setProdutosAtribuidos(dataProdutos);
    
    setLoading(false);
  }

  async function handleMovimentacao(e: React.FormEvent) {
    e.preventDefault();
    if (!itemSelecionado || !clienteSelecionado) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o item e o cliente.' });
      return;
    }

    setLoading(true);
    setMensagem(null);

    const { data: itemMestre } = await supabase
      .from('produtos_mestre')
      .select('*')
      .eq('id', itemSelecionado)
      .single();

    if (!itemMestre) {
      setMensagem({ tipo: 'erro', texto: 'Item do catálogo não encontrado.' });
      setLoading(false);
      return;
    }

    // Busca se este cliente já tem este item específico
    const { data: produtoExistente } = await supabase
      .from('produtos')
      .select('id, saldo')
      .eq('cliente_id', clienteSelecionado)
      .eq('produto_mestre_id', itemSelecionado)
      .maybeSingle();

    const qtdAjuste = tipoMovimentacao === 'entrada' ? Number(quantidade) : -Number(quantidade);

    if (produtoExistente) {
      const novoSaldo = Math.max(0, produtoExistente.saldo + qtdAjuste);
      const { error } = await supabase
        .from('produtos')
        .update({
          saldo: novoSaldo,
          min_estoque: Number(minEstoque),
          critico_estoque: Number(criticoEstoque),
        })
        .eq('id', produtoExistente.id);

      if (error) {
        setMensagem({ tipo: 'erro', texto: 'Erro ao movimentar estoque: ' + error.message });
      } else {
        setMensagem({ tipo: 'sucesso', texto: 'Movimentação realizada com sucesso!' });
      }
    } else {
      const { error } = await supabase.from('produtos').insert([
        {
          nome: itemMestre.nome,
          descricao: itemMestre.descricao,
          categoria: itemMestre.categoria,
          cliente_id: clienteSelecionado,
          produto_mestre_id: itemSelecionado,
          saldo: Math.max(0, qtdAjuste),
          min_estoque: Number(minEstoque),
          critico_estoque: Number(criticoEstoque),
        },
      ]);

      if (error) {
        setMensagem({ tipo: 'erro', texto: 'Erro ao vincular item ao cliente: ' + error.message });
      } else {
        setMensagem({ tipo: 'sucesso', texto: 'Item vinculado e movimentação registrada com sucesso!' });
      }
    }

    setLoading(false);
    setObservacao('');
    carregarDados();
  }

  // Cálculos dos Cards
  const totalPecas = produtosAtribuidos.reduce((acc, curr) => acc + (curr.saldo || 0), 0);
  const estoqueBaixoCount = produtosAtribuidos.filter(
    (i) => i.saldo <= (i.min_estoque || 10) && i.saldo > (i.critico_estoque || 3)
  ).length;
  const criticoCount = produtosAtribuidos.filter(
    (i) => i.saldo <= (i.critico_estoque || 3)
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-12">
      {/* Sub-header superior */}
      <div className="bg-slate-200/60 text-slate-600 text-xs py-1.5 px-6 border-b border-slate-300">
        Ação Uniformes • Gestão de Clientes, Estoque e Lançamentos
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Banner Azul de Filtro */}
        <div className="bg-[#1a237e] text-white p-5 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold opacity-75">
              Filtro de Visualização & Relatórios
            </span>
            <h2 className="text-xl font-bold flex items-center gap-2 mt-0.5">
              <span>🌐</span> Visão Geral (Todos os Clientes)
            </h2>
            <p className="text-xs text-blue-200 mt-1">
              Selecione um cliente ao lado para isolar o estoque e emitir o relatório individual.
            </p>
          </div>
          <div>
            <select
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              className="bg-white text-slate-800 text-sm font-medium px-4 py-2 rounded-lg outline-none cursor-pointer border border-slate-300 shadow-sm"
            >
              <option value="todos">-- Todos os Clientes (Visão Geral Admin) --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards de Métricas / KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-slate-400">TOTAL GERAL DE PEÇAS</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{totalPecas}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-slate-400">CLIENTES CADASTRADOS</span>
            <p className="text-3xl font-extrabold text-blue-600 mt-1">{clientes.length}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-slate-400">ESTOQUE BAIXO</span>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">{estoqueBaixoCount} itens</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-slate-400">NÍVEL CRÍTICO</span>
            <p className="text-3xl font-extrabold text-rose-600 mt-1">{criticoCount} itens</p>
          </div>
        </div>

        {/* Alerta Amarelo de Reposição */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-3 text-xs text-amber-900 shadow-sm">
          <span className="font-bold flex items-center gap-1">
            ⚠️ CLIENTES COM ALERTA DE REPOSIÇÃO (2):
          </span>
          <div className="flex flex-wrap gap-2">
            <span className="bg-amber-100/80 border border-amber-300 px-2.5 py-1 rounded-md font-medium text-amber-900 flex items-center gap-1.5">
              CIPLAN CIMENTOS PLANALTO S/A <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.5 rounded font-bold">1 item baixo</span>
            </span>
            <span className="bg-amber-100/80 border border-amber-300 px-2.5 py-1 rounded-md font-medium text-amber-900 flex items-center gap-1.5">
              Alimentos Lideranca LTDA <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.5 rounded font-bold">1 item baixo</span>
            </span>
          </div>
        </div>

        {/* Barra de Abas de Navegação */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setAbaAtiva('lancar')}
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
              abaAtiva === 'lancar'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            🔵 Lançar Entrada/Saída
          </button>
          <button
            onClick={() => setAbaAtiva('relatorio')}
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
              abaAtiva === 'relatorio'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            📊 Relatório & Dashboard
          </button>
          <button
            onClick={() => setAbaAtiva('historico')}
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
              abaAtiva === 'historico'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            📜 Histórico
          </button>
          <button
            onClick={() => setAbaAtiva('cadastrar_uniforme')}
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
              abaAtiva === 'cadastrar_uniforme'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            👕 Cadastrar Uniforme
          </button>
          <button
            onClick={() => setAbaAtiva('cadastrar_cliente')}
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
              abaAtiva === 'cadastrar_cliente'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            🏢 Cadastrar Cliente
          </button>
          <button
            onClick={() => setAbaAtiva('cadastrar_usuario')}
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
              abaAtiva === 'cadastrar_usuario'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            👤 Cadastrar Usuário
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {mensagem && (
          <div
            className={`p-4 rounded-xl border text-sm font-medium ${
              mensagem.tipo === 'sucesso'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        {/* Formulário Principal */}
        {abaAtiva === 'lancar' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b pb-3">
              Registrar Entrada / Saída de Estoque & Atribuir ao Cliente
            </h3>

            <form onSubmit={handleMovimentacao} className="space-y-5">
              {/* Linha 1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Selecione o Item do Catálogo Geral ou de Cliente *
                  </label>
                  <select
                    value={itemSelecionado}
                    onChange={(e) => setItemSelecionado(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o Item</option>
                    {catalogo.map((item) => (
                      <option key={item.id} value={item.id}>{item.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Atribuir / Movimentar para o Cliente *
                  </label>
                  <select
                    value={clienteSelecionado}
                    onChange={(e) => setClienteSelecionado(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o Cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tipo de Movimentação *
                  </label>
                  <select
                    value={tipoMovimentacao}
                    onChange={(e) => setTipoMovimentacao(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="entrada">🟢 Entrada (Abastecer / Atribuir Lote)</option>
                    <option value="saida">🔴 Saída (Retirada / Baixa do Cliente)</option>
                  </select>
                </div>
              </div>

              {/* Linha 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Quantidade de Peças * <span className="text-slate-400 font-normal">(Aceita 0 para apenas vincular)</span>
                  </label>
                  <input
                    type="number"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-700 mb-1.5">
                    Estoque Mínimo para este Cliente (Alerta Amarelo)
                  </label>
                  <input
                    type="number"
                    value={minEstoque}
                    onChange={(e) => setMinEstoque(Number(e.target.value))}
                    className="w-full border border-amber-300 bg-amber-50/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1.5">
                    Mínimo Crítico para este Cliente (Alerta Vermelho)
                  </label>
                  <input
                    type="number"
                    value={criticoEstoque}
                    onChange={(e) => setCriticoEstoque(Number(e.target.value))}
                    className="w-full border border-rose-300 bg-rose-50/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    min="0"
                  />
                </div>
              </div>

              {/* Linha 3 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Observação / Solicitante / Observação Lote
                </label>
                <input
                  type="text"
                  placeholder="Ex: Lote inicial atribuído / Pedido do gestor Pedro"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3 rounded-lg shadow transition-all disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Confirmar Atribuição / Movimentação'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}