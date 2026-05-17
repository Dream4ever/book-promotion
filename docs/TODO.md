# 重构 TODO

## 已完成: P0 拆分 `src/App.vue` 的页面结构

已将五个 tab 拆成独立组件，`App.vue` 保留页面骨架、全局消息、顶层数据装配和弹窗入口。

- [x] 拆出 `SchoolsTab.vue`
- [x] 拆出 `BooksTab.vue`
- [x] 拆出 `PromotersTab.vue`
- [x] 拆出 `ReportsTab.vue`
- [x] 拆出 `AnalyticsTab.vue`
- [x] 保留 `App.vue` 作为页面骨架、全局消息、顶层数据装配入口
- [x] 执行 `npm run build`

验收点:

- [x] `App.vue` 不再直接包含各业务表格的大段模板
- [x] 各 tab 的 props/emits 边界清晰
- [x] 现有搜索、分页、选择、导入、导出、删除行为不变

## 已完成: P0 抽取表单弹窗逻辑

学校、书目、推广商、报备表单状态已拆到独立弹窗组件，`App.vue` 只保留弹窗入口、当前编辑对象、API 保存流程和全局消息。

- [x] 抽出 `SchoolModal.vue`
- [x] 抽出 `BookModal.vue`
- [x] 抽出 `PromoterModal.vue`
- [x] 抽出 `ReportModal.vue`
- [x] 将表单 reset、open、close、submit 逻辑移动到对应组件或 composable
- [x] 报备表单校验继续复用 `shared/reportRules.js`
- [x] 执行 `npm run build`

验收点:

- [x] `App.vue` 不再维护所有表单字段的 reactive 对象
- [x] 弹窗组件只通过 props 接收初始数据，通过 emits 通知保存/关闭
- [x] 新增和编辑流程行为不变

## 已完成: P1 继续拆分后端 service 层

`server/index.js` 只保留 Express 初始化、路由声明、静态资源服务和响应委托，业务校验和数据变更逻辑已拆到 `server/services/`。

- [x] 新增 `server/services/schoolService.js`
- [x] 新增 `server/services/bookService.js`
- [x] 新增 `server/services/promoterService.js`
- [x] 新增 `server/services/reportService.js`
- [x] 新增 `server/services/deleteService.js`
- [x] 路由层只负责读取请求参数、调用 service、返回响应

验收点:

- [x] `server/index.js` 只保留 Express 初始化、路由声明、静态资源服务
- [x] 业务校验和数据变更逻辑都在 service 文件中
- [x] `node --check server/index.js` 和 `npm run build` 通过

## 已完成: P1 改善 Supabase 表写入可靠性

`readDb -> mutate -> writeDb` 已加入同进程写队列，规范化表写入改为差异化更新；旧 `app_state.data` 迁移改为显式脚本，数据库级原子性通过可配置 Supabase RPC 接入。

- [x] 增加写入队列，保证同一进程内写操作串行执行
- [x] 将旧 `app_state.data` 迁移逻辑改成显式脚本或管理端接口
- [x] 写入时只更新受影响的实体表和关联表，避免每次整体清空重写
- [x] 增加数据库事务或 RPC，保证多表写入原子性
- [x] 执行 `node --check server/db.js`、`node --check server/routeHelpers.js` 和 `npm run build`

验收点:

- [x] 并发请求不会互相覆盖 Supabase 中的应用状态
- [x] 多表写入失败时不会留下半更新数据
- [x] 迁移逻辑可单独触发和测试

## 已完成: P1 补充业务函数测试

已引入 Vitest，新增报备规则、导入字段映射、删除级联、report service 新增/修改/冲突判断测试。

- [x] 引入 Vitest
- [x] 测试 `shared/reportRules.js`
- [x] 测试 `src/utils/importers.js`
- [x] 测试后端删除级联逻辑
- [x] 测试 report service 的新增、修改、冲突判断
- [x] 执行 `npm test` 和 `npm run build`

验收点:

- [x] `npm test` 可运行
- [x] 报备冲突、书目模式、导入字段映射、级联删除都有覆盖

## 已完成: P2 统一前端 API 调用错误处理

前端 API 错误已统一为 `ApiError`，常见 busy/message/refresh/clear selection 流程已抽到 action runner composable；报备提交继续使用弹窗错误。

- [x] 给 `src/utils/api.js` 增加更清晰的错误对象结构
- [x] 将常见 `busy/message/refresh` 流程抽成 action runner composable
- [x] 区分普通 toast 式错误和报备弹窗错误
- [x] 执行 `npm test` 和 `npm run build`

验收点:

- [x] 页面组件中的 try/catch 数量减少
- [x] 用户可见错误信息保持不变或更明确

## 已完成: P2 清理 UI 基础组件职责

`SearchSelect` 和 `MultiSearchSelect` 已共用 option filtering helper，并统一 loading/empty/invalid 状态，补充了基础键盘交互。

- [x] 抽出通用 option filtering helper
- [x] 统一 empty/loading/invalid 状态
- [x] 检查键盘可访问性和焦点管理
- [x] 执行 `npm test` 和 `npm run build`

验收点:

- [x] 单选和多选组件搜索行为一致
- [x] 弹层关闭、清空、选择行为稳定
