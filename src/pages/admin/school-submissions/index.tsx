import { useMemo, useState } from 'react'
import { View, Text, Textarea, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { checkAdminAccess } from '../../../services/profile'
import { listSchoolSubmissions, reviewSchoolSubmission } from '../../../services/admin'
import type { SchoolSubmissionItem } from '../../../types/domain'
import AdminActionButton from '../../../components/admin/AdminActionButton'
import AppCard from '../../../components/common/AppCard'
import AppChip from '../../../components/common/AppChip'
import FormInputBox from '../../../components/common/FormInputBox'
import { palette } from '../../../theme/palette'
import { radius, space } from '../../../theme/spacing'
import { typography } from '../../../theme/typography'

const STATUS_OPTIONS = ['pending', 'processed', 'duplicate', 'rejected'] as const

type StatusValue = typeof STATUS_OPTIONS[number]
type ReviewAction = 'mark_processed' | 'reject' | 'duplicate' | 'reset_pending'

function Pill(props: { label: string; active: boolean; onClick: () => void }) {
  return <AppChip text={props.label} tone='brand' size='md' selected={props.active} interactive onClick={props.onClick} />
}

function formatDateText(value?: string | null) {
  if (!value) return '未填写'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { hour12: false })
}

function normalizeText(value?: string) {
  return String(value || '').trim()
}

function getSchoolTypeText(item: SchoolSubmissionItem) {
  return item.schoolType || (item.schoolTypes || []).join('、') || ''
}

function getAgeRangeText(item: SchoolSubmissionItem) {
  return item.ageRange || (item.ageRanges || []).join('、') || ''
}

function formatSubmissionForClipboard(item: SchoolSubmissionItem, adminNote: string) {
  const officialUrl = normalizeText(item.officialUrl || item.publicAccountNote)
  const admissionReq = normalizeText(item.admissionReq || item.participationNote)
  return [
    '【建议发布到 schools】',
    `name / canonical_name：${item.name || ''}`,
    `school_type：${getSchoolTypeText(item)}`,
    `age_range：${getAgeRangeText(item)}`,
    `official_url：${officialUrl}`,
    `xuji_note：${item.xujiNote || ''}`,
    `residency_req：${item.residencyReq || ''}`,
    `admission_req：${admissionReq}`,
    `fee：${item.feeNote || ''}`,
    `output_direction：${item.outputDirection || ''}`,
    '',
    '【建议发布到 school_locations】',
    `province：${item.province || ''}`,
    `city：${item.city || ''}`,
    'address_note：',
    'contact_note：',
    'status：published',
    'source：school_submission',
    '',
    '【仅供审核参考，不直接公开】',
    `信息来源：${item.sourceNote || ''}`,
    `推荐理由：${item.recommendationNote || ''}`,
    `提交人：${item.submitterDisplayName || '未知'}${item.submitterCity ? ` · ${item.submitterCity}` : ''}`,
    `内容安全：${item.contentSecurityStatus || 'unknown'}`,
    `审核备注：${adminNote || item.adminNote || ''}`,
    `submissionId：${item._id}`,
  ].join('\n')
}

