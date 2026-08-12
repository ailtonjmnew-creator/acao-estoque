'use client';

import React, { useState, useRef } from 'react';

export default function SistemaAcaoEstoque() {
  const [abaAtiva, setAbaAtiva] = useState<'tablet' | 'admin'>('tablet');

  // Estado do Estoque Vivo
  const [estoque, setEstoque] = useState([
    { id: '1', sku: 'CIP-CBR-CIN-G', produto: 'Calça Brim', cor: 'Cinza', tamanho: 'G', qtd: 15, minimo: 20, barcode: '7890000000001' },
    { id: '2', sku: 'CIP-CAM-AZU-M', produto: 'Camisa Piquet Gola Polo', cor: 'Azul Marinho', tamanho: 'M', qtd: 45, minimo: 15, barcode: '7890000000002' },
    { id: '3', sku: 'CIP-JAC-IMP-GG', produto: 'Jaqueta Impermeável Refletiva', cor: 'Laranja/Cinza', tamanho: 'GG', qtd: 4, minimo: 10, barcode: '7890000000003' },
  ]);

  // Histórico de Movimentações (com foto/imagem da assinatura)
  const [historico, setHistorico] = useState<any[]>([
    { id: 1, funcionario: 'Maria Eduarda Santos', setor: 'Enfermagem', produto: 'Camisa Piquet Gola Polo (M)', qtd: 1, hora: '10:14', assinatura: null },
  ]);

  // Estados do Form Tablet
  const [funcionario, setFuncionario] = useState<{ id: string; nome: string; matricula: string; setor: string } | null>(null);
  const [buscaFuncionario, setBuscaFuncionario] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [skuDetectado, setSkuDetectado] = useState<any>(null);
  const [quantidadeEntrega, setQuantidadeEntrega] = useState(1);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);

  // Estado do Modal de Assinatura
  const [modalAssinaturaAberto, setModalAssinaturaAberto] = useState(false);

  // Referência do Canvas de Assinatura
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const funcionariosExemplo = [
    { id: '1', nome: 'João Carlos Silva', matricula: 'FUNC-001', setor: 'Manutenção' },
    { id: '2', nome: 'Maria Eduarda Santos', matricula: 'MED-102', setor: 'Enfermagem' },
    { id: '3', nome: 'Carlos Eduardo Lima', matricula: 'OP-504', setor: 'Operação Produção' }
  ];

  const handleSimularLeituraBip = (e: React.FormEvent) => {
    e.preventDefault();
    const produtoEncontrado = estoque.find(p => p.barcode === codigoBarras.trim());
    if (produtoEncontrado) {
      setSkuDetectado(produtoEncontrado);
    } else {
      alert('Código não encontrado! Tente bipar: 7890000000001 ou 7890000000002');
    }
  };

  // Funções de Desenho no Canvas (Mouse e Touch)
  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const limparAssinatura = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFinalizarComAssinatura = () => {
    if (!funcionario || !skuDetectado) return;

    // Converte o canvas para imagem em Base64
    const canvas = canvasRef.current;
    const assinaturaImg = canvas ? canvas.toDataURL() : null;

    // Reduz quantidade no estoque
    setEstoque(prev => prev.map(item => {
      if (item.id === skuDetectado.id) {
        return { ...item, qtd: Math.max(0, item.qtd - quantidadeEntrega) };
      }
      return item;
    }));

    // Registra no Histórico com a Assinatura
    const horaAtual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistorico(prev => [
      {
        id: Date.now(),
        funcionario: funcionario.nome,
        setor: funcionario.setor,
        produto: `${skuDetectado.produto} (${skuDetectado.tamanho})`,
        qtd: quantidadeEntrega,
        hora: horaAtual,
        assinatura: assinaturaImg
      },
      ...prev
    ]);

    setModalAssinaturaAberto(false);
    setMensagemSucesso(true);

    setTimeout(() => {
      setMensagemSucesso(false);
      setFuncionario(null);
      setSkuDetectado(null);
      setCodigoBarras('');
      setQuantidadeEntrega(1);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-6 font-sans">
      {/* Cabeçalho de Navegação do Protótipo */}
      <header className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-wider text-amber-400">AÇÃO ESTOQUE</h1>
            <p className="text-xs text-slate-400">Ciplan Cimentos • Gestão Integrada de Uniformes & EPIs</p>
          </div>

          <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700 w-full md:w-auto">
            <button
              onClick={() => setAbaAtiva('tablet')}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                abaAtiva === 'tablet' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📱</span> Terminal Tablet (Operador)
            </button>
            <button
              onClick={() => setAbaAtiva('admin')}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                abaAtiva === 'admin' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📊</span> Dashboard Admin (Ação Uniformes)
            </button>
          </div>
        </div>
      </header>

      {/* MÓDULO 1: TERMINAL TABLET */}
      {abaAtiva === 'tablet' && (
        <div className="space-y-6">
          {mensagemSucesso && (
            <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-lg font-bold animate-bounce">
              <span>✅</span> ENTREGA E TERMO ASSINADO COM SUCESSO!
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Passo 1: Selecionar Funcionário */}
            <section className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span>👤</span> 1. Identificar Funcionário
              </h2>

              {!funcionario ? (
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar por nome ou matrícula..."
                      value={buscaFuncionario}
                      onChange={(e) => setBuscaFuncionario(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {funcionariosExemplo
                      .filter(f => f.nome.toLowerCase().includes(buscaFuncionario.toLowerCase()) || f.matricula.toLowerCase().includes(buscaFuncionario.toLowerCase()))
                      .map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFuncionario(f)}
                          className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{f.nome}</p>
                            <p className="text-xs text-slate-500">{f.setor} • {f.matricula}</p>
                          </div>
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-lg">Selecionar</span>
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border-2 border-blue-500 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase">Funcionário Ativo</span>
                    <p className="text-base font-bold text-slate-900">{funcionario.nome}</p>
                    <p className="text-xs text-slate-600">{funcionario.setor} ({funcionario.matricula})</p>
                  </div>
                  <button
                    onClick={() => { setFuncionario(null); setSkuDetectado(null); }}
                    className="text-xs font-bold text-slate-500 hover:text-red-600 underline"
                  >
                    Trocar
                  </button>
                </div>
              )}
            </section>

            {/* Passo 2: Escanear & Solicitar Assinatura */}
            <section className={`lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ${!funcionario ? 'opacity-40 pointer-events-none' : ''}`}>
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span>🏷️</span> 2. Escanear Código de Barras
              </h2>

              <form onSubmit={handleSimularLeituraBip} className="flex gap-2 mb-6">
                <input
                  type="text"
                  placeholder="Bip do Leitor (ex: 7890000000001)..."
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  className="flex-1 p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button type="submit" className="bg-slate-900 text-white px-6 font-bold text-sm rounded-xl hover:bg-slate-800">
                  Bipar
                </button>
              </form>

              {skuDetectado && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-400">{skuDetectado.sku}</span>
                      <h3 className="text-lg font-bold text-slate-900">{skuDetectado.produto}</h3>
                      <p className="text-xs font-semibold text-slate-600">Cor: {skuDetectado.cor} | Tamanho: {skuDetectado.tamanho}</p>
                    </div>
                    <div className="bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Em Estoque</span>
                      <span className="text-base font-bold">{skuDetectado.qtd} un</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-700 text-sm">Quantidade a Entregar:</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setQuantidadeEntrega(Math.max(1, quantidadeEntrega - 1))} className="w-10 h-10 bg-slate-200 rounded-xl text-xl font-bold text-slate-700 hover:bg-slate-300 flex items-center justify-center">-</button>
                      <span className="text-xl font-bold text-slate-900 w-8 text-center">{quantidadeEntrega}</span>
                      <button onClick={() => setQuantidadeEntrega(Math.min(skuDetectado.qtd, quantidadeEntrega + 1))} className="w-10 h-10 bg-slate-200 rounded-xl text-xl font-bold text-slate-700 hover:bg-slate-300 flex items-center justify-center">+</button>
                    </div>
                  </div>

                  <button
                    onClick={() => setModalAssinaturaAberto(true)}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>✍️</span> AVANÇAR PARA ASSINATURA DO TERMO
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* MODAL DE ASSINATURA DIGITAL NA TELA DO TABLET */}
      {modalAssinaturaAberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Termo de Recebimento de Uniformes</h3>
                <p className="text-xs text-slate-500">Ciplan Cimentos • Controle de Entrega</p>
              </div>
              <button onClick={() => setModalAssinaturaAberto(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
            </div>

            {/* Texto Resumido do Termo Legal */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p><strong>Recebedor:</strong> {funcionario?.nome} ({funcionario?.matricula})</p>
              <p><strong>Item:</strong> {quantidadeEntrega}x {skuDetectado?.produto} ({skuDetectado?.tamanho})</p>
              <p className="text-[10px] text-slate-400 mt-2 italic">
                "Declaro ter recebido as peças acima identificadas em perfeito estado de conservação, comprometendo-me a utilizá-las exclusivamente em serviço."
              </p>
            </div>

            {/* Tela de Desenho para o Dedo/Mouse */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-700">Assine no quadro abaixo:</span>
                <button onClick={limparAssinatura} className="text-xs text-red-600 hover:underline font-bold">Limpar Desenho</button>
              </div>
              <canvas
                ref={canvasRef}
                width={440}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 touch-none cursor-crosshair"
              />
            </div>

            {/* Ações do Modal */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalAssinaturaAberto(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizarComAssinatura}
                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-sm shadow-md"
              >
                ✔ CONFIRMAR & SALVAR TERMO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÓDULO 2: DASHBOARD ADMIN */}
      {abaAtiva === 'admin' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Central de Alertas Ação Uniformes</p>
                <p className="text-xs text-slate-400">Os avisos de reposição de estoque mínimo são disparados automaticamente para o e-mail do administrador.</p>
              </div>
            </div>
            <span className="text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
              admin@acaouniformes.com.br
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase">Total de Itens Cadastrados</span>
              <p className="text-3xl font-extrabold text-slate-800 mt-1">{estoque.length} SKUs</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs font-bold text-amber-600 uppercase">Alertas Críticos para Admin</span>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">
                {estoque.filter(i => i.qtd <= i.minimo).length} Itens
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-xs font-bold text-blue-600 uppercase">Saídas com Termo Assinado</span>
              <p className="text-3xl font-extrabold text-blue-600 mt-1">{historico.length} Termos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span>📦</span> Gestão de Nível de Estoque (Ação Uniformes)
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase">
                      <th className="pb-3">SKU / Item</th>
                      <th className="pb-3">Tam</th>
                      <th className="pb-3 text-center">Estoque Atual</th>
                      <th className="pb-3 text-center">Mínimo</th>
                      <th className="pb-3 text-right">Status Alerta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estoque.map((item) => {
                      const eCritico = item.qtd <= item.minimo;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-3">
                            <p className="font-bold text-slate-800">{item.produto}</p>
                            <p className="text-xs font-mono text-slate-400">{item.sku}</p>
                          </td>
                          <td className="py-3 font-semibold text-slate-600">{item.tamanho}</td>
                          <td className="py-3 text-center font-extrabold text-slate-900">{item.qtd}</td>
                          <td className="py-3 text-center text-slate-400 font-medium">{item.minimo}</td>
                          <td className="py-3 text-right">
                            {eCritico ? (
                              <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">
                                🚨 Alerta Enviado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                                🟢 Ok
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Auditoria com Comprovante da Assinatura em Imagem */}
            <section className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span>📋</span> Auditoria de Termos Assinados
              </h2>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {historico.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{h.funcionario}</span>
                      <span className="text-slate-400 font-mono">{h.hora}</span>
                    </div>
                    <p className="text-slate-600">{h.produto} • <span className="font-bold text-blue-600">{h.qtd} un</span></p>

                    {/* Exibição da Assinatura Capturada */}
                    {h.assinatura ? (
                      <div className="bg-white p-2 rounded-lg border border-slate-200 mt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Comprovante Digital de Assinatura:</span>
                        <img src={h.assinatura} alt="Assinatura" className="h-12 border border-slate-100 rounded bg-slate-50 object-contain" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic block">Entrega legada (Sem assinatura gravada)</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}