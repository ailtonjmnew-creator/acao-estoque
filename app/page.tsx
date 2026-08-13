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
  const [carregando, setCarregando] = useState(false);
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);

  // Estados do Cadastro Expresso
  const [novoNome, setNovoNome] = useState("");
  const [novaMatricula, setNovaMatricula] = useState("");
  const [novoCracha, setNovoCracha] = useState("");
  const [novaUnidade, setNovaUnidade] = useState("Atacadão Costa - Goiânia");
  const [novoSetor, setNovoSetor] = useState("Caixa");

  // Estados da Entrega e Assinatura Digital
  const [itemSelecionado, setItemSelecionado] = useState("Camisa Polo Atacadão Costa - Tam G");
  const [quantidade, setQuantidade] = useState(1);
  const [modalAssinaturaAberto, setModalAssinaturaAberto] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const inputBuscaRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (inputBuscaRef.current && !modalCadastroAberto && !modalAssinaturaAberto) {
      inputBuscaRef.current.focus();
    }
  }, [modalCadastroAberto, modalAssinaturaAberto, funcionarioSelecionado]);

  // Consultar Colaborador no Supabase
  const buscarFuncionarios = async (termo: string) => {
    setBusca(termo);
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
        .limit(10);

      if (error) {
        console.error("Erro na busca:", error.message);
      } else if (data) {
        setFuncionarios(data);
        const exato = data.find(f => f.codigo_cracha === termo || f.matricula === termo);
        if (exato) setFuncionarioSelecionado(exato);
      }
    }
    setCarregando(false);
  };

  // Gravar Colaborador no Supabase
  const salvarNovoFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome || !novaMatricula) {
      alert("Preencha Nome e Matrícula.");
      return;
    }

    const novoColaborador: Funcionario = {
      nome: novoNome,
      matricula: novaMatricula,
      codigo_cracha: novoCracha || novaMatricula,
      unidade: novaUnidade,
      setor: novoSetor || "Geral",
    };

    if (supabase) {
      const { data, error } = await supabase.from("funcionarios").insert([novoColaborador]).select();
      
      if (error) {
        alert("Erro ao gravar no Supabase: " + error.message);
        return;
      }

      if (data && data[0]) {
        setFuncionarioSelecionado(data[0]);
        alert(`Colaborador ${data[0].nome} cadastrado e selecionado com sucesso!`);
      }
    } else {
      alert("Aviso: Supabase não conectado. Dados salvos apenas na sessão atual.");
      setFuncionarioSelecionado(novoColaborador);
    }

    setNovoNome("");
    setNovaMatricula("");
    setNovoCracha("");
    setModalCadastroAberto(false);
  };

  // Funções do Coletor de Assinatura Digital Canvas
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

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const limparAssinatura = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const finalizarEntregaComAssinatura = () => {
    alert(`Entrega efetuada com SUCESSO!\n\nColaborador: ${funcionarioSelecionado?.nome}\nItem: ${itemSelecionado}\nQtd: ${quantidade}\nAssinatura coletada.`);
    setModalAssinaturaAberto(false);
    setFuncionarioSelecionado(null);
    setBusca("");
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 md:p-8 font-sans">
      {/* Cabeçalho */}
      <header className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">AÇÃO ESTOQUE</h1>
          <p className="text-sm text-slate-400">Terminal Operacional de Entregas | Atacadão Costa</p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
          Sistema Ativo
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bloco 1: Identificação por Crachá ou Nome */}
        <section className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-200">1. Identificar Colaborador</h2>
            <button
              onClick={() => {
                setNovoCracha(busca);
                setModalCadastroAberto(true);
              }}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition"
            >
              + Cadastro Expresso
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">
              Escanear Crachá / Digitar Nome ou Matrícula
            </label>
            <input
              ref={inputBuscaRef}
              type="text"
              value={busca}
              onChange={(e) => buscarFuncionarios(e.target.value)}
              placeholder="Passe o crachá no leitor aqui..."
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-lg focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Resultado da Busca */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {carregando && <p className="text-sm text-slate-400 text-center py-2">Consultando banco de dados...</p>}
            
            {!carregando && busca && funcionarios.length === 0 && (
              <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg text-center">
                <p className="text-sm text-slate-400 mb-2">Nenhum cadastro encontrado para &quot;{busca}&quot;.</p>
                <button
                  onClick={() => {
                    setNovoCracha(busca);
                    setModalCadastroAberto(true);
                  }}
                  className="text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg transition"
                >
                  Cadastrar &quot;{busca}&quot; Agora
                </button>
              </div>
            )}

            {funcionarios.map((func) => (
              <div
                key={func.id || func.matricula}
                onClick={() => setFuncionarioSelecionado(func)}
                className={`p-3 rounded-lg border cursor-pointer transition flex justify-between items-center ${
                  funcionarioSelecionado?.matricula === func.matricula
                    ? "bg-amber-500/20 border-amber-400 text-amber-300"
                    : "bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-200"
                }`}
              >
                <div>
                  <p className="font-semibold text-base">{func.nome}</p>
                  <p className="text-xs text-slate-400">
                    Matrícula: {func.matricula} | Setor: {func.setor || "Geral"}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-slate-800 rounded border border-slate-600">
                  Selecionar
                </span>
              </div>
            ))}
          </div>

          {/* Confirmação do Selecionado */}
          {funcionarioSelecionado && (
            <div className="mt-4 p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl">
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Colaborador Confirmado</p>
              <p className="text-lg font-bold text-emerald-200">{funcionarioSelecionado.nome}</p>
              <p className="text-xs text-emerald-300/70">
                Matrícula: {funcionarioSelecionado.matricula} | Unidade: {funcionarioSelecionado.unidade || "Atacadão Costa"}
              </p>
            </div>
          )}
        </section>

        {/* Bloco 2: Liberação de Uniformes */}
        <section className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">2. Registrar Entrega de Uniforme</h2>
          
          {!funcionarioSelecionado ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-700 rounded-lg text-center p-4">
              Aguardando leitura do crachá ou seleção do colaborador ao lado.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Item do Estoque</label>
                <select
                  value={itemSelecionado}
                  onChange={(e) => setItemSelecionado(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white"
                >
                  <option>Camisa Polo Atacadão Costa - Tam G</option>
                  <option>Camisa Polo Atacadão Costa - Tam M</option>
                  <option>Camisa Polo Atacadão Costa - Tam GG</option>
                  <option>Calça Operacional Brim - Tam 42</option>
                  <option>Avental de Proteção - Tam Único</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Quantidade Entregue</label>
                <input
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  min={1}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <button
                onClick={() => setModalAssinaturaAberto(true)}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-lg rounded-xl transition shadow-lg shadow-emerald-500/10"
              >
                Avançar para Assinatura do Colaborador
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Modal 1: Cadastro Expresso */}
      {modalCadastroAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-amber-400 mb-1">Cadastro Expresso de Colaborador</h3>
            <p className="text-xs text-slate-400 mb-4">Insira os dados para salvar no banco de dados e liberar a entrega.</p>

            <form onSubmit={salvarNovoFuncionario} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
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
                    placeholder="Ex: 12345"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Cód. Crachá</label>
                  <input
                    type="text"
                    value={novoCracha}
                    onChange={(e) => setNovoCracha(e.target.value)}
                    placeholder="Ex: 54321"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
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
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Setor</label>
                  <input
                    type="text"
                    value={novoSetor}
                    onChange={(e) => setNovoSetor(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalCadastroAberto(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-sm transition"
                >
                  Salvar e Selecionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Assinatura Digital do Colaborador */}
      {modalAssinaturaAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-emerald-400 mb-1">Assinatura Digital de Recebimento</h3>
            <p className="text-xs text-slate-400 mb-4">
              Colaborador: <span className="text-white font-semibold">{funcionarioSelecionado?.nome}</span> | Item: <span className="text-white font-semibold">{itemSelecionado} ({quantidade}x)</span>
            </p>

            <div className="bg-slate-950 border-2 border-dashed border-slate-700 rounded-xl p-2 text-center mb-4 touch-none">
              <p className="text-xs text-slate-500 mb-2">Assine com o dedo ou caneta na caixa abaixo:</p>
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
                className="bg-slate-900 rounded-lg w-full cursor-crosshair border border-slate-800"
              />
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={limparAssinatura}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs rounded-lg transition"
              >
                Limpar Assinatura
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalAssinaturaAberto(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={finalizarEntregaComAssinatura}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-sm transition"
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
