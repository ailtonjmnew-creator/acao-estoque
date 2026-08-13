"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// Inicialização do Supabase usando as variáveis de ambiente da Vercel
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

  // Formulário de Cadastro Expresso
  const [novoNome, setNovoNome] = useState("");
  const [novaMatricula, setNovaMatricula] = useState("");
  const [novoCracha, setNovoCracha] = useState("");
  const [novaUnidade, setNovaUnidade] = useState("Atacadão Costa - Goiânia");
  const [novoSetor, setNovoSetor] = useState("");

  const inputBuscaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Manter o cursor focado no campo de busca para pronto uso do leitor de crachá
    if (inputBuscaRef.current && !modalCadastroAberto) {
      inputBuscaRef.current.focus();
    }
  }, [modalCadastroAberto, funcionarioSelecionado]);

  // Consultar colaboradores no Supabase em tempo real
  const buscarFuncionarios = async (termo: string) => {
    setBusca(termo);
    if (!termo.trim()) {
      setFuncionarios([]);
      return;
    }

    setCarregando(true);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("funcionarios")
          .select("*")
          .or(`nome.ilike.%${termo}%,matricula.ilike.%${termo}%,codigo_cracha.eq.${termo}`)
          .limit(10);

        if (!error && data) {
          setFuncionarios(data);
          // Seleção automática caso o leitor faça uma leitura exata do crachá ou matrícula
          const buscaExata = data.find(f => f.codigo_cracha === termo || f.matricula === termo);
          if (buscaExata) {
            setFuncionarioSelecionado(buscaExata);
          }
        }
      } catch (err) {
        console.error("Erro na consulta:", err);
      }
    }
    setCarregando(false);
  };

  // Processar o Cadastro Expresso
  const salvarNovoFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome || !novaMatricula) {
      alert("Por favor, preencha o Nome e a Matrícula/CPF.");
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
        alert("Erro ao gravar no banco de dados: " + error.message);
        return;
      }
      if (data && data[0]) {
        setFuncionarioSelecionado(data[0]);
      }
    } else {
      setFuncionarioSelecionado(novoColaborador);
    }

    // Limpar campos e fechar o modal
    setNovoNome("");
    setNovaMatricula("");
    setNovoCracha("");
    setNovoSetor("");
    setModalCadastroAberto(false);
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
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-lg"
            />
          </div>

          {/* Resultado da busca */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {carregando && <p className="text-sm text-slate-400 text-center py-2">Consultando banco de dados...</p>}
            
            {!carregando && busca && funcionarios.length === 0 && (
              <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg text-center">
                <p className="text-sm text-slate-400 mb-2">Colaborador não cadastrado para &quot;{busca}&quot;.</p>
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

          {/* Confirmação do Colaborador Selecionado */}
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

        {/* Bloco 2: Liberação e Entrega de Uniformes */}
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
                <select className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white">
                  <option>Camisa Polo Atacadão Costa - Tam G</option>
                  <option>Camisa Polo Atacadão Costa - Tam M</option>
                  <option>Camisa Polo Atacadão Costa - Tam GG</option>
                  <option>Calça Operacional Brim - Tam 42</option>
                  <option>Avental de Proteção - Tam Único</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Quantidade Entregue</label>
                <input type="number" defaultValue={1} min={1} className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white" />
              </div>

              <button
                onClick={() => {
                  alert(`Entrega registrada com sucesso para ${funcionarioSelecionado.nome}!`);
                  setFuncionarioSelecionado(null);
                  setBusca("");
                }}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-lg rounded-xl transition shadow-lg shadow-emerald-500/10"
              >
                Confirmar e Dar Baixa
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Modal de Cadastro Expresso */}
      {modalCadastroAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-amber-400 mb-1">Cadastro Expresso de Colaborador</h3>
            <p className="text-xs text-slate-400 mb-4">Insira os dados para realizar o cadastro e liberar a entrega no mesmo instante.</p>

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
                    placeholder="Ex: 10429"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Cód. Crachá</label>
                  <input
                    type="text"
                    value={novoCracha}
                    onChange={(e) => setNovoCracha(e.target.value)}
                    placeholder="Lido no leitor"
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
                    placeholder="Ex: Açougue / Caixas"
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
    </main>
  );
}
