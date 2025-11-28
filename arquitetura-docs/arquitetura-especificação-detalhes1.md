## Arquitetura de Referência Enterprise: Especificação Técnica e Detalhamento de Implementação Full Stack (NestJS & Angular 19+)

 

 

## 1. Visão Executiva e Fundamentação Arquitetural

 

Este relatório técnico apresenta a especificação exaustiva e os artefatos de implementação para uma arquitetura de referência empresarial moderna, projetada para suportar aplicações de alta complexidade, escalabilidade horizontal e manutenibilidade a longo prazo. A solução proposta harmoniza um backend robusto em **NestJS**, utilizando padrões avançados de persistência com **TypeORM** e isolamento de contexto via **AsyncLocalStorage**, com um frontend de última geração baseado em **Angular 19+**, explorando o novo paradigma reativo de **Signals** e a API **httpResource**.

O objetivo deste documento é transcender a teoria arquitetural e fornecer ao time de engenharia um "manual de campo" contendo classes abstratas, configurações de injeção de dependência, estratégias de auditoria e padrões de consumo de API que acelerem o desenvolvimento inicial (scaffolding) e garantam a aderência estrita aos requisitos não funcionais de segurança e performance.

 

### 1.1. Contexto Tecnológico e Decisões de Design

 

A escolha do **NestJS** como framework de backend não é acidental; ela responde à necessidade de uma estrutura opinativa que imponha organização modular em ambientes Node.js, historicamente propensos à entropia arquitetural.1 O NestJS, inspirado fortemente no Angular, utiliza injeção de dependência (DI) e metadados via decoradores (`ReflectMetadata`) para desacoplar a lógica de negócios da infraestrutura HTTP.2

No lado do cliente, o **Angular 19** representa uma mudança de paradigma — frequentemente chamada de "Renascença do Angular". A introdução de **Signals** como primitiva reativa e a nova API **httpResource** 3 permitem a construção de aplicações "Zone-less" (sem a dependência pesada do Zone.js para detecção de mudanças), resultando em performance superior e modelos mentais de reatividade mais simples do que os baseados exclusivamente em RxJS.

 

### 1.2. Drivers Arquiteturais

 

A implementação detalhada a seguir é guiada pelos seguintes drivers:

1. **Multi-tenancy Transparente:** A aplicação deve ser capaz de servir múltiplos clientes (tenants) com isolamento lógico de dados, sem que o desenvolvedor precise adicionar filtros `WHERE tenant_id =?` manualmente em cada consulta.5
2. **Auditoria Imutável e Contextual:** Todas as mutações de dados devem ser rastreadas (quem, quando, o quê), resolvendo o desafio técnico de injetar contexto de requisição (User ID, IP) dentro do ciclo de vida do ORM (Subscribers).7
3. **Padronização de Contratos (API First):** Definição estrita de DTOs (Data Transfer Objects) e respostas genéricas para garantir previsibilidade no consumo pelo frontend.
4. **Desacoplamento de Frameworks:** Uso de classes base e abstrações (Generics) para que a lógica de negócios não fique refém de detalhes de implementação das bibliotecas subjacentes.

---

 

## 2. Camada Core Backend: Contexto e Injeção de Dependência Avançada

 

O coração de uma aplicação multi-tenant segura reside na sua capacidade de propagar o contexto da execução (quem é o usuário, qual é o tenant, qual é o ID da correlação de log) através de toda a pilha de chamadas assíncronas, sem a necessidade de passar esses dados como argumentos de função ("prop drilling").

 

### 2.1. O Problema do Escopo de Requisição (`Scope.REQUEST`)

 

Nativamente, o NestJS oferece o `Scope.REQUEST` para serviços que dependem de dados da requisição. No entanto, o uso indiscriminado desse escopo é uma armadilha de performance. Quando um provedor é marcado como `Scope.REQUEST`, o container de injeção de dependência do NestJS precisa recriar esse provedor — e toda a sua árvore de dependências — para _cada_ requisição HTTP recebida. Em aplicações de alto tráfego, isso aumenta drasticamente a latência e o consumo de memória (Garbage Collection pressure).

 

