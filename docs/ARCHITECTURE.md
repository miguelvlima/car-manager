# LIMA Stock — Arquitetura da Fase 1

Sistema de gestão do ciclo de vida de viaturas usadas: stock, localização, workflow, histórico, permissões e venda.

## 1. Princípios

- O valor do sistema não é um CRUD de carros. Cada viatura tem uma história: entrada → preparação → processos → publicação → venda → entrega.
- Autorização é sempre verificada no servidor (services / server actions). A UI apenas esconde o que o utilizador não pode fazer.
- Listas operacionais (origens, localizações, estados, tipos) são dados, não código.
- `dias em stock` nunca é persistido. É calculado.
- Storage, e-mail e notificações são portas (adapters), para trocar de fornecedor sem reescrever o domínio.

## 2. Stack

| Camada | Tecnologia | Motivo |
| --- | --- | --- |
| UI | Next.js App Router, React, TypeScript, Tailwind, shadcn-like | Uma app, SSR, mobile-first |
| API | Server Actions + Route Handlers | Mutações tipadas; uploads e Auth em HTTP |
| Auth | Auth.js (next-auth v5) credentials + JWT | Sessões seguras, passwords bcrypt |
| Dados | PostgreSQL + Prisma | Relacional, cloud-ready |
| i18n | Dicionário PT-PT tipado | Pronto para mais idiomas sem rotas `/pt` nesta fase |
| Ficheiros | `StoragePort` (local agora) | S3 / Supabase depois, sem mudar serviços |

## 3. Autorização (RBAC)

Chaves de permissão vivem em código (`PERMISSION_CATALOG`) para não haver strings soltas.

Quem tem o quê vive na base de dados (`RolePermission`) e é editável no backoffice.

`requirePermission()` consulta sempre a BD. O JWT só serve para a UI.

`SUPER_ADMIN` tem bypass explícito no servidor.

Campos sensíveis (origem, entrada, kms administrativos, preço de aquisição, vendedor da venda) são filtrados no service conforme permissões — um vendedor a chamar a action com payload extra não altera esses campos.

## 4. Workflow comercial vs processos

`vehicleStatus` é o estado global comercial/operacional.

Recondicionamento, higienização, revisão e fotografia são processos com vida própria. Não substituem o estado global.

Transições iniciais (dados, administráveis mais tarde):

```
A_ENTRAR
  → EM_PREPARACAO
    → AGUARDA_RECONDICIONAMENTO → EM_RECONDICIONAMENTO
    → AGUARDA_HIGIENIZACAO
    → AGUARDA_REVISAO
      → PRONTO_PARA_FOTOGRAFAR → AGUARDA_PUBLICACAO
        → DISPONIVEL_PARA_VENDA
          → RESERVADO
            → VENDIDO → AGUARDA_ENTREGA → ENTREGUE
Ramos: CEDIDO, DEVOLVIDO
```

## 5. Histórico

Dois canais, de propósito:

- **Timeline (`VehicleEvent`)**: história da viatura, visível na ficha.
- **Audit log (`AuditLog`)**: rastro administrativo (quem, IP, before/after). Imutável para utilizadores normais.

Qualquer mudança de localização, preço, estado ou venda gera ambos.

## 6. Cálculo de dias em stock

```
se renovação = não  →  hoje - dataEntrada
se renovação = sim  →  hoje - dataEntrada - N dias
```

`N` (predefinição 90) está em `AppSetting.renewalOffsetDays`.

## 7. Pastas

```
src/
  app/                 rotas (login, dashboard, catálogo, viaturas, backoffice)
  components/          UI e blocos de ecrã
  lib/                 i18n, utils, errors, storage
  server/
    auth/              Auth.js
    permissions/       catálogo + requirePermission
    services/          regras de negócio
    actions/           server actions
    validations/       Zod
  types/
prisma/                schema + seed
docs/
tests/
```

## 8. Fases

1. Auth, RBAC, viaturas, stock, ficha, fotos, pesquisa, estados, localizações, origens
2. Processos (recond/higienização/revisão), timeline rica, audit UI
3. Catálogo vendedores, reserva, venda, dashboard, relatórios base
4. Importador Excel + validação
5. AI Vision + OCR documentos
6. Reporting, notificações, exports, UX

A Fase 1 já inclui o **schema completo**, a **timeline/audit na escrita**, o **catálogo** e o **registo de venda** no domínio, porque são o núcleo do produto. A UI de processos/import/AI fica para as fases seguintes.

## 9. Decisões técnicas

1. **PostgreSQL desde o dia 1** — o Excel vai ser substituído; JSON num único documento não serve histórico nem permissões.
2. **JWT + revalidação de permissões na BD** — UI rápida, autorização verdadeira no servidor.
3. **Soft-delete** em viaturas, utilizadores e fotos.
4. **Matrícula normalizada** (`BB35ZR`) para a pesquisa global aceitar `BB-35-ZR` ou `BB35ZR`.
5. **StoragePort** — uploads locais em desenvolvimento; contrato igual para S3/Supabase.
6. **Sem locale na URL** nesta fase — um dicionário PT-PT; mais idiomas = novo ficheiro + selector.
7. **Server-side filtering** na listagem de stock (paginação, filtros, ordenação).
8. **API futura** — serviços de domínio sem dependência de React; Route Handlers podem expor o mesmo contrato a DMS/ERP mais tarde.
