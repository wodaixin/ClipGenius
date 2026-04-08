这是一份完整设计方案，包含所有审查中发现的问题的解决方案。
---
ClipGenius 多设备同步冲突处理设计方案
一、问题陈述
当前系统存在以下已知问题：
问题	严重程度
多 Tab 并发编辑被静默覆盖	高
无版本字段，无法判断"谁更新过"	高
updateDoc 乐观锁失败被静默忽略	高
clearUnpinned 非原子性	中
isAnalyzing + summary 跨设备时序覆盖	中
---
## 二、设计目标
### 2.1 目标
- 实现 **本地优先 + 云端更新** 的冲突处理策略
- 多 Tab 场景下任意 Tab 的编辑都能被其他 Tab 感知
- 所有云端写入失败都能被正确重试或标记为冲突
- `clearUnpinned` 操作具有最终一致性
### 2.2 非目标（暂不做）
- 冲突解决 UI（出现冲突时采用 LWW 策略自动合并，用户无感知）
- Firestore 事务（对剪贴板低并发场景，timestamp 比较够用）
- 离线操作队列（Firestore SDK 本身有一定重试能力）
- 双向实时同步（如 Google Docs 的 OT/CRDT）
---
三、数据模型变更
3.1 PasteItem 字段变更
// src/types.ts
export interface PasteItem {
  id: string;
  type: PasteType;
  content: string;           // base64 for images/videos, raw text for others
  mimeType: string;
  timestamp: Date;          // 创建时间（不变）
  updatedAt: Date;          // ← 新增：最后一次修改时间（每次更新都刷新）
  syncRev: number;          // ← 新增：递增同步版本号（用于冲突检测）
  suggestedName: string;
  summary?: string;
  isAnalyzing: boolean;
  isPinned?: boolean;
  isDeleted?: boolean;      // ← 新增：软删除标记（替代直接删除）
  userId: string;
}
字段说明：
- updatedAt：客户端 new Date()，用于人类可读的时间比较。注意：不同设备时钟有偏差，不作为唯一权威依据。
- syncRev：Firestore 端用 increment(1) 原子递增，是设备无关的版本号。云端推送时带回本地，用于判断"哪边更新"。
- isDeleted：软删除标记。删除时不直接 deleteDoc，而是设置 isDeleted=true + deletedAt=now，确保删除操作可以被追踪和同步。
3.2 同步状态跟踪结构
// src/types.ts
/** 本地同步状态机 */
export type SyncStatus = 'synced' | 'pending' | 'conflict';
/** 追踪本地某项的同步状态 */
export interface SyncState {
  status: SyncStatus;
  localUpdatedAt: Date;       // 本地 updatedAt
  localSyncRev: number;        // 本地 syncRev（云端未知时为 -1）
  pendingCloudRev?: number;     // 等待云端确认到的 syncRev
  retryCount: number;          // 当前重试次数
  lastError?: string;          // 最后一次错误信息
}
/** 全局同步状态 Map，key 为 pasteId */
export interface SyncStore {
  states: Record<string, SyncState>;
}
存储位置：
- SyncStore 存于 localStorage，key = "ClipGenius:sync"。
- App 启动时从 localStorage 恢复，同步状态不丢失。
- setItems 等 UI 状态不变，仍存在 React state 中。
---
四、同步状态机
                    ┌──────────────────────────────────────────┐
                    │                                          │
                    ▼                                          │
  ┌──────────┐  write   ┌──────────┐  sync success  ┌──────────┐
  │ 空闲     │ ──────▶ │ Pending  │ ─────────────▶ │ 已同步   │
  │ (synced) │          │ (pending)│                │ (synced) │
  └──────────┘          └──────────┘                └──────────┘
                            │    ▲                       ▲
                            │    │                       │
                     retry  │    │  max retry            │
                     fail   │    │  exceeded              │
                            ▼    │                       │
                       ┌──────────┐ │                     │
                       │ 冲突    │─┘                     │
                       │(conflict)│ ◀─────────────────────┘
                       └──────────┘    (云端更新，syncRev 更大)
