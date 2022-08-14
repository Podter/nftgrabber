// copy pasta from https://github.com/ericmurphyxyz/nftgrabber/blob/master/index.js

import { Page, launch } from "puppeteer";
import { existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import sharp from "sharp";

const url = process.argv[2];

if (!url) {
  console.log(
    `Please enter a URL (e.g. "npm start https://rarible.com/boredapeyachtclub").`
  );
  process.exit(1);
}

async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      let distance = 500;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 1000);
    });
  });
}

console.log("Loading...\nPress Ctrl + C if you are done with it.");
const browser = await launch({ headless: false });
const page = await browser.newPage();

await page.goto(url);
await page.setViewport({
  width: 960,
  height: 1080,
});

await page.waitForSelector(".ReactVirtualized__Grid");

const collection = join("collection");
if (!existsSync(collection)) {
  mkdirSync(collection);
}

let currentImage = 1;

page.on("response", async (response) => {
  const imageUrl = response.url();
  if (response.request().resourceType() === "image") {
    response.buffer().then((file) => {
      if (imageUrl.includes("t_image_preview")) {
        const fileName = imageUrl.split("/").pop() + ".avif";
        const filePath = resolve(collection, fileName);
        sharp(file).toFormat("png").toFile(`${filePath}.png`);
        console.log(`#${currentImage} saved to ${filePath}.png`);
        currentImage++;
      }
    });
  }
});

await autoScroll(page);

await page.evaluate(() => {
  const elements = [...document.querySelectorAll("button")];
  const targetElement = elements.find((e) => e.innerText.includes("Load more"));
  targetElement && targetElement.click();
});

await autoScroll(page);
await browser.close();
