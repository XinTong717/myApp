# Design System Guardrails

可雀的小程序界面要保持温暖、安全、独立、自由，但实现上必须收敛：颜色、字号、间距和组件都尽量从统一入口取，避免每个页面长出自己的小森林。

## 颜色

- TS/TSX 中优先使用 `src/theme/palette.ts`。
- WXSS/SCSS 中优先使用 `src/app.scss` 里的 CSS variables，例如 `var(--color-brand)`。
- 不要在 `src/**/*.tsx` 里新增裸 hex，例如 `#B85540`。确实需要临时例外时，把例外写进 `scripts/check-design-system.cjs` 的 allowlist，并补一句原因。

## 字号

- TS/TSX inline style 中优先使用 `src/theme/typography.ts`，例如 `style={{ ...typography.body }}`。
- className 中优先使用全局文字类：`.text-title`、`.text-section-title`、`.text-card-title`、`.text-body`、`.text-body-strong`、`.text-meta`、`.text-caption`、`.text-micro`、`.text-button`。
- 不要新增裸 `fontSize:`。确实需要例外时，写进 design-system check allowlist。

## 组件

优先使用 `src/components/common/`：

- 页面：`AppPage`、`AppPageHeader`
- 卡片：`AppCard`
- 按钮：`AppPrimaryButton`、`AppMiniButton`
- 筛选：`AppChip`、`AppFilterRow`、`PillSelect`
- 表单：`FormInputBox`、`AppSearchBox`
- 状态：`Skeleton`、`StateCards`

`src/components/profile/` 是历史包袱区。上线测试前不要大迁移，但新功能不要继续往里面新增一套视觉语言。

## 新代码检查

运行：

```bash
npm run check:design-system
```

这个脚本会扫描 `src/**/*.tsx`，拦截未列入 allowlist 的裸 hex 和裸 `fontSize:`。它不是审美警察，是防止界面变成调色盘事故现场的护栏。