- Pending → Synced：云端写入成功，onSnapshot 确认云端 syncRev >= pendingCloudRev
- Pending → Conflict：超过最大重试次数，或收到云端 syncRev > pendingCloudRev 的变更
- Conflict → Synced：收到云端更新，且云端 syncRev 更新
---
五、架构总览
┌─────────────────────────────────────────────────────────────────────┐
│                         React App (AppContext)                        │
│                                                                      │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────────┐  │
│  │ usePaste    │   │ useFirestore │   │ useTabSync              │  │
│  │ Store       │   │ Sync         │   │ (BroadcastChannel +      │  │
│  │             │   │              │   │  localStorage listener)  │  │
│  │ - addItem   │   │ onSnapshot   │   │                         │  │
│  │ - updateItem│   │ 收到云端变化  │   │ - 监听其他 Tab 广播      │  │
│  │ - deleteItem │   │ - 检测冲突   │   │ - 拒绝在途的旧覆盖      │  │
│  │ - clearUnpinned│ │ - LWW 合并   │   │                         │  │
│  └──────┬──────┘   └──────┬───────┘   └────────────┬────────────┘  │
│         │                  │                        │                │
│         ▼                  ▼                        │                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    SyncEngine (src/lib/syncEngine.ts)        │   │
│  │                                                               │   │
│  │  - writeWithSync(item): 写入本地 + 写云端 + 状态追踪          │   │
│  │  - handleCloudChange(cloudItem): 冲突检测 + LWW 决策          │   │
│  │  - retryPending(): 重试 pending 项                           │   │
│  │  - syncStore: localStorage 持久化的 SyncStore               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Firestore         │
                    │ /users/{uid}/     │
                    │   pastes/{id}     │
                    └──────────────────┘
                              ▲
                              │
                    ┌──────────────────┐
                    │ IndexedDB        │
                    │ (pastes store)   │
                    └──────────────────┘
---
六、核心组件详细设计
6.1 SyncEngine (src/lib/syncEngine.ts)
SyncEngine 是所有同步逻辑的中央调度者。
6.1.1 初始化
// src/lib/syncEngine.ts
const SYNC_STORE_KEY = "ClipGenius:sync";
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 3000]; // ms，指数退避
export class SyncEngine {
  private syncStore: SyncStore;
  constructor() {
    this.syncStore = this.loadStore();
    // 启动时清理所有 pending 项（可能已过期）
    this.cleanupStalePending();
  }
  private loadStore(): SyncStore {
    try {
      const raw = localStorage.getItem(SYNC_STORE_KEY);
      return raw ? JSON.parse(raw) : { states: {} };
    } catch {
      return { states: {} };
    }
  }
  private saveStore(): void {
    localStorage.setItem(SYNC_STORE_KEY, JSON.stringify(this.syncStore));
  }
}
6.1.2 写入流程
// src/lib/syncEngine.ts
/**
 * 写入一个 PasteItem：本地立即更新 + 异步写云端 + 状态追踪
 */
