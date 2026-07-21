# 银行贷款材料智能核验系统
## 最终版项目说明与 5 天开发计划

> 本文档可直接交给 Codex，作为项目的最终开发说明。  
> 项目目标是在 5 天内完成一个可运行、可测试、可部署、可向面试官讲清楚的 MVP。

---

## 1. 项目简介

开发一个银行贷款材料预审网站。

用户上传模拟的贷款申请表、工资单和银行流水后，系统自动检查：

- 材料是否齐全
- 申请表和工资单中的姓名是否一致
- 雇主名称是否一致
- 申报收入是否与工资单一致
- 申报收入是否与银行流水中的平均工资一致
- 最近三个月是否都有稳定工资收入

系统最终返回三种状态之一：

```text
verification_passed
additional_documents_required
manual_review_required
```

系统只负责贷款材料预审，不负责最终批准或拒绝贷款。

---

## 2. 项目核心原则

这个项目不是普通聊天机器人。

职责划分如下：

```text
JavaScript + SQL
负责计算、比较和决定核验结果

RAG
负责检索银行政策并提供来源

大语言模型
负责解释核验结果

MCP
负责把查询、计算、核验和创建复核任务封装为工具

AWS
负责部署前端、后端、数据库、文件和模型服务
```

最重要的设计原则：

> 大语言模型负责理解和解释；JavaScript、SQL 和规则负责计算和判断。

---

## 3. 技术栈

### 前端

- React
- TypeScript
- TSX
- Vite
- React Router
- Axios
- Tailwind CSS

### 后端

- Node.js
- JavaScript
- Express.js
- `pg`
- Multer
- `csv-parse`
- Zod
- dotenv
- cors

### 数据库

- PostgreSQL
- 原生 SQL
- pgvector
- 本地开发使用 Docker Compose
- 线上部署使用 AWS RDS PostgreSQL

### AI

- Amazon Bedrock
- PostgreSQL + pgvector
- Markdown 银行政策文件

### MCP

- `@modelcontextprotocol/sdk`
- Zod
- MCP 工具复用现有后端函数

### AWS

- AWS Amplify：部署 React 前端
- AWS Elastic Beanstalk：部署 Express 后端
- AWS RDS PostgreSQL：数据库
- Amazon S3：保存上传文件
- Amazon Bedrock：Embedding 和解释生成
- Amazon CloudWatch：日志

### 开发工具

- VS Code 或 Cursor
- Codex
- Node.js
- npm
- Git
- GitHub
- Docker Desktop
- DBeaver
- Postman 或 Bruno

---

## 4. 最新极简目录结构

```text
loan-document-verification/
├── public/
│
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   │
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── FileUpload.tsx
│   │   ├── VerificationCard.tsx
│   │   ├── PolicyCard.tsx
│   │   └── LoadingSpinner.tsx
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Upload.tsx
│   │   └── Result.tsx
│   │
│   ├── api/
│   │   └── api.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   └── styles/
│       └── globals.css
│
├── server/
│   ├── server.js
│   ├── routes.js
│   ├── database.js
│   ├── verification.js
│   ├── rag.js
│   ├── mcp.js
│   └── utils.js
│
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── policies.sql
│
├── sample-data/
│   ├── passed/
│   │   ├── application.json
│   │   ├── payslip.json
│   │   └── bank_statement.csv
│   │
│   ├── missing-documents/
│   │   ├── application.json
│   │   └── bank_statement.csv
│   │
│   └── income-mismatch/
│       ├── application.json
│       ├── payslip.json
│       └── bank_statement.csv
│
├── knowledge-base/
│   ├── income_verification.md
│   ├── required_documents.md
│   └── manual_review_policy.md
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── docker-compose.yml
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── .env
├── .env.example
└── README.md
```

---

## 5. 每个目录的作用

### `src/`

React 前端代码。

### `src/components/`

只放可复用 UI 组件。

### `src/pages/`

只保留三个页面：

- `Home.tsx`
- `Upload.tsx`
- `Result.tsx`

### `server/`

所有 Node.js 后端代码。

不再拆分 controller、service、repository 等复杂目录。

### `database/`

只保存 SQL 文件：

- `schema.sql`：创建数据库表
- `seed.sql`：插入测试数据
- `policies.sql`：插入政策数据或测试向量数据

### `sample-data/`

