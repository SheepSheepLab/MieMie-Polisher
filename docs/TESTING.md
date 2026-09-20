# Polisher 验证说明

当前版本 **1.0.1-hub.2**，独立自动测试 **10 项通过**。

```sh
npm ci
npm run build
npm test
```

测试读取本项目源码与本项目生成的产物，不导入 Hub Runtime、不寻找兄弟目录。测试夹具仅提取旧工具箱中的算法、默认提示词与原 UI 模板，来源记录在 `tests/fixtures/README.md`。

- 4 项资源管理测试：取消不配合的请求等待、清理失败隔离与幂等、同步发送拦截撤销、保留第三方 fetch 包装。
- 4 项兼容测试：算法／默认提示词原样、UI 仅保留已确认的身份变化、独立 JSON／Manifest／版本一致、历史业务数据键和标记保留。
- 2 项工厂协议测试：挂载／打开／停用与已取消激活。使用本地 API 测试替身，不复制或导入 Hub 实现。

本次构建 JSON 的 SHA-256 为 `99cfdf386186be770d47e6f840da105095eaf595d4cb0bb3cc7667b7872729e4`，与 Phase 2 验收产物字节一致。构建的 `manifest.json` 与根目录正式 Manifest 字节一致。

## Hub + Polisher 组合验收

组合测试由 MieMie-Hub 项目维护；把本项目产出的 JSON 作为文件交给测试即可，无需把 Polisher 源码放到 Hub 旁边。

在独立 Hub 项目中执行：

```sh
npm run test:integration -- --polisher /absolute/path/咩咩润色工具-Extension-1.0.1-hub.2.json
```

Hub 的 `tests/integration/artifacts.lock.json` 明确锁定 Hub 0.2.0-alpha.2 + Polisher 1.0.1-hub.2 双方版本和 SHA-256；校验失败时拒绝执行。跨项目测试仅引用已确定版本的产物，不把双方源码重新耦合。

本次 **25 项组合检查通过**，实际运行两份 JSON 的生命周期、业务处理和事件协作。运行环境为 Node + jsdom，角色、世界书、API 和文件选择由本地夹具模拟；不连接真实 API、不改变用户数据，不替代真实浏览器布局／动画和真实酒馆验证。

真实酒馆建议按以下顺序做拆分后的快速复核：确认两个新导出文件能分别导入；时间线与 Hello 正常；打开润色核对旧设置／提示词；润色、翻译各一次；恢复与发送原文；连续启停及卸载后重新注册。业务和 Runtime 产物未变，本次没有引入新的功能验收项。