### 2.2. Solução: `AsyncLocalStorage` e `nestjs-cls`

 

Para mitigar o problema de performance, adotaremos a biblioteca `nestjs-cls` (Continuation Local Storage), que utiliza a API nativa `AsyncLocalStorage` do Node.js. Isso permite que nossos serviços permaneçam como **Singletons** (instanciados apenas uma vez na inicialização), enquanto acessam dados isolados por requisição através de um armazenamento estático thread-local virtual.5

 

#### 2.2.1. Artefato: Configuração do Módulo de Contexto (`ContextModule`)

 

Este módulo deve ser importado na raiz da aplicação (`AppModule`) e configurado para interceptar cabeçalhos HTTP críticos.

TypeScript

 

```plaintext
// src/core/context/context.module.ts
import { Module, Global } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';

/**
 * Módulo Global de Contexto.
 * Responsável por configurar o armazenamento local assíncrono (ALS) para
 * propagação de Tenant ID, User ID e Request ID.
 */
@Global()
@Module({
  imports: |

| uuidv4(),
        setup: (cls, req) => {
          // Extração e normalização de metadados de contexto
          // Em um cenário real, estes valores viriam validados pelo AuthGuard (Passport/JWT)
          const tenantId = req.headers['x-tenant-id'];
          const userId = req.headers['x-user-id']; // Ou extraído do JWT payload
          
          if (tenantId) {
            cls.set('TENANT_ID', tenantId);
          }
          if (userId) {
            cls.set('USER_ID', userId);
          }
          
          // Armazenar metadados adicionais para auditoria
          cls.set('IP_ADDRESS', req.ip);
          cls.set('USER_AGENT', req.headers['user-agent']);
        },
      },
    }),
  ],
  exports: [ClsModule], // Exporta para uso em Guards, Interceptors e Services
})
export class ContextModule {}
```

Análise de Impacto:

A implementação acima garante que this.cls.get('TENANT\_ID') esteja disponível em qualquer lugar da aplicação (Services, Subscribers, Exception Filters) sem afetar a injeção de dependência. Isso é fundamental para a estratégia de isolamento de dados detalhada na seção de Persistência.

---

 

## 3. Camada de Persistência: TypeORM, Entidades e Auditoria

 

A camada de persistência utiliza o TypeORM, o ORM mais maduro para TypeScript.7 No entanto, para atingir o nível de robustez "Enterprise", não podemos usar o TypeORM "out-of-the-box". Precisamos estendê-lo para suportar auditoria automática e multi-tenancy forçado.

 

### 3.1. Design de Entidades Base

 

Para garantir consistência, _nenhuma_ entidade de domínio deve ser criada do zero. Todas devem herdar de uma `AbstractEntity` que define os contratos de chave primária (UUID para evitar enumeração de recursos), timestamps e colunas de auditoria.

 

#### 3.1.1. Artefato: `AbstractEntity`

 

TypeScript

 

```plaintext
// src/core/database/entities/abstract.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  VersionColumn,
  BaseEntity,
} from 'typeorm';

/**
 * Classe base para todas as entidades persistentes.
 * Garante a existência de IDs padronizados, auditoria temporal e lógica de concorrência.
 */
export abstract class AbstractEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Coluna de discriminação para Multi-tenancy (Row-Level Isolation)
  // 'select: false' impede que o ID do tenant vaze em queries normais por padrão
  @Column({ type: 'varchar', nullable: true, select: false })
  tenantId: string;

  @CreateDateColumn({ type: 'timestamptz', comment: 'Data de criação do registro' })
  createdAt: Date;

  @Column({ type: 'varchar', nullable: true, comment: 'ID do usuário que criou o registro' })
  createdBy: string;

  @UpdateDateColumn({ type: 'timestamptz', comment: 'Data da última atualização' })
  updatedAt: Date;

  @Column({ type: 'varchar', nullable: true, comment: 'ID do usuário da última atualização' })
  updatedBy: string;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true, comment: 'Data de exclusão lógica (Soft Delete)' })
  deletedAt: Date;

  @Column({ type: 'varchar', nullable: true, comment: 'ID do usuário que realizou a exclusão' })
  deletedBy: string;

  // Controle de Concorrência Otimista (Optimistic Locking)
  // Incrementado automaticamente a cada save()
  @VersionColumn()
  version: number;
}
```

 

