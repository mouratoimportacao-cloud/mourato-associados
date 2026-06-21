# Roadmap Técnico — Nível Prime

**Projeto:** Mourato & Associados  
**Estado atual:** Semi-comercial (6/10)  
**Meta:** Site comercial de alta conversão (9/10)

---

## Fase 1 — Performance (CRÍTICO)
> Impacto direto em vendas: página lenta = cliente abandona  
> Prazo sugerido: 1-2 dias

| # | Tarefa | Motivo | Esforço |
|---|--------|--------|---------|
| 1.1 | Extrair imagens base64 do banco → salvar como `.webp` no `/public/uploads/` | Página atual: 2.96 MB (88% base64). Precisa cair para ~0.3 MB | Médio |
| 1.2 | Atualizar banco com URLs das imagens no lugar do base64 | Banco JSONB fica leve, queries rápidas | Baixo |
| 1.3 | Usar `next/image` nos componentes de produto | Lazy loading, resize automático, CDN da Vercel | Médio |
| 1.4 | Implementar ISR/revalidate na página de produtos | Cachear HTML por 60s ao invés de rebuild a cada request | Baixo |
| 1.5 | Recriar `manifest.json` | PWA quebrou (foi removido). Necessário para instalação mobile | Baixo |

**Resultado esperado:**  
- Página: 2.96 MB → ~0.3 MB  
- TTFB: 2.7s → ~0.5s  
- Lighthouse Performance: ~40 → ~85+

---

## Fase 2 — SEO & Indexação
> Impacto: aparecer no Google, Google Shopping, ranquear organicamente  
> Prazo sugerido: 1 dia

| # | Tarefa | Motivo | Esforço |
|---|--------|--------|---------|
| 2.1 | Adicionar `robots.txt` | Permite crawlers indexarem o site | Baixo |
| 2.2 | Criar `sitemap.xml` dinâmico | Google descobre todas as páginas | Baixo |
| 2.3 | Adicionar canonical URL em todas as páginas | Evita conteúdo duplicado | Baixo |
| 2.4 | Implementar JSON-LD (Product schema) | Produtos aparecem no Google Shopping / rich results | Médio |
| 2.5 | Meta description única por produto (se tiver página individual) | Cada produto ranqueia separadamente | Médio |

**Resultado esperado:**  
- Site indexado pelo Google em 1-2 semanas  
- Produtos elegíveis para Google Shopping  

---

## Fase 3 — Legal & Confiança
> Impacto: obrigatório para vender online no Brasil (LGPD), gera confiança  
> Prazo sugerido: 1 dia

| # | Tarefa | Motivo | Esforço |
|---|--------|--------|---------|
| 3.1 | Página de Política de Privacidade | Obrigatório (LGPD) | Baixo |
| 3.2 | Página de Termos de Uso | Protege legalmente | Baixo |
| 3.3 | Banner de cookie consent | LGPD exige consentimento | Baixo |
| 3.4 | CNPJ/razão social no footer | Transmite confiança | Baixo |

**Resultado esperado:**  
- Conformidade com LGPD  
- Maior taxa de conversão (confiança)

---

## Fase 4 — Analytics & Métricas
> Impacto: sem dados, não há como otimizar vendas  
> Prazo sugerido: meio dia

| # | Tarefa | Motivo | Esforço |
|---|--------|--------|---------|
| 4.1 | Integrar Google Analytics 4 (GA4) | Saber quantos visitam, de onde vêm, o que compram | Baixo |
| 4.2 | Pixel do Meta (Facebook/Instagram) | Remarketing para quem visitou | Baixo |
| 4.3 | Eventos de conversão (add_to_cart, purchase) | Medir funil de vendas | Médio |

**Resultado esperado:**  
- Dados reais de tráfego e conversão  
- Base para campanhas de remarketing

---

## Fase 5 — Conversão & Checkout
> Impacto: transformar visitante em comprador sem sair do site  
> Prazo sugerido: 3-5 dias

| # | Tarefa | Motivo | Esforço |
|---|--------|--------|---------|
| 5.1 | Integrar Mercado Pago (PIX + Cartão) | Pagamento direto no site | Alto |
| 5.2 | Fluxo de checkout completo | Endereço, resumo, confirmação | Alto |
| 5.3 | Email transacional (confirmação de pedido) | Profissionalismo, reduz dúvidas | Médio |
| 5.4 | Página de produto individual (`/produtos/[id]`) | SEO + compartilhamento + detalhes | Médio |
| 5.5 | Cálculo de frete (Correios/Melhor Envio) | Transparência no custo total | Médio |

**Resultado esperado:**  
- Venda 100% online sem WhatsApp  
- Aumento de 3-5x na conversão

---

## Fase 6 — Retenção & Marketing
> Impacto: fazer o cliente voltar e comprar novamente  
> Prazo sugerido: 2-3 dias

| # | Tarefa | Motivo | Esforço |
|---|--------|--------|---------|
| 6.1 | Reviews/avaliações de produtos | Prova social | Médio |
| 6.2 | Cupom de desconto para primeira compra | Incentiva conversão | Baixo |
| 6.3 | Email marketing (newsletter) | Retenção | Médio |
| 6.4 | Notificações push (PWA) | Engajamento | Médio |
| 6.5 | Programa de indicação (lojistas) | Growth orgânico | Já existe |

---

## Fase 7 — CI/CD & Qualidade
> Impacto: segurança para evoluir sem quebrar produção  
> Prazo sugerido: meio dia

| # | Tarefa | Motivo | Esforço |
|---|--------|--------|---------|
| 7.1 | GitHub Actions: lint + build em PRs | Evita deploy de código quebrado | Baixo |
| 7.2 | Branch `dev` para desenvolvimento | Protege `main` (produção) | Baixo |
| 7.3 | Preview deploys por PR | Testar antes de ir para produção | Já existe (Vercel) |

---

## Resumo de Prioridade

```
🔴 URGENTE (faz hoje)     → Fase 1 (Performance)
🟠 IMPORTANTE (essa semana) → Fase 2 (SEO) + Fase 3 (Legal)
🟡 NECESSÁRIO (próx semana) → Fase 4 (Analytics) + Fase 7 (CI/CD)
🟢 EVOLUÇÃO (próximas 2-3 semanas) → Fase 5 (Checkout) + Fase 6 (Retenção)
```

---

## Métrica de Sucesso

| Métrica | Hoje | Meta Prime |
|---------|------|------------|
| Page Size | 2.96 MB | < 0.5 MB |
| TTFB | 2.7s | < 0.8s |
| Lighthouse Performance | ~40 | 85+ |
| Lighthouse SEO | ~70 | 95+ |
| Conversão (estimada) | WhatsApp only | Checkout online |
| Google indexado | Parcial | Completo com rich results |
