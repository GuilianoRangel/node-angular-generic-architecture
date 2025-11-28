# Plano de Implementação: Arquitetura de Alta Eficiência

Este documento detalha o roteiro para implementar a arquitetura proposta, focando na construção do framework interno que sustentará o desenvolvimento rápido de funcionalidades.

## User Review Required

> [!IMPORTANT]
> **Decisão de Stack:** Confirmar o uso de **Angular 19+ (Preview)** para acesso às features de `httpResource` e `Signals` estáveis, ou se devemos usar a versão 18 com polyfills/adaptadores. Assumiremos **Angular 19** conforme a proposta.

> [!WARNING]
> **Infraestrutura:** A configuração do **RDS Proxy** e **AWS Lambda** requer acesso a uma conta AWS para testes reais. O ambiente local simulará isso via Docker, mas a validação final depende da nuvem.

## Proposed Changes

### Fase 1: Foundation (Backend Core)

O objetivo é estabelecer a base do Monólito Modular e o sistema de Contexto/Auditoria.

#### [NEW] [core.module.ts](file:///home/guiliano/workspace/lab-crud2/src/core/core.module.ts)
- Configuração global do `ClsModule` (AsyncLocalStorage).
- Configuração do `TypeOrmModule` com suporte a variáveis de ambiente para dev/prod.

#### [NEW] [abstract.entity.ts](file:///home/guiliano/workspace/lab-crud2/src/core/database/entities/abstract.entity.ts)
- Classe base com `id` (UUID), `tenantId`, `createdAt`, `updatedAt`, `version`.

#### [NEW] [audit.subscriber.ts](file:///home/guiliano/workspace/lab-crud2/src/core/database/subscribers/audit.subscriber.ts)
- Implementação do `EventSubscriber` que intercepta escritas.
- Injeção de dependência manual para acessar `ClsService` e preencher `createdBy`/`tenantId`.

### Fase 2: Metaprogramming & Abstração CRUD

Implementação da "mágica" que elimina o boilerplate.

#### [NEW] [abstract-crud.controller.ts](file:///home/guiliano/workspace/lab-crud2/src/core/crud/abstract-crud.controller.ts)
- Super classe com métodos `findAll`, `findOne`, `create`, `update`, `remove`.
- Uso de Generics `<TEntity>`.
- Decoração automática com Swagger (`@ApiOperation`, `@ApiResponse`).

#### [NEW] [typeorm-query.parser.ts](file:///home/guiliano/workspace/lab-crud2/src/core/utils/typeorm-query.parser.ts)
- Utilitário para converter query strings REST (`filter[age][gt]=18`) em `FindOptions` do TypeORM.

#### [NEW] [abstract.service.ts](file:///home/guiliano/workspace/lab-crud2/src/core/base/abstract.service.ts)
- Serviço base que conecta o Controller ao Repositório TypeORM.
- Implementação de paginação e filtros dinâmicos.

### Fase 3: Frontend Core (Angular 19+)

Construção da camada de apresentação reativa e orientada a metadados.

#### [NEW] [base-resource.service.ts](file:///home/guiliano/workspace/lab-crud2/frontend/src/app/core/services/base-resource.service.ts)
- Implementação genérica usando `httpResource` e `Signals`.
- Serializador de Query Params compatível com o backend.

#### [NEW] [generic-table.component.ts](file:///home/guiliano/workspace/lab-crud2/frontend/src/app/shared/components/generic-table/generic-table.component.ts)
- Componente "Dumb" baseado no **Angular CDK Table** para alta performance.
- Renderização dinâmica de colunas.
- **Ações:** Coluna de ações (Editar/Remover) configurável.
- **Confirmação:** Ação de remover deve acionar o `DialogService` para confirmação.

#### [NEW] [generic-form.component.ts](file:///home/guiliano/workspace/lab-crud2/frontend/src/app/shared/components/generic-form/generic-form.component.ts)
- Componente para inclusão e edição de registros.
- Renderização baseada em metadados (JSON Schema) vindo do backend.
- Validação dinâmica.

#### [NEW] [dialog.service.ts](file:///home/guiliano/workspace/lab-crud2/frontend/src/app/shared/services/dialog.service.ts)
- Serviço reutilizável para abrir modais (Dialogs).
- Implementação de `confirm(message: string): Promise<boolean>` para padronizar confirmações.
- Componente de UI `ConfirmationDialogComponent`.

### Fase 4: Infraestrutura Serverless

Adaptação para execução híbrida (Local/Lambda).

#### [NEW] [lambda.ts](file:///home/guiliano/workspace/lab-crud2/src/lambda.ts)
- Entry point para AWS Lambda usando `@codegenie/serverless-express`.
- Lógica de "Cached Server" para reuso de instância.

#### [MODIFY] [main.ts](file:///home/guiliano/workspace/lab-crud2/src/main.ts)
- Refatoração para extrair a configuração do `App` (`setupGlobals`) para ser reutilizada no `lambda.ts`.

## Verification Plan

### Automated Tests
- **Unit Tests:** Testar o `TypeOrmQueryParser` com vários cenários de filtros complexos.
- **Integration Tests:** Criar uma entidade `TestEntity`, gerar o CRUD e verificar se a auditoria (`createdBy`) e o multi-tenancy (`tenantId`) são preenchidos automaticamente no banco em memória (SQLite).

### Manual Verification
- **Swagger UI:** Verificar se os endpoints da entidade de teste aparecem documentados corretamente.
- **Fluxo End-to-End:** Criar um registro via POST e tentar lê-lo com um `tenantId` diferente no header (deve retornar vazio).
