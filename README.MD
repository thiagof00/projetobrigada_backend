# 🚨 SOS Real-Time System

Sistema de acionamento **SOS em tempo real**, onde um usuário pode solicitar ajuda e **brigadistas disponíveis recebem a ocorrência instantaneamente**, podendo aceitá-la em tempo real.

O projeto foi desenvolvido com **Node.js + Express**, utilizando **SQLite** como banco de dados.

---

## 📌 Funcionalidades

* 📱 Usuário pode acionar um **SOS** pelo aplicativo
* 🚒 Todos os brigadistas recebem a solicitação em **tempo real**
* ✅ Apenas **um brigadista pode aceitar** a ocorrência
* 🔄 Atualização de status em tempo real (WebSocket)
* 🗂 Persistência dos dados em **SQLite**

---

## 🧠 Conceito do Funcionamento

Fluxo inspirado em apps de corrida:

1. Usuário aperta o botão **SOS**
2. Backend cria uma ocorrência com status `ABERTA`
3. WebSocket notifica todos os brigadistas online
4. O primeiro brigadista que aceitar fica com a ocorrência
5. Status muda para `EM_ATENDIMENTO`
6. Os demais brigadistas perdem acesso à ocorrência

---

## 🏗 Arquitetura

```
[ APP Usuário ] ---> REST API (Express)
                         |
                         |-- WebSocket (tempo real)
                         v
                    [ SQLite ]
```

---

## 🛠 Tecnologias Utilizadas

* Node.js
* Express
* WebSocket (`ws`)
* SQLite

---

## 📁 Estrutura do Projeto

```
src/
 ├─ index.js        # Servidor principal
 ├─ routes/        # Rotas REST
 └─ db/            # Conexão SQLite e seeds
```

---

## 🚀 Como Executar o Projeto

### 1️⃣ Clonar o repositório

```bash
git clone https://github.com/seu-usuario/sos-realtime-system.git
cd sos-realtime-system
```

### 2️⃣ Instalar dependências

```bash
npm install
```

### 3️⃣ Configurar .env

* crie a variavel PORT_SERVER para executar na porta de sua preferencia
> ⚠️ Não versionar este arquivo

---

### 4️⃣ Iniciar o servidor

```bash
node src/index.js
```

Servidor rodará em:

```
http://localhost:PORT_SERVER
```

---

## 🔌 Endpoints Principais

### Criar SOS

```
POST /sos
```

Body:

```json
{
  "usuarioId": 1
}
```

---

### Aceitar Ocorrência

```
POST /ocorrencias/:id/aceitar
```

Body:

```json
{
  "brigadistaId": 10
}
```

---

## 🔔 WebSocket

### Conexão

```
ws://localhost:3000
```

### Identificação inicial

```json
{
  "type": "IDENTIFY",
  "role": "BRIGADA",
  "userId": 10
}
```

### Eventos

* `NOVA_OCORRENCIA`
* `OCORRENCIA_ACEITA`
* `OCORRENCIA_FINALIZADA`

---

## 🔐 Regras de Negócio Importantes

* Apenas ocorrências com status `ABERTA` podem ser aceitas
* Backend garante exclusividade (evita dupla aceitação)
* Push Notification **não decide nada**, apenas notifica

---

## 📈 Possíveis Evoluções

* 🔐 Autenticação JWT
* 📍 Filtro de ocorrências por proximidade
* ⚡ Redis para escalar o sistema
* ⏱ Timeout automático de ocorrências
* 📊 Dashboard administrativo

---

## 🎓 Contexto Acadêmico

Este projeto é ideal para:

* Trabalhos acadêmicos
* TCCs
* Protótipos de sistemas em tempo real
* Estudos sobre WebSocket, concorrência e notificações push

---

## 👨‍💻 Autor

Thiago Ribeiro

---

## 📄 Licença

Este projeto é distribuído sob a licença MIT.