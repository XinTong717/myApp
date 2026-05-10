import { useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, getCurrentInstance, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { registerCurrentPageShare } from '../../utils/share'
import { getSchoolDetail, submitCorrection } from '../../services/school'
import { getDetailPreview } from '../../services/detailPreview'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'
import AppPage from '../../components/common/AppPage'
import AppCard from '../../components/common/AppCard'
import AppTag from '../../components/common/AppTag'
import AppInfoRow from '../../components/common/AppInfoRow'
import AppIcon from '../../components/common/AppIcon'
import AppPrimaryButton from '../../components/common/AppPrimaryButton'
import AppPromptBanner from '../../components/common/AppPromptBanner'
import CorrectionCard from '../../components/common/CorrectionCard'
import { DetailSkeleton } from '../../components/common/Skeleton'
import type { SchoolItem, SchoolLocationItem } from '../../types/domain'

type School = SchoolItem

function buildSchoolShare(school?: School | null, schoolId?: number) {
  const id = Number(school?.id || schoolId || 0)
  const name = school?.canonical_name || school?.name || ''
  const title = name ? `可雀学习社区｜${name}` : '可雀学习社区库｜找到适合教育探索的场域'

  return {
    appMessage: {
      title,
      path: id ? `/pages/school-detail/index?id=${id}` : '/pages/schools/index',
    },
    timeline: {
      title,
      query: id ? `id=${id}` : '',
    },
  }
}

function splitTokens(value?: string) {
  return String(value || '')
    .split(/[、,，/|｜\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getLocations(school: School): SchoolLocationItem[] {
  if (Array.isArray(school.locations) && school.locations.length > 0) return school.locations
  return splitTokens(school.city).map((city, index) => ({
    school_id: Number(school.id),
    province: splitTokens(school.province)[index] || splitTokens(school.province)[0] || '',
    city,
    status: 'legacy',
  }))
}

function formatLocation(location: SchoolLocationItem) {
  return [location.province, location.city].filter(Boolean).join(' · ') || '地点未填写'
}

function SchoolContent(props: {
  school: School
  preview?: boolean
  showCorrectionForm: boolean
  correctionText: string
  correctionSubmitting: boolean
  correctionDone: boolean
  onShowCorrectionForm: () => void
  onCancelCorrection: () => void
  onCorrectionTextChange: (value: string) => void
  onSubmitCorrection: () => void
}) {
  const {
    school,
    preview,
    showCorrectionForm,
    correctionText,
    correctionSubmitting,
    correctionDone,
    onShowCorrectionForm,
    onCancelCorrection,
    onCorrectionTextChange,
    onSubmitCorrection,
  } = props
  const locations = getLocations(school)

  return (
    <>
      {preview ? (
        <View style={{ marginBottom: space(3) }}>
          <AppPromptBanner title='完整详情暂未加载成功' description='当前显示列表中的基础信息。' icon='school' tone='warning' />
        </View>
      ) : null}

      <AppCard padding={`${space(4)} ${space(4)}`}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(3) }}>
          <View style={{ marginRight: space(3) }}>
            <AppIcon name='school' size={42} backgroundColor={palette.iconBg} bordered />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.title, color: palette.text }}>{school.canonical_name || school.name}</Text>
          </View>
        </View>

        <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: school.official_url ? space(3) : '0' }}>
          <AppTag text={locations.length > 0 ? `${locations.length} 个地点` : '地点未填写'} />
          {!!school.school_type && <AppTag text={school.school_type} />}
          {!!school.age_range && <AppTag text={school.age_range} />}
        </View>

        {!!school.official_url && (
          <View onClick={() => Taro.setClipboardData({ data: school.official_url || '' })} style={{ backgroundColor: palette.surface, borderRadius: radius.md, padding: space(3), display: 'flex', flexDirection: 'row', alignItems: 'center', border: `1px solid ${palette.line}` }}>
            <View style={{ flex: 1, paddingRight: space(3) }}>
              <Text style={{ ...typography.caption, color: palette.brand }}>官方/说明链接</Text>
              <View style={{ marginTop: space(1) }}>
                <Text style={{ ...typography.meta, color: palette.text }}>{school.official_url}</Text>
              </View>
            </View>
            <Text style={{ ...typography.micro, color: palette.muted }}>点击复制</Text>
          </View>
        )}
      </AppCard>

      <AppCard>
        <View style={{ marginBottom: space(3) }}>
          <Text style={{ ...typography.cardTitle, color: palette.text }}>地点列表</Text>
        </View>
        {locations.length > 0 ? locations.map((location, index) => (
          <View key={`${location.province}-${location.city}-${index}`} style={{ backgroundColor: palette.surface, borderRadius: radius.md, padding: space(3), marginBottom: index === locations.length - 1 ? '0' : space(3), border: `1px solid ${palette.line}` }}>
            <Text style={{ ...typography.bodyStrong, color: palette.text }}>{formatLocation(location)}</Text>
            {!!location.address_note && (
              <View style={{ marginTop: space(2) }}><Text style={{ ...typography.caption, color: palette.subtext }}>地址说明：{location.address_note}</Text></View>
            )}
            {!!location.contact_note && (
              <View style={{ marginTop: space(2) }}><Text style={{ ...typography.caption, color: palette.subtext }}>联系说明：{location.contact_note}</Text></View>
            )}
          </View>
        )) : (
          <Text style={{ ...typography.meta, color: palette.subtext }}>暂无地点信息</Text>
        )}
      </AppCard>

      <AppInfoRow variant='prominent' label='公开说明' value={school.xuji_note} />
      <AppInfoRow variant='prominent' label='参与前了解' value={school.residency_req} />
      <AppInfoRow variant='prominent' label='参与方式参考' value={school.admission_req} />
      <AppInfoRow variant='prominent' label='参考费用' value={school.fee} />
      <AppInfoRow variant='prominent' label='相关说明' value={school.output_direction} />

      {!preview ? (
        <CorrectionCard
          showForm={showCorrectionForm}
          value={correctionText}
          submitting={correctionSubmitting}
          done={correctionDone}
          entryTitle='信息有误？帮我们完善'
          entryDescription='补充、修正或更新这个学习社区的信息'
          formTitle='补充或修正信息'
          formDescription='请描述需要修正或补充的内容，例如：费用有调整、参与方式有变化、名称已更新、官网地址有误等。提交后我们会核实更新。'
          onOpen={onShowCorrectionForm}
          onCancel={onCancelCorrection}
          onChange={onCorrectionTextChange}
          onSubmit={onSubmitCorrection}
        />
      ) : null}
    </>
  )
}

