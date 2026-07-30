# 银行贷款材料智能核验系统
## 当前项目说明与剩余三天开发计划

> 本文档以当前代码状态为准。目标是在三天内完成一个可运行、可演示、可部署、能清楚讲明技术取舍的 MVP。  
> MCP 不再实现。Day 1 和 Day 2 的最简 RAG 与前端展示已经完成；接下来重点是 AWS 数据库/部署和演示质量。

---

## 1. 项目目标

开发一个银行贷款材料预审网站。

用户在页面中选择模拟材料：

- 贷款申请表 JSON
- 工资单 JSON
- 银行流水 CSV

前端读取文件内容后，把解析后的普通 JSON 数据提交给后端。后端使用确定性规则检查：

- 材料是否齐全
- 申请表和工资单姓名是否一致
- 申请表和工资单雇主是否一致
- 申报收入是否与工资单一致
- 申报收入是否与银行流水平均工资一致
- 最近三个月是否都有稳定工资收入

系统最终返回三种状态之一：

```text
verification_passed
additional_documents_required
manual_review_required
```

系统只做贷款材料预审，不做最终批准或拒绝。

---

## 2. 当前核心原则

```text
React
负责表单、文件选择、前端读取 JSON/CSV、结果展示

Express
负责 API、数据库写入、调用核验和 RAG

JavaScript + SQL
负责计算、比较和决定核验结果

RAG
负责检索银行政策、提供来源、生成结构化审核辅助信息

PostgreSQL
负责保存申请、文档解析结果、银行流水、核验结果
```

最重要的设计原则：

> 规则和 SQL 负责判断；RAG 和大语言模型负责解释，不负责决定结果。

---

## 3. 当前技术栈

### 前端

- React
- TypeScript
- Vite
- React Router
- Axios
- Tailwind CSS
- lucide-react

### 后端

- Node.js
- Express.js
- JavaScript ES modules
- pg
- dotenv
- cors

### 数据库

- PostgreSQL
- 本地开发使用 Docker Compose
- 线上计划使用 AWS RDS PostgreSQL

### 最简 RAG

- 一个 RAG 文件：`server/ai.js`
- `server/ai.js` 里包含小型政策语料库、政策检索函数和大模型调用
- 大模型把核验结果和检索到的政策生成结构化 JSON
- 当前 JSON 字段：`summary`、`riskLevel`、`explanation`、`recommendedActions`、`requiredDocuments`
- 必须配置 `OPENAI_API_KEY`
- 第一版不接 pgvector，先用关键词检索

### 不再使用

- Multer：已经移除。前端读取文件内容后提交 JSON。
- Zod：已经移除。当前 MVP 使用轻量手写校验。
- MCP：不做。
- S3：当前 MVP 不保存原始文件，因此不需要 S3。

---

## 4. 当前目录结构

```text
Stratton-Oakmont-LoanAdvisor/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── api/
│   │   └── api.ts
│   ├── components/
│   │   ├── FileUpload.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Navbar.tsx
│   │   ├── PolicyCard.tsx
│   │   └── VerificationCard.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Result.tsx
│   │   └── Upload.tsx
│   ├── styles/
│   │   └── globals.css
│   └── types/
│       └── index.ts
│
├── server/
│   ├── ai.js
│   ├── database.js
│   ├── server.js
│   └── verification.js
│
├── database/
│   └── schema.sql
│
├── sample-data/
│   ├── income-mismatch/
│   ├── missing-documents/
│   └── passed/
│
├── README.md
├── docker-compose.yml
├── package.json
├── vite.config.ts
└── .env.example
```

最简 RAG 当前集中在：

```text
server/ai.js
```

---

## 5. 当前已经完成

### 前端

- 首页、上传页、结果页已经存在。
- 上传页可以输入申请人信息。
- 上传页可以选择三类模拟文件。
- 前端不再真正上传文件本体。
- 前端使用 `file.text()` 读取 JSON/CSV 内容。
- 前端把解析后的 `documents` 对象作为普通 JSON 发给后端。

### 后端

- Express 服务已存在。
- PostgreSQL 连接已存在。
- `POST /api/applications` 已存在。
- `POST /api/applications/intake` 已存在。
- `GET /api/applications/:id` 已存在。
- `POST /api/applications/:id/verify` 已存在。
- 核验规则已放在 `server/verification.js`。
- 小型政策语料库、政策检索和大模型调用已集中放在 `server/ai.js`。
- `GET /api/applications/:id/policy-explanation` 已返回结构化 RAG 结果。
- 文档数据保存到 `documents.extracted_data`。
- 银行流水保存到 `bank_transactions`。
- 核验结果保存到 `verification_results`。

### 数据库

当前已有核心表：

- `applications`
- `documents`
- `bank_transactions`
- `verification_results`

### 测试数据

当前已有三套演示数据：

- `sample-data/passed`
- `sample-data/missing-documents`
- `sample-data/income-mismatch`