### 3.2. O Desafio Técnico dos Subscribers e Injeção de Dependência

 

Um dos desafios mais complexos na integração NestJS + TypeORM é a injeção de dependência em `EventSubscribers`. O TypeORM carrega subscribers internamente ao inicializar a conexão, ignorando o container de DI do NestJS. Isso significa que, nativamente, você não pode injetar o `ClsService` dentro de um Subscriber para saber _quem_ está fazendo uma alteração no banco.10

A pesquisa aponta que tentar usar `Scope.REQUEST` em subscribers gera erros ou `undefined` em tempo de execução.10 A solução robusta envolve um padrão de "Registro Manual de Instância" (Workaround), onde instanciamos o subscriber como um serviço NestJS normal e, no construtor, injetamos ele manualmente na lista de subscribers do `DataSource` ou `Connection`.7

 

#### 3.2.1. Artefato: `AuditSubscriber` com Injeção de Contexto

 

Este componente é vital. Ele atua como um "firewall" de dados, interceptando todas as escritas para preencher auditoria e garantir que o `tenantId` esteja presente.

TypeScript

 

```plaintext
// src/core/database/subscribers/audit.subscriber.ts
import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  SoftRemoveEvent,
  DataSource,
} from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AbstractEntity } from '../entities/abstract.entity';

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<AbstractEntity> {
  
  /**
   * Construtor com Workaround para Injeção de Dependência.
   * O NestJS instancia esta classe (injetando ClsService).
   * Em seguida, nós nos auto-registramos no DataSource do TypeORM.
   */
  constructor(
    @Inject(DataSource) dataSource: DataSource,
    private readonly cls: ClsService,
  ) {
    dataSource.subscribers.push(this);
  }

  /**
   * Define que este subscriber escuta qualquer entidade que herde de AbstractEntity.
   */
  listenTo() {
    return AbstractEntity;
  }

  /**
   * Executado ANTES de qualquer inserção.
   * Responsável por preencher createdBy e tenantId automaticamente.
   */
  async beforeInsert(event: InsertEvent<AbstractEntity>) {
    const user = this.cls.get('USER_ID') |

| 'system';
    const tenant = this.cls.get('TENANT_ID');

    // Auditoria
    event.entity.createdBy = user;
    event.entity.updatedBy = user;
    
    // Multi-tenancy Enforcement
    // Se o tenant está no contexto, ele é forçado na entidade.
    if (tenant) {
      event.entity.tenantId = tenant;
    } else {
        // Log de aviso ou erro dependendo da política de segurança
        console.warn(` Inserção na entidade ${event.metadata.name} sem Tenant ID no contexto.`);
    }
  }

  /**
   * Executado ANTES de qualquer atualização.
   * Atualiza updatedBy e incrementa versão.
   */
  async beforeUpdate(event: UpdateEvent<AbstractEntity>) {
    const user = this.cls.get('USER_ID') |

| 'system';
    
    // Nota: Em updates parciais, event.entity pode conter apenas os campos alterados.
    // O TypeORM faz o merge automático.
    if (event.entity) {
        event.entity.updatedBy = user;
    }
  }

  /**
   * Executado ANTES de um Soft Delete.
   * Preenche deletedBy.
   */
  async beforeSoftRemove(event: SoftRemoveEvent<AbstractEntity>) {
    const user = this.cls.get('USER_ID') |

| 'system';
    
    // Importante: O TypeORM nativamente apenas seta deletedAt.
    // Para persistir o deletedBy, precisamos garantir que essa coluna seja incluída no UPDATE gerado pelo soft remove.
    // Em algumas versões do TypeORM, pode ser necessário um update manual explícito aqui se o comportamento padrão não persistir colunas adicionais.
    event.entity.deletedBy = user;
  }
}
```

 

