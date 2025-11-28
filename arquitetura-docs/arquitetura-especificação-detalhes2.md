## Arquitetura de Referência: NestJS Serverless & Angular Reativo

 

 

## 1. Visão Geral e Estratégia de "Dual-Runtime"

 

O desafio central desta arquitetura é resolver a dicotomia entre **Desenvolvimento Local** (onde temos estado persistente e latência zero de rede) e **Produção Serverless** (onde tudo é efêmero, stateless e a conexão com banco de dados é um recurso crítico).

Adotaremos a estratégia de **Dual-Runtime**:

1. **Dev Mode (**`npm run start:dev`**):** A aplicação roda como um servidor HTTP Node.js padrão (Fastify/Express). O banco de dados roda em Docker local.
2. **Prod Mode (AWS Lambda):** A aplicação utiliza o padrão **"Cached Server"**. O NestJS é inicializado uma única vez e mantido "quente" na memória da Lambda para processar múltiplas requisições subsequentes, eliminando o _Cold Start_ recorrente.

---

 

## 2. Backend: Adaptação Serverless com NestJS

 

 

### 2.1. Otimização de Boot e Entry Points

 

Não podemos usar o `main.ts` padrão na AWS. Criaremos dois pontos de entrada.

 

#### A. `src/main.ts` (Apenas Local)

 

O padrão que você já conhece.

TypeScript

 

```plaintext
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Configurações globais (Pipes, Interceptors, Swagger)
  setupGlobals(app); 
  await app.listen(3000);
}
bootstrap();
```

 

#### B. `src/lambda.ts` (Apenas Produção)

 

Este arquivo exporta o `handler` que a AWS invoca. Utilizamos a lib `@codegenie/serverless-express` (sucessora mantida da `aws-serverless-express`).

**Padrão Cached Server:**

TypeScript

 

```plaintext
// src/lambda.ts
import { configure as serverlessExpress } from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

let cachedServer: any;

export const handler = async (event, context) => {
  if (!cachedServer) {
    // Inicialização (Cold Start): Ocorre apenas na 1ª requisição da instância
    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
    
    // Extraímos a configuração global para uma função compartilhada para garantir paridade Dev/Prod
    setupGlobals(app); 
    
    await app.init(); // Inicializa mas NÃO chama.listen()
    
    const expressApp = app.getHttpAdapter().getInstance();
    cachedServer = serverlessExpress({ app: expressApp });
  }
  
  // Execução (Warm Start): Reutiliza a instância já carregada na memória
  return cachedServer(event, context);
};
```

 

### 2.2. Gestão de Conexões de Banco de Dados (Crítico)

 

Em Serverless, não podemos ter um _pool_ de conexões tradicional (ex: 10 conexões por instância), pois 1000 lambdas abririam 10.000 conexões, derrubando o banco.

**Solução Obrigatória: AWS RDS Proxy + Configuração TypeORM Cirúrgica**

Configuração do `DataSource` (via `DatabaseConfigService`):

| **Configuração**      | **Valor Local** | **Valor Produção (Lambda)** | **Por quê?**                                                                                                |
| --------------------- | --------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `synchronize`         | `true`          | `false`                     | Jamais rodar DDL (alter table) na Lambda. Causa race conditions fatais.                                     |
| `keepConnectionAlive` | `true`          | `true`                      | Impede que o TypeORM feche a conexão TCP ao fim da execução do script, permitindo reuso no próximo evento.  |
| `poolSize`            | `10`            | `1`                         | A Lambda processa uma requisição por vez. Não precisamos de pool interno. O RDS Proxy gerencia o pool real. |
| `host`                | `localhost`     | **RDS Proxy Endpoint**      | O Proxy multiplexa as conexões.                                                                             |

 

### 2.3. Isolamento de Tenant e Estado (`nestjs-cls`)

 

Como estamos reutilizando a aplicação (cachedServer), Singletons mantêm estado. Se salvarmos this.userId em um serviço, vazaremos dados entre tenants.

O uso de nestjs-cls (AsyncLocalStorage) é a barreira de segurança.

Interceptor de Contexto (Atualizado para Serverless):

Precisamos garantir que o contexto seja limpo mesmo se a Lambda reutilizar o container. O ClsMiddleware já faz isso, mas precisamos garantir que ele monte o contexto a partir do event da AWS (que contém os headers do API Gateway).

TypeScript

 

```plaintext
// src/core/context/tenant.middleware.ts
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: any, res: any, next: () => void) {
    // O setup do CLS garante que 'run' é chamado, isolando este escopo
    this.cls.run(() => {
        const tenantId = req.headers['x-tenant-id'];
        // Em serverless, headers podem vir minúsculos ou camelCase dependendo do proxy
        this.cls.set('TENANT_ID', tenantId);
        next();
    });
  }
}
```

---

 

## 3. Implementação da Camada de Aplicação (Backend)

 

 

### 3.1. Controller Genérico REST com `@nestjs-query`

 

