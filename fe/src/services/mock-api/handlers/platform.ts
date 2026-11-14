/**
 * AI patterns and images, the admin console (accounts, health, bank reconciliation, library) and the analytics of the
 * offline demo. AI runs the free procedural generator of the API; images are drawn from it too, so the whole flow
 * (spend xu, wait for the job, place the result) works without a provider.
 */

import {
  AI_IMAGE_MODEL_BY_KEY,
  AI_IMAGE_MODELS,
  AI_IMAGE_KEEP_DAYS,
  ANALYTICS_BOX_TYPES,
  isAiImageModelKey,
  XU_PATTERN_COST,
  XU_TOOL_COST,
  type AnalyticsSummary,
} from "@wrapfit/shared";
import { DEMO_HEALTH } from "@/features/dashboard/demoData";
import type { AiImageJob, AiImageOutput, AiImageTool } from "@/types/api";
import { badRequest, conflict, currentUser, cursorPage, MockHttpError, notFound, paginate, requireAdmin, type Handler } from "../http";
import { renderPatternSvg } from "../pattern/pattern-svg";
import { ProceduralPatternGenerator } from "../pattern/procedural-pattern.generator";
import { db, newId, nowIso, save } from "../store";
import { publicUser } from "./account";
import { bankPaymentOf, settlePayment, spendXu, xuWallet } from "./billing";

const procedural = new ProceduralPatternGenerator();

// ---------------------------------------------------------------- AI

const aiUsage: Handler = () => {
  const user = currentUser();
  const wallet = xuWallet(user);
  save();
  return {
    aiEnabled: true,
    budgetReached: false,
    patternCost: { fast: XU_PATTERN_COST.fast, premium: XU_PATTERN_COST.premium },
    xu: { balance: wallet.balance, allowance: wallet.allowance },
  };
};

const aiPattern: Handler = ({ body }) => {
  const user = currentUser();
  const theme = String(body.theme ?? "").trim();
  if (!theme) throw badRequest("Hãy mô tả chủ đề hoạ tiết.");
  const quality = body.quality === "premium" ? "premium" : "fast";
  const cost = XU_PATTERN_COST[quality];
  const balance = spendXu(user, cost, "AI_PATTERN", null);
  const design = procedural.design({ theme, preferredColors: (body.preferredColors as string[]) ?? [] });
  save();
  return {
    source: "ai",
    themeName: design.themeName,
    description: design.description,
    palette: design.palette,
    tile: { size: design.tile.size, svg: renderPatternSvg(design) },
    usage: { charged: cost, balance },
  };
};

const catalog: Handler = () => ({
  enabled: true,
  models: AI_IMAGE_MODELS.filter((m) => m.enabled).map((m) => ({
    key: m.key,
    label: m.label,
    tier: m.tier,
    xu: m.xu,
    output: m.output,
    supportsText: m.supportsText,
    aspectRatios: [...m.aspectRatios],
    maxImages: m.maxImages,
    summary: m.summary,
  })),
  tools: XU_TOOL_COST,
});

const RATIO: Record<string, [number, number]> = { "1:1": [1, 1], "4:3": [4, 3], "3:4": [3, 4], "3:2": [3, 2], "2:3": [2, 3], "16:9": [16, 9], "9:16": [9, 16] };

/** An artwork for a box face: the procedural pattern of the prompt, repeated over the frame. */
function artwork(prompt: string, aspectRatio: string, seed: number, tool?: AiImageTool) {
  const [rw, rh] = RATIO[aspectRatio] ?? [1, 1];
  const width = 1024;
  const height = Math.round((width * rh) / rw);
  const design = procedural.design({ theme: `${prompt} ${seed}`, preferredColors: [] });
  const tile = renderPatternSvg(design);
  const scale = tool === "upscale" ? 1.6 : 2.4 + (seed % 3) * 0.6;
  const size = design.tile.size * scale;
  const background = tool === "remove-bg" ? "" : `<rect width="100%" height="100%" fill="${design.palette[0]}"/>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><pattern id="p" width="${size}" height="${size}" patternUnits="userSpaceOnUse">` +
    `<image width="${size}" height="${size}" href="data:image/svg+xml;base64,${btoa(tile)}"/></pattern></defs>` +
    `${background}<rect width="100%" height="100%" fill="url(#p)"/></svg>`;
  return { url: `data:image/svg+xml;base64,${btoa(svg)}`, width, height };
}