保存三套固定演示案例。

### `knowledge-base/`

保存给 RAG 检索的银行政策 Markdown 文件。

---

## 6. 前端页面

### 6.1 Home

功能：

- 简单介绍项目
- 展示系统流程
- 提供“开始核验”按钮

### 6.2 Upload

功能：

- 输入申请人信息
- 上传申请表 JSON
- 上传工资单 JSON
- 上传银行流水 CSV
- 提交后调用后端核验接口
- 成功后跳转 Result 页面

### 6.3 Result

显示：

- 申请人姓名
- 雇主
- 申报收入
- 银行流水平均工资
- 最终核验状态
- 每一条核验结果
- 相关银行政策
- AI 解释
- 创建人工复核任务按钮

---

## 7. 后端文件职责

### `server/server.js`

负责：

- 创建 Express 应用
- 注册中间件
- 注册路由
- 启动服务器
- 统一错误处理

### `server/routes.js`

负责所有 REST API：

```text
POST /api/applications
POST /api/applications/:id/documents
POST /api/applications/:id/verify
GET  /api/applications/:id
POST /api/applications/:id/review-case
GET  /api/health
```

### `server/database.js`

负责：

- PostgreSQL 连接池
- 参数化 SQL 查询
- 数据库事务
- 基础查询函数

### `server/verification.js`

负责：

- 材料完整性检查
- 姓名一致性检查
- 雇主一致性检查
- 收入差异计算
- 三个月工资稳定性检查
- 最终状态判断

### `server/rag.js`

负责：

- 读取政策文档
- 生成 Embedding
- 写入 pgvector
- 检索最相关政策
- 调用 Bedrock 生成解释

### `server/mcp.js`

负责注册 MCP 工具：

```text
get_application
calculate_average_salary
verify_application
create_review_case
```

### `server/utils.js`

负责：

- 姓名标准化
- 公司名称标准化
- 收入差异计算
- 日期范围计算
- 通用辅助函数

---

## 8. 输入文件

### 8.1 application.json

```json
{
  "applicantName": "Alex Tan",
  "declaredMonthlyIncome": 8000,
  "employerName": "ABC Technologies Pte Ltd",
  "requestedLoanAmount": 50000,
  "address": "10 Example Street, Singapore"
}
```

### 8.2 payslip.json

```json
{
  "employeeName": "Alex Tan",
  "monthlyIncome": 6500,
  "employerName": "ABC Technologies",
  "payPeriod": "2026-06"
}
```

### 8.3 bank_statement.csv

```csv
date,description,amount,category
2026-04-30,Salary Credit,6480,salary
2026-05-31,Salary Credit,6500,salary
2026-06-30,Salary Credit,6460,salary
2026-06-05,Rent Payment,-1800,rent
2026-06-10,Grocery Store,-250,shopping
```

规则：

- 收入为正数
- 支出为负数
- 工资记录的 `category` 必须是 `salary`

---

## 9. 数据库表

为了简化，只使用六张表。

### 9.1 applications

```sql
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    applicant_name VARCHAR(100) NOT NULL,
    declared_monthly_income NUMERIC(12, 2) NOT NULL,
    employer_name VARCHAR(150) NOT NULL,
    requested_loan_amount NUMERIC(12, 2) NOT NULL,
    address TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 9.2 documents

```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500),
    extracted_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 9.3 bank_transactions

```sql
CREATE TABLE bank_transactions (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description VARCHAR(255),
    amount NUMERIC(12, 2) NOT NULL,
    category VARCHAR(50) NOT NULL
);
```

### 9.4 verification_results

```sql
CREATE TABLE verification_results (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    check_name VARCHAR(100) NOT NULL,
    result VARCHAR(30) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 9.5 review_cases

```sql
CREATE TABLE review_cases (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 9.6 policy_chunks

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE policy_chunks (
    id SERIAL PRIMARY KEY,
    policy_id VARCHAR(50) NOT NULL,
    policy_name VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1024),
    source_file VARCHAR(255) NOT NULL
);
```

Embedding 维度根据最终 Bedrock 模型调整。

---

## 10. 核验规则

### 10.1 材料完整性

必须上传：

```text
application_form
payslip
bank_statement
```

缺少任意材料：

```text
additional_documents_required
```

### 10.2 姓名一致性

比较：

```text
application.applicantName
payslip.employeeName
```

标准化后仍不一致：

```text
manual_review_required
```

### 10.3 雇主一致性

比较：

```text
application.employerName
payslip.employerName
```

忽略：

```text
ltd
limited
inc
company
corp
pte
private
标点
空格
```

不一致：

```text
manual_review_required
```

### 10.4 工资单收入差异

计算：

```text
ABS(申报收入 - 工资单收入) / 申报收入
```

判断：

```text
<= 10%：通过
> 10% 且 <= 15%：需要补充材料
> 15%：人工复核
```

### 10.5 银行流水平均工资

使用 SQL：

```sql
SELECT AVG(amount) AS average_salary
FROM bank_transactions
WHERE application_id = $1
  AND category = 'salary';
