# CareerFit 导出交付说明

本目录用于交付 CareerFit 项目作品，不建议把代码压缩包直接发给 HR。

## 文件夹说明

- `careerfit_web/`：网页版本，可直接打开 `index.html` 预览。
- `careerfit_pdf/`：PDF 版本，适合直接作为附件发送。
- `careerfit_long_image/`：完整长图版本，适合放入作品集或作为整页预览。
- `careerfit_shots/`：关键截图版本，适合放入 BOSS 附件、作品集页面和简历作品入口。

## 给 HR 的建议

如果给 HR 看，优先给网页链接或 PDF；不建议直接给代码压缩包。网页链接更方便快速浏览，PDF 更适合作为投递附件。

## 重新导出

在项目根目录运行：

```bash
npm run export
```

导出脚本会读取 `careerfit_web/index.html`，生成 PDF、完整长图和关键截图。脚本只做导出，不修改网页正文内容、页面结构或功能。
