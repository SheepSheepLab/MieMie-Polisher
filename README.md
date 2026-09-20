# MieMie Polisher · 咩咩润色工具

MieMie Hub 的原生 Extension，当前版本 **1.0.1**，永久 ID **`miemie.polisher`**。完整保留翻译／润色、原 UI、提示词库、API／模型配置、术语、标签保护、备份恢复、发送原文及调试能力。

本项目已从原工具箱物理拆分；当前 1.0.1 统一公开版本命名，业务代码、生命周期接入、图标和样式保持不变。构建与本项目测试不依赖 Hub 源码、Hub 目录或旧工具箱完整 JSON。实际在酒馆中运行时需要 Hub 提供 Extension API v1；这是运行协议依赖。

## 开发与构建

需要 Node.js 22 或更新版本和 npm。在本目录执行：

```sh
npm ci
npm run build
npm test
```

本项目当前无需第三方开发依赖，使用 Node 内置构建／测试工具；保留独立 `package.json` 和 `package-lock.json`。`npm ci` 可独立执行，后续所需依赖可在本项目维护。`npm test` 会先构建。

生成：

```text
build/咩咩润色工具-Extension-1.0.1.json
build/manifest.json
build/miemie-polisher.js
```

前者用于酒馆助手导入，`manifest.json` 是声明副本，JavaScript 文件用于检查。`build/`、`node_modules/`、`test-results/` 均忽略，不是基础构建必须提交的文件。

版本由本项目 `package.json` 与根目录 `manifest.json` 共同声明；更新时二者必须一致，构建会检查。所有新的官方版本必须使用无前导零的 `MAJOR.MINOR.PATCH`，详见 [版本规范](docs/VERSIONING.md)。Hub 版本不参与决定 Polisher 版本；运行时依赖 Extension API v1。GitHub Release Asset 使用 ASCII 文件名 `MieMie-Polisher-Extension-1.0.1.json`，与本地中文文件名的产物内容相同。

## 目录职责

```text
manifest.json                 正式 Extension 身份与 Launcher 声明
polisher.js                   Extension 工厂 activate/open/deactivate
entry.js                      本地脚本接入 Hub、重连、撤回
legacy-tool.js                完整业务与 UI
resources.js                  Hook、监听、计时器、请求取消与清理
assets/                       润色专属图片与样式
packaging/script-template.json 酒馆助手导出元数据
tools/build.mjs               只构建 Polisher JSON、JS、Manifest
tests/                        资源、工厂协议、产品／旧版兼容测试
docs/                         数据兼容及验证说明
```

## 使用

启用兼容的 Hub，并导入本项目的 Extension JSON。Hub 与 Polisher 的助手脚本可任意先后加载；初次使用建议先 Hub 后 Polisher。不要同时启用旧工具箱或多个润色版本。菜单显示“咩咩润色”，管理页显示“咩咩润色工具”。

首次通过 `window.parent.__MieMieHub.extensions.provide` 注册并启用；可从 Hub 打开、停用、启用、卸载和重新注册。Runtime 卸载不删除助手脚本，也不删除旧设置／备份。停用独立助手脚本会撤回它提供的源。未启用 Hub 时，独立脚本等待 Hub 的就绪事件，不自行运行润色业务。

- [数据与历史标识兼容](docs/COMPATIBILITY.md)
- [自身测试与组合测试](docs/TESTING.md)

本项目不包含 Hub Runtime、时间线、Catalog、GitHub 下载或在线包管理。

## 授权与来源

Copyright © 2026 SheepSheep。

本项目的软件代码采用 **GNU General Public License v3.0 or later**（SPDX：`GPL-3.0-or-later`）。你可以按照 GNU 通用公共许可证第 3 版，或自行选择自由软件基金会发布的任何后续版本，使用、研究、修改、再分发及商业使用软件。软件不提供任何担保，具体权利与义务见 [LICENSE](LICENSE)。

该授权包括本项目的 JavaScript、CSS、HTML、Manifest、软件配置、构建脚本、测试、历史代码测试基线及内置业务提示词（包括 `WUXIA_EXAMPLE`）。`LICENSE` 是[GNU 官方 GPLv3 完整文本](https://www.gnu.org/licenses/gpl-3.0.txt)的原样副本；“or later”的选择由本声明及包元数据明确，不修改许可证正文。

MieMie / 咩咩官方品牌身份，以及指定角色美术资产，**不因软件采用 GPL 而获得同样授权**。当前单独说明的图片仅为 `assets/icon.png`；`assets/` 中的 CSS 仍属于 GPL 软件代码。这是代码与指定素材分别说明许可的项目，不能将包含图片的整个发布包概括为单一 GPL 授权。

- [品牌身份与正常引用规则](BRAND.md)
- [指定 PNG 的来源与素材使用范围](ASSETS-LICENSE.md)
- [第三方依赖及运行环境说明](THIRD_PARTY_NOTICES.md)

按 SheepSheep 的来源确认，原咩咩工具箱和本项目的需求、功能设计及架构决策由 SheepSheep 提出，代码主要由 Codex 按这些需求生成、修改和迭代；当前没有其他需列出的共同版权人。`WUXIA_EXAMPLE` 同样由 Codex 根据需求生成，并非从第三方 Prompt、网站或小说原文复制。当前审计未识别出复制或改写自第三方项目的产品代码。

对外分发时应随附 `LICENSE`、上述品牌／素材说明及适用的第三方声明，并按 GPL 提供对应版本源码和构建材料。当前构建不会把这些文件嵌入酒馆助手 JSON；单独一个 JSON 不能替代完整的授权说明与源码提供安排。
