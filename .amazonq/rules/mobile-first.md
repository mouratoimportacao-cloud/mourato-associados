# Regra: Mobile-First Obrigatório

Toda alteração visual (CSS, Tailwind, layout, componentes) DEVE:

1. Ser implementada primeiro para mobile (tela < 640px)
2. Depois adaptar para tablet (sm: 640px+) e desktop (md: 768px+, lg: 1024px+)
3. Sempre usar classes responsivas do Tailwind (sm:, md:, lg:) quando necessário
4. Testar mentalmente o layout em 375px de largura antes de finalizar
5. Nunca usar tamanhos fixos (px) que quebrem em telas pequenas — preferir %, vw, ou classes responsivas

Se um componente só funciona em desktop, está INCOMPLETO.
