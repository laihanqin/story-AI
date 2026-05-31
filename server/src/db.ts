// ===== SQLite 数据库（sql.js）=====
import initSqlJs, { type Database, type QueryExecResult } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'stories.db');

let db: Database;

function run(sql: string, params: any[] = []): QueryExecResult[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results: QueryExecResult[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function exec(sql: string, params: any[] = []): void {
  db.run(sql, params);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let savePending = false;

function scheduleSave(): void {
  if (savePending) return;
  savePending = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    savePending = false;
    saveTimer = null;
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  }, 300);
}

function save(): void {
  scheduleSave();
}

function flushSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    savePending = false;
  }
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// ===== 类型 =====
export interface PageRow {
  page_number: number;
  text: string;
  illustration_url: string;
  audio_url: string;
}

export interface StoryRow {
  id: string;
  title: string;
  type: string;
  tag: string | null;
  character: string;
  scene: string;
  description: string;
  status: string;
  user_id: string | null;
  target_child_id: string | null;
  created_at: string;
  updated_at: string;
  pages: PageRow[];
  progress: number;
  progress_message: string;
  lesson: string;
  cover_url: string;
  pipeline_step: string;
}

export interface UserRow {
  id: string;
  name: string;
  role: string;
  avatar: string;
  token: string;
  password: string;
}

// ===== 初始化 =====
export async function initDb(): Promise<void> {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      token TEXT NOT NULL UNIQUE,
      password TEXT DEFAULT ''
    )
  `);

  // 为已有数据库添加 password 列
  try { exec('ALTER TABLE users ADD COLUMN password TEXT DEFAULT \'\''); } catch { /* 列已存在 */ }

  exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'ai_create',
      character TEXT DEFAULT '',
      scene TEXT DEFAULT '',
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      user_id TEXT DEFAULT NULL,
      target_child_id TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 为已有数据库添加 user_id 列
  try { exec('ALTER TABLE stories ADD COLUMN user_id TEXT DEFAULT NULL'); } catch { /* 列已存在 */ }

  // 为已有数据库添加进度字段
  try { exec('ALTER TABLE stories ADD COLUMN progress INTEGER DEFAULT 0'); } catch { /* 列已存在 */ }
  try { exec('ALTER TABLE stories ADD COLUMN progress_message TEXT DEFAULT \'\''); } catch { /* 列已存在 */ }
  try { exec('ALTER TABLE stories ADD COLUMN lesson TEXT DEFAULT \'\''); } catch { /* 列已存在 */ }
  try { exec('ALTER TABLE stories ADD COLUMN cover_url TEXT DEFAULT \'\''); } catch { /* 列已存在 */ }
  try { exec('ALTER TABLE stories ADD COLUMN pipeline_step TEXT DEFAULT \'\''); } catch { /* 列已存在 */ }
  try { exec('ALTER TABLE stories ADD COLUMN tag TEXT DEFAULT NULL'); } catch { /* 列已存在 */ }

  exec(`
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      text TEXT DEFAULT '',
      illustration_url TEXT DEFAULT '',
      audio_url TEXT DEFAULT '',
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
    )
  `);

  exec(`CREATE INDEX IF NOT EXISTS idx_pages_story ON pages(story_id)`);
  exec(`CREATE INDEX IF NOT EXISTS idx_stories_type ON stories(type)`);

  save();

  // 进程退出前强制刷盘
  const doFlush = () => { try { flushSave(); } catch { /* 忽略 */ } };
  process.on('exit', doFlush);
  process.on('SIGINT', () => { doFlush(); process.exit(); });
  process.on('SIGTERM', () => { doFlush(); process.exit(); });
}

// 公开刷盘函数供外部调用
export { flushSave };

// ===== 用户操作 =====
export function findUserByToken(token: string): UserRow | null {
  const rows = run('SELECT * FROM users WHERE token = ?', [token]);
  return rows.length ? (rows[0] as unknown as UserRow) : null;
}

export function findUserByName(nam: string, role: string): UserRow | null {
  const rows = run('SELECT * FROM users WHERE name = ? AND role = ?', [nam, role]);
  return rows.length ? (rows[0] as unknown as UserRow) : null;
}

export function findUserByNameOnly(nam: string): UserRow | null {
  const rows = run('SELECT * FROM users WHERE name = ?', [nam]);
  return rows.length ? (rows[0] as unknown as UserRow) : null;
}

export function createUser(nam: string, role: string, avatar: string, token: string): UserRow {
  const id = Date.now().toString();
  run('INSERT INTO users (id, name, role, avatar, token, password) VALUES (?, ?, ?, ?, ?, ?)', [id, nam, role, avatar, token, '']);
  save();
  return { id, name: nam, role, avatar, token, password: '' };
}

export function createUserWithPassword(nam: string, role: string, avatar: string, token: string, password: string): UserRow {
  // 检查用户名是否已存在
  const existing = findUserByNameOnly(nam);
  if (existing) throw new Error('用户名已被注册');
  const id = Date.now().toString();
  run('INSERT INTO users (id, name, role, avatar, token, password) VALUES (?, ?, ?, ?, ?, ?)', [id, nam, role, avatar, token, password]);
  save();
  return { id, name: nam, role, avatar, token, password };
}

// ===== 故事操作 =====
export function listStories(filter?: { type?: string; childId?: string; userId?: string; tag?: string | null }): StoryRow[] {
  let sql = 'SELECT * FROM stories WHERE 1=1';
  const params: any[] = [];

  if (filter?.type) { sql += ' AND type = ?'; params.push(filter.type); }
  if (filter?.childId) { sql += ' AND target_child_id = ?'; params.push(filter.childId); }
  if (filter?.userId) { sql += ' AND user_id = ?'; params.push(filter.userId); }
  if (filter?.tag !== undefined) {
    if (filter.tag === null) { sql += ' AND tag IS NULL'; }
    else { sql += ' AND tag = ?'; params.push(filter.tag); }
  }

  sql += ' ORDER BY created_at DESC';
  const storyRows = run(sql, params) as unknown as StoryRow[];

  return storyRows.map(s => {
    const pages = run('SELECT page_number, text, illustration_url, audio_url FROM pages WHERE story_id = ? ORDER BY page_number', [s.id]) as unknown as PageRow[];
    return { ...s, pages };
  });
}

export function findStoryById(id: string): StoryRow | null {
  const rows = run('SELECT * FROM stories WHERE id = ?', [id]) as unknown as StoryRow[];
  if (!rows.length) return null;
  const pages = run('SELECT page_number, text, illustration_url, audio_url FROM pages WHERE story_id = ? ORDER BY page_number', [id]) as unknown as PageRow[];
  return { ...rows[0], pages };
}

export function createStory(data: { title: string; type: string; character?: string; scene?: string; description?: string; userId?: string; tag?: string | null }): StoryRow {
  const id = Date.now().toString();
  const now = new Date().toISOString();
  exec(
    `INSERT INTO stories (id, title, type, tag, character, scene, description, status, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    [id, data.title, data.type, data.tag || null, data.character || '', data.scene || '', data.description || '', data.userId || null, now, now],
  );
  save();
  return { id, title: data.title, type: data.type, tag: data.tag || null, character: data.character || '', scene: data.scene || '', description: data.description || '', status: 'draft', user_id: data.userId || null, target_child_id: null, created_at: now, updated_at: now, pages: [], progress: 0, progress_message: '', lesson: '', cover_url: '', pipeline_step: '' };
}

