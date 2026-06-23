const fs = require('fs');
let code = fs.readFileSync('lib/prisma.ts', 'utf8');

// 1. Add types
const typesToAdd = `
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
  totalDespesas: number;
  saldoBancario: number;
  resultado: number;
  dadosDespesas?: any;
};
`;
code = code.replace('type TableName = "Produto" | "Pedido" | "Usuario";', typesToAdd + '\ntype TableName = "Produto" | "Pedido" | "Usuario" | "Despesa" | "FechamentoMensal";');

// 2. Add columns
code = code.replace(
  '    "createdAt",\n  ],\n} as const;',
  '    "createdAt",\n  ],\n  Despesa: ["id", "data", "categoria", "valor", "observacao", "createdAt"],\n  FechamentoMensal: ["id", "mesAno", "receitaAtacado", "receitaSite", "receitaTotal", "cmv", "valorEstoque", "totalDespesas", "saldoBancario", "resultado", "dadosDespesas", "createdAt"]\n} as const;'
);

// 3. Add to emptyStore
code = code.replace(
  '      Usuario: [],\n    } as Record<TableName, MemoryRow[]>,',
  '      Usuario: [],\n      Despesa: [],\n      FechamentoMensal: [],\n    } as Record<TableName, MemoryRow[]>,'
);
code = code.replace(
  '      Usuario: 0,\n    } as Record<TableName, number>,',
  '      Usuario: 0,\n      Despesa: 0,\n      FechamentoMensal: 0,\n    } as Record<TableName, number>,'
);

// 4. Add to loadLocalStore & loadPostgresStore
code = code.replace(
  /        Usuario: parsed\.rows\?\.Usuario \?\? \[\],/g,
  '        Usuario: parsed.rows?.Usuario ?? [],\n        Despesa: parsed.rows?.Despesa ?? [],\n        FechamentoMensal: parsed.rows?.FechamentoMensal ?? [],'
);
code = code.replace(
  /        Usuario: parsed\.seq\?\.Usuario \?\? 0,/g,
  '        Usuario: parsed.seq?.Usuario ?? 0,\n        Despesa: parsed.seq?.Despesa ?? 0,\n        FechamentoMensal: parsed.seq?.FechamentoMensal ?? 0,'
);

// 5. Export
const exportToAdd = `
  despesa: {
    ...model("Despesa"),
    create: (args: WriteArgs<DespesaData>) => insert("Despesa", args.data),
    update: (args: UpdateArgs<Partial<DespesaData>>) => update("Despesa", args),
    delete: (args: DeleteArgs) => remove("Despesa", args),
  },
  fechamentoMensal: {
    ...model("FechamentoMensal"),
    create: (args: WriteArgs<FechamentoMensalData>) => insert("FechamentoMensal", args.data),
    update: (args: UpdateArgs<Partial<FechamentoMensalData>>) => update("FechamentoMensal", args),
    delete: (args: DeleteArgs) => remove("FechamentoMensal", args),
  },
`;
code = code.replace('export const prisma = {', 'export const prisma = {' + exportToAdd);

fs.writeFileSync('lib/prisma.ts', code);