### 3.3. Configuração do DataSource e Metadados

 

Para que a aplicação tenha ciência de todas as entidades, utilizaremos o carregamento dinâmico de metadados. A propriedade `entityMetadatas` do `DataSource` (ou `getMetadata` na conexão) permite inspecionar em tempo de execução quais tabelas e colunas existem, o que é útil para utilitários de validação genérica.13

---

 

## 4. Camada de Serviço Genérica e Tratamento de Consultas

 

Desenvolver um serviço para cada entidade (CRUD) repetindo códigos de `find`, `save`, `delete` viola o princípio DRY (Don't Repeat Yourself). Implementaremos uma camada de serviço base genérica que lida com a complexidade de traduzir parâmetros de consulta REST (paginação, filtros dinâmicos, ordenação) para o formato do TypeORM.

 

### 4.1. Interface de Consulta Avançada (`QueryParams`)

 

As APIs modernas precisam suportar filtragem rica. Definimos um padrão de URL como:

GET /users?page=1\&limit=10\&sort=name:ASC\&filter\[age]\[gt]=18\&filter\[role]=ADMIN

Para suportar isso, precisamos de um _Parser_ robusto que traduza `filter[age][gt]=18` para `{ age: MoreThan(18) }` do TypeORM.15

 

#### 4.1.1. Artefato: `TypeOrmQueryParser`

 

TypeScript

 

```plaintext
// src/core/utils/typeorm-query.parser.ts
import { FindOptionsWhere, ILike, Equal, MoreThan, LessThan, In, Between } from 'typeorm';

export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string; // Ex: 'createdAt:DESC,name:ASC'
  filter?: Record<string, any>; // Ex: { name: 'John', age: { gt: 18 } }
  search?: string; // Busca textual global (opcional)
}

/**
 * Utilitário para transformar parâmetros de query string (REST)
 * em opções de busca compatíveis com o TypeORM (FindManyOptions).
 */
export class TypeOrmQueryParser {
  static parse<T>(query: QueryParams): {
    take: number;
    skip: number;
    order: any;
    where: FindOptionsWhere<T>;
  } {
    // 1. Paginação
    const page = query.page? Number(query.page) : 1;
    const limit = query.limit? Number(query.limit) : 10;
    const take = limit;
    const skip = (page - 1) * limit;

    // 2. Ordenação
    const order: any = {};
    if (query.sort) {
      query.sort.split(',').forEach((s) => {
        const [field, dir] = s.split(':');
        if (field && dir) {
            order[field] = dir.toUpperCase() === 'ASC'? 'ASC' : 'DESC';
        }
      });
    } else {
      order['createdAt'] = 'DESC'; // Default seguro
    }

    // 3. Filtragem Avançada
    const where: any = {};
    if (query.filter) {
      Object.keys(query.filter).forEach((key) => {
        const value = query.filter[key];
        
        // Se o valor for um objeto, pode conter operadores (eq, gt, lt, like, in)
        if (typeof value === 'object' && value!== null) {
            if (value.eq) where[key] = Equal(value.eq);
            if (value.neq) where[key] = { $not: Equal(value.neq) }; // Adaptação necessária para TypeORM puro
            if (value.gt) where[key] = MoreThan(value.gt);
            if (value.lt) where[key] = LessThan(value.lt);
            if (value.like) where[key] = ILike(`%${value.like}%`); // Case-insensitive
            if (value.in) where[key] = In(value.in.split(','));
            if (value.between) {
                const [start, end] = value.between.split(',');
                where[key] = Between(start, end);
            }
        } else {
            // Valor direto assume igualdade
             where[key] = value;
        }
      });
    }

    return { take, skip, order, where };
  }
}
```

 

### 4.2. Artefato: `AbstractService`

 

Este serviço base será estendido pelos serviços de domínio. Ele injeta o repositório e usa o parser acima.

TypeScript

 

```plaintext
// src/core/base/abstract.service.ts
import { Repository, DeepPartial } from 'typeorm';
import { NotFoundException, Injectable } from '@nestjs/common';
import { AbstractEntity } from '../database/entities/abstract.entity';
import { QueryParams, TypeOrmQueryParser } from '../utils/typeorm-query.parser';

export interface PaginatedResult<T> {
  data: T;
  meta: {
    total: number;
    page: number;
    lastPage: number;
    limit: number;
  };
}

/**
 * Serviço Genérico CRUD.
 * T: Tipo da Entidade
 */
export abstract class AbstractService<T extends AbstractEntity> {
  // Injeção do repositório deve ser feita na classe filha e passada via super()
  protected constructor(protected readonly repository: Repository<T>) {}

  /**
   * Busca paginada com filtros dinâmicos.
   */
  async findAll(query: QueryParams): Promise<PaginatedResult<T>> {
    const { take, skip, order, where } = TypeOrmQueryParser.parse<T>(query);
    
    // Opcional: Adicionar lógica para forçar filtro de Tenant se não estiver usando Global Scope
    // const tenantId = this.clsService.get('TENANT_ID');
    // if (tenantId) where['tenantId'] = tenantId;

    const [data, total] = await this.repository.findAndCount({
      where,
      take,
      skip,
      order,
    });

    return {
      data,
      meta: {
        total,
        page: Number(query.page) |

| 1,
        lastPage: Math.ceil(total / (query.limit |

| 10)),
        limit: take,
      },
    };
  }

  async findOne(id: string): Promise<T> {
    const options: any = { where: { id } };
    const entity = await this.repository.findOne(options);
    if (!entity) {
      throw new NotFoundException(`Entidade com ID ${id} não encontrada.`);
    }
    return entity;
  }

  async create(createDto: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(createDto);
    return this.repository.save(entity);
  }

  async update(id: string, updateDto: DeepPartial<T>): Promise<T> {
    // Verifica existência antes de atualizar
    await this.findOne(id);
    
    // TypeORM update não retorna a entidade atualizada, então buscamos novamente
    await this.repository.update(id, updateDto as any);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.repository.softRemove(entity);
  }
}
```

---

 

## 5. Arquitetura Frontend: Angular 19+ e a Revolução Reativa

 

A especificação do frontend foca na modernização completa, abandonando padrões legados baseados exclusivamente em Observables do RxJS (`HttpClient.get().subscribe()`) em favor da nova API **httpResource** e **Signals**, introduzidos experimentalmente no Angular 19.3

 

### 5.1. Comparativo: HttpClient Legado vs. httpResource

 

| **Característica**          | **Padrão RxJS (HttpClient)**                          | **Padrão Signals (httpResource)**                       |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| **Gatilho de Requisição**   | Imperativo (chamar método `.subscribe()`)             | Declarativo (Reativo a mudanças em Signals de input)    |
| **Race Conditions**         | Manual (necessita `switchMap`)                        | Automático (cancela requisições anteriores nativamente) |
| **Integração com Template** | Pipe \`                                               | async\`                                                 |
| **Detecção de Mudança**     | Dependente de Zone.js                                 | Compatível com Zone-less (futuro do Angular)            |
| **Boilerplate**             | Alto (Subjects, Observables, Subscription management) | Mínimo (função factory)                                 |

 

### 5.2. Desafio de Implementação: Serialização de Parâmetros

 

Um ponto crítico identificado na pesquisa é que o `httpResource` (na versão atual) aceita objetos simples de parâmetros, mas não serializa automaticamente objetos aninhados complexos necessários para nossa API de backend (ex: `filter[age][gt]=18`).17 O `HttpClient` tradicional possui `HttpParams` para isso, mas o `httpResource` opera de forma ligeiramente diferente na sua configuração de `request`.

A solução arquitetural é criar um **Service Factory** que encapsule a lógica de construção da URL e dos parâmetros, garantindo que a complexidade da serialização não vaze para os componentes.

 

### 5.3. Artefato: `BaseResourceService` (Frontend)

 

Este serviço abstrato fornece a ponte entre os componentes Angular e a API padronizada do NestJS.

TypeScript

 

```plaintext
// src/app/core/services/base-resource.service.ts
import { Injectable, Signal, computed } from '@angular/core';
import { httpResource, HttpResourceRef } from '@angular/common/http'; // Angular 19.2+ API
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

// Interfaces de Tipo para o Frontend
export interface QueryState {
  page: number;
  limit: number;
  sort?: string;
  filter?: Record<string, any>;
  search?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  lastPage: number;
  limit: number;
}

export interface ApiResponse<T> {
  data: T;
  meta: PaginationMeta;
}

@Injectable({ providedIn: 'root' })
export abstract class BaseResourceService<T> {
  protected abstract basePath: string; // Ex: '/api/tasks'
  protected http = inject(HttpClient); // Injetado para operações de mutação (POST/PUT/DELETE)
  
  /**
   * Factory de Recurso de Listagem (Reativo).
   * @param querySignal Um Signal contendo o estado atual dos filtros e paginação.
   * @returns HttpResourceRef que atualiza automaticamente quando o querySignal mudar.
   */
  list(querySignal: Signal<QueryState>): HttpResourceRef<ApiResponse<T> | undefined> {
    return httpResource<ApiResponse<T>>(() => {
      const query = querySignal();
      
      // Lógica de Serialização Manual para Query Params Complexos
      // Necessário pois httpResource.params nativo pode não suportar deep objects
      const params = new URLSearchParams();
      
      params.set('page', query.page.toString());
      params.set('limit', query.limit.toString());
      if (query.sort) params.set('sort', query.sort);
      if (query.search) params.set('search', query.search);
      
      if (query.filter) {
        Object.entries(query.filter).forEach(([key, value]) => {
          if (value === null |

| value === undefined |
| value === '') return;

          if (typeof value === 'object') {
             // Serializa: filter[age][gt]=18
             Object.entries(value).forEach(([op, val]) => {
                if (val!== null && val!== undefined) {
                    params.set(`filter[${key}][${op}]`, String(val));
                }
             });
          } else {
             // Serializa: filter[status]=DONE
             params.set(`filter[${key}]`, String(value));
          }
        });
      }

      // Retorna o objeto de configuração da requisição
      // A mudança na URL dispara o reload do resource
      return {
        url: `${this.basePath}?${params.toString()}`,
        method: 'GET',
      };
    });
  }

  /**
   * Factory de Recurso Unitário (Reativo ao ID).
   */
  get(idSignal: Signal<string | null>): HttpResourceRef<T | undefined> {
    return httpResource<T | undefined>(() => {
      const id = idSignal();
      if (!id) return undefined; // Retorna undefined e não faz request

      return {
        url: `${this.basePath}/${id}`,
        method: 'GET',
      };
    });
  }
  
  // Operações de Mutação (Create/Update/Delete)
  // Estas permanecem imperativas (retornam Observable ou Promise) pois são ações do usuário,
  // não estados derivados. O uso de Observables aqui é aceitável, mas deve-se considerar
  // converter para Promise ou usar firstValueFrom para ergonomia async/await.

  create(data: Partial<T>) {
    return this.http.post<T>(this.basePath, data);
  }

  update(id: string, data: Partial<T>) {
    return this.http.patch<T>(`${this.basePath}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.basePath}/${id}`);
  }
}
```

---

 

## 6. Aplicação de Exemplo: Gerenciador de Tarefas Enterprise ("Enterprise Task Manager")

 

Para tangibilizar a implementação, demonstraremos um módulo de tarefas (`Tasks`) completo.

 

### 6.1. Backend: Módulo de Tarefas

 

 

#### 6.1.1. Entidade (`Task`)

 

TypeScript

 

```plaintext
// src/modules/tasks/entities/task.entity.ts
import { Entity, Column } from 'typeorm';
import { AbstractEntity } from '../../../core/database/entities/abstract.entity';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

@Entity('tasks')
export class Task extends AbstractEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  // Prioridade: 1 (Baixa) a 5 (Crítica)
  @Column({ type: 'int', default: 1 })
  priority: number;
}
```

 

#### 6.1.2. Controller (`TasksController`)

 

Observe como o Controller é limpo. Ele apenas delega para o serviço base, confiando nos decoradores e interceptadores globais.

TypeScript

 

```plaintext
// src/modules/tasks/tasks.controller.ts
import { Controller, Get, Post, Body, Query, Param, Patch, Delete } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { QueryParams } from '../../../core/utils/typeorm-query.parser';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  // @Query() query captura?page=1&filter[status]=TODO automaticamente
  findAll(@Query() query: QueryParams) {
    return this.tasksService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  create(@Body() createDto: CreateTaskDto) {
    return this.tasksService.create(createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
```

 

#### 6.1.3. Service (`TasksService`)

 

TypeScript

 

```plaintext
// src/modules/tasks/tasks.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { AbstractService } from '../../../core/base/abstract.service';

@Injectable()
export class TasksService extends AbstractService<Task> {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {
    // Passa o repositório específico para a classe base genérica
    super(taskRepository);
  }
  // Métodos customizados (além do CRUD) entrariam aqui
}
```

 

### 6.2. Frontend: Componente de Lista de Tarefas (`TasksListComponent`)

 

Este componente ilustra a integração completa: Signals controlam o estado da query, que alimenta o `httpResource`, que renderiza a UI.

TypeScript

 

```plaintext
// src/app/features/tasks/tasks-list.component.ts
import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksResourceService } from './services/tasks-resource.service';
import { QueryState } from '../../../core/services/base-resource.service';
import { Task, TaskStatus } from '../models/task.model';

@Component({
  selector: 'app-tasks-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="task-manager">
      <header>
        <h1>Minhas Tarefas</h1>
        <button (click)="createNew()">Nova Tarefa</button>
      </header>
      
      <div class="filters-bar">
        <div class="filter-group">
          <label>Busca:</label>
          <input 
            type="text" 
            [ngModel]="searchTerm()" 
            (ngModelChange)="searchTerm.set($event)" 
            placeholder="Buscar por título..."
          />
        </div>
        
        <div class="filter-group">
          <label>Status:</label>
          <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
            <option value="">Todos</option>
            <option value="TODO">A Fazer</option>
            <option value="IN_PROGRESS">Em Progresso</option>
            <option value="DONE">Concluído</option>
          </select>
        </div>
      </div>

      <div *ngIf="tasksResource.isLoading()" class="loading-spinner">
        Carregando dados...
      </div>
      
      <div *ngIf="tasksResource.error() as err" class="error-banner">
        Ocorreu um erro ao carregar tarefas: {{ err }}
      </div>

      <table *ngIf="tasksResource.value() as response" class="data-table">
        <thead>
          <tr>
            <th (click)="toggleSort('title')">Título</th>
            <th (click)="toggleSort('status')">Status</th>
            <th (click)="toggleSort('priority')">Prioridade</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let task of response.data">
            <td>{{ task.title }}</td>
            <td>
              <span [class]="'badge ' + task.status">{{ task.status }}</span>
            </td>
            <td>{{ task.priority }}</td>
            <td>
              <button (click)="deleteTask(task.id)">Excluir</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination-controls" *ngIf="tasksResource.value() as response">
        <span class="info">
            Mostrando {{ response.data.length }} de {{ response.meta.total }} registros.
        </span>
        <button 
            (click)="prevPage()" 
            [disabled]="page() === 1 |

| tasksResource.isLoading()">
            Anterior
        </button>
        <span class="current-page">Página {{ page() }}</span>
        <button 
            (click)="nextPage(response.meta.lastPage)" 
            [disabled]="page() >= response.meta.lastPage |

| tasksResource.isLoading()">
            Próxima
        </button>
      </div>
    </div>
  `,
  styles:
})
export class TasksListComponent {
  private service = inject(TasksResourceService);

  // 1. Estado Local (Signals)
  // Signals primitivos que representam a intenção do usuário
  page = signal(1);
  searchTerm = signal('');
  statusFilter = signal<string>('');
  sortField = signal('createdAt:DESC');

  // 2. Estado Derivado (Computed)
  // Computa o objeto QueryState completo sempre que qualquer input muda.
  // Debounce poderia ser aplicado aqui usando rxResource ou toObservable se necessário,
  // mas httpResource lida bem com cancelamentos rápidos.
  queryState = computed<QueryState>(() => {
    const filters: any = {};
    
    // Constrói filtro dinâmico
    if (this.statusFilter()) {
        filters.status = { eq: this.statusFilter() };
    }

    return {
      page: this.page(),
      limit: 10, // Tamanho de página fixo ou também via signal
      sort: this.sortField(),
      search: this.searchTerm(),
      filter: filters
    };
  });

  // 3. Recurso Reativo (Resource)
  // A mágica acontece aqui: tasksResource é um objeto que contém.value(),.isLoading(),.error()
  // Ele "observa" o signal queryState. Mudou o queryState -> Dispara novo Request.
  tasksResource = this.service.list(this.queryState);

  // Ações de UI (Métodos)
  
  nextPage(lastPage: number) {
    if (this.page() < lastPage) {
        this.page.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.page() > 1) {
        this.page.update(p => p - 1);
    }
  }

  toggleSort(field: string) {
    // Lógica simples de alternância ASC/DESC
    const current = this.sortField();
    if (current.startsWith(field) && current.endsWith('DESC')) {
        this.sortField.set(`${field}:ASC`);
    } else {
        this.sortField.set(`${field}:DESC`);
    }
  }
  
  async deleteTask(id: string) {
    if(!confirm('Tem certeza?')) return;
    
    try {
        await lastValueFrom(this.service.delete(id)); // lastValueFrom para converter Observable em Promise
        // Nota: httpResource não recarrega automaticamente após mutações externas por padrão.
        // Precisamos invalidar o resource ou atualizar o signal de query para forçar refresh.
        // No Angular 19, resource.reload() é o método esperado.
        this.tasksResource.reload(); 
    } catch (e) {
        alert('Erro ao excluir');
    }
  }
}
```

---

 

## 7. Conclusão e Próximos Passos

 

A arquitetura detalhada neste documento estabelece um padrão de desenvolvimento "Enterprise Grade" que resolve desafios comuns de escalabilidade e manutenção antes mesmo que eles ocorram.

Ao adotar o **NestJS** com **TypeORM** e **Subscribers Injetáveis**, a equipe backend ganha uma auditoria de dados "à prova de esquecimento" e um isolamento de tenant robusto. A camada genérica de serviços elimina o boilerplate de CRUD, permitindo foco em regras de negócio complexas.

No frontend, a adoção do **Angular 19** com **Signals** e **httpResource** posiciona a aplicação na vanguarda da tecnologia web, preparada para um futuro sem Zone.js, com código mais limpo, performático e fácil de depurar. A barreira de entrada da nova API foi mitigada através da criação do `BaseResourceService`, que abstrai a complexidade da serialização de parâmetros.

 

### Checklist de Implementação Inicial

 

1. **Setup do Projeto:** Inicializar monorepo (NX ou Turborepo) ou repositórios separados para Backend e Frontend.
2. **Core Module:** Implementar `ContextModule` e configurar `nestjs-cls` no NestJS.
3. **Database:** Configurar conexão TypeORM e implementar `AuditSubscriber` com o workaround de injeção.
4. **Base Classes:** Criar `AbstractEntity`, `AbstractService` e `TypeOrmQueryParser`.
5. **Frontend Core:** Implementar `BaseResourceService` no Angular lidando com a serialização de query params.
6. **POC:** Criar o módulo `Tasks` conforme documentado para validar o fluxo ponta a ponta.