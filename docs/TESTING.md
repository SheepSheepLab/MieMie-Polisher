# Polisher 验证说明

> 下方原有 1.2.0 候选、23 项基础测试、旧组合命令和待验结论均为历史阶段；本分支的新增结果见文末 API2 Pre-Main 记录。

> API2 开发分支补充：当前契约见 [HUB-API2.md](HUB-API2.md)。本页既有 API1 / Shortcut / 历史验收描述仅对应原版本；当前适配不恢复该 Runtime，测试边界与机器校验已独立迁移。

当前本地候选版本 **1.2.0**（未发布）。独立安装开发依赖、构建和测试：

```sh
npm ci
npm run build
npm test
```

测试不导入 Hub Runtime，不查找兄弟目录，不连接真实服务。jsdom 仅用于可销毁的本地 DOM 模拟。

历史基础 23 项测试包括（现有完整 suite 另含 Native Presentation / Shortcut 回归，数量以实际输出为准）：

- 原有 11 项：资源取消/清理、第三方 fetch wrapper 保留、旧版算法/Prompt/UI 基线、历史数据键、工厂生命周期及版本规范。
- 9 项可选 Launcher 协议：独立打开/关闭、两种加载顺序、连续 5 次 Hub 重启、禁用/注销不自行复活、旧 Hub 异步清理等待、keepStandalone、重复来源、脚本 iframe 重载、卸载后监听撤销。
- 1 项机器 Package：ASCII/中文 JSON 字节一致、文件/content Hash、Manifest、repository、永久产品 ID 与版本一致。
- 2 项完整构建产物：无 Hub 时原业务真实执行到模拟 API/消息写回；连续模式切换保留未记住的页面 API Key、未保存接口输入、当前 tab 和自动开关，事件监听始终为一份，最终 fetch 恢复。敏感值只在测试内存，使用明确的 Fixture 字符串。

`legacy-tool.js` 仅增加私有 `captureSession/restoreSession` 生命周期接口，用于切换 Launcher 所有者时传递页面内状态；算法/Prompt/原 HTML 基线保持字节一致。这是必要适配，不能声称整个业务文件完全未动。

## Hub + Polisher 组合验收

组合测试由独立 Hub 项目维护，只把本项目构建 JSON 交给它；不能引用 Polisher 源码。锁定文件保存双方版本及 SHA-256，更新配对后执行：

```sh
npm run test:integration -- --polisher /path/to/MieMie-Polisher-Extension-1.2.0.json
```

上面的 `/path/to/` 仅为公开文档占位，不是开发机路径。

## 真实环境黄金路径

1. 只启用 Polisher：独立球出现，打开原 UI，确认旧 API Key / Prompt / 备份仍可读，翻译/润色各处理一次。
2. 保持 Polisher 启用，启动 Hub：独立球消失、Hub Launcher 出现并打开原 UI。
3. 停用 Hub：独立球恢复；再启用 Hub：再次收纳，无重复球。
4. Hub 中停用或 Runtime 注销 Polisher：不得立刻出现独立球绕过用户操作；重新启用可恢复。
5. 从已公开 1.1.4 验证升级到本地 1.2.0 候选：核对单一脚本实例、安装实例 ID 不变，原设置/API Key/Prompt/备份保留，标题显示「咩咩润色工具 - 1.2.0」。候选尚未上线，不能把公开更新按钮仍返回 1.1.4 当作已完成候选自动升级；自动升级链由隔离测试验证，实机按 Hub RC 清单操作。

切换会取消进行中的润色/接口请求，不迁移正在等待的请求。未保存接口输入及仅页面内 Key 在同一 Polisher iframe 内的两种模式之间保留；彻底停用/重载 Polisher 自己的脚本或页面时，这些未持久状态仍按页面级语义丢弃。要跨脚本更新保留 Key，请先使用现有的“在此浏览器记住密钥”。

当前候选标题从构建内嵌 Manifest 读取名称和版本；独立运行及 Hub 收纳后均验证显示一致。沿用 1.1.2 的 Icon 原始 PNG。DOM 模拟测试不替代真实酒馆布局、浏览器下载/CORS 或真实 OAuth 验证。

## API2 Pre-Main（2026-10-20）

实测源码 `eedfbee6e24b045e5accea8a3303ced7adf7e082`；产物 `MieMie-Polisher-Extension-1.2.1.json`，完整附件 SHA-256 `ca22438bc4321dfd416c024239f05806bad2e9b18684514fa79adb0d37ca2f0a`。解析后 content SHA-256 `19a2882b27abd0d06975dc5c4687fd2c8c97ef088e175849f8394fde9ed1351e`。 本分支内部版本暂留，不能替换已发布同版资产。

