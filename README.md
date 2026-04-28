# ⚡ DemandFlow

App de gestão de demandas e agenda para consultores. PWA — instala no celular como app nativo.

---

## 🚀 Como publicar (passo a passo)

### PASSO 1 — Supabase (banco de dados + login)
1. Acesse https://supabase.com → criar conta → New project
2. Nome: `demandflow` | Região: South America (São Paulo)
3. Aguarde ~2 min
4. Menu: **SQL Editor** → New Query → cole o conteúdo de `supabase-schema.sql` → Run
5. Menu: **Settings → API** → copie:
   - `Project URL`
   - `anon public` key

### PASSO 2 — Variáveis de ambiente
Renomeie `.env.example` para `.env` e preencha:
```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ANTHROPIC_KEY=sk-ant-...
```

### PASSO 3 — GitHub
1. Acesse https://github.com/new → nome: `demandflow` → Create repository
2. Clique em "uploading an existing file"
3. Arraste TODOS os arquivos desta pasta (incluindo src/)
4. Commit changes

### PASSO 4 — Vercel (deploy gratuito)
1. Acesse https://vercel.com → Login com GitHub
2. Add New Project → selecione `demandflow`
3. Em "Environment Variables" adicione as 3 variáveis do .env
4. Deploy → seu app estará em `demandflow.vercel.app`

### PASSO 5 — Instalar no celular
- Android: Chrome → menu ⋮ → "Adicionar à tela inicial"
- iPhone: Safari → compartilhar → "Adicionar à Tela de Início"

---

## Estrutura dos arquivos

```
demandflow/
├── src/
│   ├── components/
│   │   ├── Auth.jsx        ← login, cadastro, recuperação de senha
│   │   ├── Demandas.jsx    ← lista de demandas + análise IA
│   │   ├── Agenda.jsx      ← calendário semana/mês/dia
│   │   └── Clientes.jsx    ← gestão de clientes
│   ├── lib/
│   │   └── supabase.js     ← configuração do banco
│   ├── App.jsx             ← navegação principal
│   ├── main.jsx            ← entry point
│   └── index.css           ← estilos globais
├── supabase-schema.sql     ← execute no Supabase
├── vite.config.js          ← build + PWA
├── .env.example            ← modelo das variáveis
├── index.html
└── package.json
```
