/**
 * 🤘 Welcome to Stagehand!
 *
 * TO RUN THIS PROJECT:
 * ```
 * npm install
 * npm run start
 * ```
 *
 * To edit config, see `stagehand.config.ts`
 */

import { Page, BrowserContext, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import boxen from "boxen";
import dotenv from "dotenv";

dotenv.config();

const getCommitInfo = async (page: Page) => {
  return await page.extract({
    instruction: "extract the latest commit message and hash",
    schema: z.object({
      commitMessage: z.string(),
      commitHash: z.string(),
    }),
  });
}

const getBranchPicker = async (page: Page) => {
  const [{ selector: branchPickerSelector }] = await page.observe({
    instruction: "find the branch picker dropdown button"
  });
  return page.locator(branchPickerSelector);
}

const getBranchButtons = async (page: Page) => {
  const branchPicker = await getBranchPicker(page);
  await branchPicker.click();

  const locator = page.locator("#branches > li > a");

  return locator;
}

const announceBranch = async (branch: Branch, page: Page) => {
  const commitInfo = await getCommitInfo(page);

  announce(`The latest commit is ${commitInfo.commitHash}: ${commitInfo.commitMessage}`, `${branch.name} ${branch.isDefault ? "(default)" : ""}`)
}

type Branch = {
  name: string,
  isDefault: boolean,
}

export async function main({
  page,
  context,
  stagehand,
}: {
  page: Page;
  context: BrowserContext;
  stagehand: Stagehand;
}) {
  await page.goto("https://github.com/rouge8/dotfiles");

  let branchButtonsLocator = await getBranchButtons(page);

  const branches: Branch[] = [];
  for (const button of await branchButtonsLocator.all()) {
    const [branchName, maybeDefault] = (await button.innerText()).trim().split(/\s/);

    branches.push({name: branchName, isDefault: maybeDefault?.toLowerCase() === "default"});
  }

  for (const [idx, branch] of branches.entries()) {
    if (idx > 1) {
      // Re-open the branches dropdown
      const branchPicker = await getBranchPicker(page);
      await branchPicker.click();
    }
    if (idx > 0) {
      // Navigate to the branch pgae
      await (await branchButtonsLocator.all())[idx].click();
    }
    await announceBranch(branch, page);
  }

  await stagehand.close();
}

function announce(message: string, title: string) {
  console.log(
    boxen(message, {
      padding: 1,
      margin: 3,
      title: title,
    })
  );
}
