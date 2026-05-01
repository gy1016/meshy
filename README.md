# Meshy 作业实现（tldraw + R3F）

本项目是「图形前端工程师二面作业」实现仓库，目标是完成一个 `3D in 2D Canvas` 的最小可用原型：  
用户在 `tldraw` 无限画布中上传图片，并可将图片转换为可交互的 3D 模型贴纸。

## 技术栈

- React + TypeScript
- tldraw（画布与 shape 交互）
- React Three Fiber（3D 渲染）
- three.js / drei
- antd（toast 提示）

## 本地启动

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm lint
pnpm build
pnpm preview
```

## Part 1 技术调研笔记

### 1) Krea「图片转 3D」小功能体验观察（用户实测）

我使用了 Krea 的图片转 3D 小工具，主观体验如下：

- 流程上大致分成两个阶段：构网（mesh generation）与贴纹理（texturing）。
- 构网阶段会先出现三角网格，并带有简单的光影/动效反馈。
- 贴图阶段先出现一个位于 mesh 正视图前方的平面几何，并把纹理先贴在这个平面上。
- 随后再通过一定算法把平面纹理映射回 mesh 表面。
- 结果上可见的问题：模型立体感不足、纹理映射错乱（本次体验使用混元模型）。

示意截图如下（用户提供）：

![Krea 图片转 3D 体验截图](./docs/images/krea-image-to-3d-observation.png)

这一观察对本作业的直接启发是：我们在作业里优先保证“可用交互闭环 + 几何语义正确”，不过度追求生成质量本身，把重点放在 tldraw 与 R3F 的融合质量。

### 2) tldraw 自定义 shape 机制调研（补充）

为了实现「图片 shape 转 3D shape」，核心依赖 tldraw 的自定义 shape 扩展机制：

- 通过自定义 `ShapeUtil` 定义 `MeshyModelShape` 的结构与行为。
- shape 的业务状态（例如 `assetUrl`、`width`、`height`、`yRotation`）应放在 shape props 中，而不是放到组件私有状态里。
- shape 内可渲染自定义 React 组件，从而把 R3F `Canvas` 嵌入到 shape body。
- 对 shape props 的更新（如旋转角度变化）走 tldraw store 更新链路，才能被 undo/redo 捕获。
- tldraw 的选中、拖动、缩放、删除等 2D 交互可直接复用，3D 仅负责 shape 内部视觉内容与局部交互。

设计结论：

- **2D 几何语义归 tldraw 管。**
- **3D 姿态与渲染细节归 shape 内 R3F 管。**
- **状态统一沉淀到 shape props，保证可回放与一致性。**

### 3) R3F 嵌入 tldraw 方案对比（可行方案打分）

评分维度（满分 5）：

- 性能（多 shape 场景）
- 交互隔离（2D 与 3D 是否容易打架）
- 状态一致性（是否容易接入 undo/redo）
- 实现复杂度（4-6 小时内落地风险）
- 可扩展性（后续向 50+ shape 演进）

| 方案 | 描述 | 性能 | 交互隔离 | 状态一致性 | 实现复杂度 | 可扩展性 | 总分 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. 每个 shape 一个独立 R3F Canvas（独立 WebGL Context） | `MeshyModelShape` 内直接渲染本地 Canvas | 3 | 5 | 5 | 5 | 3 | **21** |
| B. 全局单 Canvas + 多视口/portal 渲染 | 统一 WebGL Context，按 shape 映射视口 | 5 | 3 | 4 | 2 | 5 | **19** |
| C. 预渲染贴图（离屏渲染/快照）+ 按需交互 | 平时显示静态图，交互时切实时 3D | 4 | 4 | 3 | 2 | 4 | **17** |

最终选择：**方案 A（每 shape 独立 Canvas）**。

选择理由：

- 本题限时下，A 方案最稳，能最快打通 Must-have 全链路。
- 与 tldraw shape 生命周期天然一致，易于保证状态收敛到 shape props。
- 交互冲突最容易隔离，便于先拿到“可用且可回放”的版本。
- 对 5+ shape 的性能可能有压力，但这是本阶段可接受 trade-off；后续可演进到 B 方案。

## 当前实现状态（截至本次提交）

- 已完成：
  - tldraw 基础画布与图片导入/转换流程骨架。
  - 转换流程提示由 `window.alert` 切换到 `antd message`。
  - 工具栏裁剪为 Select / Hand / Media。
  - 去除默认 license watermark（CSS 局部隐藏）。
- 待完成（核心）：
  - `MeshyModelShape` 与 R3F 真实渲染主体。
  - shape 内 Y 轴姿态旋转交互与 undo/redo 完整验证。
  - 多 shape 下渲染清晰度策略（DPR）与性能策略说明。

## 下一步实现计划（与评分项对齐）

1. 定义 `MeshyModelShape` 数据结构（`assetUrl` / `width` / `height` / `yRotation`）。
2. 在 shape 内接入 GLB 加载、灯光、透明背景与 fit 策略。
3. 实现独立旋转控件并将旋转写回 shape props。
4. 完整验证链路：上传 → 转 3D → 移动 → 缩放 → 旋转 → 删除 → undo/redo。
5. README 补充性能取舍、AI 使用记录、时间分配、部署信息。
