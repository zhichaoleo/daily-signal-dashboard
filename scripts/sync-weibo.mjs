import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const outputFile = new URL("../netlify/functions/weibo-snapshot.mts", import.meta.url);

async function main() {
  const { stdout } = await runOpenCli(["weibo", "hot", "--limit", "10", "-f", "json", "--window", "background", "--site-session", "persistent"]);
  const raw = JSON.parse(stdout);
  const hotItems = Array.isArray(raw) ? raw.slice(0, 10) : [];
  const items = [];
  for (const [index, item] of hotItems.entries()) {
    const word = text(item.word);
    const posts = word ? await searchPosts(word) : [];
    items.push({
      rank: index + 1,
      word,
      category: text(item.category),
      hot_value: Number(item.hot_value) || 0,
      label: text(item.label),
      url: text(item.url),
      posts,
    });
  }
  const file = `export const weiboSnapshot = ${JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 2)} as const;\n`;
  await writeFile(outputFile, file, "utf8");
  console.log(`Wrote ${outputFile.pathname}`);
}

async function searchPosts(word) {
  try {
    const { stdout } = await runOpenCli(["weibo", "search", word, "--limit", "3", "-f", "json", "--window", "background", "--site-session", "persistent"]);
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) ? parsed.slice(0, 3).map((post) => ({
      rank: Number(post.rank) || 0,
      id: text(post.id),
      author: text(post.author),
      time: text(post.time),
      title: cleanPost(text(post.title)),
      url: text(post.url),
    })) : [];
  } catch (error) {
    console.warn(`search failed for ${word}: ${error.message}`);
    return [];
  }
}

async function runOpenCli(args) {
  return execFileAsync("opencli", args, {
    maxBuffer: 1024 * 1024 * 8,
    timeout: 90_000,
  });
}

function text(value) {
  return value === null || value === undefined ? "" : String(value);
}

function cleanPost(value) {
  return value.replace(/\s*收起d\s*$/g, "").replace(/\s+/g, " ").trim();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
