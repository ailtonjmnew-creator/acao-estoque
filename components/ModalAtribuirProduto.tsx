import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ModalAtribuirProps {
  clientes: { id: string; nome: string }[];
  produtosCatalogo: { id: string; nome: string; tamanho: string }[];
  onSuccess: () => void;
  onClose: () => void;
}

export function ModalAtribuirProduto({ clientes, produtosCatalogo, onSuccess, onClose }: ModalAtribuirProps) {
  const [clienteId, setClienteId] = useState('');
  const [produtoCatalogoId, setProdutoCatalogoId] = useState('');
  const [quantidadeInicial, setQuantidadeInicial] = useState(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState(5);
  const [estoqueCritico, setEstoqueCritico] = useState(2);
  const [loading, setLoading] = useState(false);

  const handleAtribuir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !produtoCatalogoId) return alert('Selecione o cliente e o produto.');

    setLoading(true);
    try {
      // 1. Criar o vínculo no estoque do cliente
 const { data: produtoCliente, error: errVinculo } = await supabase
      .from('produtos_cliente')
      .upsert([{
        cliente_id: clienteId,
        produto_catalogo_id: produtoCatalogoId,
        quantidade_atual: quantidadeInicial,
        estoque_minimo: estoqueMinimo,
        estoque_critico: estoqueCritico
      }], { onConflict: 'cliente_id,produto_catalogo_id' })
      .select()
      .single();

      if (errVinculo) throw errVinculo;

      // 2. Se houver quantidade inicial, registrar movimentação de ENTRADA
      if (quantidadeInicial > 0 && produtoCliente) {
        const { error: errMov } = await supabase
          .from('movimentacoes')
          .insert([{
            produto_cliente_id: produtoCliente.id,
            tipo: 'ENTRADA',
            quantidade: quantidadeInicial,
            motivo: 'Estoque Inicial de Atribuição',
            responsavel: 'Administrador'
          }]);

        if (errMov) throw errMov;
      }

      alert('Produto atribuído ao cliente com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Erro ao atribuir produto: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2 className="text-xl font-bold mb-4">Vincular Item ao Cliente</h2>
        <form onSubmit={handleAtribuir} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cliente</label>
            <select 
              value={clienteId} 
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full border rounded p-2"
              required
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Item do Catálogo Geral</label>
            <select 
              value={produtoCatalogoId} 
              onChange={(e) => setProdutoCatalogoId(e.target.value)}
              className="w-full border rounded p-2"
              required
            >
              <option value="">Selecione um produto...</option>
              {produtosCatalogo.map(p => (
                <option key={p.id} value={p.id}>{p.nome} - {p.tamanho}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
  <div>
    <label className="block text-xs font-medium mb-1">Qtd. Inicial</label>
    <input
      type="number"
      value={quantidadeInicial === 0 ? '' : quantidadeInicial}
      onChange={(e) => setQuantidadeInicial(e.target.value === '' ? 0 : Number(e.target.value))}
      className="w-full border rounded p-2"
      placeholder="0"
      min="0"
    />
  </div>

  <div>
    <label className="block text-xs font-medium mb-1">Estoque Min.</label>
    <input
      type="number"
      value={estoqueMinimo === 0 ? '' : estoqueMinimo}
      onChange={(e) => setEstoqueMinimo(e.target.value === '' ? 0 : Number(e.target.value))}
      className="w-full border rounded p-2"
      placeholder="0"
      min="0"
    />
  </div>

  <div>
    <label className="block text-xs font-medium mb-1">Estoque Crit.</label>
    <input
      type="number"
      value={estoqueCritico === 0 ? '' : estoqueCritico}
      onChange={(e) => setEstoqueCritico(e.target.value === '' ? 0 : Number(e.target.value))}
      className="w-full border rounded p-2"
      placeholder="0"
      min="0"
    />
  </div>
</div>

          <div className="flex justify-end space-x-2 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Atribuir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}