# MieMie Polisher · 咩咩润色工具

MieMie Hub 的原生 Extension，当前版本 **1.1.3**，永久 ID **`miemie.polisher`**。完整保留翻译／润色、原 UI、提示词库、API／模型配置、术语、标签保护、备份恢复、发送原文及调试能力。

本项目可在酒馆助手中独立运行，也可通过可选 Launcher 协议接入 Hub。1.1.0 新增独立悬浮球和动态自动收纳；1.1.3 在面板标题显示 Manifest 版本号，沿用 1.1.2 修正版 Icon；原翻译／润色业务与数据结构不变。构建及测试不依赖 Hub 源码或另一个项目目录。

## 开发与构建

需要 Node.js 22 或更新版本和 npm。在本目录执行：

```sh
npm ci
npm run build
npm test
```

构建使用 Node 内置工具；DOM 测试使用仅开发依赖 jsdom 26.1.0，不进入发布 JSON。`npm ci` 可独立安装，`npm test` 会先构建。

生成：

```text
build/咩咩润色工具-Extension-1.1.3.json
build/MieMie-Polisher-Extension-1.1.3.json
build/MieMie-Extension-update.json
build/manifest.json
build/miemie-polisher.js
```

前者用于酒馆助手导入，`manifest.json` 是声明副本，JavaScript 文件用于检查。`build/`、`node_modules/`、`test-results/` 均忽略，不是基础构建必须提交的文件。

版本由本项目 `package.json` 与根目录 `manifest.json` 共同声明；更新时二者必须一致，构建会检查。所有新的官方版本必须使用无前导零的 `MAJOR.MINOR.PATCH`，详见 [版本规范](docs/VERSIONING.md)。Hub 版本不参与决定 Polisher 版本；运行时依赖 Extension API v1。GitHub Release Asset 使用 ASCII 文件名 `MieMie-Polisher-Extension-1.1.3.json`，与本地中文文件名的产物内容相同。

## 目录职责

```text
manifest.json                 正式 Extension 身份与 Launcher 声明
polisher.js                   Extension 工厂 activate/open/deactivate
entry.js                      本地脚本启动
launcher-adapter.js            独立球、Hub 接入、重连、撤回
legacy-tool.js                完整业务与 UI
resources.js                  Hook、监听、计时器、请求取消与清理
assets/                       润色专属图片与样式
packaging/script-template.json 酒馆助手导出元数据
tools/build.mjs               只构建 Polisher JSON、JS、Manifest
tests/                        资源、工厂协议、产品／旧版兼容测试
docs/                         数据兼容及验证说明
```

## 使用

将本项目 JSON 导入并启用后，没有 Hub 时自动出现独立球，点击打开原 Polisher UI。有 Hub 时默认收纳为 Hub 的“咩咩润色”入口。两者支持任意启动顺序；Hub 停用后独立球恢复，Hub 再启动后重新收纳。不要同时启用旧工具箱或多个 Polisher 实例。

Hub 仍在运行时，从 Hub 停用/注销 Polisher 不会使其绕过选择、自动转为独立业务。关闭 Polisher 自身脚本则清理来源和全部运行资源。已有数据和备份不随生命周期删除。

- [Launcher 双模式协议及 keepStandalone 示例](docs/LAUNCHER-PROTOCOL.md)
- [GitHub Package 与机器更新元数据](docs/PACKAGE.md)
- [数据与历史标识兼容](docs/COMPATIBILITY.md)
- [自身测试与组合测试](docs/TESTING.md)

Polisher 不包含 Registry、Catalog 或自己的在线下载器；包安装和更新由 Hub 从作者 GitHub 完成。

## 授权与来源

Copyright © 2026 SheepSheep。

本项目的软件代码采用 **GNU General Public License v3.0 or later**（SPDX：`GPL-3.0-or-later`）。你可以按照 GNU 通用公共许可证第 3 版，或自行选择自由软件基金会发布的任何后续版本，使用、研究、修改、再分发及商业使用软件。软件不提供任何担保，具体权利与义务见 [LICENSE](LICENSE)。

该授权包括本项目的 JavaScript、CSS、HTML、Manifest、软件配置、构建脚本、测试、历史代码测试基线及内置业务提示词（包括 `WUXIA_EXAMPLE`）。`LICENSE` 是[GNU 官方 GPLv3 完整文本](https://www.gnu.org/licenses/gpl-3.0.txt)的原样副本；“or later”的选择由本声明及包元数据明确，不修改许可证正文。

MieMie / 咩咩分别为地位相同的英文、中文官方品牌；官方品牌身份、Logo、角色形象及指定角色 Icon 不因软件代码采用 GPL 而自动获得同等授权。当前 Reserved Assets 仅为 `assets/icon.png`，目录中的软件代码仍适用 GPL。第三方修改版及商业 Fork 请查看 [BRAND.md](BRAND.md) 与 [ASSETS-LICENSE.md](ASSETS-LICENSE.md)：可使用自己的品牌和视觉资产按 GPL 收费分发代码；新素材政策允许免费原样转载含保留素材的官方包，默认不授权收费转售该含图包，且不追溯撤销历史授权。

- [品牌身份与正常引用规则](BRAND.md)
- [指定 PNG 的来源与素材使用范围](ASSETS-LICENSE.md)
- [第三方依赖及运行环境说明](THIRD_PARTY_NOTICES.md)

按 SheepSheep 的来源确认，原咩咩工具箱和本项目的需求、功能设计及架构决策由 SheepSheep 提出，代码主要由 Codex 按这些需求生成、修改和迭代；当前没有其他需列出的共同版权人。`WUXIA_EXAMPLE` 同样由 Codex 根据需求生成，并非从第三方 Prompt、网站或小说原文复制。当前审计未识别出复制或改写自第三方项目的产品代码。

对外分发时应随附 `LICENSE`、上述品牌／素材说明及适用的第三方声明，并按 GPL 提供对应版本源码和构建材料。当前构建不会把这些文件嵌入酒馆助手 JSON；单独一个 JSON 不能替代完整的授权说明与源码提供安排。