function output(prompt: string, aspectRatio: string, seed: number, tool?: AiImageTool): AiImageOutput {
  const art = artwork(prompt, aspectRatio, seed, tool);
  const vector = tool === "vectorize";
  return {
    id: newId(),
    url: art.url,
    contentType: "image/svg+xml",
    width: vector ? null : art.width,
    height: vector ? null : art.height,
    keepUntil: new Date(Date.now() + AI_IMAGE_KEEP_DAYS * 86_400_000).toISOString(),
    createdAt: nowIso(),
  };
}

const jobView = ({ userId, ...job }: AiImageJob & { userId: string }): AiImageJob => {
  void userId;
  // The job "runs" for a couple of seconds, like the queue of the API.
  if (job.status !== "COMPLETED" && Date.now() - new Date(job.createdAt).getTime() > 2_500) {
    return { ...job, status: "COMPLETED", completedAt: nowIso() };
  }
  return job.status === "COMPLETED" ? job : { ...job, status: "PROCESSING", outputs: [] };
};

const createImages: Handler = ({ body }) => {
  const user = currentUser();
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) throw badRequest("Hãy mô tả hình ảnh bạn muốn.");
  const modelKey = String(body.modelKey ?? "");
  if (!isAiImageModelKey(modelKey)) throw badRequest("Mẫu AI không hợp lệ.");
  const model = AI_IMAGE_MODEL_BY_KEY[modelKey];
  const numImages = Math.min(model.maxImages, Math.max(1, Number(body.numImages) || 1));
  const repeated = db().aiJobs.find((j) => j.userId === user.id && body.clientRequestId && j.id === `job-${body.clientRequestId}`);
  if (repeated) return { job: jobView(repeated), balance: xuWallet(user).balance };
  if (db().aiJobs.filter((j) => j.userId === user.id && jobView(j).status !== "COMPLETED").length >= 3) {
    throw new MockHttpError(429, "Chờ các ảnh đang tạo xong rồi tạo tiếp.", { code: "AI_IMAGE_BUSY" });
  }
  const cost = model.xu * numImages;
  const id = body.clientRequestId ? `job-${body.clientRequestId}` : newId();
  const balance = spendXu(user, cost, "AI_IMAGE", id);
  const aspectRatio = String(body.aspectRatio ?? "1:1");
  const job = {
    id,
    userId: user.id,
    kind: "GENERATE" as const,
    modelKey,
    status: "PENDING" as const,
    prompt,
    aspectRatio,
    numImages,
    xuCost: cost,
    error: null,
    createdAt: nowIso(),
    completedAt: null,
    outputs: Array.from({ length: numImages }, (_, i) => output(prompt, aspectRatio, Date.now() + i)),
  };
  db().aiJobs.push(job);
  save();
  return { job: jobView(job), balance };
};

const runTool: Handler = ({ params }) => {
  const user = currentUser();
  const tool = params.tool as AiImageTool;
  if (!(tool in XU_TOOL_COST)) throw notFound();
  const source = db().aiJobs.find((j) => j.userId === user.id && j.outputs.some((o) => o.id === params.outputId));
  if (!source) throw notFound("Không tìm thấy ảnh.");
  const id = newId();
  const balance = spendXu(user, XU_TOOL_COST[tool], "AI_TOOL", id);
  const kind = tool === "upscale" ? "UPSCALE" : tool === "remove-bg" ? "REMOVE_BG" : "VECTORIZE";
  const job = {
    ...source,
    id,
    kind: kind as AiImageJob["kind"],
    status: "PENDING" as const,
    numImages: 1,
    xuCost: XU_TOOL_COST[tool],
    createdAt: nowIso(),
    completedAt: null,
    outputs: [output(source.prompt ?? "", source.aspectRatio ?? "1:1", Date.now(), tool)],
  };
  db().aiJobs.push(job);
  save();
  return { job: jobView(job), balance };
};

/** Tools on an image of the canvas (docs/23 S20): the offline demo answers with a generated image. */
const runUploadTool: Handler = ({ params }) => {
  const user = currentUser();
  const tool = params.tool as AiImageTool;
  if (!(tool in XU_TOOL_COST)) throw notFound();
  const id = newId();
  const balance = spendXu(user, XU_TOOL_COST[tool], "AI_TOOL", id);
  const kind = tool === "upscale" ? "UPSCALE" : tool === "remove-bg" ? "REMOVE_BG" : "VECTORIZE";
  const job = {
    id,
    userId: user.id,
    kind: kind as AiImageJob["kind"],
    modelKey: tool,
    status: "PENDING" as const,
    prompt: "Ảnh tải lên",
    aspectRatio: "1:1",
    numImages: 1,
    xuCost: XU_TOOL_COST[tool],
    error: null,
    createdAt: nowIso(),
    completedAt: null,
    outputs: [output("Ảnh tải lên", "1:1", Date.now(), tool)],
  };
  db().aiJobs.push(job);
  save();
  return { job: jobView(job), balance };
};