---

## 6. 当前文件读取和提交路径

现在没有服务器文件上传路径。

完整路径是：

```text
/upload 页面
→ 用户选择 JSON/CSV 文件
→ 浏览器生成 File 对象
→ 前端 file.text() 读取文件内容
→ 前端 JSON.parse 或 CSV parse
→ POST /api/applications/intake
→ 后端 req.body.documents
→ applications / documents / bank_transactions / verification_results
→ 前端跳转 /result/:id
```

关键点：

- 不使用 Multer。
- 不使用 `multipart/form-data`。
- 不使用 `req.files`。
- 不保存原始文件。
- 数据库只保存文件名和解析后的结构化数据。

请求体示例：

```json
{
  "applicantName": "Alex Tan",
  "declaredMonthlyIncome": 8000,
  "employerName": "ABC Technologies Pte Ltd",
  "requestedLoanAmount": 50000,
  "address": "10 Example Street, Singapore",
  "documents": {
    "application_form": {
      "fileName": "application.json",
      "extractedData": {
        "applicantName": "Alex Tan"
      }
    },
    "payslip": {
      "fileName": "payslip.json",
      "extractedData": {
        "employeeName": "Alex Tan",
        "monthlyIncome": 8000,
        "employerName": "ABC Technologies Pte Ltd"
      }
    },
    "bank_statement": {
      "fileName": "bank_statement.csv",
      "extractedData": {
        "transactions": [
          {
            "transactionDate": "2026-04-30",
            "description": "Salary Credit",
            "amount": 8000,
            "category": "salary"
          }
        ]
      }
    }
  }
}
```

---

## 7. 当前 API

```text
GET  /api/health
POST /api/applications
POST /api/applications/intake
POST /api/applications/:id/verify
GET  /api/applications/:id/policy-explanation
GET  /api/applications/:id
```

### `POST /api/applications/intake`

当前最重要的接口。

负责：

1. 接收申请字段和 `documents`。
2. 创建 application。
3. 保存文档解析结果。
4. 保存银行流水交易。
5. 执行核验。
6. 返回完整 application。

---

## 8. RAG 要做什么

RAG 不负责判断贷款是否通过。

RAG 只负责：

1. 根据核验结果生成政策查询。
2. 从小型政策语料库中检索相关政策。
3. 返回 policy id、政策标题、政策内容。
4. 把核验结果和政策交给大模型生成结构化 JSON。
5. 在 Result 页面展示风险总结、风险等级、下一步建议、需要补充的材料、政策依据和解释。

正确职责链：

```text
verification.js
产生确定性核验结果

ai.js
提供小型政策语料库、检索函数和大模型调用

policy-explanation API
调用大模型，返回检索结果和面向审核员的结构化分析
```

---

## 9. 最简 RAG 实现方案

为了让结构尽量简单，RAG 第一版保留“检索增强生成”的核心，但不做向量库、不做 seed、不新增数据库表。

第一版只做：

```text
核验结果
→ 检索小型政策语料库
→ 返回政策依据
→ 大模型生成结构化 JSON
→ Result 页面展示审核辅助信息
```

RAG 只放在一个后端文件：

```text
server/ai.js
```

里面放 3 到 5 条政策，作为第一版 policy corpus：

```js
export const policies = [
  {
    id: 'DOC-001',
    title: 'Required Documents Policy',
    tags: ['document_completeness', 'additional_documents_required'],
    content: 'Applications require an application form, payslip, and bank statement.'
  },
  {
    id: 'INC-001',
    title: 'Income Verification Policy',
    tags: ['payslip_income_match', 'bank_income_match', 'manual_review_required'],
    content: 'Large income differences require additional documents or manual review.'
  }
];
```

只新增一个 API：

```text
GET /api/applications/:id/policy-explanation
```

这个接口做三件事：

1. 读取 application 和 verification results。
2. 用 `checkName` / `result` 在 `server/ai.js` 里检索相关政策。
3. 调用大模型，返回检索到的政策列表和结构化分析。

当前返回结构：

```json
{
  "applicationId": 1,
  "status": "manual_review_required",
  "summary": "Income evidence does not match the declared income.",
  "riskLevel": "high",
  "explanation": "The applicant's declared income differs from the payslip and bank salary records, so the policies require manual review before a decision.",
  "recommendedActions": [
    "Ask the reviewer to compare payslip and bank salary deposits.",
    "Confirm employer and income with an additional document."
  ],
  "requiredDocuments": [
    "Updated payslip",
    "Three months of bank statements"
  ],
  "relatedPolicies": []
}
```

第一版明确不做：

- pgvector
- embedding
- policy seed
- `knowledge-base/`
- Bedrock
- 新数据库表

---

## 10. 剩余三天开发计划

目标：三天内完成最简 RAG、演示体验、AWS 数据库/部署准备。MCP 不做。

### Day 1：最简 RAG 后端（已完成）