export function updateStoryStatus(id: string, status: string): void {
  exec('UPDATE stories SET status = ?, updated_at = ? WHERE id = ?', [status, new Date().toISOString(), id]);
  save();
}

export function updateStoryProgress(id: string, progress: number, message: string = ''): void {
  exec('UPDATE stories SET progress = ?, progress_message = ? WHERE id = ?', [progress, message, id]);
  save();
}

export function updateStoryPipelineStep(id: string, step: string): void {
  exec('UPDATE stories SET pipeline_step = ? WHERE id = ?', [step, id]);
  save();
}

export function updateStoryCover(id: string, coverUrl: string): void {
  exec('UPDATE stories SET cover_url = ? WHERE id = ?', [coverUrl, id]);
  save();
}

export function updateStoryMeta(id: string, data: { title: string; character: string; scene: string; description: string; lesson: string }): void {
  exec('UPDATE stories SET title = ?, character = ?, scene = ?, description = ?, lesson = ? WHERE id = ?', [data.title, data.character, data.scene, data.description, data.lesson, id]);
  save();
}

export function setStoryLesson(id: string, lesson: string): void {
  exec('UPDATE stories SET lesson = ? WHERE id = ?', [lesson, id]);
  save();
}

export function setStoryPages(id: string, pages: PageRow[]): void {
  exec('DELETE FROM pages WHERE story_id = ?', [id]);
  const stmt = db.prepare('INSERT INTO pages (story_id, page_number, text, illustration_url, audio_url) VALUES (?, ?, ?, ?, ?)');
  for (const p of pages) {
    stmt.run([id, p.page_number, p.text, p.illustration_url || '', p.audio_url || '']);
  }
  stmt.free();
  exec('UPDATE stories SET updated_at = ? WHERE id = ?', [new Date().toISOString(), id]);
  save();
}

export function pushStoryToChild(id: string, childId: string): void {
  exec('UPDATE stories SET target_child_id = ?, updated_at = ? WHERE id = ?', [childId, new Date().toISOString(), id]);
  save();
}

export function updatePageAudio(storyId: string, pageNumber: number, audioUrl: string): void {
  exec('UPDATE pages SET audio_url = ? WHERE story_id = ? AND page_number = ?', [audioUrl, storyId, pageNumber]);
  save();
}

export function updatePageIllustration(storyId: string, pageNumber: number, illustrationUrl: string): void {
  exec('UPDATE pages SET illustration_url = ? WHERE story_id = ? AND page_number = ?', [illustrationUrl, storyId, pageNumber]);
  save();
}

export function deleteStory(id: string): void {
  exec('DELETE FROM pages WHERE story_id = ?', [id]);
  exec('DELETE FROM stories WHERE id = ?', [id]);
  save();
}

export function recoverStuckStories(): number {
  exec("UPDATE stories SET status = 'draft', progress = 0, progress_message = '服务器重启，请重新生成' WHERE status = 'generating'");
  const count = db.getRowsModified();
  if (count > 0) save();
  return count;
}

export function trySetGenerating(id: string): boolean {
  exec("UPDATE stories SET status = 'generating' WHERE id = ? AND status != 'generating'", [id]);
  const changed = db.getRowsModified() > 0;
  if (changed) save();
  return changed;
}
