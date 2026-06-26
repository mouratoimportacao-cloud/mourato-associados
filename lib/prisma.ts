import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type OrderBy = Record<string, "asc" | "desc">;
type Select = Record<string, boolean>;
type Where =
  | Record<string, unknown>
  | {
      OR?: Record<string, unknown>[];
    };

interface FindManyArgs {
  where?: Where;
  select?: Select;
  orderBy?: OrderBy;
  take?: number;
}

interface CountArgs {
  where?: Where;
}

interface WriteArgs<T> {
  data: T;
}

interface UpdateArgs<T> {
  where: { id: number };
  data: T;
}

interface DeleteArgs {
  where: { id: number };
}

type ProdutoData = {
  codigo?: number | null;
  nome: string;
  marca: string;
  categoria: string;
  volume: string;
  preco?: number | null;
  precoAtacado?: number | null;
  custoDolar?: number | null;
  cotacaoDolar?: number | null;
  estoque?: number;
  estoqueLojista?: number;
  vitrine?: boolean;
  promocaoAtiva?: boolean;
  descontoPercentual?: number | null;
  descricao?: string | null;
  imagem?: string | null;
  categoria_principal?: string | null;
  tags?: string[] | null;
  concentracao?: string | null;
  origem?: string | null;
  tipo_perfume?: string | null;
  genero?: string | null;
  familia_olfativa?: string[] | null;
  notas_topo?: string | null;
  notas_coracao?: string | null;
  notas_fundo?: string | null;
  fixacao_estimada?: string | null;
  projecao?: string | null;
  ocasiao_uso?: string[] | null;
  similaridade_inspiracao?: string | null;
  descricao_olfativa?: string | null;
};

type UsuarioData = {
  nome: string;
  email: string;
  senha: string;
  tipo: string;
  documento?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  status?: string | null;
  resetToken?: string | null;
  resetExpiresAt?: string | null;
  resetRequestedAt?: string | null;
  codigoRevenda?: string | null;
  estoquePessoal?: Record<string, number> | null;
  precosVenda?: Record<string, number> | null;
  limiteAprovado?: number | null;
  historicoPagamentos?: any[] | null;
};

type PedidoData = {
  usuarioId: number;
  produtoId?: number;
  produtoNome?: string;
  quantidade?: number;
  precoUnitario?: number;
  precoTabela?: number | null;
  custoUnitario?: number | null;
  descontoConcedido?: number | null;
  lucroBruto?: number | null;
  tipoFluxo?: string | null;
  quantidadePagaFornecedor?: number | null;
  totalPagoFornecedor?: number | null;
  saldoFornecedor?: number | null;
  pagamento?: string;
  observacao?: string | null;
  total: number;
  status: string;
};

type LancamentoFinanceiroData = {
  data: string;
  competencia: string;
  tipo: string;
  grupo: string;
  categoria: string;
  valor: number;
  observacao?: string | null;
};

type FechamentoFinanceiroData = {
  competencia: string;
  fechadoEm: string;
  receitaAtacado: number;
  receitaSite: number;
  receitaTotal: number;
  cmv: number;
  estoque: number;
  contasReceber: number;
  totalDespesas: number;
  saldoBancario: number;
  resultadoOperacional: number;
  despesasPorCategoria: Record<string, number>;
};

type DespesaData = {
  data: string | Date;
  categoria: string;
  valor: number;
  observacao?: string | null;
};

type FechamentoMensalData = {
  mesAno: string;
  receitaAtacado: number;
  receitaSite: number;
  receitaTotal: number;
  cmv: number;
  valorEstoque: number;

export const prisma = new PrismaClient();


interface FindManyArgs {
  where?: Where;
  select?: Select;
  orderBy?: OrderBy;
  take?: number;
}

interface CountArgs {
  where?: Where;
}

interface WriteArgs<T> {
  data: T;
}

interface UpdateArgs<T> {
  where: { id: number };
  data: T;
}

interface DeleteArgs {
  where: { id: number };
}

type ProdutoData = {
  codigo?: number | null;
  nome: string;
  marca: string;
  categoria: string;
  volume: string;
  preco?: number | null;
  precoAtacado?: number | null;
  custoDolar?: number | null;
  cotacaoDolar?: number | null;
  estoque?: number;
  estoqueLojista?: number;
  vitrine?: boolean;
  promocaoAtiva?: boolean;
  descontoPercentual?: number | null;
  descricao?: string | null;
  imagem?: string | null;
  categoria_principal?: string | null;
  tags?: string[] | null;
  concentracao?: string | null;
  origem?: string | null;
  tipo_perfume?: string | null;
  genero?: string | null;
  familia_olfativa?: string[] | null;
  notas_topo?: string | null;
  notas_coracao?: string | null;
  notas_fundo?: string | null;
  fixacao_estimada?: string | null;
  projecao?: string | null;
  ocasiao_uso?: string[] | null;
  similaridade_inspiracao?: string | null;
  descricao_olfativa?: string | null;
};

type UsuarioData = {
  nome: string;
  email: string;
  senha: string;
  tipo: string;
  documento?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  status?: string | null;
  resetToken?: string | null;
  resetExpiresAt?: string | null;
  resetRequestedAt?: string | null;
  codigoRevenda?: string | null;
  estoquePessoal?: Record<string, number> | null;
  precosVenda?: Record<string, number> | null;
  limiteAprovado?: number | null;
  historicoPagamentos?: any[] | null;
};

type PedidoData = {
  usuarioId: number;
  produtoId?: number;
  produtoNome?: string;
  quantidade?: number;
  precoUnitario?: number;
  precoTabela?: number | null;
  custoUnitario?: number | null;
  descontoConcedido?: number | null;
  lucroBruto?: number | null;
  tipoFluxo?: string | null;
  quantidadePagaFornecedor?: number | null;
  totalPagoFornecedor?: number | null;
  saldoFornecedor?: number | null;
  pagamento?: string;
  observacao?: string | null;
  total: number;
  status: string;
};

type LancamentoFinanceiroData = {
  data: string;
  competencia: string;
  tipo: string;
  grupo: string;
  categoria: string;
  valor: number;
  observacao?: string | null;
};

type FechamentoFinanceiroData = {
  competencia: string;
  fechadoEm: string;
  receitaAtacado: number;
  receitaSite: number;
  receitaTotal: number;
  cmv: number;
  estoque: number;
  contasReceber: number;
  totalDespesas: number;
  saldoBancario: number;
  resultadoOperacional: number;
  despesasPorCategoria: Record<string, number>;
};

type DespesaData = {
  data: string | Date;
  categoria: string;
  valor: number;
  observacao?: string | null;
};

type FechamentoMensalData = {
  mesAno: string;
  receitaAtacado: number;
  receitaSite: number;
  receitaTotal: number;
  cmv: number;
  valorEstoque: number;