export default function SchoolDetailPage() {
  const [school, setSchool] = useState<School | null>(null)
  const [previewSchool, setPreviewSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCorrectionForm, setShowCorrectionForm] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false)
  const [correctionDone, setCorrectionDone] = useState(false)
  const correctionLockRef = useRef(false)
  const currentSchoolId = Number(getCurrentInstance().router?.params?.id || school?.id || previewSchool?.id || 0)

  useShareAppMessage(() => buildSchoolShare(school || previewSchool, currentSchoolId).appMessage)
  useShareTimeline(() => buildSchoolShare(school || previewSchool, currentSchoolId).timeline)

  const loadDetail = async (options: { forceRefresh?: boolean } = {}) => {
    const id = Number(getCurrentInstance().router?.params?.id || 0)
    const preview = getDetailPreview<School>('school', id)
    if (preview) {
      setPreviewSchool(preview)
      registerCurrentPageShare(buildSchoolShare(preview, id))
    } else {
      registerCurrentPageShare(buildSchoolShare(null, id))
    }

    try {
      setLoading(true)
      setError('')
      const result = await getSchoolDetail(id, { forceRefresh: !!options.forceRefresh })
      const nextSchool = result?.school || null
      setSchool(nextSchool)
      if (nextSchool) {
        registerCurrentPageShare(buildSchoolShare(nextSchool, id))
      }
      if (!result?.ok || !nextSchool) {
        setError(result?.message || '未找到该学习社区')
      }
    } catch (err: any) {
      console.error('loadDetail error:', err)
      setError(err?.message || '读取学习社区详情失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    registerCurrentPageShare(buildSchoolShare(school || previewSchool, currentSchoolId))
    loadDetail()
    setShowCorrectionForm(false)
    setCorrectionText('')
    setCorrectionDone(false)
    correctionLockRef.current = false
  })

  const handleSubmitCorrection = async () => {
    if (correctionLockRef.current || correctionSubmitting) return
    const text = correctionText.trim()
    if (!text) {
      Taro.showToast({ title: '请填写修正内容', icon: 'none' })
      return
    }
    if (!school) return

    correctionLockRef.current = true
    try {
      setCorrectionSubmitting(true)
      const result = await submitCorrection(school.id, school.name, text)
      if (result?.ok) {
        setCorrectionDone(true)
        setCorrectionText('')
        Taro.showToast({ title: '提交成功，感谢反馈', icon: 'success' })
      } else {
        Taro.showToast({ title: result?.message || '提交失败，请稍后重试', icon: 'none' })
      }
    } catch (err: any) {
      console.error('submitCorrection error:', err)
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    } finally {
      correctionLockRef.current = false
      setCorrectionSubmitting(false)
    }
  }

  const displaySchool = school || previewSchool
  const isPreview = !school && !!previewSchool

  return (
    <AppPage>
      {loading && !displaySchool && <DetailSkeleton />}

      {loading && displaySchool ? (
        <SchoolContent
          school={displaySchool}
          preview={isPreview}
          showCorrectionForm={showCorrectionForm}
          correctionText={correctionText}
          correctionSubmitting={correctionSubmitting}
          correctionDone={correctionDone}
          onShowCorrectionForm={() => setShowCorrectionForm(true)}
          onCancelCorrection={() => { setShowCorrectionForm(false); setCorrectionText('') }}
          onCorrectionTextChange={setCorrectionText}
          onSubmitCorrection={handleSubmitCorrection}
        />
      ) : null}

      {!loading && error && (
        <View style={{ padding: space(3), marginBottom: space(4), backgroundColor: palette.errorSoft, borderRadius: radius.md, border: `1px solid ${palette.line}` }}>
          <Text style={{ ...typography.body, color: palette.error }}>{error}</Text>
          <View style={{ marginTop: space(3) }}>
            <AppPrimaryButton text='重新加载' variant='secondary' size='sm' appearance='inline' marginBottom='0' onClick={() => loadDetail({ forceRefresh: true })} />
          </View>
        </View>
      )}

      {!loading && error && displaySchool && (
        <SchoolContent
          school={displaySchool}
          preview
          showCorrectionForm={showCorrectionForm}
          correctionText={correctionText}
          correctionSubmitting={correctionSubmitting}
          correctionDone={correctionDone}
          onShowCorrectionForm={() => setShowCorrectionForm(true)}
          onCancelCorrection={() => { setShowCorrectionForm(false); setCorrectionText('') }}
          onCorrectionTextChange={setCorrectionText}
          onSubmitCorrection={handleSubmitCorrection}
        />
      )}

      {!loading && !error && !displaySchool && <Text style={{ ...typography.body, color: palette.subtext }}>未找到该学习社区</Text>}

      {!loading && !error && displaySchool && (
        <SchoolContent
          school={displaySchool}
          preview={isPreview}
          showCorrectionForm={showCorrectionForm}
          correctionText={correctionText}
          correctionSubmitting={correctionSubmitting}
          correctionDone={correctionDone}
          onShowCorrectionForm={() => setShowCorrectionForm(true)}
          onCancelCorrection={() => { setShowCorrectionForm(false); setCorrectionText('') }}
          onCorrectionTextChange={setCorrectionText}
          onSubmitCorrection={handleSubmitCorrection}
        />
      )}
    </AppPage>
  )
}
