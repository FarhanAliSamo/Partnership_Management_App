# 09 — Offline-First & Sync

> Complete offline-first strategy, sync queue, conflict handling, and photo sync for **F CRM**.
> Implementation lives in `src/services/sync/` and `src/repositories/syncQueueRepository.ts`.

---

## 1. Philosophy

- **SQLite is the source of truth on device.** The app never blocks a user action waiting on the network.
- The backend is a **synchronization target**, not a required read path.
- Every write is **local-first**: persist local record → enqueue sync → attempt push if online.

---

## 2. What Works Offline

- View all existing data (earnings, expenses, investments, loans, settlements, reports).
- Add earning, mark closed, add expense, add investment, add loan, add repayment.
- Attach photos (saved locally).
- View locally-computed reports.

> Reports based on local data are always available; they reflect the latest synced + pending local state.

---

## 3. Sync States

Every syncable record has `sync_state`:

| State | Meaning | UI |
|-------|---------|----|
| `synced` | Matches backend | (none / subtle check) |
| `pending` | Local change not yet pushed | Cloud icon + "Pending" |
| `failed` | Push failed, retryable | Cloud icon + "Retry" |
| `conflict` | Changed locally + remotely | Warning icon + resolution action |

Shown via `SyncIndicator` (cloud icon) on cards and a global "Last synced: X min ago" in sync settings.

---

## 4. Sync Queue

`SyncQueue` table (see [`04-data-model.md`](04-data-model.md) §3.14) stores each pending operation.

### Queue entry
```ts
type SyncQueueEntry = {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>; // full record snapshot
  status: 'pending' | 'in_progress' | 'failed' | 'conflict';
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### Ordering
- Entries process **FIFO** by `createdAt` (earliest first).
- Dependencies (attachments before parent finalize) handled explicitly.

---

## 5. Write Flow (any mutation)

```
1. Service validates + permission-check
2. Repository writes record to SQLite (sync_state = pending, local_version++)
3. SyncQueue enqueue (operation + payload)
4. If online → trigger SyncEngine.run()
5. Return record to UI immediately (optimistic)
```

---

## 6. Sync Engine

`src/services/sync/syncEngine.ts`.

```
run():
  1. Check connectivity (NetInfo)
  2. Pull pending entries from SyncQueue (status = pending|failed)
  3. For each entry (FIFO):
       a. Push to backend (idempotent by entityId + operation)
       b. Success → mark record synced, remove from queue
       c. Failure → status = failed, attempts++, store lastError (user-safe)
       d. Conflict → status = conflict, preserve both versions
  4. Update lastSyncAt
```

### Triggers
- App foreground/resume.
- Network reconnect event.
- Manual "Sync Now".
- "Retry" on failed entries.

---

## 7. Photo Sync

Offline-capable image handling via `FileStore` + `AttachmentRepository`.

```
Add photo (offline):
  1. Pick from Camera/Gallery
  2. Compress to optimised size (e.g. max 1600px, JPEG quality ~0.7)
  3. Copy to persistent app dir via Expo FileSystem
  4. Create Attachment row:
       local_uri, entity_type, entity_id, upload_state = pending
  5. Enqueue sync (attach upload)
```

```
When online:
  1. Upload pending attachments one-by-one to backend
  2. Get remote_uri → update Attachment (upload_state = uploaded)
  3. Then finalize parent record sync (if parent record still pending)
  4. Remove temp/original files, keep compressed local copy
```

- `upload_state`: `pending` | `uploaded` | `failed`.
- Never upload un-optimised originals.

---

## 8. Conflict Handling

Conflict occurs when a record has **both local and remote changes** after last known sync.

### Detection
- Use `local_version` / `remote_version` integers + `updatedAt`.
- On push, if server `remote_version > lastKnownRemoteVersion` → conflict.

### Resolution (safety first)
1. **Preserve both versions.**
2. Mark `sync_state = conflict`.
3. Surface a resolution UI:
   - **Keep local** (push local over server, bump version)
   - **Keep server** (discard local for that record, adopt server)
   - **Manual review** (optional for complex financial records)
4. Financial data **never silently disappears**.

### Minimum bar (required)
- At least keep latest server version and local version until explicitly resolved.
- Conflicts are never auto-overwritten by a blind re-push.

---

## 9. Idempotency & Retry Safety

- Every push carries the record's `id` + `operation`.
- Backend upserts by `id`, so retry of a `create` is idempotent.
- Repayments/money updates are gated by version to prevent double-apply.

---

## 10. Connectivity Detection

- Use `@react-native-community/netinfo` (or Expo equivalent) to detect online/offline.
- Do **not** trust connectivity alone for sync success — push failures still set `failed`.

---

## 11. Sync UI Requirements

- **Global**: "Last synced: 2 min ago" in Settings → Sync.
- **Pending count**: "N items pending sync".
- **Card indicators**: cloud icon + `Pending` / `Retry` / `Conflict`.
- **Actions**: "Sync Now" button, "Retry" on failed.
- Error messaging: user-safe ("Couldn't sync. Check connection and try again."), no raw stacks.

---

## 12. Edge Cases

- Sync while offline → entries stay `pending`, no failure noise.
- Sync fails mid-batch → completed entries stay synced, rest become `failed`.
- App killed during sync → queue persists in SQLite; resumes next launch.
- Duplicate data → idempotent upsert prevents duplicates; UI guards against same-date duplicate entry (see [`03-flows.md`](03-flows.md) §3).