Esta é a implementação concreta da "Fábrica de CRUD" mencionada no primeiro relatório. Ela elimina a necessidade de escrever controllers manuais.

TypeScript

 

```plaintext
// src/core/crud/crud.factory.ts
import { Controller, Get, Post, Body, Param, Delete, Patch, Query, UseInterceptors } from '@nestjs/common';
import { TypeOrmQueryService } from '@nestjs-query/query-typeorm';
import { DeepPartial } from 'typeorm';
import { QueryParams, TypeOrmQueryParser } from '../utils/typeorm-query.parser';

export function createCrudController<TEntity, TCreateDto, TUpdateDto>(
  EntityClass: any, 
  ResourceName: string
) {
  @Controller(ResourceName)
  class BaseCrudController {
    constructor(private readonly service: TypeOrmQueryService<TEntity>) {}

    @Get()
    async findAll(@Query() query: QueryParams) {
      // O Parser traduz a query string REST para o objeto de filtro do NestJS-Query
      const filterQuery = TypeOrmQueryParser.parse(query);
      return this.service.query(filterQuery);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
      return this.service.findById(id);
    }

    @Post()
    async create(@Body() dto: TCreateDto) {
      // O service do nestjs-query aceita DeepPartial
      return this.service.createOne(dto as DeepPartial<TEntity>);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: TUpdateDto) {
      return this.service.updateOne(id, dto as DeepPartial<TEntity>);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
      return this.service.deleteOne(id);
    }
  }

  // Renomeia a classe para aparecer corretamente nos logs/Swagger
  Object.defineProperty(BaseCrudController, 'name', { value: `${EntityClass.name}Controller` });
  
  return BaseCrudController;
}
```

 

### 3.2. Exemplo de Uso (Módulo de Produtos)

 

O desenvolvedor precisa escrever **apenas** isto para ter uma API completa, auditada e multi-tenant:

TypeScript

 

```plaintext
// src/modules/products/products.module.ts
@Module({
  imports:), // Registra Repositorio e Service
  ],
  controllers:
})
export class ProductsModule {}
```

---

 

## 4. Frontend: Angular 20+ com `httpResource` e Signals

 

O Angular 19/20 introduz o `httpResource`, que é reativo por padrão. No entanto, ele não serializa objetos complexos de query params (como os filtros `filter[field][eq]=val`) nativamente. Precisamos de um adaptador.

 

### 4.1. Adaptador de Serialização (`QueryStringUtil`)

 

Uma função pura para converter o estado do Signal em Query String compatível com `@nestjs-query`.

TypeScript

 

```plaintext
// src/app/core/utils/query-serializer.ts
export function serializeQueryParams(state: QueryState): Record<string, string> {
  const params: Record<string, string> = {};
  
  params['page'] = state.page.toString();
  params['limit'] = state.limit.toString();
  
  if (state.sort) {
    // Ex: sort=name,ASC
    params['sorting[field]'] = state.sort.field;
    params['sorting[direction]'] = state.sort.direction;
  }

  // Serialização de Filtros Aninhados para formato qs (PHP-style)
  // Entrada: filter: { name: { eq: 'Macbook' } }
  // Saída: filter[name][eq]=Macbook
  if (state.filter) {
    Object.entries(state.filter).forEach(([field, operations]) => {
      Object.entries(operations as any).forEach(([operator, value]) => {
        if (value!== null && value!== undefined && value!== '') {
          params[`filter[${field}][${operator}]`] = String(value);
        }
      });
    });
  }
  
  return params;
}
```

 

### 4.2. Serviço Genérico Reativo (`GenericResourceService`)

 

Este serviço substitui o `HttpClient` tradicional.

TypeScript

 

```plaintext
// src/app/core/services/generic-resource.service.ts
import { inject, Injectable, Signal } from '@angular/core';
import { httpResource, HttpResourceRef } from '@angular/common/http';
import { serializeQueryParams } from '../utils/query-serializer';

@Injectable({ providedIn: 'root' })
export class GenericResourceService {
  
  /**
   * Cria um Resource reativo para listagem.
   * @param endpoint URL base (ex: '/api/products')
   * @param stateSignal Signal contendo o estado da tabela (paginação, filtros)
   */
  createListResource<T>(endpoint: string, stateSignal: Signal<QueryState>): HttpResourceRef<PaginatedResponse<T>> {
    return httpResource<PaginatedResponse<T>>(() => {
      // A função loader é reexecutada sempre que stateSignal() muda
      const currentState = stateSignal();
      const queryParams = serializeQueryParams(currentState);

      return {
        url: endpoint,
        method: 'GET',
        params: queryParams, // Passamos o objeto já achatado
      };
    });
  }
}
```

 

### 4.3. Componente "Smart" de Listagem

 

O componente consome o recurso sem RxJS manual (sem `subscribe`/`unsubscribe`).

TypeScript

 

