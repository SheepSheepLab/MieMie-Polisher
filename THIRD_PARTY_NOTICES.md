# 第三方声明

本文件记录 MieMie Polisher 1.0.1-hub.2 当前实际使用的第三方组件范围。软件代码采用 GPL-3.0-or-later；第三方作品若有各自声明，应保留其原有权利与许可证，本项目不能替其重新授权。

## 产品代码与资源

当前产品源码未识别出复制、内嵌或修改自第三方项目的产品代码。旧版咩咩工具箱迁移代码及内置 `WUXIA_EXAMPLE` 的来源确认见 [README](README.md)，指定 AI 生成 PNG 的来源与独立使用规则见 [ASSETS-LICENSE.md](ASSETS-LICENSE.md)。不将这些来源记录虚列为第三方软件依赖。

本项目未捆绑第三方字体、图标库或其他媒体库。系统字体与 Unicode emoji 不以字体／图片包形式分发。

## 开发与测试

当前 `package.json` / `package-lock.json` 没有第三方 npm 依赖。构建和自身测试使用 Node.js 内置模块；Node.js 实现本身不被复制进仓库或酒馆助手 JSON。

Hub + Polisher 组合测试由独立 Hub 项目维护，Hub 的 `jsdom` 是 Hub 的开发／测试依赖，不属于本项目依赖，也不会打包进 Polisher JSON。

## 运行环境

产品调用 MieMie Hub Extension API v1、酒馆助手及 SillyTavern 提供的宿主接口；这些宿主实现不包含在本项目生成的 JSON 中。本文件不替宿主项目声明许可证，也不表示本项目获得了它们的官方背书。

后续如实际引入或随包分发第三方代码、素材或工具，应按对应版本的许可证更新此文件，并随分发物保留所需版权、许可证和 NOTICE；当前没有应虚构添加的第三方产品代码署名。
