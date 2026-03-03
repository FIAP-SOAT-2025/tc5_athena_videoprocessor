<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

<h1 align="center">Athena Video Processor</h1>

<p align="center">
  Sistema de processamento de vídeos construído com NestJS, que extrai frames de vídeos e gera arquivos ZIP compactados.
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
- [API Endpoints](#-api-endpoints)
- [Processamento de Vídeos](#-processamento-de-vídeos)
- [Monitoramento](#-monitoramento)
- [Testes](#-testes)
- [Docker](#-docker)
- [Estrutura do Projeto](#-estrutura-do-projeto)

## 📝 Descrição

O **Athena Video Processor** é uma API RESTful para processamento assíncrono de vídeos. O sistema permite:

- Upload de vídeos em múltiplos formatos (MP4, AVI, MOV, MKV, WMV, FLV, WEBM)
- Extração automática de frames (1 frame por segundo)
- Compressão dos frames em arquivo ZIP
- Armazenamento local ou em AWS S3
- Acompanhamento do status de processamento em tempo real
- Download do resultado processado

## 🏗 Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   NestJS    │────▶│    Redis    │
│             │     │     API     │     │   (Queue)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  PostgreSQL │     │   Worker    │
                    │  (Prisma)   │     │  (BullMQ)   │
                    └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   FFmpeg    │
                                        │  (Frames)   │
                                        └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  S3/Local   │
                                        │  Storage    │
                                        └─────────────┘
```

## 🛠 Tecnologias

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| **Node.js** | ≥20.x | Runtime JavaScript |
| **NestJS** | ^11.0.1 | Framework backend |
| **TypeScript** | ^5.7.3 | Linguagem tipada |
| **Prisma** | ^6.8.2 | ORM para PostgreSQL |
| **BullMQ** | ^5.67.2 | Gerenciamento de filas |
| **Redis** | 7.x | Broker de mensagens |
| **PostgreSQL** | 16.x | Banco de dados |
| **FFmpeg** | - | Processamento de vídeo |
| **AWS S3** | - | Armazenamento em nuvem |
| **Prometheus** | - | Métricas |
| **Grafana** | - | Dashboards |

## 📋 Pré-requisitos

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Docker** e **Docker Compose** (recomendado)
- **FFmpeg** (instalado automaticamente via dependência)

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

### Popule o banco com dados iniciais (opcional)

```bash
npx prisma db seed
```

## ⚙️ Configuração

Edite o arquivo `.env` com suas configurações:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=tc5hack
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/tc5hack?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-key

# Application
NODE_ENV=development
PORT=3000

# AWS S3 (opcional)
AWS_S3_BUCKET=your-bucket-name

# Output
OUTPUT_FILE_NAME=output.zip

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin
```

## ▶️ Execução

### Desenvolvimento

```bash
# Iniciar serviços com Docker
docker-compose up -d postgres redis

# Executar aplicação em modo desenvolvimento
npm run start:dev
```

### Produção

```bash
# Build da aplicação
npm run build

# Executar em produção
npm run start:prod
```

### Com Docker (recomendado)

```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar logs
docker-compose logs -f api
```

## 📡 API Endpoints

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/auth/signin` | Autenticar usuário |

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Usuários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/users` | Criar novo usuário |

### Vídeos

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| `POST` | `/video` | Upload de vídeo | ✅ |
| `GET` | `/video/status/:jobId` | Status do processamento | ✅ |
| `GET` | `/video/:userId/:videoId` | Download do resultado | ✅ |

### Upload de Vídeo

**Request (multipart/form-data):**
- `file`: Arquivo de vídeo
- `file_name`: Nome do arquivo
- `extension`: Extensão (opcional)
- `userId`: ID do usuário

**Response:**
```json
{
  "jobId": "uuid",
  "status": "Processing",
  "videoId": "uuid"
}
```

### Monitoramento

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/metrics` | Métricas Prometheus |
| `GET` | `/admin/queues` | Dashboard Bull Board |

## 🎬 Processamento de Vídeos

### Fluxo de Processamento

1. **Upload**: Vídeo é recebido e salvo no storage
2. **Enfileiramento**: Job é adicionado à fila BullMQ
3. **Processamento**: Worker extrai frames usando FFmpeg (1 fps)
4. **Compressão**: Frames são compactados em ZIP
5. **Armazenamento**: ZIP é salvo no S3 ou storage local
6. **Notificação**: Status é atualizado no banco de dados

### Status do Vídeo

| Status | Descrição |
|--------|-----------|
| `PENDING` | Aguardando processamento |
| `PROCESSING` | Em processamento |
| `COMPLETED` | Processamento concluído |
| `ERROR` | Erro no processamento |

### Formatos Suportados

- MP4, AVI, MOV, MKV, WMV, FLV, WEBM

## 📊 Monitoramento

### Prometheus + Grafana

O projeto inclui configuração completa de monitoramento:

```bash
# Acessar Grafana
http://localhost:3001

# Credenciais padrão
Usuário: admin
Senha: admin
```

### Dashboards Disponíveis

- **API NestJS Metrics**: Métricas da aplicação
- **PostgreSQL**: Métricas do banco de dados
- **AWS S3**: Métricas do storage (se configurado)

### Bull Board

Acesse o painel de monitoramento de filas:

```
http://localhost:3000/admin/queues
```

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
| `api` | 3000 | Aplicação NestJS |
| `postgres` | 5432 | Banco de dados |
| `redis` | 6379 | Broker de mensagens |
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

# Ver logs
docker-compose logs -f [service]

# Acessar container
docker exec -it [container-name] sh
```

## 📁 Estrutura do Projeto

```
tc5-videoprocessor/
├── prisma/
│   ├── migrations/          # Migrações do banco
│   ├── schema.prisma        # Schema do Prisma
│   └── seed.ts              # Seed do banco
├── src/
│   ├── database/            # Conexão com banco
│   ├── storage/             # Módulo de armazenamento
│   ├── video/
│   │   ├── domain/          # Entidades
│   │   ├── gateways/
│   │   │   ├── processor/   # Serviço FFmpeg
│   │   │   ├── queue/       # Consumer BullMQ
│   │   │   └── repository/  # Repositório Prisma
│   │   └── usecases/        # Casos de uso
│   ├── app.module.ts        # Módulo principal
│   └── main.ts              # Bootstrap
├── monitoring/
│   ├── grafana/
│   │   ├── dashboards/      # Dashboards JSON
│   │   └── provisioning/    # Configuração automática
│   └── prometheus.yml       # Configuração Prometheus
├── test/                    # Testes e2e
├── docker-compose.yml       # Orquestração Docker
├── Dockerfile               # Build da aplicação
└── package.json
```

## 🔐 Autenticação

O sistema utiliza JWT para autenticação. Após o login, inclua o token no header:

```
Authorization: Bearer <token>
```

### Usuário de Teste

```
Email: admin@athena.com
Senha: 123456
```

## 📝 Postman Collection

Importe a collection disponível em [postman_collection.json](postman_collection.json) para testar a API.

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença privada (UNLICENSED).

## 👥 Autores

- **Time TC5** - Desenvolvimento inicial

---

<p align="center">
  Desenvolvido com ❤️ usando <a href="https://nestjs.com">NestJS</a>
</p>