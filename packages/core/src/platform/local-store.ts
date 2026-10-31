import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Asset, ConversionJob, JobOutput } from "@vetor/contracts";
import type { ExtraAssetInput } from "../types";
import type { JobRuntime } from "../jobs/runtime";

interface LocalDatabase {
  users: Array<{
    id: string;
    email: string;
    passwordHash: string;
    salt: string;
    createdAt: string;
  }>;
  sessions: Array<{ token: string; userId: string; expiresAt: string }>;
  assets: Asset[];
  jobs: ConversionJob[];
  outputs: JobOutput[];
  events: Array<{
    id: string;
    jobId: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
  queue: string[];
}

const emptyDb = (): LocalDatabase => ({
  users: [],
  sessions: [],
  assets: [],
  jobs: [],
  outputs: [],
  events: [],
  queue: [],
});

export class LocalStore implements JobRuntime {
  constructor(private readonly root: string) {}

  private dbPath() {
    return path.join(this.root, "db.json");
  }

  async ensure() {
    await mkdir(path.join(this.root, "storage", "originals"), { recursive: true });
    await mkdir(path.join(this.root, "storage", "outputs"), { recursive: true });
    try {
      await readFile(this.dbPath(), "utf8");
    } catch {
      await this.writeDb(emptyDb());
    }
  }

  private async readDb(): Promise<LocalDatabase> {
    await this.ensure();
    return JSON.parse(await readFile(this.dbPath(), "utf8")) as LocalDatabase;
  }

  private async writeDb(db: LocalDatabase) {
    const tmp = `${this.dbPath()}.tmp`;
    await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await rename(tmp, this.dbPath());
  }

  private async mutate<T>(fn: (db: LocalDatabase) => T | Promise<T>): Promise<T> {
    const db = await this.readDb();
    const result = await fn(db);
    await this.writeDb(db);
    return result;
  }

  async createUser(email: string, passwordHash: string, salt: string) {
    return this.mutate((db) => {
      const existing = db.users.find((user) => user.email === email);
      if (existing) throw new Error("Este e-mail já está cadastrado.");
      const user = {
        id: randomUUID(),
        email,
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
      return user;
    });
  }

  async findUserByEmail(email: string) {
    const db = await this.readDb();
    return db.users.find((user) => user.email === email) ?? null;
  }

  async createSession(userId: string) {
    const token = randomUUID();
    await this.mutate((db) => {
      db.sessions.push({
        token,
        userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
      });
    });
    return token;
  }

  async getSession(token: string) {
    const db = await this.readDb();
    const session = db.sessions.find((item) => item.token === token);
    if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
    const user = db.users.find((item) => item.id === session.userId);
    return user ? { user, session } : null;
  }

  async deleteSession(token: string) {
    await this.mutate((db) => {
      db.sessions = db.sessions.filter((item) => item.token !== token);
    });
  }

  async createAsset(asset: Asset) {
    await this.mutate((db) => {
      db.assets.unshift(asset);
    });
    return asset;
  }

  async listAssets(userId: string) {
    const db = await this.readDb();
    return db.assets.filter((asset) => asset.userId === userId);
  }

  async createJob(job: ConversionJob) {
    await this.mutate((db) => {
      db.jobs.unshift(job);
      db.queue.push(job.id);
    });
    return job;
  }

  async listJobs(userId: string) {
    const db = await this.readDb();
    return db.jobs.filter((job) => job.userId === userId);
  }

  async getJob(jobId: string) {
    const db = await this.readDb();
    return db.jobs.find((job) => job.id === jobId) ?? null;
  }

  async getAsset(assetId: string) {
    const db = await this.readDb();
    return db.assets.find((asset) => asset.id === assetId) ?? null;
  }

  async claimJob(jobId: string) {
    return this.mutate((db) => {
      const job = db.jobs.find((item) => item.id === jobId);
      if (!job || job.status === "cancelled" || job.status === "completed") return false;
      if (job.status === "processing") return false;
      job.status = "processing";
      job.startedAt = new Date().toISOString();
      job.progress = 5;
      return true;
    });
  }

  async updateJob(jobId: string, patch: Partial<ConversionJob>) {
    await this.mutate((db) => {
      const job = db.jobs.find((item) => item.id === jobId);
      if (job) Object.assign(job, patch);
    });
  }

  async addEvent(jobId: string, type: string, message: string) {
    await this.mutate((db) => {
      db.events.push({
        id: randomUUID(),
        jobId,
        type,
        message,
        createdAt: new Date().toISOString(),
      });
    });
  }

  async readStorage(storagePath: string) {
    return readFile(path.join(this.root, storagePath));
  }

  async writeOriginal(userId: string, fileName: string, buffer: Buffer) {
    const id = randomUUID();
    const storagePath = path.posix.join("storage", "originals", userId, `${id}-${safe(fileName)}`);
    const full = path.join(this.root, storagePath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buffer);
    return { id, storagePath, sha256: sha256(buffer) };
  }

  async writeOutput(input: {
    jobId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
    width: number | null;
    height: number | null;
    metadata: Record<string, unknown>;
  }) {
    return this.mutate(async (db) => {
      const job = db.jobs.find((item) => item.id === input.jobId);
      const outputId = randomUUID();
      const storagePath = path.posix.join(
        "storage",
        "outputs",
        job?.userId ?? "unknown",
        `${outputId}-${safe(input.fileName)}`,
      );
      const full = path.join(this.root, storagePath);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, input.buffer);
      const output: JobOutput = {
        id: outputId,
        jobId: input.jobId,
        storagePath,
        mimeType: input.mimeType,
        fileSize: input.buffer.length,
        width: input.width,
        height: input.height,
        metadata: input.metadata,
        createdAt: new Date().toISOString(),
      };
      db.outputs.push(output);
      return output;
    });
  }

  async listOutputs(jobId: string) {
    const db = await this.readDb();
    return db.outputs.filter((output) => output.jobId === jobId);
  }

  async loadExtraAssets(ids: string[]): Promise<ExtraAssetInput[]> {
    const extras: ExtraAssetInput[] = [];
    for (const id of ids) {
      const asset = await this.getAsset(id);
      if (!asset) continue;
      extras.push({
        id,
        buffer: await this.readStorage(asset.storagePath),
        fileName: asset.originalName,
      });
    }
    return extras;
  }

  async enqueue(job: ConversionJob) {
    await this.mutate((db) => {
      if (!db.queue.includes(job.id)) db.queue.push(job.id);
    });
  }

  async dequeue() {
    return this.mutate((db) => {
      const jobId = db.queue.shift();
      return jobId ? { jobId, messageId: undefined } : null;
    });
  }

  async ack() {
    return;
  }

  async listEvents(jobId: string) {
    const db = await this.readDb();
    return db.events.filter((event) => event.jobId === jobId);
  }
}

function safe(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
}

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