export async function writeWithSync(
  item: PasteItem,
  uid: string,
  options: { isDeletion?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  const syncRev = (item.syncRev ?? 0) + 1;
  const updatedItem: PasteItem = {
    ...item,
    updatedAt: now,
    syncRev,
    isDeleted: options.isDeletion ?? item.isDeleted ?? false,
  };
  // 1. 先写本地 IndexedDB
  await savePaste(updatedItem);
  // 2. 发给 AppContext 更新 React state（同步，不等待）
  //    注意：AppContext.setItems 由 usePasteStore 调用者直接触发
  // 3. 如果已登录，发起云端写入并追踪
  if (uid) {
    const stateKey = updatedItem.id;
    // 设置为 pending
    setSyncState(stateKey, {
      status: "pending",
      localUpdatedAt: now,
      localSyncRev: syncRev,
      pendingCloudRev: syncRev,
      retryCount: 0,
    });
    // 异步写云端，不阻塞 UI
    writeToCloud(updatedItem, uid).catch((err) => {
      console.error(`[SyncEngine] writeToCloud failed for ${stateKey}:`, err);
    });
  }
  return { success: true };
}
/**
 * 将 PasteItem 写入 Firestore，支持重试
 */
async function writeToCloud(
  item: PasteItem,
  uid: string,
  retryCount = 0
): Promise<void> {
  const stateKey = item.id;
  const state = getSyncState(stateKey);
  try {
    if (item.isDeleted) {
      // 软删除：用 updateDoc 设置 isDeleted 和 deletedAt
      await updateDoc(doc(db, `users/${uid}/pastes`, item.id), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        syncRev: increment(1),
      });
    } else {
      await setDoc(
        doc(db, `users/${uid}/pastes`, item.id),
        {
          ...item,
          timestamp: item.timestamp, // 保持创建时间不变
          updatedAt: serverTimestamp(),
          syncRev: increment(1),
        },
        { merge: true } // ← 关键：merge 而不是覆盖
      );
    }
    // 成功：更新状态为 synced
    setSyncState(stateKey, {
      status: "synced",
      localUpdatedAt: item.updatedAt,
      localSyncRev: item.syncRev,
      pendingCloudRev: undefined,
      retryCount: 0,
    });
  } catch (error: unknown) {
    const isRetryable =
      error instanceof Error &&
      (error.message.includes("RESOURCE_EXHAUSTED") ||
        error.message.includes("ABORTED") ||
        error.message.includes("network"));
    if (isRetryable && retryCount < MAX_RETRIES) {
      // 指数退避重试
      const delay = RETRY_DELAYS[retryCount] ?? 3000;
      await sleep(delay);
      return writeToCloud(item, uid, retryCount + 1);
    }
    // 不可重试或超过重试次数 → 标记为冲突
    setSyncState(stateKey, {
      status: "conflict",
      localUpdatedAt: item.updatedAt,
      localSyncRev: item.syncRev,
      pendingCloudRev: undefined,
      retryCount: retryCount + 1,
      lastError: error instanceof Error ? error.message : String(error),
    });
  }
}
关键设计点：
- merge: true：setDoc 用 merge 模式，不是覆盖。云端文档可能已有 isPinned、summary 等字段，来自其他设备，merge 模式下不会丢失。
- 错误分类重试：只有网络错误和乐观锁冲突 (ABORTED/RESOURCE_EXHAUSTED) 才重试。权限错误等不重试。
- 本地立即更新：IndexedDB 写入在云端写入之前完成，UI 不等待网络。
6.1.3 冲突检测
// src/lib/syncEngine.ts
/**
 * 处理从 onSnapshot 收到的云端变更
 * 返回是否接受了云端覆盖（影响是否需要更新 React state）
 */
export async function handleCloudChange(
  cloudItem: PasteItem,
  uid: string
): Promise<{
  accepted: boolean;          // 是否接受云端覆盖
  mergeResult?: PasteItem;    // 如果需要 merge，返回 merge 后的结果
}> {
  const stateKey = cloudItem.id;
  const localState = getSyncState(stateKey);
  // === 情况 1：本地有未完成的写入（pending） ===
  if (localState?.status === "pending") {
    const pendingCloudRev = localState.pendingCloudRev ?? 0;
    // 云端 syncRev 还未包含我们的 pending 写入 → 保留本地，拒绝云端覆盖
    if ((cloudItem.syncRev ?? 0) < pendingCloudRev) {
      return { accepted: false };
    }
    // 云端 syncRev 已包含我们的 pending 写入 → 我们的写入成功了，接受云端更新
    // （可能云端有更后来的修改）
    if ((cloudItem.syncRev ?? 0) === pendingCloudRev) {
      // 严格等于说明云端还没有更新，pending 被接受 → 转为 synced
      setSyncState(stateKey, { status: "synced", pendingCloudRev: undefined });
      return { accepted: true };
    }
    // cloudItem.syncRev > pendingCloudRev：
    // 云端有更晚的修改（来自第三方），本地 pending 写入被覆盖了
    // → 标记冲突，但仍然接受云端（因为我们的写入已经丢失了）
    setSyncState(stateKey, {
      status: "conflict",
      pendingCloudRev: undefined,
      lastError: "Local pending write was overwritten by cloud",
    });
    return { accepted: true };
  }
  // === 情况 2：本地无 pending ===
  if (!localState || localState.status === "synced") {
    // 直接用 syncRev 比较
    const localRev = localState?.localSyncRev ?? -1;
    const cloudRev = cloudItem.syncRev ?? -1;
    if (cloudRev > localRev) {
      // 云端更新 → 接受
      setSyncState(stateKey, {
        status: "synced",
        localUpdatedAt: cloudItem.updatedAt,
        localSyncRev: cloudRev,
      });
      return { accepted: true };
    }
    if (cloudRev <= localRev) {
      // 本地更新更新或相等 → 拒绝云端覆盖
      return { accepted: false };
    }
  }
  // === 情况 3：本地已经是 conflict 状态 ===
  if (localState?.status === "conflict") {
    // 收到云端变更说明冲突已解除（或者云端有更新）
    // 比较 syncRev，如果云端更新则接受
    const localRev = localState.localSyncRev ?? -1;
    const cloudRev = cloudItem.syncRev ?? -1;
    if (cloudRev > localRev) {
      setSyncState(stateKey, {
        status: "synced",
        localUpdatedAt: cloudItem.updatedAt,
        localSyncRev: cloudRev,
      });
      return { accepted: true };
    }
    return { accepted: false };
  }
  // 兜底：未知状态，接受云端（保守策略）
  return { accepted: true };
}
6.1.4 Tab 间同步
// src/lib/tabSync.ts
const TAB_CHANNEL = "ClipGenius:tab-sync";
type TabMessage =
  | { type: "item-updated"; item: PasteItem; fromTabId: string }
  | { type: "item-deleted"; id: string; fromTabId: string }
  | { type: "request-state"; requestTabId: string }
  | { type: "state-response"; items: PasteItem[]; toTabId: string };
