'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PainelAdmin() {
  const [abaAtiva, setAbaAtiva] = useState<'movimentacao' | 'uniforme' | 'cliente' | 'usuario'>('movimentacao');

  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  const [erroSupabase, setErroSupabase] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

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
      // Busca Clientes
      const { data: dClientes, error: errC } = await supabase.from('clientes').select('*');
      if (errC) console.error('Erro Clientes:', errC);
      if (dClientes) setClientes(dClientes);

      // Busca Produtos
      const { data: dProdutos, error: errP } = await supabase.from('produtos').select('*');
      if (errP) {
        console.error('Erro Produtos Supabase:', errP);
        setErroSupabase(`Erro ao buscar produtos: ${errP.message}`);
      } else if (dProdutos) {
        console.log('Produtos carregados:', dProdutos);
        setProdutos(dProdutos);
      }

      // Busca Usuários
      const { data: dUsuarios, error: errU } = await supabase.from('usuarios').select('*');
      if (errU) console.error('Erro Usuários:', errU);
      if (dUsuarios) setUsuarios(dUsuarios);

    } catch (err: any) {
      console.error('Erro geral:', err);
      setErroSupabase(`Falha de conexão: ${err?.message || 'Erro desconhecido'}`);
    }
  }

  const mostrarAlerta = (texto: string, tipo = 'sucesso') => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
  };

  const gerarCodigoAuto = () => `UNI-${Math.floor(1000 + Math.random() * 9000)}`;

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

    const payload = {
      produto_id: movItem,
      cliente_id: movCliente || null,
      tipo_movimento: movTipo,
      quantidade: Number(movQtd),
      observacao: movObs,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('estoque').insert([payload]);
    if (error) {
      mostrarAlerta(`Erro na movimentação: ${error.message}`, 'erro');
    } else {
      mostrarAlerta(`Movimentação de ${movTipo} efetuada com sucesso!`);
      setMovItem('');
      setMovQtd(1);
      setMovObs('');
      await carregarDados();
    }
  };

  // Cálculo total de peças
  const totalPecas = produtos.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Ação Estoque</h1>
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded">Ação Uniformes</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Plataforma de Gestão, Controle de Estoque e Alertas Automáticos</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={carregarDados}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow"
            >
              🔄 Recarregar Dados
            </button>
          </div>
        </div>

        {erroSupabase && (
          <div className="p-4 rounded-xl text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            ⚠️ <strong>Erro no Supabase:</strong> {erroSupabase}
          </div>
        )}

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
            <p className="text-2xl font-black text-amber-600 mt-1">0 itens</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-red-600 uppercase">Nível Crítico</p>
            <p className="text-2xl font-black text-red-600 mt-1">0 itens</p>
          </div>
        </div>

        <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-2">
          <button
            onClick={() => setAbaAtiva('movimentacao')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'movimentacao' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📦 Movimentação (Entrada/Saída)
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
                    onChange={(e) => setMovItem(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-xs bg-white font-medium text-slate-800"
                    required
                  >
                    <option value="">
                      {produtos.length === 0
                        ? '-- Nenhum produto encontrado --'
                        : `-- Escolha um Item (${produtos.length} disponíveis) --`}
                    </option>
                    {produtos.map((p, idx) => {
                      const idVal = p.id || p.produto_id || p.codigo || idx;
                      const nomeExibicao = p.descricao || p.nome || `Produto #${idx + 1}`;
                      const codExibicao = p.codigo ? `(${p.codigo})` : '';
                      return (
                        <option key={idVal} value={idVal}>
                          {nomeExibicao} {codExibicao}
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
                    <option value="SAIDA">🔴 Saída (Retirada de Estoque)</option>
                    <option value="ENTRADA">🟢 Entrada (Lançamento de Compra)</option>
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
                    className="w-full p-2.5 border rounded-lg text-xs"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Observação / Solicitação / Colaborador</label>
                  <input
                    type="text"
                    value={movObs}
                    onChange={(e) => setMovObs(e.target.value)}
                    placeholder="Ex: Lote mensal / Almoxarifado"
                    className="w-full p-2.5 border rounded-lg text-xs"
                  />
                </div>
              </div>

              <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs hover:bg-blue-700 transition-colors">
                Confirmar Movimentação
              </button>
            </form>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <h3 className="text-base font-bold text-slate-800 mb-4">Posição Geral do Estoque</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-[11px] text-slate-400 uppercase font-bold">
                    <th className="p-3">CÓDIGO</th>
                    <th className="p-3">UNIFORME / DESCRIÇÃO</th>
                    <th className="p-3">QTD. ESTOQUE</th>
                    <th className="p-3">ESTOQUE MÍNIMO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {produtos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400 font-medium">
                        Nenhum produto cadastrado até o momento.
                      </td>
                    </tr>
                  ) : (
                    produtos.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="p-3 font-mono font-bold text-blue-600">{item.codigo || '—'}</td>
                        <td className="p-3 font-bold text-slate-800">{item.descricao || item.nome || '—'}</td>
                        <td className="p-3 font-bold text-slate-700">{item.quantidade ?? 0} un</td>
                        <td className="p-3 font-bold text-slate-700">{item.estoque_minimo || 10} un</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                <label className="block text-xs font-bold text-slate-600 mb-1">Estoque Mínimo (Alerta Laranja)</label>
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