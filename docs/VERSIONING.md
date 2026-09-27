# MieMie 官方项目版本规范

从本次发布开始，SheepSheep 维护的 MieMie 官方项目只使用无前导零的 `MAJOR.MINOR.PATCH`，例如 `1.0.1`、`1.0.2`。不使用 `-alpha.N`、`-beta.N`、`-hub.N`、`-build.N` 或 `+build` 等任何后缀。

内部快速迭代直接增加 PATCH；后续功能和兼容性变化按 SemVer 使用 MINOR / MAJOR。Hub 与各 Extension 独立维护自己的版本，不联动提升。

`package.json` 与 Extension `manifest.json` 必须声明相同版本。构建拒绝不符合上述格式的版本。Git Tag 使用 `v<version>`，GitHub Pre-release 是发布状态，仍可用于纯三段式版本，不属于版本字符串的一部分。

本次 Polisher 候选版本为 `1.2.0`：原生悬浮球、Hub Shortcut 与单实例双模式能力属于兼容性 MINOR 增强，翻译/润色数据格式和 API v1 不变。仅生成本地候选文件，不创建 Tag 或 Release。分发文件为 `MieMie-Polisher-Extension-1.2.0.json`、`manifest.json` 与 `MieMie-Extension-update.json`，本地中文 JSON 字节一致。已公开 1.1.4 及更早历史发布保持不变。

旧版本命名可能保留在源码提交历史中，不重写提交历史。版本规范化不改变永久 Extension ID `miemie.polisher`，也不修改旧数据兼容键 `meeme_translation_v1`、`meeme_translation_key_v1` 或翻译／润色业务。
