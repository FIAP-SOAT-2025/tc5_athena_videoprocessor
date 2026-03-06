<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

<h1 align="center">Video Processor Worker</h1>

<p align="center">
  Worker de processamento de vídeos que consome jobs de uma fila Redis/BullMQ, extrai frames usando FFmpeg e gera arquivos ZIP compactados.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen" alt="Node Version" />
  <img src="https://img.shields.io/badge/typescript-%5E5.7.3-blue" alt="TypeScript Version" />
  <img src="https://img.shields.io/badge/nestjs-%5E11.0.1-red" alt="NestJS Version" />
  <img src="https://img.shields.io/badge/license-UNLICENSED-gray" alt="License" />
</p>

## 📋 Índice

- [Descrição](#-descrição)
- [Arquitetura](#-arquitetura)
- [Tecnologias](#-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Execução](#-execução)
- [Fluxo de Processamento](#-fluxo-de-processamento)
- [Monitoramento](#-monitoramento)
- [Testes](#-testes)
- [Docker](#-docker)
- [Estrutura do Projeto](#-estrutura-do-projeto)

## 📝 Descrição

O **Video Processor Worker** é um serviço de processamento assíncrono de vídeos, projetado para funcionar como um worker que consome jobs de uma fila Redis. Este serviço **não expõe rotas de API REST** - ele apenas processa jobs enviados por outros serviços.

### Funcionalidades

- Consumo de jobs da fila `video-processing` (BullMQ)
- Extração automática de frames (1 frame por segundo) usando FFmpeg
- Compressão dos frames em arquivo ZIP
- Armazenamento do resultado no AWS S3
- Atualização de status no banco de dados PostgreSQL
- Métricas de performance via Prometheus
- Dashboard de monitoramento de filas via Bull Board

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVIÇOS EXTERNOS                        │
│  (API de Upload, Microserviços, etc.)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │ Envia jobs para a fila
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      REDIS (BullMQ)                         │
│                  Fila: video-processing                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ Consome jobs
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 VIDEO PROCESSOR WORKER                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  VideoConsumer (BullMQ Worker)                      │    │
│  │    │                                                │    │
│  │    ├──▶ Busca vídeo no S3                          │    │
│  │    ├──▶ Extrai frames (FFmpeg - 1 fps)             │    │
│  │    ├──▶ Comprime frames em ZIP                      │    │
│  │    ├──▶ Armazena ZIP no S3                         │    │
│  │    └──▶ Atualiza status no PostgreSQL              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Endpoints disponíveis (apenas monitoramento):               │
│    • GET /metrics      → Métricas Prometheus                │
│    • GET /admin/queues → Dashboard Bull Board               │
└─────────────────────────────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   PostgreSQL    │     │     AWS S3      │
│  (Status/Dados) │     │   (Arquivos)    │
└─────────────────┘     └─────────────────┘
```

## 🛠 Tecnologias

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| **Node.js** | ≥20.x | Runtime JavaScript |
| **NestJS** | ^11.0.1 | Framework backend |
| **TypeScript** | ^5.7.3 | Linguagem tipada |
| **BullMQ** | ^5.67.2 | Processamento de filas |
| **Redis** | 7.x | Broker de mensagens |
| **FFmpeg** | - | Extração de frames |
| **Archiver** | ^7.0.1 | Compressão ZIP |
| **Prisma** | ^6.8.2 | ORM para PostgreSQL |
| **AWS S3** | - | Armazenamento de arquivos |
| **Prometheus** | - | Coleta de métricas |

## 📋 Pré-requisitos

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Docker** e **Docker Compose** (recomendado)
- **Redis** (para fila de jobs)
- **PostgreSQL** (para persistência de dados)
- **AWS S3** (para armazenamento de arquivos)

## 🚀 Instalação

### Clone o repositório

```bash
git clone <repository-url>
cd tc5-videoprocessor
```

### Instale as dependências

```bash
npm install
```

### Configure as variáveis de ambiente

```bash
cp .env.example .env
```

### Execute as migrações do banco de dados

```bash
npx prisma migrate deploy
npx prisma generate
```

## ⚙️ Configuração

Edite o arquivo `.env` com suas configurações:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=tc5hack
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/tc5hack?schema=public

# Redis (Fila de Jobs)
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS S3 (Armazenamento)
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Application
NODE_ENV=development
PORT=8000

# Output
OUTPUT_FILE_NAME=output.zip

# Monitoramento (Grafana)
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin
```

## ▶️ Execução

### Desenvolvimento

```bash
# Iniciar serviços de infraestrutura
docker-compose up -d postgres redis

# Executar worker em modo desenvolvimento
npm run start:dev
```

### Produção

```bash
# Build da aplicação
npm run build

# Executar worker em produção
npm run start:prod
```

### Com Docker (recomendado)

```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar logs do worker
docker-compose logs -f api
```

## 🎬 Fluxo de Processamento

### Estrutura do Job

O worker espera jobs na fila `video-processing` com o seguinte formato:

```typescript
interface JobData {
  videoId: string;      // ID único do vídeo
  userId: string;       // ID do usuário proprietário
  originalName: string; // Nome original do arquivo
  timestamp: number;    // Timestamp de criação
}
```

### Etapas do Processamento

| Etapa | Progresso | Descrição |
|-------|-----------|-----------|
| 1 | 0% | Job recebido da fila |
| 2 | 10% | Vídeo baixado do S3 |
| 3 | 10-60% | Extração de frames (FFmpeg - 1 fps) |
| 4 | 60-80% | Compressão dos frames em ZIP |
| 5 | 80-100% | Upload do ZIP para S3 |
| 6 | 100% | Status atualizado para COMPLETED |

### Status do Vídeo

| Status | Descrição |
|--------|-----------|
| `PENDING` | Aguardando processamento |
| `PROCESSING` | Worker processando o vídeo |
| `COMPLETED` | Processamento concluído com sucesso |
| `ERROR` | Erro durante o processamento |

### Estrutura de Arquivos no S3

```
bucket/
└── {userId}/
    └── {videoId}/
        ├── video-original.mp4    # Vídeo de entrada
        └── output.zip            # Frames compactados
```

## 📊 Monitoramento

### Endpoints Disponíveis

> ⚠️ **Importante**: Este worker **não expõe rotas de API REST**. Os únicos endpoints disponíveis são para monitoramento:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/metrics` | Métricas no formato Prometheus |
| `GET` | `/admin/queues` | Dashboard Bull Board |

### Bull Board

Acesse o painel de monitoramento de filas:

```
http://localhost:8000/admin/queues
```

Funcionalidades:
- Visualizar jobs pendentes, ativos, completados e com erro
- Retry de jobs com falha
- Visualizar detalhes e progresso de cada job
- Limpar filas

### Prometheus + Grafana

```bash
# Acessar Grafana
http://localhost:3001

# Credenciais padrão
Usuário: admin
Senha: admin
```

### Dashboards Disponíveis

- **API Metrics**: Métricas do worker (jobs processados, tempo de execução)
- **PostgreSQL**: Métricas do banco de dados
- **AWS S3**: Métricas de storage

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes com watch mode
npm run test:watch

# Cobertura de testes
npm run test:cov

# Testes e2e
npm run test:e2e
```

## 🐳 Docker

### Serviços

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| `api` (worker) | 8000 | Worker de processamento |
| `postgres` | 5432 | Banco de dados |
| `redis` | 6379 | Broker de mensagens/filas |
| `prometheus` | 9090 | Coleta de métricas |
| `grafana` | 3001 | Visualização de métricas |
| `postgres-exporter` | 9187 | Exportador PostgreSQL |

### Comandos Úteis

```bash
# Iniciar todos os serviços
docker-compose up -d

# Parar todos os serviços
docker-compose down

# Reconstruir imagens
docker-compose up -d --build

# Ver logs do worker
docker-compose logs -f api

# Escalar workers (processar mais jobs em paralelo)
docker-compose up -d --scale api=3
```

## 📁 Estrutura do Projeto

```
tc5-videoprocessor/
├── prisma/
│   ├── migrations/              # Migrações do banco
│   ├── schema.prisma            # Schema do Prisma
│   └── seed.ts                  # Seed do banco
├── src/
│   ├── database/                # Conexão com banco
│   ├── storage/
│   │   ├── domain/              # Entidade Storage
│   │   ├── gateways/
│   │   │   └── repository/      # Repositório S3
│   │   └── usecases/            # Upload/Download/Delete
│   ├── video/
│   │   ├── domain/              # Entidade Video
│   │   ├── gateways/
│   │   │   ├── processor/       # Serviço FFmpeg
│   │   │   ├── queue/           # Consumer BullMQ
│   │   │   └── repository/      # Repositório Prisma
│   │   └── usecases/            # Casos de uso
│   ├── app.module.ts            # Módulo principal
│   └── main.ts                  # Bootstrap
├── monitoring/
│   ├── grafana/
│   │   ├── dashboards/          # Dashboards JSON
│   │   └── provisioning/        # Configuração automática
│   └── prometheus.yml           # Configuração Prometheus
├── docker-compose.yml           # Orquestração Docker
├── Dockerfile                   # Build da aplicação
└── package.json
```

## 🔄 Integração com Outros Serviços

Para enviar jobs para este worker, outros serviços devem:

1. Conectar ao mesmo Redis
2. Adicionar jobs na fila `video-processing`

### Exemplo de envio de job (outro serviço)

```typescript
import { Queue } from 'bullmq';

const videoQueue = new Queue('video-processing', {
  connection: {
    host: 'redis',
    port: 6379,
  },
});

// Enviar job para processamento
await videoQueue.add('process-video', {
  videoId: 'uuid-do-video',
  userId: 'uuid-do-usuario',
  originalName: 'video.mp4',
  timestamp: Date.now(),
});
```

## 📝 Logs

O worker utiliza o logger do NestJS com os seguintes níveis:

```
[VideoConsumer] Processing job {jobId} for video {videoId}
[VideoConsumer] Extracting frames for video {videoId}
[VideoConsumer] Compressing frames for video {videoId}
[VideoConsumer] Video {videoId} processed successfully
[VideoConsumer] Failed to process video {videoId}: {error}
```

## 📄 Licença

Este projeto está sob licença privada (UNLICENSED).

---

<p align="center">
  Desenvolvido com ❤️ usando <a href="https://nestjs.com">NestJS</a> + <a href="https://docs.bullmq.io">BullMQ</a>
</p>
