const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const Module = require("module");

const rootDir = path.resolve(__dirname, "..");
const webDir = path.join(rootDir, "careerfit_web");
const webIndex = path.join(webDir, "index.html");

const outputDirs = {
  pdf: path.join(rootDir, "careerfit_pdf"),
  longImage: path.join(rootDir, "careerfit_long_image"),
  shots: path.join(rootDir, "careerfit_shots"),
};

const outputFiles = {
  pdfCn: path.join(outputDirs.pdf, "CareerFit_AI求职匹配与简历真实性审查工具.pdf"),
  pdfFallback: path.join(outputDirs.pdf, "CareerFit_Product_Case.pdf"),
  longImage: path.join(outputDirs.longImage, "CareerFit_完整长图.png"),
};

const viewport = {
  width: 1440,
  height: 1100,
};

function addNodeModulePath(modulePath) {
  if (!modulePath || !fs.existsSync(modulePath)) return;
  const parts = (process.env.NODE_PATH || "")
    .split(path.delimiter)
    .filter(Boolean);
  if (!parts.includes(modulePath)) {
    parts.push(modulePath);
    process.env.NODE_PATH = parts.join(path.delimiter);
    Module._initPaths();
  }
}

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (firstError) {
    const bundledNodeModules = path.join(
      os.homedir(),
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "node",
      "node_modules"
    );
    addNodeModulePath(bundledNodeModules);
    addNodeModulePath(path.join(bundledNodeModules, ".pnpm", "node_modules"));

    try {
      return require("playwright");
    } catch (secondError) {
      throw new Error(
        [
          "Playwright is required to export CareerFit.",
          "Run npm install before npm run export, or run inside the Codex bundled runtime.",
          `Original error: ${firstError.message}`,
          `Bundled-runtime error: ${secondError.message}`,
        ].join("\n")
      );
    }
  }
}

function ensureInputs() {
  if (!fs.existsSync(webIndex)) {
    throw new Error(`Missing source page: ${webIndex}`);
  }

  ["style.css", "script.js"].forEach((fileName) => {
    const filePath = path.join(webDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing web asset: ${filePath}`);
    }
  });
}

function ensureOutputDirs() {
  Object.values(outputDirs).forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
}

function findSystemBrowserExecutable() {
  const candidates = [
    path.join(process.env.PROGRAMFILES || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env.PROGRAMFILES || "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function launchBrowser(chromium) {
  try {
    return await chromium.launch();
  } catch (defaultError) {
    const executablePath = findSystemBrowserExecutable();
    if (!executablePath) {
      throw defaultError;
    }

    return chromium.launch({
      executablePath,
      headless: true,
    });
  }
}

async function waitForStablePage(page) {
  await page.goto(pathToFileURL(webIndex).href, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function preparePage(page) {
  await page.setViewportSize(viewport);
  await waitForStablePage(page);
  await page.addStyleTag({
    content: [
      ".back-to-top{display:none!important;}",
      ".site-header{position:static!important;}",
      "html{scroll-behavior:auto!important;}",
    ].join(""),
  });
}

async function activateWireframeTab(page, panelName) {
  const tab = page.locator(`.tab[data-panel="${panelName}"]`);
  await tab.click();
  await page.locator(`#panel-${panelName}.is-active`).waitFor({ state: "visible" });
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function getClip(page, startSelector, endSelector) {
  const clip = await page.evaluate(
    ({ startSelector: start, endSelector: end, width }) => {
      const startEl = document.querySelector(start);
      const endEl = document.querySelector(end || start);
      if (!startEl || !endEl) {
        throw new Error(`Missing screenshot selector: ${start} ${end || ""}`.trim());
      }

      const startRect = startEl.getBoundingClientRect();
      const endRect = endEl.getBoundingClientRect();
      const top = Math.max(0, Math.floor(startRect.top + window.scrollY));
      const bottom = Math.ceil(endRect.bottom + window.scrollY);
      const pageHeight = Math.ceil(document.documentElement.scrollHeight);

      return {
        x: 0,
        y: top,
        width,
        height: Math.max(1, Math.min(bottom, pageHeight) - top),
      };
    },
    { startSelector, endSelector, width: viewport.width }
  );

  return clip;
}

async function captureClip(page, fileName, startSelector, endSelector = startSelector) {
  const clip = await getClip(page, startSelector, endSelector);
  await page.setViewportSize({
    width: viewport.width,
    height: Math.ceil(clip.height),
  });
  await page.evaluate((top) => window.scrollTo(0, top), clip.y);
  await page.waitForTimeout(100);
  await page.screenshot({
    path: path.join(outputDirs.shots, fileName),
    animations: "disabled",
    caret: "hide",
  });
  await page.setViewportSize(viewport);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function exportPdf(page) {
  await page.pdf({
    path: outputFiles.pdfCn,
    printBackground: true,
    displayHeaderFooter: false,
    width: "1440px",
    height: "2036px",
    margin: {
      top: "0px",
      right: "0px",
      bottom: "0px",
      left: "0px",
    },
  });
  fs.copyFileSync(outputFiles.pdfCn, outputFiles.pdfFallback);
}

async function exportLongImage(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: outputFiles.longImage,
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
}

async function exportKeyShots(page) {
  const shots = [
    ["01_首页项目概览.png", "#overview"],
    ["02_设计目标与用户痛点.png", "#goals", "#pain-points"],
    ["03_核心需求小样.png", "#requirements"],
    ["04_功能优先级.png", "#priority"],
  ];

  for (const [fileName, startSelector, endSelector] of shots) {
    await captureClip(page, fileName, startSelector, endSelector);
  }

  const wireframeShots = [
    ["upload", "05_低保真原型_上传页.png"],
    ["match", "06_低保真原型_匹配页.png"],
    ["truth", "07_低保真原型_真实性页.png"],
    ["review", "08_低保真原型_复盘页.png"],
  ];

  for (const [panelName, fileName] of wireframeShots) {
    await activateWireframeTab(page, panelName);
    await captureClip(page, fileName, "#wireframes");
  }

  await captureClip(page, "09_项目总结与边界说明.png", "#summary", "#boundary");
}

async function main() {
  ensureInputs();
  ensureOutputDirs();

  const { chromium } = loadPlaywright();
  const browser = await launchBrowser(chromium);
  const page = await browser.newPage({ viewport });

  try {
    await preparePage(page);
    await exportPdf(page);
    await exportLongImage(page);
    await exportKeyShots(page);
  } finally {
    await browser.close();
  }

  const shotCount = fs
    .readdirSync(outputDirs.shots)
    .filter((fileName) => /^\d{2}_.+\.png$/u.test(fileName)).length;

  console.log("CareerFit export complete.");
  console.log(`PDF: ${outputFiles.pdfCn}`);
  console.log(`PDF fallback: ${outputFiles.pdfFallback}`);
  console.log(`Long image: ${outputFiles.longImage}`);
  console.log(`Key screenshots: ${shotCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
