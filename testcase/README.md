# 手动测试用例

打开项目的上传页面。所有案例的表单字段都使用页面默认值：Alex Tan、ABC Technologies Pte Ltd、月收入 8000、贷款额 50000。每个案例文件夹里的 `application.json` 是要上传到 **Application form JSON** 的文件；它不会自动填写页面表单。再上传同文件夹的 `payslip.json` 和 `bank_statement.csv`。缺失工资单的案例请将 **Payslip JSON** 留空。

提交后先检查 **Rule-based checks** 和页面顶部的状态，再检查 **Review guidance → Related policies**。AI 文字可能变化，但下表中的状态和政策 ID 应保持稳定。显示 AI 指引需要有效的 `OPENAI_API_KEY`；没有密钥时仍可检查规则结果。

| 文件夹 | 主要核验结果 | 预期状态 | 预期相关政策 ID |
| --- | --- | --- | --- |
| `01-passed` | 材料齐全，姓名、雇主和收入匹配，3 个月工资记录 | `verification_passed` | DOC-005、INC-007、SAL-002 |
| `02-missing-payslip` | 缺少工资单；姓名、雇主和工资单收入暂不能核验 | `additional_documents_required` | DOC-001、DOC-003、ID-002、EMP-002 |
| `03-employer-mismatch` | 工资单雇主与申请表不符 | `manual_review_required` | EMP-001、REV-001 |
| `04-payslip-income-12pct` | 工资单月收入 7000，与申报的 8000 相差 12.5% | `additional_documents_required` | INC-001 |
| `05-bank-income-18pct` | 银行工资平均 6500，与申报的 8000 相差 18.75% | `manual_review_required` | INC-004、REV-002 |
| `06-short-salary-history` | 银行流水只有 2 个不同月份的工资记录 | `additional_documents_required` | SAL-001 |

下一步动作和补件要求由样例政策库给出，并显示所引用的政策 ID 与核验项。若 AI 服务不可用，页面仍会显示这些政策指引及已匹配的政策，不会改变规则核验状态。

这些文件全是演示数据，不是实际借款人资料或真实银行政策。
