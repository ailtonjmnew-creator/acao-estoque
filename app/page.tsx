"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

interface Funcionario {
  id?: string;
  nome: string;
  matricula: string;
  codigo_cracha?: string;
  unidade?: string;
  setor?: string;
}

export default function Home() {
  const [busca, setBusca] = useState("");
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<Funcionario | null>(null);
  const [isAvulso, setIsAvulso] = useState(false);
  const [nomeAvulso, setNomeAvulso] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Modais
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [modalAssinaturaAberto, setModalAssinaturaAberto] = useState(false);

  // Cadastro Expresso
  const [novoNome, setNovoNome] = useState("");
  const [novaMatricula, setNovaMatricula] = useState("");
  const [novoCracha, setNovoCracha] = useState("");
  const [novaUnidade, setNovaUnidade] = useState("Unidade Principal");
  const [novoSetor, setNovoSetor] = useState("Operacional");

  // Atributos de Peças (Flexíveis)
  const [produto, setProduto] = useState("Camisa Polo");
  const [tecido, setTecido] = useState("Malha Piquet Premium");
  const [cor, setCor] = useState("Azul Marinho");
  const [tamanho, setTamanho] = useState("G");
  const [quantidade, setQuantidade] = useState(1);

  // Assinatura Canvas
  const [isDrawing, setIsDrawing] = useState(false);
  const inputBuscaRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (inputBuscaRef.current && !modalCadastroAberto && !modalAssinaturaAberto) {
      inputBuscaRef.current.focus();
    }
  }, [modalCadastroAberto, modalAssinaturaAberto]);

  // Consultar Colaborador
  const buscarFuncionarios = async (termo: string) => {
    setBusca(termo);
    setIsAvulso(false);
    if (!termo.trim()) {
      setFuncionarios([]);
      return;
    }

    setCarregando(true);
    if (supabase) {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("*")
        .or(`nome.ilike.%${termo}%,matricula.ilike.%${termo}%,codigo_cracha.ilike.%${termo}%`)
        .limit(5);

      if (!error && data) setFuncionarios(data);
    }
    setCarregando(false);
  };

  // Salvar Novo Colaborador Expresso
  const salvarNovoFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    const novoColaborador: Funcionario = {
      nome: novoNome,
      matricula: novaMatricula,
      codigo_cracha: novoCracha || novaMatricula,
      unidade: novaUnidade,
      setor: novoSetor,
    };

    if (supabase) {
      const { data } = await supabase.from("funcionarios").insert([novoColaborador]).select();
      if (data && data[0]) setFuncionarioSelecionado(data[0]);
    } else {
      setFuncionarioSelecionado(novoColaborador);
    }

    setIsAvulso(false);
    setNovoNome("");
    setNovaMatricula("");
    setNovoCracha("");
    setModalCadastroAberto(false);
  };

  // Funções da Assinatura Touch / Mouse
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const limparAssinatura = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const finalizarEntrega = () => {
    const nomeFinal = isAvulso ? nomeAvulso : funcionarioSelecionado?.nome;
    alert(`✅ ENTREGA REGISTRADA COM SUCESSO!\n\nRecebedor: ${nomeFinal} ${isAvulso ? "(Avulso)" : ""}\nItem: ${produto} - ${tecido} (${cor} / Tam: ${tamanho})\nQtd: ${quantidade} un.\n\nAssinatura digital capturada e baixa registrada no estoque.`);
    setModalAssinaturaAberto(false);
    setFuncionarioSelecionado(null);
    setIsAvulso(false);
    setNomeAvulso("");
    setBusca("");
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 md:p-8 font-sans">
      {/* Cabeçalho Institucional com Logotipo da Ação Uniformes */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-6 shadow-xl gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* LOGOTIPO OFICIAL */}
            <img 
              src="/logo.png" 
              alt="Ação Uniformes Profissionais" 
              className="h-10 md:h-12 w-auto object-contain"
              onError={(e) => {
                // Se a imagem ainda não estiver na pasta public, exibe a marca em texto formatado
                e.currentTarget.style.display = 'none';
                const fallback = document.getElementById('fallback-title');
                if (fallback) fallback.style.display = 'block';
              }}
            />

            <h1 id="fallback-title" className="text-2xl md:text-3xl font-black tracking-wider text-amber-400 hidden">
              AÇÃO UNIFORMES PROFISSIONAIS
            </h1>

            <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-500/30">
              Ação Estoque • Demonstração
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Sistema Módulo Almoxarifado • Gestão e Controle de Entregas
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-700 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-300 font-medium">Terminal Ativo & Sincronizado</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LADO ESQUERDO: Identificação do Colaborador / Avulso */}
        <section className="lg:col-span-6 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">1</span>
                Identificar Recebedor
              </h2>
              
              <button
                onClick={() => setModalCadastroAberto(true)}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-lg transition shadow-md"
              >
                + Cadastrar Novo
              </button>
            </div>

            {/* Alternador de Modo: Cadastrado vs Avulso */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl mb-4 border border-slate-800">
              <button
                onClick={() => { setIsAvulso(false); setFuncionarioSelecionado(null); }}
                className={`py-2 text-xs font-bold rounded-lg transition ${!isAvulso ? "bg-slate-800 text-amber-400 shadow" : "text-slate-400 hover:text-white"}`}
              >
                Colaborador Cadastrado
              </button>
              <button
                onClick={() => { setIsAvulso(true); setFuncionarioSelecionado(null); setBusca(""); }}
                className={`py-2 text-xs font-bold rounded-lg transition ${isAvulso ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"}`}
              >
                Entrega Avulsa (Sem Cadastro)
              </button>
            </div>

            {!isAvulso ? (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Buscar por Nome, Matrícula ou Bipar Crachá
                  </label>
                  <input
                    ref={inputBuscaRef}
                    type="text"
                    value={busca}
                    onChange={(e) => buscarFuncionarios(e.target.value)}
                    placeholder="Digite ou bipe o crachá..."
                    className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium text-base focus:outline-none focus:border-amber-400 transition"
                  />
                </div>

                {/* Lista de Resultados de Busca */}
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {carregando && <p className="text-xs text-slate-400 text-center py-3">Buscando colaborador...</p>}
                  
                  {!carregando && busca && funcionarios.length === 0 && (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                      <p className="text-xs text-slate-400 mb-2">Nenhum colaborador encontrado para &quot;{busca}&quot;.</p>
                      <button
                        onClick={() => { setNovoCracha(busca); setModalCadastroAberto(true); }}
                        className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg"
                      >
                        Cadastrar &quot;{busca}&quot; Agora
                      </button>
                    </div>
                  )}

                  {funcionarios.map((func) => (
                    <div
                      key={func.id || func.matricula}
                      onClick={() => setFuncionarioSelecionado(func)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                        funcionarioSelecionado?.matricula === func.matricula
                          ? "bg-amber-500/20 border-amber-400 text-amber-300"
                          : "bg-slate-950 border-slate-800 hover:border-slate-600 text-slate-200"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-sm">{func.nome}</p>
                        <p className="text-xs text-slate-400">Matrícula: {func.matricula} | Setor: {func.setor || "Geral"}</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300">Selecionar</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Identificação do Recebedor Avulso</p>
                <label className="block text-xs text-slate-300 mb-1">Nome Completo do Responsável/Retirante *</label>
                <input
                  type="text"
                  value={nomeAvulso}
                  onChange={(e) => setNomeAvulso(e.target.value)}
                  placeholder="Ex: Carlos Silva (Prestador / Novo Contratado)"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-400 mt-2">
                  * Esta modalidade permite entregar o uniforme imediatamente, exigindo a assinatura do recebedor na etapa seguinte.
                </p>
              </div>
            )}
          </div>

          {/* Card de Confirmação do Selecionado */}
          {(funcionarioSelecionado || (isAvulso && nomeAvulso.trim())) && (
            <div className="mt-4 p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Pronto para Liberação</p>
                <p className="text-base font-bold text-emerald-200">
                  {isAvulso ? nomeAvulso : funcionarioSelecionado?.nome}
                </p>
                <p className="text-xs text-emerald-300/70">
                  {isAvulso ? "Retirada Avulsa Confirmada" : `Matrícula: ${funcionarioSelecionado?.matricula}`}
                </p>
              </div>
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
          )}
        </section>

        {/* LADO DIREITO: Seleção de Uniformes e Tecidos */}
        <section className="lg:col-span-6 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">2</span>
              Selecionar Peça & Lançamento
            </h2>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Modelo de Uniforme</label>
                  <select
                    value={produto}
                    onChange={(e) => setProduto(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option>Camisa Polo</option>
                    <option>Camiseta Gola O</option>
                    <option>Camisa Social Executive</option>
                    <option>Calça Operacional Brim</option>
                    <option>Jaleco Brim Heavy</option>
                    <option>Avental de Proteção</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tecido / Malha</label>
                  <select
                    value={tecido}
                    onChange={(e) => setTecido(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option>Malha Piquet Premium</option>
                    <option>Brim Profissional Heavy</option>
                    <option>Tricoline Mista</option>
                    <option>Helanca Escolar/Ind.</option>
                    <option>Terbrim Cedro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Cor</label>
                  <select
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option>Azul Marinho</option>
                    <option>Preto Especial</option>
                    <option>Cinza Grafite</option>
                    <option>Branco</option>
                    <option>Verde Bandeira</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tamanho</label>
                  <select
                    value={tamanho}
                    onChange={(e) => setTamanho(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option>P</option>
                    <option>M</option>
                    <option>G</option>
                    <option>GG</option>
                    <option>EG</option>
                    <option>Tam. 42</option>
                    <option>Tam. 44</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Qtd. Entregue</label>
                  <input
                    type="number"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                    min={1}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm text-center font-bold"
                  />
                </div>
              </div>

              {/* Informação do Saldo Disponível */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Saldo Atual em Estoque:</span>
                <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30">
                  28 unidades disponíveis
                </span>
              </div>
            </div>
          </div>

          <button
            disabled={!funcionarioSelecionado && (!isAvulso || !nomeAvulso.trim())}
            onClick={() => setModalAssinaturaAberto(true)}
            className="w-full mt-6 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-black text-lg rounded-xl transition shadow-lg shadow-emerald-500/10"
          >
            Avançar para Assinatura do Colaborador ➔
          </button>
        </section>
      </div>

      {/* MODAL 1: CADASTRO EXPRESSO DE COLABORADOR */}
      {modalCadastroAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-amber-400 mb-1">Cadastro Expresso de Colaborador</h3>
            <p className="text-xs text-slate-400 mb-4">Insira os dados para liberar a entrega imediatamente.</p>

            <form onSubmit={salvarNovoFuncionario} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Roberto Alves"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Matrícula / CPF *</label>
                  <input
                    type="text"
                    required
                    value={novaMatricula}
                    onChange={(e) => setNovaMatricula(e.target.value)}
                    placeholder="Ex: 9988"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Cód. Crachá</label>
                  <input
                    type="text"
                    value={novoCracha}
                    onChange={(e) => setNovoCracha(e.target.value)}
                    placeholder="Ex: 112233"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Unidade</label>
                  <input
                    type="text"
                    value={novaUnidade}
                    onChange={(e) => setNovaUnidade(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Setor</label>
                  <input
                    type="text"
                    value={novoSetor}
                    onChange={(e) => setNovoSetor(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalCadastroAberto(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition"
                >
                  Salvar e Selecionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSINATURA DIGITAL NO TOUCH / MOUSE */}
      {modalAssinaturaAberto && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-emerald-400 mb-1">Assinatura Digital de Recebimento</h3>
            <p className="text-xs text-slate-300 mb-4">
              Recebedor: <span className="text-amber-400 font-bold">{isAvulso ? nomeAvulso : funcionarioSelecionado?.nome}</span> | Item: <span className="text-white font-semibold">{produto} - {tecido} ({quantidade}x)</span>
            </p>

            <div className="bg-slate-950 border-2 border-dashed border-slate-700 rounded-2xl p-2 text-center mb-4 touch-none">
              <p className="text-[11px] text-slate-500 mb-2">Assine com o dedo ou caneta touch na caixa abaixo:</p>
              <canvas
                ref={canvasRef}
                width={440}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="bg-slate-900 rounded-xl w-full cursor-crosshair border border-slate-800"
              />
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={limparAssinatura}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-xs rounded-xl transition"
              >
                Limpar Assinatura
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalAssinaturaAberto(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={finalizarEntrega}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm transition shadow-lg shadow-emerald-500/20"
                >
                  Confirmar e Dar Baixa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
