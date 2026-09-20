# 产品身份、旧数据与生命周期

## 正式身份

| 项目 | 值 |
|---|---|
| 产品名 | 咩咩润色工具 / MieMie Polisher |
| 未来仓库名 | MieMie-Polisher |
| 永久 Extension ID | `miemie.polisher` |
| Launcher 名称 | 咩咩润色 |
| 助手脚本 UUID | `4dd658f1-9d4b-4f74-bba8-305c4ef2a9c8` |
| 版本 | `1.0.1-hub.2` |

Manifest 保持 Phase 2 原样；本次不再修改任何产品身份，不为旧 `miemie.translation` 添加别名。

## 有意保留的历史标识

- `meeme_translation_v1`：助手扩展变量命名空间，继续保存 config、cards、library、backups，并保留旧单份 backup 格式读取兼容。
- `meeme_translation_key_v1`：浏览器中按 API 根地址匹配的记住密钥，不进入 Hub Manifest 或注册偏好。
- `__meemeTranslation01`：旧版实例桥接／重复实例保护。
- `meeme-translation`、`mt-*`：原 DOM 和样式标识，保持现有界面与选择器。
- `meeme-builtin-translation`、`translate`、`selections.translate`、`translations` 及相关 translation 函数／字段：翻译业务、默认模板和响应／备份兼容。翻译模式完整保留。
- `meeme-prompt`：提示词 JSON 导入导出协议不变。

这些不是待改名的产品身份。拆分不迁移、不改名、不主动删除用户业务数据。用户 API Key 不作为开发依赖、源码配置或构建输入。

## 生命周期边界

工厂、入口、资源管理和业务源码均原样迁入本目录。activate 创建业务实例和资源、接入 Hub 主面板；open 调用 Hub 的 showPanel；deactivate 释放本实例资源。

停用／卸载清理事件、Hook、计时器、请求等待、DOM、对象 URL 和兼容实例标记。API 请求迟到结果不继续处理；写回已经发生但宿主刷新未结束时仍遵循 Phase 2 的备份保存处理。若其他脚本后来包装 fetch，只让旧润色包装层失效，不覆盖对方。

独立脚本用于发现／重连 Hub 的两项监听在该脚本存活期间保留，脚本 pagehide／unload 时撤回。Hub Runtime 卸载与从酒馆助手删除原脚本是不同操作；本项目没有安装器。

当前页临时密钥、未保存输入、自动处理开关和调试状态继续按原初始化规则处理，不承诺停用后保存所有临时状态。保存的用户配置、选择记住的密钥与备份仍保留。

此前宿主写回／保存的异步等待、同步写入时序依赖、生成中途重新启用的状态窗口均未因本次拆分而修改。Phase 2 已由用户验收，本次不扩大生命周期或业务修改范围。