`npm test`：**55 PASS／0 FAIL／0 SKIP**，含API2生产Adapter与完整构建执行。`npm run build` 通过；[Linux regression](https://github.com/SheepSheepLab/MieMie-Polisher/actions/runs/39350613499)成功。旧API1／keepStandalone测试与历史算法／数据基线保留原语义，不作为现行API2成功证据。

| 范围 | 验证及限制 |
| --- | --- |
| Standalone与API2 | 双启动顺序、ready/release/whenDisposed、缺必需合同失败、可选Native／Back缺失不伪报能力；同Hub单业务实例 |
| 原生展示 | Surface／Native Lease、OFF不卸载业务、同步release、迟到任务、重开／拖动／焦点、前景与清理 |
| 润色／翻译／发送 | 原算法／Prompt／UI与历史数据键回归；实际构建在受控API／消息回写中执行，不冒充真实服务商 |
| 配置与Key | 页面内未记住Key、未保存接口输入、tab与开关交接；持久配置和外部存储不清空；请求取消、fetch wrapper恢复 |
| IME／Escape | 真实系统拼音在Polisher Native与Standalone执行；compositionend→Escape 229不收起，普通Escape仍收起；其他输入法／物理手机未推断 |
| 真实桌面 | ST两版本×Chromium／Safari，每组9项，均使用上述最终字节；另与其他两款同Hub共存，各浏览器7项 |
| Managed | 最终Package经隔离Catalog／Relay与真实Helper安装、保存回读、运行版本和卸载；hash／身份负例及取消独立检查 |

真实环境：macOS 26.6（25G72）、Chromium 151.0.7922.34、Apple Safari 26.6，ST 1.18.0／1.19.0、Tavern Helper 4.11.3。ST 1.19 源码为 `7e8663cd9c184a550b37238218bdd32c6efc68e9`；1.18 测试副本无 Git 元数据，按完整文件 hash 锁定，不能编造 commit。公开 Default 派生测试数据、专用 dataRoot 与本机合成模型响应；未调用真实外部模型供应商。

Runtime API2 与 Managed Package v1 为两道 Gate：开发候选 Runtime／Native 已测范围 PASS，隔离机器包流程 PASS；**生产 Registry API2、生产 Origin／OAuth、正式新版本及 Assets、正式在线安装更新、物理移动 Safari、真实外部模型服务及 Owner 手工验收仍分别 Pending**。Standalone、Package 身份／完整性与用户数据保护继续保留，不增加旧 Hub Runtime 兼容义务。

原始证据为 **Owner 私有审核材料，尚未公开下载**：`MieMie-Hub-0.9.0-Final-Pre-Main-Review.zip`，SHA-256 `8c06fdad93ff68c5be5699b742d98e4849000b532eaa072bc3279165ee473d73`。包内 `evidence/FINAL-INTEGRATION-LOCK.json`、`FINAL-ACCEPTANCE-RESULTS.json`、`FINAL-BUILD-AUDIT.json`、`FINAL-CI-RESULTS.json` 关联真实源码、产物和日志；不以本机路径充当公共证据。以下是该阶段的既有执行记录，本轮文档维护不声称重新运行 Safari 或宿主；本轮新 HEAD 的本地／Linux CI 回执另随 Owner 审核包交付。

包内本产品 `portable-*-MieMie-Polisher.json`、IME事件原始记录、`final-MieMie-Polisher-test.log` 和 `FINAL-BUILD-AUDIT.json` 分别证明宿主、输入、单测和构建边界。全新正式发行后仍需真实GitHub digest和在线持久保存验收，不能上传本内部版本覆盖已发行1.2.1。

## 产品版本对齐候选（2026-10-20）

Owner 已批准本版 **1.3.0**，当前仍为未发行候选。本节追加独立新执行记录；上方旧产品版本、Pre-Main hash、历史Golden、Safari／OS输入法与手工结论保留原对象范围，不追溯改写。

本轮最终版本的 `npm test`：**55 PASS／0 FAIL／0 SKIP**。正式构建连续两次产物逐字一致；现有业务、数据与当前API2实际完整构建执行均通过。 当前附件 `MieMie-Polisher-Extension-1.3.0.json`，完整附件 SHA-256 `9fc1a4437a2531240601678f67c44baa6001c8e1a4a471fd09d1472c95441cab`；解析后 content SHA-256 `70993952914b95dba5d4bfd7106fc1fc79d74e7f58f27834ebb1a75b4af42650`。最终签名 HEAD 的空目录锁文件重建、Linux CI及原始日志单独随 Owner 本轮审核包交付。

Manifest Schema1、Package1、Metadata1、Build Identity1 均保持；Manifest 为 API2／hubApi2–2，Build Identity 不增加 apiVersion。新版只要求 Hub Runtime API2，Standalone、数据键和原业务模型不变。本轮当前版本断言与UI文字随版本更新，历史夹具及已发布资产原样保留；生成脚本在显式产品版本归一化后与进入本轮的API2候选逐字一致，没有新增旧Runtime或兼容层。

Runtime 与 Managed Package 分开记录：实际最终脚本的API2注册路径审计通过，未含API1注册或Shortcut调用；三款实际新字节的隔离机器流程涵盖首次安装、从前一API2开发候选更新、保存回读、同实例／用户名称／data／文件夹／排序／启用保持、恢复、取消与物理卸载。Node合成GitHub／saved tree不计为真实宿主或生产；本轮真实隔离Tavern及浏览器业务结果另见 Owner 回执。既有公开API1包仅在安全管理规则内识别，不恢复API1 Runtime；不把旧Hub向后兼容列为新版发行Gate。

本节不声称重新执行真实Safari／OS输入法／OS动画设置或物理移动设备。生产 Registry API2、生产Origin／OAuth、正式新Assets及真实在线Managed、物理移动Safari、真实外部模型供应商、Owner手工验收及正式发行授权仍独立Pending。
