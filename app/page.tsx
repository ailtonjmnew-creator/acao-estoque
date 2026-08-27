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
  
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(0);
  
  const [filtroCliente, setFiltroCliente] = useState<string>('todos');
  const [busca, setBusca] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [modalAberto, setModalAberto] = useState<boolean>(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    
    // Carrega clientes, catálogo mestre e produtos atribuídos
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

  async function handleAtribuirProduto(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteSelecionado || !produtoSelecionado) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um cliente e um produto.' });
      return;
    }

    setLoading(true);
    setMensagem(null);

    const { data: itemMestre } = await supabase
      .from('produtos_mestre')
      .select('*')
      .eq('id', produtoSelecionado)
      .single();

    if (!itemMestre) {
      setMensagem({ tipo: 'erro', texto: 'Produto mestre não encontrado.' });
      setLoading(false);
      return;
    }

    // 1. Verifica se já existe vínculo para este cliente específico
    const { data: produtoExistente } = await supabase
      .from('produtos')
      .select('id, saldo')
      .eq('cliente_id', clienteSelecionado)
      .eq('produto_mestre_id', produtoSelecionado)
      .maybeSingle();

    if (produtoExistente) {
      // 2. Atualiza saldo isolado do cliente
      const { error } = await supabase
        .from('produtos')
        .update({ saldo: produtoExistente.saldo + Number(quantidade) })
        .eq('id', produtoExistente.id);

      if (error) setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar saldo: ' + error.message });
      else setMensagem({ tipo: 'sucesso', texto: 'Saldo atualizado com sucesso!' });
    } else {
      // 3. Cria novo produto isolado para o cliente
      const { error } = await supabase
        .from('produtos')
        .insert([
          {
            nome: itemMestre.nome,
            descricao: itemMestre.descricao,
            categoria: itemMestre.categoria,
            cliente_id: clienteSelecionado,
            produto_mestre_id: produtoSelecionado,
            saldo: Number(quantidade),
            min_estoque: 10,
            critico_estoque: 5,
          },
        ]);

      if (error) setMensagem({ tipo: 'erro', texto: 'Erro ao atribuir produto: ' + error.message });
      else setMensagem({ tipo: 'sucesso', texto: 'Produto atribuído com sucesso!' });
    }

    setLoading(false);
    setQuantidade(0);
    setModalAberto(false);
    carregarDados();
  }

  // Filtros da tabela
  const produtosFiltrados = produtosAtribuidos.filter((item) => {
    const atendeCliente = filtroCliente === 'todos' || item.cliente_id === filtroCliente;
    const atendeBusca = item.nome.toLowerCase().includes(busca.toLowerCase());
    return atendeCliente && atendeBusca;
  });

  // KPIs
  const totalItens = produtosAtribuidos.length;
  const saldoTotal = produtosAtribuidos.reduce((acc, curr) => acc + (curr.saldo || 0), 0);
  const alertasCriticos = produtosAtribuidos.filter(item => (item.saldo || 0) <= (item.critico_estoque || 5)).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header / Barra Superior */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 font-bold px-3 py-1.5 rounded-lg text-lg">AÇÃO</div>
            <h1 className="text-xl font-semibold tracking-tight">Ação Estoque — Painel de Gestão</h1>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2"
          >
            + Atribuir Produto
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Mensagens de Feedback */}
        {mensagem && (
          <div className={`p-4 rounded-xl border flex justify-between items-center ${
            mensagem.tipo === 'sucesso' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <span>{mensagem.texto}</span>
            <button onClick={() => setMensagem(null)} className="font-bold ml-4">✕</button>
          </div>
        )}

        {/* Cards de Métricas / KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total de Registros</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{totalItens}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total de Peças em Estoque</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{saldoTotal}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Alertas Críticos</p>
            <p className="text-3xl font-bold text-rose-600 mt-2">{alertasCriticos}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Clientes Ativos</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{clientes.length}</p>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              placeholder="Buscar por nome do produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="w-full md:w-1/3">
            <select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="todos">Todos os Clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela de Produtos por Cliente */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-800">
            Estoque de Produtos por Cliente
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="px-6 py-3.5 font-medium">Produto</th>
                  <th className="px-6 py-3.5 font-medium">Cliente</th>
                  <th className="px-6 py-3.5 font-medium">Saldo Atual</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  produtosFiltrados.map((item) => {
                    const status = item.saldo <= (item.critico_estoque || 5)
                      ? { label: 'Crítico', bg: 'bg-rose-100 text-rose-800' }
                      : item.saldo <= (item.min_estoque || 10)
                      ? { label: 'Baixo', bg: 'bg-amber-100 text-amber-800' }
                      : { label: 'Normal', bg: 'bg-emerald-100 text-emerald-800' };

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{item.nome}</td>
                        <td className="px-6 py-4 text-slate-600">{item.clientes?.nome || '—'}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{item.saldo} un</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal de Atribuição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Atribuir Produto a Cliente</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleAtribuirProduto} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Cliente</label>
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
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Produto (Catálogo Geral)</label>
                <select
                  value={produtoSelecionado}
                  onChange={(e) => setProdutoSelecionado(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o Produto</option>
                  {catalogo.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Quantidade Inicial</label>
                <input
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Confirmar Atribuição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}