# 产品身份、旧数据与生命周期

## 正式身份

| 项目 | 值 |
|---|---|
| 产品名 | 咩咩润色工具 / MieMie Polisher |
| 仓库名 | MieMie-Polisher |
| 永久 Extension ID | `miemie.polisher` |
| Launcher 名称 | 咩咩润色 |
| 助手脚本 UUID | `4dd658f1-9d4b-4f74-bba8-305c4ef2a9c8` |
| 版本 | `1.1.2` |

Manifest 版本为纯三段式 `1.1.2`；永久 ID、产品名称和 Launcher 声明不变，不为旧 `miemie.translation` 添加别名。

## 有意保留的历史标识

- `meeme_translation_v1`：助手扩展变量命名空间，继续保存 config、cards、library、backups，并保留旧单份 backup 格式读取兼容。
- `meeme_translation_key_v1`：浏览器中按 API 根地址匹配的记住密钥，不进入 Hub Manifest 或注册偏好。
- `__meemeTranslation01`：旧版实例桥接／重复实例保护。
- `meeme-translation`、`mt-*`：原 DOM 和样式标识，保持现有界面与选择器。
- `meeme-builtin-translation`、`translate`、`selections.translate`、`translations` 及相关 translation 函数／字段：翻译业务、默认模板和响应／备份兼容。翻译模式完整保留。
- `meeme-prompt`：提示词 JSON 导入导出协议不变。

这些不是待改名的产品身份。拆分不迁移、不改名、不主动删除用户业务数据。用户 API Key 不作为开发依赖、源码配置或构建输入。

## 生命周期边界

原有业务由独立工厂 activate/open/deactivate 管理。1.1.0 的入口适配器为相同工厂选择独立面板 API 或 Hub Extension API v1；一次只保留一份业务实例。资源管理仍沿用原清理流程。

停用／卸载清理事件、Hook、计时器、请求等待、DOM、对象 URL 和兼容实例标记。API 请求迟到结果不继续处理；写回已经发生但宿主刷新未结束时仍遵循 Phase 2 的备份保存处理。若其他脚本后来包装 fetch，只让旧润色包装层失效，不覆盖对方。

独立脚本用于发现／重连 Hub 的两项监听在该脚本存活期间保留，脚本 pagehide／unload 时撤回。Hub Runtime 卸载与从酒馆助手删除原脚本是不同操作；本项目没有安装器。

同一个 Polisher iframe 内的独立/Hub 模式切换会在私有内存交接页面 Key、未保存接口输入、当前 tab 和自动处理开关；调试历史与进行中请求不迁移。彻底停用/重载 Polisher 自己的 iframe 时，页面级未持久状态丢弃。保存的用户配置、选择记住的密钥与备份仍保留。

此前宿主写回／保存的异步等待、同步写入时序依赖、生成中途重新启用的状态窗口均未修改。本次仅增加双模式需要的交接，不改变消息处理算法和用户数据结构。

## 1.1.0 Launcher 交接

新增独立 Launcher 与 Hub 自动收纳。`legacy-tool.js` 仅增私有内存 capture/restore 接口，避免 Hub 出现或消失时丢失页面 Key、接口草稿和自动开关；原算法、Prompt 与 HTML 基线不变。交接不写入新业务存储，不改变两项历史数据键。正在进行的请求按原 deactivate 清理规则取消。