```

### 10.6 流水收入差异

计算：

```text
ABS(申报收入 - 流水平均工资) / 申报收入
```

判断规则同工资单收入。

### 10.7 工资稳定性

最近三个月必须每个月都有工资记录。

不足三个月：

```text
additional_documents_required
```

### 10.8 状态优先级

```text
manual_review_required
>
additional_documents_required
>
verification_passed
```

---

## 11. RAG 功能

RAG 不负责决定核验结果。

RAG 只负责：

1. 根据失败规则生成查询。
2. 搜索相关银行政策。
3. 返回 Policy ID。
4. 返回政策原文。
5. 返回来源文件。
6. 使用 Bedrock 生成解释。

正确流程：

```text
JavaScript 和 SQL 产生核验结果
→ pgvector 检索政策
→ Bedrock 生成解释
```

政策文件：

```text
knowledge-base/
├── income_verification.md
├── required_documents.md
└── manual_review_policy.md
```

示例：

```markdown
# Income Verification Policy

Policy ID: INC-002

If the difference between declared monthly income and average salary
credit exceeds 15%, the application must be escalated for manual review.
```

---

## 12. MCP 功能

只实现四个工具。

### `get_application`

获取申请和核验结果。

### `calculate_average_salary`

使用 SQL 计算平均工资。

### `verify_application`

执行全部核验规则。

### `create_review_case`

创建人工复核任务。

输入必须包含：

```json
{
  "applicationId": 1,
  "reason": "Income difference exceeds 15%",
  "confirmed": true
}
```

规则：

- `confirmed` 必须为 `true`
- 状态必须为 `manual_review_required`
- 不允许重复创建未关闭的复核任务

MCP 工具必须复用现有函数，不要重新写一套业务逻辑。

---

## 13. 本地开发环境

### docker-compose.yml

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: loan_verification
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### .env.example

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/loan_verification
VITE_API_BASE_URL=http://localhost:3000/api

AWS_REGION=
BEDROCK_EMBEDDING_MODEL_ID=
BEDROCK_TEXT_MODEL_ID=
S3_BUCKET_NAME=
```

### 本地启动顺序

```bash
docker compose up -d
npm install
npm run db:setup
npm run dev
```

---

## 14. 五天开发计划

# Day 1：基础项目

目标：

```text
React
→ Express
→ PostgreSQL
→ 创建申请
→ 显示申请
```

任务：

1. 创建 GitHub 仓库。
2. 初始化 React + TypeScript + Vite。
3. 初始化 Express 后端。
4. 创建 Docker PostgreSQL。
5. 创建 `schema.sql`。
6. 实现数据库连接。
7. 实现创建申请 API。
8. 实现获取申请 API。
9. 创建简单表单。
10. 前端显示保存后的数据。

验收：

- React 可以创建申请
- Express 可以访问 PostgreSQL
- 页面可以显示申请内容

---

# Day 2：文件上传与核验

任务：

1. 实现 JSON 和 CSV 上传。
2. 解析三个文件。
3. 保存文档和银行流水。
4. 实现全部核验规则。
5. 实现最终状态判断。
6. 创建 Result 页面。
7. 准备三套演示数据。
8. 添加基础测试。

验收：

三种场景稳定输出：

```text
verification_passed
additional_documents_required
manual_review_required
```

---

# Day 3：RAG

任务：

1. 编写三份银行政策。
2. 启用 pgvector。
3. 创建 policy_chunks。
4. 导入政策。
5. 调用 Bedrock 生成 Embedding。
6. 实现向量检索。
7. 调用 Bedrock 生成解释。
8. 页面显示政策来源。