```plaintext
// src/app/features/products/product-list.component.ts
@Component({
  template: `
    <div *ngIf="resource.isLoading()">Carregando...</div>

    <div *ngIf="resource.error()">Erro: {{ resource.error() }}</div>

    <table *ngIf="resource.value() as data">
       <tr *ngFor="let product of data.items">
         <td>{{ product.name }}</td>
         <td>{{ product.price | currency }}</td>
       </tr>
    </table>

    <button (click)="nextPage()">Próxima</button>
  `
})
export class ProductListComponent {
  private genericService = inject(GenericResourceService);

  // 1. Estado (Signals)
  filter = signal({ name: { like: '' } });
  page = signal(1);

  // 2. Estado Computado (Combina tudo)
  queryState = computed(() => ({
    page: this.page(),
    limit: 10,
    filter: this.filter()
  }));

  // 3. O Recurso (A Mágica acontece aqui)
  // O Angular monitora 'queryState'. Mudou? Cancela request anterior e faz novo.
  resource = this.genericService.createListResource<Product>('/api/products', this.queryState);

  nextPage() {
    this.page.update(p => p + 1);
  }
}
```

---

 

## 5. Infraestrutura e Pipeline (CI/CD)

 

Esta parte é crucial para que a arquitetura funcione em produção.

 

### 5.1. Pipeline de Migração (O "Catch-22" do Serverless)

 

Você não pode rodar migrações na Lambda da aplicação. Ela vai dar timeout ou causar travamento de tabela se escalar horizontalmente.

**Estratégia Definida:**

1. **Build:** Gera dois artefatos.

   * `app.zip`: Código da aplicação (webpack/esbuild tree-shaken).
   * `migration.zip`: Apenas arquivos `.js` de migração e o `typeorm-cli`.

2. **Pre-Deploy Stage (CodeBuild ou Lambda de Admin):**

   * Este passo roda _antes_ de atualizar o código da Lambda principal.
   * Ele baixa o `migration.zip`, conecta no RDS e roda `typeorm migration:run`.
   * Se falhar, o deploy para.

3. **Deploy Stage:** Atualiza a função Lambda da aplicação via CloudFormation/CDK.

 

### 5.2. Definição de Infraestrutura (AWS CDK snippet)

 

TypeScript

 

```plaintext
// infra/stack.ts
const proxy = new rds.DatabaseProxy(this, 'Proxy', {
  proxyTarget: rds.ProxyTarget.fromInstance(databaseInstance),
  secrets:,
  vpc,
  // IMPORTANTE: Obrigar IAM Auth para não hardcodar senhas na Lambda
  iamAuth: true 
});

const apiFunction = new lambda.NodejsFunction(this, 'ApiHandler', {
  entry: 'src/lambda.ts', // Ponto de entrada específico
  vpc,
  environment: {
    // Aponta para o Proxy, não para o DB direto
    DB_HOST: proxy.endpoint, 
    // Habilita modo serverless no TypeORM (poolSize=1)
    NODE_ENV: 'production', 
    NO_COLOR: 'true',
  }
});

// Permissão para Lambda conectar no Proxy via IAM
proxy.grantConnect(apiFunction);
```

---

 

## 6. Documentação para o Desenvolvedor

 

 

### Guia Rápido: Como criar uma nova funcionalidade

 

1. **Crie a Entidade:** Adicione `src/modules/clients/client.entity.ts` estendendo `AbstractEntity`.

2. **Crie os DTOs:** `create-client.dto.ts` (com validação `class-validator`).

3. **Crie o Módulo:** `ClientsModule`.

   * Importe `NestjsQueryTypeOrmModule.forFeature([ClientEntity])`.
   * Adicione o controller: `createCrudController(ClientEntity, 'clients')`.

4. **No Frontend:**

   * Adicione a rota no Angular.
   * Use o `GenericResourceService` apontando para `/api/clients`.
   * Defina as colunas da tabela nos metadados (ou hardcoded no template inicialmente).

 

### Checklist de Segurança (Auditoria Automática)

 

O desenvolvedor **não precisa fazer nada**.

* Ao salvar, o `AuditSubscriber` (detalhado no relatório anterior) injeta automaticamente:

  * `tenant_id` (do JWT/Header via `nestjs-cls`).
  * `created_by` / `updated_by`.

* Ao consultar, o Escopo Global do TypeORM injeta `WHERE tenant_id = current_tenant`.

---

 

## 7. Conclusão

 

Esta arquitetura revisada entrega o melhor dos dois mundos:

* **Para o Desenvolvedor:** A experiência é idêntica a desenvolver um monólito local. `docker-compose up` e `npm run start:dev`.
* **Para a Operação (FinOps):** Custo zero quando ocioso (Serverless), escala infinita sob demanda, sem gerenciamento de servidores.
* **Para o Negócio:** Multi-tenancy seguro por padrão e entrega rápida de CRUDs via metaprogramação.

A complexidade do Serverless (conexões DB, cold starts) foi encapsulada na camada `Core` e na infraestrutura, deixando os desenvolvedores de negócio livres para focar em regras de valor.