const getJob: Handler = ({ params }) => {
  const user = currentUser();
  const job = db().aiJobs.find((j) => j.id === params.jobId && j.userId === user.id);
  if (!job) throw notFound("Không tìm thấy lượt tạo ảnh.");
  const view = jobView(job);
  if (view.status === "COMPLETED" && job.status !== "COMPLETED") {
    job.status = "COMPLETED";
    job.completedAt = view.completedAt;
    save();
  }
  return view;
};

const gallery: Handler = ({ query }) => {
  const user = currentUser();
  const items = db()
    .aiJobs.filter((j) => j.userId === user.id)
    .map(jobView)
    .filter((j) => j.status === "COMPLETED")
    .flatMap((j) => j.outputs.map((o) => ({ ...o, job: { id: j.id, kind: j.kind, modelKey: j.modelKey, prompt: j.prompt } })));
  const page = cursorPage(items, query);
  return { items: page.entries, nextBefore: page.nextBefore };
};

// ---------------------------------------------------------------- admin

const listUsers: Handler = ({ query }) => {
  requireAdmin();
  return paginate(
    [...db().users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicUser),
    query,
  );
};

const getUser: Handler = ({ params }) => {
  requireAdmin();
  const user = db().users.find((u) => u.id === params.id);
  if (!user) throw notFound("Không tìm thấy tài khoản.");
  return publicUser(user);
};

const updateUser: Handler = ({ params, body }) => {
  const admin = requireAdmin();
  const user = db().users.find((u) => u.id === params.id);
  if (!user) throw notFound("Không tìm thấy tài khoản.");
  if (user.id === admin.id && (body.isActive === false || (body.role && body.role !== "ADMIN"))) {
    throw conflict("Không thể tự khoá hoặc tự bỏ quyền quản trị của mình.");
  }
  if (body.role) user.role = body.role as typeof user.role;
  if (typeof body.isActive === "boolean") user.isActive = body.isActive;
  if (typeof body.isDemo === "boolean") {
    user.isDemo = body.isDemo;
    save();
    return { id: user.id, isDemo: user.isDemo };
  }
  user.updatedAt = nowIso();
  save();
  return publicUser(user);
};

const deleteUser: Handler = ({ params }) => {
  const admin = requireAdmin();
  if (params.id === admin.id) throw conflict("Không thể xoá tài khoản đang đăng nhập.");
  db().users = db().users.filter((u) => u.id !== params.id);
  db().projects = db().projects.filter((p) => p.ownerId !== params.id);
  save();
};

const health: Handler = () => {
  requireAdmin();
  return { ...DEMO_HEALTH, uptime: Math.round(performance.now() / 1000) + 86_400, timestamp: nowIso() };
};

const listBank: Handler = ({ query }) => {
  requireAdmin();
  const status = query.get("status");
  return cursorPage(db().bankTransactions.filter((t) => !status || t.status === status), query);
};

const paymentByReference = (reference: string) => {
  const payment = db().payments.find((p) => p.reference === reference.trim().toUpperCase());
  if (!payment) throw notFound("Không có thanh toán với mã này.");
  return payment;
};

const previewBank: Handler = ({ params }) => {
  requireAdmin();
  if (!/^WF[0-9A-Z]{6}$/i.test(params.reference.trim())) throw badRequest("Mã thanh toán có dạng WF + 6 ký tự.");
  const payment = paymentByReference(params.reference);
  return bankPaymentOf(payment, db().users.find((u) => u.id === payment.userId)?.email ?? "");
};

const resolveBank: Handler = ({ params, body }) => {
  const admin = requireAdmin();
  const tx = db().bankTransactions.find((t) => t.id === params.id);
  if (!tx) throw notFound("Không tìm thấy giao dịch.");
  if (tx.status !== "UNMATCHED") throw conflict("Giao dịch này đã được xử lý.");
  const now = nowIso();
  if (body.action === "ignore") {
    tx.status = "IGNORED";
  } else {
    const payment = paymentByReference(String(body.paymentReference ?? ""));
    if (payment.provider === "VNPAY") throw badRequest("Thanh toán VNPay không xác nhận bằng chuyển khoản.");
    if (tx.amountVnd < payment.amountVnd) throw badRequest("Số tiền chuyển ít hơn số tiền cần thanh toán.");
    if (payment.status === "PAID") throw conflict("Thanh toán này đã được xác nhận.");
    settlePayment(payment, "ADMIN");
    tx.status = "RESOLVED";
    tx.payment = bankPaymentOf(payment, db().users.find((u) => u.id === payment.userId)?.email ?? "");
  }
  tx.resolvedBy = admin.email;
  tx.resolvedNote = typeof body.note === "string" ? body.note : null;
  tx.unmatchedReason = tx.status === "RESOLVED" ? null : tx.unmatchedReason;
  void now;
  save();
  return tx;
};