验收：

人工复核案例能够显示：

- 实际数据
- Policy ID
- 政策原文
- 来源文件
- AI 解释

---

# Day 4：MCP

任务：

1. 安装 MCP SDK。
2. 实现四个 MCP 工具。
3. MCP 工具复用现有函数。
4. 测试查询申请。
5. 测试计算平均工资。
6. 测试执行核验。
7. 测试创建人工复核任务。

验收：

MCP 客户端可以成功调用四个工具。

---

# Day 5：AWS 与 GitHub

任务：

1. 创建 AWS RDS PostgreSQL。
2. 执行 schema.sql。
3. 部署 Express 到 Elastic Beanstalk。
4. 部署 React 到 Amplify。
5. 创建 S3 Bucket。
6. 配置 Bedrock。
7. 配置 GitHub Actions。
8. 完善 README。
9. 准备演示截图。
10. 测试三套演示数据。

验收：

- 网站可公开访问
- API 可访问
- 数据保存在 RDS
- 文件保存在 S3
- RAG 正常工作
- MCP 正常工作
- GitHub CI 通过

---

## 15. 三套测试场景

### passed

```text
姓名一致
雇主一致
三个月工资完整
收入差异小于 10%
```

结果：

```text
verification_passed
```

### missing-documents

```text
缺少工资单
或缺少一个月工资记录
```

结果：

```text
additional_documents_required
```

### income-mismatch

```text
申报收入：8000
工资单收入：6500
流水平均工资：6480
流水差异：19%
```

结果：

```text
manual_review_required
```

---

## 16. GitHub Actions

只保留一个 CI 文件：

```text
.github/workflows/ci.yml
```

检查：

```text
npm install
前端 TypeScript 检查
前端 Build
后端测试
```

第一版不需要复杂自动部署流程。

AWS Amplify 可以直接连接 GitHub 自动部署前端。

后端部署可以在第五天手动完成。

---

## 17. 不要实现的功能

第一版不要加入：

- 登录注册
- 真实客户数据
- PDF OCR
- Amazon Textract
- 信用评分
- 自动批准贷款
- 自动拒绝贷款
- 多角色系统
- 管理员后台
- 多语言
- 多银行
- 多 Agent
- 真实银行 API

---

## 18. 给 Codex 的第一条指令

```text
Create only the Day 1 foundation of a bank loan document verification MVP.

Use this simple project structure:

- src/ for the React TypeScript frontend
- server/ for the Node.js JavaScript backend
- database/ for SQL files
- sample-data/ for demo files
- knowledge-base/ for policy Markdown files

Frontend:
- React
- TypeScript
- TSX
- Vite
- React Router
- Axios

Backend:
- Node.js
- JavaScript
- Express
- ES modules
- pg
- Zod
- cors
- dotenv

Database:
- PostgreSQL
- Docker Compose
- Raw SQL

Day 1 requirements:
- Create the folder structure.
- Add Docker Compose with pgvector/pgvector:pg16.
- Create database/schema.sql with applications and documents tables.
- Create server/database.js.
- Create server/server.js.
- Create server/routes.js.
- Implement POST /api/applications.
- Implement GET /api/applications/:id.
- Create a React form in src/pages/Upload.tsx.
- Submit the form to the backend.
- Display the saved application.
- Add .env.example.
- Add basic error handling.
- Do not implement uploads, verification rules, RAG, MCP or AWS yet.
- After writing the code, provide exact commands to install, configure, test and run the project.
```

---

## 19. 面试介绍

### 30 秒版本

我开发了一个银行贷款材料智能核验系统。用户上传申请表、工资单和银行流水后，系统使用 JavaScript 和 SQL 自动比较姓名、雇主和收入，并根据确定性规则判断是通过预审、补充材料还是进入人工复核。RAG 用于检索银行政策并提供来源，MCP 用于封装查询申请、计算收入、执行核验和创建复核任务。系统最终部署在 AWS。

### 技术总结

```text
React + TypeScript + TSX
Node.js + JavaScript + Express
PostgreSQL + SQL + pgvector
RAG + Amazon Bedrock
MCP
AWS Amplify + Elastic Beanstalk + RDS + S3
GitHub Actions
```

### 最重要的一句话

> 大语言模型负责理解和解释；JavaScript、SQL 和规则负责计算和判断。
