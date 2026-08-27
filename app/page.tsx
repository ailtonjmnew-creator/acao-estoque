'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<string>('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: dataClientes } = await supabase.from('clientes').select('*');
    const { data: dataCatalogo } = await supabase.from('produtos_mestre').select('*');
    
    if (dataClientes) setClientes(dataClientes);
    if (dataCatalogo) setCatalogo(dataCatalogo);
  }

  async function handleAtribuirProduto(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteSelecionado || !produtoSelecionado) {
      setMensagem('Selecione um cliente e um produto.');
      return;
    }

    setLoading(true);
    setMensagem('');

    // Busca dados do produto mestre
    const { data: itemMestre } = await supabase
      .from('produtos_mestre')
      .select('*')
      .eq('id', produtoSelecionado)
      .single();

    if (!itemMestre) {
      setMensagem('Produto mestre não encontrado.');
      setLoading(false);
      return;
    }

    // 1. Verifica se o produto já está atribuído a este cliente
    const { data: produtoExistente } = await supabase
      .from('produtos')
      .select('id, saldo')
      .eq('cliente_id', clienteSelecionado)
      .eq('produto_mestre_id', produtoSelecionado)
      .maybeSingle();

    if (produtoExistente) {
      // 2. Atualiza apenas o saldo do registro deste cliente
      const { error } = await supabase
        .from('produtos')
        .update({ saldo: produtoExistente.saldo + Number(quantidade) })
        .eq('id', produtoExistente.id);

      if (error) setMensagem('Erro ao atualizar saldo: ' + error.message);
      else setMensagem('Saldo do cliente atualizado com sucesso!');
    } else {
      // 3. Cria um registro isolado para o cliente
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

      if (error) setMensagem('Erro ao atribuir produto: ' + error.message);
      else setMensagem('Produto atribuído ao cliente com sucesso!');
    }

    setLoading(false);
    setQuantidade(0);
  }

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Ação Estoque — Atribuição de Produtos</h1>

      {mensagem && (
        <div className="p-3 bg-blue-100 text-blue-800 rounded">{mensagem}</div>
      )}

      <form onSubmit={handleAtribuirProduto} className="space-y-4 border p-6 rounded-lg bg-white shadow-sm">
        <div>
          <label className="block text-sm font-medium mb-1">Cliente</label>
          <select
            value={clienteSelecionado}
            onChange={(e) => setClienteSelecionado(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">Selecione o Cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Produto (Catálogo Geral)</label>
          <select
            value={produtoSelecionado}
            onChange={(e) => setProdutoSelecionado(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">Selecione o Produto</option>
            {catalogo.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Quantidade Inicial</label>
          <input
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            className="w-full border p-2 rounded"
            min="0"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Processando...' : 'Atribuir ao Cliente'}
        </button>
      </form>
    </main>
  );
}