// ---------------------------------------------------------------- analytics

const VN_OFFSET = 7 * 3_600_000;
const vnDay = (ms: number) => new Date(ms + VN_OFFSET).toISOString().slice(0, 10);

const analytics: Handler = ({ query }): AnalyticsSummary => {
  const user = currentUser();
  const scope = query.get("scope") === "global" && user.role === "ADMIN" ? "global" : "me";
  const days = Number(query.get("days")) || 30;
  const end = Date.now();
  const start = end - (days - 1) * 86_400_000;
  const firstDay = vnDay(start);
  const projects = db().projects.filter((p) => (scope === "global" || p.ownerId === user.id) && vnDay(new Date(p.createdAt).getTime()) >= firstDay);
  const byDay = Array.from({ length: days }, (_, i) => {
    const date = vnDay(start + i * 86_400_000);
    return { date, count: projects.filter((p) => vnDay(new Date(p.createdAt).getTime()) === date).length };
  });
  const counted = ANALYTICS_BOX_TYPES.map((type) => ({ type, count: projects.filter((p) => p.template.id === type).length }));
  const other = projects.length - counted.reduce((sum, row) => sum + row.count, 0);
  const events = db().events.filter((e) => (scope === "global" || e.userId === user.id) && vnDay(new Date(e.createdAt).getTime()) >= firstDay);
  const autoFixed = events.filter((e) => e.type === "AUTO_FIX_APPLIED").reduce((sum, e) => sum + (Number(e.payload.fixed) || 0), 0);
  const checked = projects.filter((p) => p.fitcheckScore !== null);
  const paidOrders = db().orders.filter((o) => (scope === "global" || o.userId === user.id) && o.paidAt && vnDay(new Date(o.paidAt).getTime()) >= firstDay);
  return {
    scope,
    days,
    from: firstDay,
    to: vnDay(end),
    boxes: { total: projects.length, byDay },
    boxTypes: other > 0 ? [...counted, { type: "other", count: other }] : counted,
    fitcheck: { prevented: autoFixed, blockedAtExport: 0, autoFixed, passed: checked.filter((p) => p.fitcheckScore === 100).length, checked: checked.length },
    creationTime: { medianSeconds: null, meanSeconds: null, projects: 0 },
    exports: { total: paidOrders.length, byFormat: paidOrders.length ? [{ fileType: "PDF_CMYK", count: paidOrders.length }] : [] },
  };
};

export const platformRoutes: [string, string, Handler][] = [
  ["GET", "/ai/usage", aiUsage],
  ["POST", "/ai/pattern", aiPattern],
  ["GET", "/ai/models", catalog],
  ["POST", "/ai/images", createImages],
  ["GET", "/ai/images", gallery],
  ["GET", "/ai/images/jobs/:jobId", getJob],
  ["POST", "/ai/images/uploads/:tool", runUploadTool],
  ["POST", "/ai/images/:outputId/:tool", runTool],
  ["GET", "/users", listUsers],
  ["GET", "/users/:id", getUser],
  ["PATCH", "/users/:id", updateUser],
  ["DELETE", "/users/:id", deleteUser],
  ["GET", "/health", () => ({ status: "ok", database: "up", redis: "up", worker: "up" })],
  ["GET", "/health/details", health],
  ["GET", "/admin/bank-transactions", listBank],
  ["GET", "/admin/bank-transactions/payment-preview/:reference", previewBank],
  ["POST", "/admin/bank-transactions/:id/resolve", resolveBank],
  ["GET", "/analytics/summary", analytics],
  // Stock photos need the backend and its Pexels key: off in the demo without a backend.
  ["GET", "/library/stock/photos", () => ({ enabled: false, items: [], page: 1, hasMore: false })],
  ["GET", "/library/licenses", () => [
    { id: "CC0", name: "CC0 1.0 (Public Domain)", attribution: false },
    { id: "CC-BY-4.0", name: "CC BY 4.0", attribution: true },
  ]],
  ["GET", "/library/assets/manage", ({ query }) => {
    requireAdmin();
    return paginate([], query);
  }],
];