let currentTabId = crypto.randomUUID();
let channel: BroadcastChannel | null = null;
/**
 * 初始化 Tab 间广播，返回清理函数
 */
export function initTabSync(
  onItemUpdated: (item: PasteItem) => void,
  onItemDeleted: (id: string) => void,
  getAllItems: () => PasteItem[]
): () => void {
  // 优先用 BroadcastChannel
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(TAB_CHANNEL);
    channel.onmessage = (event: MessageEvent<TabMessage>) => {
      const msg = event.data;
      if (msg.type === "item-updated" && msg.fromTabId !== currentTabId) {
        // 收到其他 Tab 的更新广播
        // 我们已经有最新数据（可能来自 onSnapshot），不做任何事
        // 关键是：这个广播能帮 onSnapshot 还没收到的设备感知变化
        onItemUpdated(msg.item);
      }
      if (msg.type === "item-deleted" && msg.fromTabId !== currentTabId) {
        onItemDeleted(msg.id);
      }
      if (msg.type === "request-state" && msg.requestTabId === currentTabId) {
        // 其他 Tab 请求我们当前状态（少见，作为保底）
      }
    };
  }
  // 同时监听 localStorage 变化（跨 Tab 更可靠，发送方也能收到自己）
  const onStorage = (event: StorageEvent) => {
    if (event.key !== TAB_CHANNEL || !event.newValue) return;
    try {
      const msg: TabMessage = JSON.parse(event.newValue);
      if (msg.type === "item-updated" && msg.fromTabId !== currentTabId) {
        onItemUpdated(msg.item);
      }
      if (msg.type === "item-deleted" && msg.fromTabId !== currentTabId) {
        onItemDeleted(msg.id);
      }
    } catch {
      // ignore parse errors
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}
/**
 * 广播本地变更给其他 Tab
 */
export function broadcastItemUpdated(item: PasteItem): void {
  const msg: TabMessage = {
    type: "item-updated",
    item,
    fromTabId: currentTabId,
  };
  // BroadcastChannel
  channel?.postMessage(msg);
  // localStorage（兜底 + 发送方自己也能收到）
  try {
    localStorage.setItem(TAB_CHANNEL, JSON.stringify(msg));
    // 立即清除，让其他 Tab 的 storage 事件能感知变化
    localStorage.removeItem(TAB_CHANNEL);
  } catch {
    // ignore
  }
}
关键设计点：
- BroadcastChannel + localStorage 双通道：BroadcastChannel 覆盖大多数浏览器（Safari >= 16.4），storage 事件作为兜底（所有浏览器支持，且发送方能收到自己）。
- 发送后立即 removeItem：确保 storage 事件每次都能触发（storage 事件只在值实际变化时触发）。
---
6.2 useFirestoreSync.ts 改造
// src/hooks/useFirestoreSync.ts
import { useEffect, useRef } from "react";
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  getDoc,
} from "../firebase";
import { savePaste, deletePaste } from "../lib/db";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { PasteItem } from "../types";
import { syncEngine } from "../lib/syncEngine"; // 全局单例
import { handleCloudChange } from "../lib/syncEngine";
export function useFirestoreSync() {
  const { user } = useAuth();
  const { setItems, items } = useAppContext();
  const pendingCallbackRef = useRef<((item: PasteItem) => void) | null>(null);
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/pastes`),
      orderBy("syncRev", "desc"), // ← 按 syncRev 排序，保证最新在前
      // Firestore 不支持 orderBy 非现有字段，需要建组合索引
      // 或用 orderBy("updatedAt", "desc") 配合
      orderBy("updatedAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          const docData = change.doc.data();
          const cloudItem: PasteItem = {
            ...docData,
            timestamp: toDate(docData.timestamp),
            updatedAt: toDate(docData.updatedAt),
          } as PasteItem;
          // 软删除处理：如果云端标记了 deletedAt，但本地没有
          if (docData.isDeleted && docData.deletedAt) {
            const cloudDeletedAt = toDate(docData.deletedAt);
            // 从 React state 中移除（乐观更新）
            setItems((prev: PasteItem[]) =>
              prev.filter((i) => i.id !== cloudItem.id)
            );
            // 从 IndexedDB 移除
            await deletePaste(cloudItem.id);
            continue;
          }
          if (change.type === "added" || change.type === "modified") {
            const { accepted } = await handleCloudChange(cloudItem, user.uid);
            if (accepted) {
              // 写入 IndexedDB
              await savePaste(cloudItem);
              // 更新 React state — cloud wins
              setItems((prev: PasteItem[]) => {
                const idx = prev.findIndex((i) => i.id === cloudItem.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = cloudItem;
                  return next;
                }
                return [cloudItem, ...prev];
              });
            }
            // 如果 accepted=false，说明本地更新，拒绝云端覆盖，不做处理
          } else if (change.type === "removed") {
            // Firestore 文档被彻底删除（不应该发生，因为我们用软删除）
            setItems((prev: PasteItem[]) =>
              prev.filter((i) => i.id !== change.doc.id)
            );
            await deletePaste(change.doc.id);
          }
        }
      },
      (error) => {
        console.error("Firestore sync error:", error);
      }
    );
    return () => unsubscribe();
  }, [user, setItems]);
}
// 工具函数
function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return (val as Timestamp).toDate();
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  return new Date();
}
---
6.3 usePasteStore.ts 改造
// src/hooks/usePasteStore.ts
// 改动集中在 addItem / updateItem / deleteItem / clearUnpinned
const addItem = useCallback(
  async (item: PasteItem) => {
    // 设置初始 syncRev
    const newItem: PasteItem = { ...item, syncRev: 0, updatedAt: new Date() };
    await savePaste(newItem);
    setItems((prev: PasteItem[]) => [newItem, ...prev]);
    if (user) {
      writeWithSync(newItem, user.uid);
    }
  },
  [user, setItems]
);
const updateItem = useCallback(
  async (updated: PasteItem) => {
    const updatedWithSync: PasteItem = {
      ...updated,
      updatedAt: new Date(),
      syncRev: (updated.syncRev ?? 0) + 1,
    };
    await updateLocalPaste(updatedWithSync);
    setItemsState((prev: PasteItem[]) =>
      prev.map((i) => (i.id === updated.id ? updatedWithSync : i))
    );
    if (user?.uid) {
      writeWithSync(updatedWithSync, user.uid);
    }
  },
  [user, setItemsState]
);
const deleteItem = useCallback(
  async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    // 软删除：设置 isDeleted，保留在 IndexedDB 直到云端确认
    const deletedItem: PasteItem = {
      ...item,
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
      syncRev: (item.syncRev ?? 0) + 1,
    };
    await savePaste(deletedItem); // 保存软删除状态到 IndexedDB
    setItems((prev: PasteItem[]) => prev.filter((i) => i.id !== id)); // 从 UI 移除
    if (user?.uid) {
      writeWithSync(deletedItem, user.uid, { isDeletion: true });
    }
  },
  [user, items, setItems]
);
const clearUnpinned = useCallback(
  async () => {
    const unpinned = items.filter((i) => !i.isPinned && !i.isDeleted);
    if (unpinned.length === 0) return;
    // 一次性给所有待删除项设置 isDeleted
    const deletedItems: PasteItem[] = unpinned.map((item) => ({
      ...item,
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
      syncRev: (item.syncRev ?? 0) + 1,
    }));
    // 乐观更新：立即从 UI 移除
    setItems((prev: PasteItem[]) =>
      prev.filter((i) => !deletedItems.some((d) => d.id === i.id))
    );
    // 保存软删除状态到 IndexedDB
    for (const item of deletedItems) {
      await savePaste(item);
    }
    // 异步发到云端
    if (user?.uid) {
      for (const item of deletedItems) {
        writeWithSync(item, user.uid, { isDeletion: true });
      }
    }
  },
  [user, items, setItems]
);
关键变化：
- *clearUnpinned 不再分"先云后本"*，因为现在用软删除 + onSnapshot 监听云端 isDeleted 来清理本地数据，具有最终一致性。
- deleteItem 立即乐观更新 UI，不等待云端确认。
---
6.4 AppContext.tsx 改造
AppContext 几乎不需要变化，因为同步逻辑已经剥离到 SyncEngine 和 usePasteStore。
唯一需要改动的是 updateItem 的重载签名：
// src/context/AppContext.tsx
interface AppContextValue {
  // ... existing fields
  updateItem: (updated: PasteItem, userId?: string) => Promise<void>;
  // syncEngine 不需要直接暴露到 AppContext
}
updateItem 内部调用 writeWithSync，无需在 AppContext 层面等待云端写入完成。
---
6.5 dualSync.ts 的角色变化
dualSync.ts 的所有函数不再直接被 usePasteStore 调用，而是由 SyncEngine 内部使用。
// src/services/sync/dualSync.ts
// 这些函数保持不变，但导出给 SyncEngine 使用
export { syncPasteToCloud, syncPasteUpdateToCloud, syncPasteDeleteFromCloud };
---
七、时序图：关键场景
场景 A：单设备编辑 + 同步完成
[Tab A]                              [Firestore]
  │                                      │
  │ setItems + savePaste                 │
  │─────────────────────────────────────▶│
  │ writeToCloud (pending)                │
  │─────────────────────────────────────▶│ setDoc merge
  │                         onSnapshot    │
  │◀─────────────────────────────────────│ syncRev = 1
  │ (handleCloudChange: cloudRev=1 >= pending=1, accepted)
  │ setSyncState → synced                │
  │                                      │
场景 B：多 Tab 并发编辑（Tab A 先完成）
[Tab A]              [Tab B]           [Firestore]
  │                    │                    │
  │ updateItem         │                    │
  │ writeWithSync      │                    │
  │───────────────────────▶│                │
  │                (pending, await Firestore)│
  │                    │                    │
  │              onSnapshot (Tab B 收到 cloud A 的值，cloudRev > localRev)
  │                    │◀──────────────────│
  │                    │ handleCloudChange: accepted=true
  │                    │ setItems cloud wins → name=cloud_value ✓
  │                    │                    │
  │◀────────────────────────────────────────│ onSnapshot (Tab A 的写入确认)
  │ handleCloudChange: synced               │
  │ (Tab A 无变化，因为它自己的写入被接受了)   │
场景 C：乐观锁冲突（两设备同时修改）
[设备 A]              [设备 B]           [Firestore]
  │                    │                    │
  │ updateItem          │ updateItem          │
  │ writeWithSync       │ writeWithSync       │
  │ syncRev=1 pending   │ syncRev=1 pending   │
  │─────────────────────▶│                    │
  │              (A 的 writeToCloud 到达)      │
  │              onSnapshot ◀─────────────────│ syncRev=1
  │  handleCloudChange: cloudRev=1, pending=1
  │  cloudRev == pending → synced            │
  │                    │              (B 的 writeToCloud 到达，覆盖 A)
  │                    │              updateDoc → ABORTED ❌
  │                    │ ◀───────────────────│ ABORTED error
  │                    │ writeToCloud retry  │
  │                    │ (未到 Firestore)    │
  │                    │                    │
  │◀────────────────────────────────────────│ onSnapshot (B 的ABORTED已发生，cloud 已是 B 的值)
  │ handleCloudChange: cloudRev=1, localRev=1
  │ cloudRev == localRev → accepted=true   │
  │                    │ (但 B 已经因为 ABORTED 在 retry)
  │                    │                    │
  │                    │ retry writeToCloud │
  │                    │────────────────────▶│ updateDoc syncRev=2
  │                    │              onSnapshot ◀│ syncRev=2
  │                    │  handleCloudChange: cloudRev > localRev
  │                    │  → accepted=true   │
注意：这个场景中，updateDoc 失败后重试，云端最终合并到 syncRev=2。设备 A 的 onSnapshot 会收到 syncRev=2 的更新，因为 A 的 pendingCloudRev 是 1，所以 A 会接受这个覆盖。这是 LWW 的预期行为。
场景 D：Tab A 编辑，Tab B 先收到云端
[Tab A]              [Tab B]           [Firestore]
  │                    │                    │
  │ startEditing(name=X)│                    │
  │ (localState: syncRev=1, localUpdatedAt=T0)│
  │                    │                    │
  │              Tab B paste event          │
  │              onSnapshot ◀─────────────────│ cloud syncRev=2 (from other device)
  │              handleCloudChange:           │
  │                cloudRev(2) > localRev(1)│
  │                → accepted=true            │
  │              setItems cloud wins → X  ← 旧值被覆盖！❌
  │                    │                    │
  │ Tab A edit (name=Y)│                    │
  │ writeWithSync      │                    │
  │────────────────────────────────────────▶│ setDoc syncRev=3
  │────────────────────────────────────────▶│ onSnapshot ◀── Tab B 收到
  │                    │ handleCloudChange:   │
  │                    │ cloudRev=3 > localRev=1
  │                    │ → accepted=true     │
  │                    │ setItems name=Y ✓   │
  │ handleCloudChange: cloudRev=3 > localRev=1
  │ → accepted=true (Tab A 也被覆盖了) ❌   │
这是方案的核心问题：Tab A 正在编辑时，Tab B 收到云端变化并更新了 state，Tab A 的编辑会被 Tab A 自己的 handleCloudChange 再次覆盖。
解决方案：编辑中状态保护
在 handleCloudChange 中检查本地是否有"正在编辑"的项：
// src/lib/syncEngine.ts
// 维护一个编辑中项的 Set（存 in-memory，Tab 关闭即丢失）
const editingIds = new Set<string>();
export function markItemEditing(id: string): void {
  editingIds.add(id);
}
export function unmarkItemEditing(id: string): void {
  editingIds.delete(id);
}
// 在 handleCloudChange 中：
if (editingIds.has(stateKey)) {
  // 本地正在编辑，拒绝云端覆盖
  return { accepted: false };
}
在 usePasteStore 中：
const startEditing = useCallback((item: PasteItem) => {
  setEditingItemId(item.id);
  setEditName(item.suggestedName);
  setEditSummary(item.summary || "");
  markItemEditing(item.id); // ← 新增
}, []);
const saveEdit = useCallback(async (id: string) => {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const updated = { ...item, suggestedName: editName, summary: editSummary };
  await updateItem(updated);
  unmarkItemEditing(id); // ← 新增
  setEditingItemId(null);
}, [items, editName, editSummary, updateItem]);
限制：如果用户打开两个 Tab 同时编辑同一个 item，第二个 Tab 会收到"正在编辑"保护而拒绝云端覆盖。这相当于乐观锁的第一层保护。
---
八、Firestore 索引配置
需要为 Firestore 创建以下组合索引：
Collection: pastes
Fields: syncRev (Ascending), updatedAt (Descending)
Fields: userId (Ascending), syncRev (Descending) — 如果按用户过滤
在 firestore.rules 同级添加 firestore.indexes.json：
{
  "indexes": [
    {
      "collectionGroup": "pastes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "syncRev", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
---
九、错误处理策略
错误类型	处理方式
网络错误	指数退避重试（1s, 3s），最多 2 次
乐观锁冲突 (ABORTED/RESOURCE_EXHAUSTED)	立即重试 1 次，若还失败标记 conflict
权限错误 (PERMISSION_DENIED)	标记 conflict，不重试，提示用户重新登录
配额超限 (RESOURCE_EXHAUSTED with quota)	不重试，标记 conflict，提示用户
文档不存在 (NOT_FOUND) on updateDoc	认为是新建，走 setDoc merge: true
---
十、测试策略
10.1 单元测试（Vitest）
// src/lib/syncEngine.test.ts
describe("SyncEngine.handleCloudChange", () => {
  it("accepts cloud when local is synced and cloud syncRev is higher", async () => {
    syncEngine.setSyncState("item-1", {
      status: "synced",
      localSyncRev: 1,
      localUpdatedAt: new Date("2025-01-01"),
      retryCount: 0,
    });
    const cloudItem = makePasteItem({ id: "item-1", syncRev: 2 });
    const result = await syncEngine.handleCloudChange(cloudItem, "uid");
    expect(result.accepted).toBe(true);
  });
  it("rejects cloud when local is synced and local syncRev is higher", async () => {
    syncEngine.setSyncState("item-1", {
      status: "synced",
      localSyncRev: 5,
      localUpdatedAt: new Date("2025-01-01"),
      retryCount: 0,
    });
    const cloudItem = makePasteItem({ id: "item-1", syncRev: 3 });
    const result = await syncEngine.handleCloudChange(cloudItem, "uid");
    expect(result.accepted).toBe(false);
  });
  it("rejects cloud when local has pending write that cloud hasn't acknowledged", async () => {
    syncEngine.setSyncState("item-1", {
      status: "pending",
      localSyncRev: 3,
      localUpdatedAt: new Date("2025-01-02"),
      pendingCloudRev: 3,
      retryCount: 0,
    });
    // 云端 syncRev=3，还没包含我们的写入（我们的写入还在 pending）
    const cloudItem = makePasteItem({ id: "item-1", syncRev: 2 });
    const result = await syncEngine.handleCloudChange(cloudItem, "uid");
    expect(result.accepted).toBe(false);
  });
});
10.2 集成测试（多 Tab 模拟）
使用 BroadcastChannel mock + localStorage 覆写，在单 Tab 测试环境中模拟多 Tab 交互。
---
十一、迁移计划
11.1 向后兼容性
新字段在 Firestore 和 IndexedDB 中都是新增（非必需），现有文档没有 syncRev 和 updatedAt：
// 读取时提供默认值
const cloudItem: PasteItem = {
  ...docData,
  syncRev: docData.syncRev ?? 0,      // ← 默认 0，视为旧数据
  updatedAt: toDate(docData.updatedAt ?? docData.timestamp), // fallback 到 timestamp
};
现有用户的数据会走 syncRev=0 的路径，不会有冲突检测效果，但不会报错。
11.2 阶段性发布
阶段	内容
Phase 1	加字段 + 基础 SyncEngine
Phase 2	冲突检测 + pendingSync
Phase 3	重试 + clearUnpinned 软删除
Phase 4	Tab 同步
---
十二、总结
这个方案的核心设计决策：
1. syncRev 作为权威版本号：updatedAt 作为辅助，syncRev 递增比较是设备无关的冲突判断依据。
2. 软删除替代硬删除：isDeleted + deletedAt 标记使得删除操作可追踪、可同步、具有最终一致性。
3. setDoc merge: true：云端写入不会覆盖其他设备的独立修改。
4. 本地优先 + 云端异步 + 状态追踪：UI 始终反映本地最新状态，云端写入在后台进行，localStorage 持久化 SyncStore 追踪每项的状态。
5. 错误分类 + 指数退避重试：只有网络错误和乐观锁冲突才重试，避免无效重试。
6. BroadcastChannel + localStorage 双通道 Tab 同步：覆盖大多数浏览器和 Edge Case。