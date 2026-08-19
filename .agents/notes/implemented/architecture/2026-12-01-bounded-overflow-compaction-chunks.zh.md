# Agent Note: 有界溢出压缩块

Status: implemented

[English](2026-12-01-bounded-overflow-compaction-chunks.md) | 中文

## 问题

当一个会话溢出其路由模型的上下文窗口时，提供方已确认的溢出恢复此前会在一次摘要调用中压缩整个可压缩表层。那次调用会把系统提示、工具模式、被压缩区域与压缩指令回放给同一个其窗口已经溢出的模型——因此回放本身就超过窗口，`CONTEXT_WINDOW_EXCEEDED` 会再次抛出。压缩失败，会话完成不了任何一轮对话，看起来像是死了。

## 决策

### 溢出恢复根据路由容量计算块预算

溢出恢复通过 `ctx.llm.resolveModelInfo` 解析路由模型的通告上下文容量。当一条路由通告 `contextWindow` 时，恢复计算单个块的预算：`contextWindow − replayHeaderTokens − instructionTokens − maxTokens − overflowChunkHeadroomTokens`。`replayHeaderTokens` 通过新的 `TokenMeter.estimateHeader(header?)` 服务方法为会话的请求 header 计价；`instructionTokens` 通过摘要回放所用的同一启发式为导出的 `COMPACTION_INSTRUCTION_MESSAGE` 计价；`maxTokens` 是摘要输出上限；`overflowChunkHeadroomTokens` 是新增的已验证配置字段，默认为 `512`。因此每个块的回放加其摘要输出都会低于窗口——而整个溢出的表层却不会。

### 最旧内容以有界、平衡的块压缩

`selectCompactableChunk` 选择可压缩溢出区域的一个锚定头部、工具对平衡的前导块，其被遮蔽 token 符合预算。恢复压缩该块，通过单例 token 计量重新测量，并反复执行，直到表层落入预算或没有块可再选。任何单次摘要调用都不会溢出。

### Token 计量为 header 与指令计价

`TokenMeter` 把 `estimate.ts` 中纯 `estimateHeader` 的服务实例面暴露为 `estimateHeader(header?)`；摘要器导出 `COMPACTION_INSTRUCTION_MESSAGE`，使溢出尺寸计算用与摘要回放相同的启发式给指令计价。

### 无容量与微小窗口路由保留历史回退

当路由不通告容量——未注册的提供方，或 `context.contextWindow` 缺失——或预算不为正数（窗口无法容纳哪怕一个有界的块）时，溢出恢复回退到历史的整个表层压缩。无容量路由与微小窗口部署不会被阻塞。

## 测试

单元测试覆盖 `selectCompactableChunk`：在无界预算下可容纳整个可压缩范围、一个在整范围末尾之前严格停止的平衡局部裁剪、以及当最旧的平衡节点也超过预算时拒绝返回。一个多块溢出集成测试确认恢复在表层可容纳前运行多次有界摘要调用。配置测试拒绝负的 `overflowChunkHeadroomTokens`；默认值测试覆盖其 `512` 默认值。Token-meter 测试覆盖 `estimateHeader` 服务方法及其对缺失 header 的零计价。两个包都保持 100% 的语句、分支、函数与行覆盖率。

## 考虑过的替代方案

- **用更大的输出上限重试整个表层摘要**——不予采纳，因为超出窗口的是过大的回放，而不是输出；提高上限并不能让输入落入窗口，调用仍会抛出 `CONTEXT_WINDOW_EXCEEDED`。
- **先用无模型方式缩小表层，再一次性摘要整个表层**——不予采纳，因为没有哪种无模型处理能保证一段已经超出窗口的整个表层回放可以容纳，而且依赖可选剪枝器会破坏恢复的独立组合性。
- **复用保留预算范围选择器**——不予采纳，因为其保留尾部预算属于保留策略，而非单次调用的回放上限，因此无法保证某次摘要调用一定落在窗口内。

## 后果

- 溢出恢复现在感知容量：此记录取代 [路由模型上下文与压缩策略 Agent Note](2026-07-20-routed-model-context-and-compaction-policy.md) 中关于溢出应绕过容量元数据、尝试一次最大且平衡缩减的声明，并拥有规范的溢出行为。
- 每次分块摘要调用都落在路由窗口内，因此一次分块缩减不会抛出 `CONTEXT_WINDOW_EXCEEDED` 或让会话卡死。
- 部署可通过已验证的 `overflowChunkHeadroomTokens` 配置字段调整每个块预留的松弛空间。
- 无容量与微小窗口路由保留整个表层缩减，因此回放只是降级，而不会被阻塞。