export default function AdminSchoolSubmissionsPage() {
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminName, setAdminName] = useState('admin')
  const [statusFilter, setStatusFilter] = useState<StatusValue>('pending')
  const [submissions, setSubmissions] = useState<SchoolSubmissionItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [noteFocused, setNoteFocused] = useState(false)

  const selectedSubmission = useMemo(
    () => submissions.find((item) => item._id === selectedId) || null,
    [submissions, selectedId]
  )

  const loadSubmissions = async (status = statusFilter) => {
    try {
      setLoading(true)
      setError('')
      const result = await listSchoolSubmissions(status, 50)
      if (result?.ok) {
        const nextList = result.submissions || []
        setSubmissions(nextList)
        if (!nextList.find((item) => item._id === selectedId)) {
          const first = nextList[0]
          setSelectedId(first?._id || '')
          setAdminNote(first?.adminNote || '')
        }
      } else {
        setError(result?.message || '读取学习社区推荐失败')
      }
    } catch (err) {
      console.error('listSchoolSubmissions error:', err)
      setError('读取学习社区推荐失败')
    } finally {
      setLoading(false)
    }
  }

  const checkAdminAndInit = async () => {
    try {
      setChecking(true)
      setError('')
      const result = await checkAdminAccess()
      if (result?.ok && result?.isAdmin) {
        setIsAdmin(true)
        setAdminName(result.admin?.name || 'admin')
        await loadSubmissions(statusFilter)
      } else {
        setIsAdmin(false)
        setError(result?.message || '你当前不是管理员，无法访问此页面')
      }
    } catch (err) {
      console.error('checkAdminAccess error:', err)
      setIsAdmin(false)
      setError('管理员权限检查失败，请确认 admin_users 集合已创建')
    } finally {
      setChecking(false)
    }
  }

  const openItem = (item: SchoolSubmissionItem) => {
    setSelectedId(item._id)
    setAdminNote(item.adminNote || '')
  }

  const handleCopy = () => {
    if (!selectedSubmission) return
    Taro.setClipboardData({ data: formatSubmissionForClipboard(selectedSubmission, adminNote) })
  }

  const handleReview = async (reviewAction: ReviewAction) => {
    if (!selectedSubmission || reviewLoading) return

    const confirmTextMap: Record<ReviewAction, string> = {
      mark_processed: '确认已人工处理？',
      reject: '确认拒绝该推荐？',
      duplicate: '确认标记为重复？',
      reset_pending: '确认重置为待审核？',
    }

    const confirm = await Taro.showModal({
      title: '更新审核状态',
      content: confirmTextMap[reviewAction],
      confirmText: '确认',
      cancelText: '取消',
    })
    if (!confirm.confirm) return

    try {
      setReviewLoading(true)
      const result = await reviewSchoolSubmission({
        submissionId: selectedSubmission._id,
        reviewAction,
        adminNote: adminNote.trim(),
      })
      if (result?.ok) {
        Taro.showToast({ title: result.message || '已更新', icon: 'success' })
        await loadSubmissions(statusFilter)
      } else {
        Taro.showToast({ title: result?.message || '操作失败', icon: 'none' })
      }
    } catch (err) {
      console.error('reviewSchoolSubmission error:', err)
      Taro.showToast({ title: '操作失败，请稍后重试', icon: 'none' })
    } finally {
      setReviewLoading(false)
    }
  }

  useDidShow(() => {
    checkAdminAndInit()
  })

  if (checking) {
    return (
      <ScrollView scrollY style={{ minHeight: '100vh', backgroundColor: palette.bg }}>
        <View style={{ padding: space(8), textAlign: 'center' }}>
          <Text style={{ ...typography.body, color: palette.subtext }}>检查管理员权限中...</Text>
        </View>
      </ScrollView>
    )
  }

  if (!isAdmin) {
    return (
      <ScrollView scrollY style={{ minHeight: '100vh', backgroundColor: palette.bg }}>
        <View style={{ padding: space(4) }}>
          <AppCard border>
            <Text style={{ ...typography.title, color: palette.text }}>学习社区推荐审核</Text>
            <View style={{ marginTop: space(2) }}>
              <Text style={{ ...typography.meta, color: palette.subtext }}>{error || '你当前没有管理员权限。'}</Text>
            </View>
          </AppCard>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView scrollY style={{ minHeight: '100vh', backgroundColor: palette.bg }}>
      <View style={{ padding: space(4), boxSizing: 'border-box' }}>
        <AppCard border>
          <Text style={{ ...typography.title, color: palette.text }}>学习社区推荐审核</Text>
          <View style={{ marginTop: space(2) }}>
            <Text style={{ ...typography.meta, color: palette.subtext }}>
              推荐内容已按学习社区详情页字段整理：复制发布字段后，可更顺畅录入或合并到 schools / school_locations。
            </Text>
          </View>
          <View style={{ marginTop: space(3), backgroundColor: palette.cardSoft, borderRadius: radius.md, padding: `${space(2)} ${space(3)}` }}>
            <Text style={{ ...typography.caption, color: palette.subtext }}>当前管理员：{adminName}</Text>
          </View>
        </AppCard>

        <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(2) }}>
          {STATUS_OPTIONS.map((option) => (
            <Pill
              key={option}
              label={option}
              active={statusFilter === option}
              onClick={async () => {
                setStatusFilter(option)
                setSelectedId('')
                setAdminNote('')
                await loadSubmissions(option)
              }}
            />
          ))}
        </View>

        <AdminActionButton text={loading ? '刷新中...' : '刷新列表'} variant='secondary' onClick={() => loadSubmissions(statusFilter)} marginBottom={space(3)} />

        {error ? (
          <View style={{ padding: space(3), marginBottom: space(3), backgroundColor: palette.errorSoft, borderRadius: radius.md, border: `1px solid ${palette.brandSoft}` }}>
            <Text style={{ ...typography.meta, color: palette.error }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ marginBottom: space(3) }}>
          {submissions.map((item) => {
            const active = item._id === selectedId
            return (
              <AppCard key={item._id} onClick={() => openItem(item)} padding={space(3)} marginBottom={space(3)} borderColor={active ? palette.brand : palette.line}>
                <Text style={{ ...typography.cardTitle, color: palette.text }}>{item.name || '未命名学习社区'}</Text>
                <View style={{ marginTop: space(1) }}>
                  <Text style={{ ...typography.caption, color: palette.subtext }}>
                    {item.province}{item.city ? ` · ${item.city}` : ''}{getSchoolTypeText(item) ? ` · ${getSchoolTypeText(item)}` : ''}
                  </Text>
                </View>
                <View style={{ marginTop: space(1) }}>
                  <Text style={{ ...typography.caption, color: palette.subtext }}>年龄：{getAgeRangeText(item) || '未填写'}</Text>
                </View>
                <View style={{ marginTop: space(1) }}>
                  <Text style={{ ...typography.caption, color: palette.subtext }}>详情字段：{[item.xujiNote && '公开说明', item.residencyReq && '参与前了解', (item.admissionReq || item.participationNote) && '参与方式', item.feeNote && '费用', item.outputDirection && '相关说明'].filter(Boolean).join(' / ') || '较少'}</Text>
                </View>
                <View style={{ marginTop: space(1) }}>
                  <Text style={{ ...typography.caption, color: palette.subtext }}>
                    提交人：{item.submitterDisplayName || '未知'}{item.submitterCity ? ` · ${item.submitterCity}` : ''}
                  </Text>
                </View>
                <View style={{ marginTop: space(1) }}>
                  <Text style={{ ...typography.caption, color: palette.subtext }}>提交时间：{formatDateText(item.createdAt)}</Text>
                </View>
                <View style={{ marginTop: space(2), display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                  <AppChip text={item.status} tone='brand' />
                  {item.contentSecurityStatus ? <AppChip text={`安全：${item.contentSecurityStatus}`} tone={item.contentSecurityStatus === 'passed' ? 'green' : 'accent'} /> : null}
                </View>
              </AppCard>
            )
          })}

          {submissions.length === 0 ? (
            <AppCard border>
              <Text style={{ ...typography.meta, color: palette.subtext }}>当前筛选下没有学习社区推荐。</Text>
            </AppCard>
          ) : null}
        </View>

        {selectedSubmission ? (
          <AppCard marginBottom={space(5)} border>
            <Text style={{ ...typography.sectionTitle, color: palette.text, marginBottom: space(2) }}>处理详情</Text>

            <View style={{ marginBottom: space(3) }}>
              <Text style={{ ...typography.caption, color: palette.brand, fontWeight: '700' }}>发布字段与审核信息</Text>
              <View style={{ marginTop: space(2), backgroundColor: palette.cardSoft, borderRadius: radius.md, padding: space(3), border: `1px solid ${palette.line}` }}>
                <Text style={{ ...typography.caption, color: palette.subtext, whiteSpace: 'pre-wrap' }}>
                  {formatSubmissionForClipboard(selectedSubmission, adminNote)}
                </Text>
              </View>
              <View style={{ marginTop: space(2) }}>
                <AdminActionButton text='复制发布字段' variant='secondary' onClick={handleCopy} />
              </View>
            </View>

            <View style={{ marginBottom: space(3) }}>
              <Text style={{ ...typography.caption, color: palette.brand, fontWeight: '700' }}>adminNote</Text>
              <View style={{ marginTop: space(2) }}>
                <FormInputBox focused={noteFocused} marginBottom='0'>
                  <Textarea
                    value={adminNote}
                    placeholder='例如：已录入为新社区；已合并为某社区新地点；重复；信息不足拒绝'
                    maxlength={300}
                    onFocus={() => setNoteFocused(true)}
                    onBlur={() => setNoteFocused(false)}
                    onInput={(e) => setAdminNote(e.detail.value)}
                    style={{ width: '100%', minHeight: '80px', ...typography.body, color: palette.text }}
                  />
                </FormInputBox>
              </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
              <AdminActionButton text='标记已处理' loading={reviewLoading} variant='success' onClick={() => handleReview('mark_processed')} />
              <AdminActionButton text='标记重复' disabled={reviewLoading} variant='secondary' onClick={() => handleReview('duplicate')} />
              <AdminActionButton text='拒绝' disabled={reviewLoading} variant='danger' onClick={() => handleReview('reject')} />
              <AdminActionButton text='重置待审核' disabled={reviewLoading} variant='neutral' onClick={() => handleReview('reset_pending')} marginRight='0' />
            </View>
          </AppCard>
        ) : null}
      </View>
    </ScrollView>
  )
}
