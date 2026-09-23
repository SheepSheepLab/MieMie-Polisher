# Polisher 验证说明

当前版本 **1.1.3**。独立安装开发依赖、构建和测试：

```sh
npm ci
npm run build
npm test
```

测试不导入 Hub Runtime，不查找兄弟目录，不连接真实服务。jsdom 仅用于可销毁的本地 DOM 模拟。

当前 23 项测试包括：

- 原有 11 项：资源取消/清理、第三方 fetch wrapper 保留、旧版算法/Prompt/UI 基线、历史数据键、工厂生命周期及版本规范。
- 9 项可选 Launcher 协议：独立打开/关闭、两种加载顺序、连续 5 次 Hub 重启、禁用/注销不自行复活、旧 Hub 异步清理等待、keepStandalone、重复来源、脚本 iframe 重载、卸载后监听撤销。
- 1 项机器 Package：ASCII/中文 JSON 字节一致、文件/content Hash、Manifest、repository、永久产品 ID 与版本一致。
- 2 项完整构建产物：无 Hub 时原业务真实执行到模拟 API/消息写回；连续模式切换保留未记住的页面 API Key、未保存接口输入、当前 tab 和自动开关，事件监听始终为一份，最终 fetch 恢复。敏感值只在测试内存，使用明确的 Fixture 字符串。

`legacy-tool.js` 仅增加私有 `captureSession/restoreSession` 生命周期接口，用于切换 Launcher 所有者时传递页面内状态；算法/Prompt/原 HTML 基线保持字节一致。这是必要适配，不能声称整个业务文件完全未动。

## Hub + Polisher 组合验收

组合测试由独立 Hub 项目维护，只把本项目构建 JSON 交给它；不能引用 Polisher 源码。锁定文件保存双方版本及 SHA-256，更新配对后执行：

```sh
npm run test:integration -- --polisher /path/to/MieMie-Polisher-Extension-1.1.3.json
```

上面的 `/path/to/` 仅为公开文档占位，不是开发机路径。

## 真实环境黄金路径

1. 只启用 Polisher：独立球出现，打开原 UI，确认旧 API Key / Prompt / 备份仍可读，翻译/润色各处理一次。
2. 保持 Polisher 启用，启动 Hub：独立球消失、Hub Launcher 出现并打开原 UI。
3. 停用 Hub：独立球恢复；再启用 Hub：再次收纳，无重复球。
4. Hub 中停用或 Runtime 注销 Polisher：不得立刻出现独立球绕过用户操作；重新启用可恢复。
5. 保持真实酒馆安装版本 1.1.2，由用户在 Hub 检查并更新到 1.1.3：核对单一脚本实例、安装实例 ID 不变，原设置/API Key/Prompt/备份保留，标题显示「咩咩润色工具 - 1.1.3」，Icon 与 1.1.2 一致。

切换会取消进行中的润色/接口请求，不迁移正在等待的请求。未保存接口输入及仅页面内 Key 在同一 Polisher iframe 内的两种模式之间保留；彻底停用/重载 Polisher 自己的脚本或页面时，这些未持久状态仍按页面级语义丢弃。要跨脚本更新保留 Key，请先使用现有的“在此浏览器记住密钥”。

1.1.3 标题从构建内嵌 Manifest 读取名称和版本；独立运行及 Hub 收纳后均验证显示一致。沿用 1.1.2 的 Icon 原始 PNG。DOM 模拟测试不替代真实酒馆布局、浏览器下载/CORS 或真实 OAuth 验证。
