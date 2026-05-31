/** 一键补齐展示故事封面：将第一页插图设为封面 */
import 'dotenv/config';
import { initDb, listStories, updateStoryCover } from '../src/db';

async function main() {
  await initDb();

  const stories = listStories({ tag: 'showcase' });
  let count = 0;

  for (const s of stories) {
    const coverUrl = s.pages?.[0]?.illustration_url;
    if (coverUrl) {
      updateStoryCover(s.id, coverUrl);
      count++;
      console.log(`✅ ${s.title}`);
    } else {
      console.log(`⚠️ ${s.title}: 无插图`);
    }
  }

  console.log(`\n已为 ${count}/${stories.length} 本设置封面`);
}

main();