目标：

```text
verification_results
→ ai.js 检索政策
→ policy-explanation API
```

任务：

1. 在 `server/ai.js` 写 3 到 5 条银行政策，形成小型 policy corpus。
2. 在 `server/ai.js` 根据 `verification_results.check_name` 和 `result` 检索政策。
3. 在 `server/ai.js` 把 application、checks、policies 发给大模型。
4. 在 `server/server.js` 新增 `GET /api/applications/:id/policy-explanation`。
5. 返回 `relatedPolicies` 和大模型生成的结构化 JSON。

验收：

- 给一个 application id，后端能返回相关政策和结构化分析。
- `income-mismatch` 能返回收入核验和人工复核政策。
- 没有 `OPENAI_API_KEY` 时接口返回配置错误，不生成模板解释。
- 大模型返回字段包括 `summary`、`riskLevel`、`explanation`、`recommendedActions`、`requiredDocuments`。

### Day 2：前端展示和演示流程（已完成）

目标：

```text
核验结果
→ 相关政策
→ Result 页面展示
```

任务：

1. 修改 `src/types/index.ts`，增加政策解释类型。
2. 修改 `src/api/api.ts`，增加获取政策解释 API。
3. 修改 `src/pages/Result.tsx`，显示解释区域。
4. 使用或简化 `PolicyCard.tsx`。
5. 页面展示：
   - summary
   - riskLevel
   - explanation
   - recommendedActions
   - requiredDocuments
   - policy id
   - policy title
   - policy content
6. 跑通三套 sample-data。
7. 修复明显 UI 文案和错误提示。

验收：

- 三套样例都能显示政策依据。
- `income-mismatch` 能显示 manual review 解释。
- 用户能讲清楚：规则判断，RAG 解释。

### Day 3：AWS 数据库和演示收尾

目标：

```text
本地功能稳定
→ AWS RDS 可用
→ 项目能演示
→ README 清楚
```

任务：

1. 创建 AWS RDS PostgreSQL。
2. 配置线上 `DATABASE_URL`。
3. 在 RDS 执行 `database/schema.sql`。
4. 部署后端。
5. 部署前端。
6. 配置前端 API 地址或同源代理。
7. 测试三套样例：
   - passed
   - missing-documents
   - income-mismatch
8. 修复最后的 UI 文案和错误提示。
9. 更新 README：
   - 安装
   - 本地运行
   - 部署环境变量
   - 演示流程
10. 准备面试讲解稿和截图。

验收：

- 网站可以打开。
- 可以创建申请。
- 可以读取三类文件。
- 可以看到核验结果。
- 可以看到政策来源。
- 可以看到最简 RAG 解释。
- README 能让别人跑起来。

---

## 11. 三套演示场景

### passed

条件：

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

演示重点：

- 系统自动通过预审。
- RAG 展示材料齐全和收入核验政策。

### missing-documents

条件：

```text
缺少工资单
或缺少必要材料
或工资记录不足三个月
```

结果：

```text
additional_documents_required
```

演示重点：

- 系统提示需要补充材料。
- RAG 展示 required documents policy。

### income-mismatch

条件：

```text
申报收入和工资单/银行流水差异超过阈值
```

结果：

```text
manual_review_required
```

演示重点：

- 系统不会自动拒绝。
- 系统升级到人工复核。
- RAG 展示收入差异和人工复核政策。

---

## 12. 不做的功能

剩余三天内不做：

- MCP
- 登录注册
- 真实客户数据
- PDF OCR
- Amazon Textract
- 原始文件保存
- S3 文件上传
- 自动批准贷款
- 自动拒绝贷款
- 多角色后台
- 真实银行 API
- 复杂 CI/CD

---

## 13. 本地运行

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:setup
npm run dev
```

开发地址：

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000/api
Postgres: localhost:5432
```

如果 `5173` 被占用，Vite 会自动使用下一个端口。

---

## 14. 当前环境变量

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/loan_verification

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

当前不需要：

```env
S3_BUCKET_NAME
VITE_API_BASE_URL
AWS_REGION
BEDROCK_EMBEDDING_MODEL_ID
BEDROCK_TEXT_MODEL_ID
```

---

## 15. 面试介绍

### 30 秒版本

我开发了一个银行贷款材料智能核验系统。用户选择申请表、工资单和银行流水后，前端读取 JSON/CSV 内容并提交给后端。后端使用确定性 JavaScript 和 SQL 规则核验姓名、雇主、收入和材料完整性，输出通过、补充材料或人工复核。RAG 用于检索银行政策并生成解释，帮助审核员理解为什么系统给出这个预审结果。

### 技术总结

```text
React + TypeScript + Vite
Node.js + Express
PostgreSQL
Rule-based verification
Minimal RAG policy retrieval and explanation
AWS RDS / deployment
```

### 最重要的一句话

> 规则负责判断，RAG 负责解释。
