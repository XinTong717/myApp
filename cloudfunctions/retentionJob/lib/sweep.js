// ---------------------------------------------------------------------------
// 通用清理原语：分页、加上限、dry-run 感知。
//
// 关键设计：
//   - dry-run 模式只做 count + 取样，绝不写库 → 安全预演。
//   - 真删模式按页删除并随删随进，受 maxDocs 硬上限保护。
//   - 单文档删除/更新失败只告警、不中断整批（最终一致，下次运行补齐）。
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(now, days) {
  return new Date(now - days * DAY_MS)
}

async function safeCount(db, collection, where) {
  try {
    const res = await db.collection(collection).where(where).count()
    return Number(res.total || 0)
  } catch (err) {
    console.warn(`count ${collection} failed:`, err && err.message ? err.message : err)
    return 0
  }
}

async function sampleIds(db, collection, where, n = 10) {
  try {
    const res = await db.collection(collection).where(where).field({ _id: true }).limit(n).get()
    return (res.data || []).map((d) => d._id)
  } catch (err) {
    return []
  }
}

async function removeOne(db, collection, id) {
  try {
    await db.collection(collection).doc(id).remove()
    return true
  } catch (err) {
    console.warn(`remove ${collection}/${id} skipped:`, err && err.message ? err.message : err)
    return false
  }
}

async function updateOne(db, collection, id, data) {
  try {
    await db.collection(collection).doc(id).update({ data })
    return true
  } catch (err) {
    console.warn(`update ${collection}/${id} skipped:`, err && err.message ? err.message : err)
    return false
  }
}

// 删除匹配 where 的文档。dry-run 时只 count + 取样。
async function sweepDelete({ db, collection, where, dryRun, batchSize, maxDocs }) {
  if (dryRun) {
    const total = await safeCount(db, collection, where)
    return {
      collection,
      mode: 'dry-run',
      matched: total,
      wouldDelete: Math.min(total, maxDocs),
      deleted: 0,
      sampleIds: await sampleIds(db, collection, where),
      hasMore: total > maxDocs,
    }
  }

  let deleted = 0
  let scanned = 0
  const taken = []
  for (;;) {
    if (scanned >= maxDocs) break
    const pageSize = Math.min(batchSize, maxDocs - scanned)
    const res = await db.collection(collection).where(where).field({ _id: true }).limit(pageSize).get()
    const docs = res.data || []
    if (docs.length === 0) break
    scanned += docs.length
    const results = await Promise.all(docs.map((d) => removeOne(db, collection, d._id)))
    results.forEach((okFlag, i) => { if (okFlag) { deleted += 1; if (taken.length < 10) taken.push(docs[i]._id) } })
    if (docs.length < pageSize) break
  }
  const remaining = await safeCount(db, collection, where)
  return { collection, mode: 'delete', deleted, sampleIds: taken, hasMore: remaining > 0 }
}

// 把匹配 where 的文档逐个改成匿名/最小化字段。dry-run 时只 count + 取样。
async function sweepAnonymize({ db, collection, where, patch, dryRun, batchSize, maxDocs }) {
  if (dryRun) {
    const total = await safeCount(db, collection, where)
    return {
      collection,
      mode: 'dry-run',
      matched: total,
      wouldUpdate: Math.min(total, maxDocs),
      updated: 0,
      sampleIds: await sampleIds(db, collection, where),
      hasMore: total > maxDocs,
    }
  }

  let updated = 0
  let scanned = 0
  for (;;) {
    if (scanned >= maxDocs) break
    const pageSize = Math.min(batchSize, maxDocs - scanned)
    const res = await db.collection(collection).where(where).field({ _id: true }).limit(pageSize).get()
    const docs = res.data || []
    if (docs.length === 0) break
    scanned += docs.length
    const results = await Promise.all(docs.map((d) => updateOne(db, collection, d._id, patch)))
    results.forEach((okFlag) => { if (okFlag) updated += 1 })
    // patch 通常会让文档不再匹配 where（例如改了 status/openid），自然推进；
    // 若 patch 不改变匹配性，maxDocs 上限兜底防止死循环。
    if (docs.length < pageSize) break
  }
  return { collection, mode: 'anonymize', updated, hasMore: false }
}

module.exports = {
  DAY_MS,
  daysAgo,
  safeCount,
  sampleIds,
  removeOne,
  updateOne,
  sweepDelete,
  sweepAnonymize,
}
