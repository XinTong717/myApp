import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Input, Textarea, Picker, Switch } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { LOCATION_DATA, PROVINCES } from '../../../constants/location'
import { submitEvent } from '../../../services/event'
import SectionTitle from '../../../components/profile/SectionTitle'
import { palette } from '../../../theme/palette'
import { radius, space } from '../../../theme/spacing'
import { typography } from '../../../theme/typography'
import { MultiPillSelect, SinglePillSelect } from '../../../components/common/PillSelect'
import AppPage from '../../../components/common/AppPage'
import AppCard from '../../../components/common/AppCard'
import AppPromptBanner from '../../../components/common/AppPromptBanner'
import AppPrimaryButton from '../../../components/common/AppPrimaryButton'
import FormInputBox from '../../../components/common/FormInputBox'

const EVENT_TYPE_OPTIONS = ['工作坊', '营期/短期营', '项目招募', '圆桌讨论', '交友聚会', '一对一', '团体', '其他']
const AUDIENCE_WHO_OPTIONS = ['家长', '教育工作者', '儿童/青少年（需家长陪同）', '儿童/青少年（独立参加）', '开放给所有人', '其他']
const FEE_OPTIONS = ['免费', '付费', '公益随喜', '费用待确认']
const RECURRENCE_OPTIONS = ['每周', '每月', '每季度', '其他']
const CHINA_TIMEZONE_OFFSET = '+08:00'
const AGE_RANGE_MIN = 0
const AGE_RANGE_MAX = 30

type FocusField =
  | 'title'
  | 'customCity'
  | 'eventTypeOther'
  | 'audienceWhoOther'
  | 'recurrenceOther'
  | 'location'
  | 'feeDetail'
  | 'earlyBirdPrice'
  | 'organizer'
  | 'organizerContact'
  | 'officialUrl'
  | 'signupNote'
  | 'description'
  | ''

type PickerMultiChangeEvent = { detail: { value: number[] } }
type PickerColumnChangeEvent = { detail: { column: number; value: number } }

function toEndOfDay(date: string) {
  if (!date) return ''
  return `${date}T23:59:00${CHINA_TIMEZONE_OFFSET}`
}

function setBeforeUnloadAlert(_enabled: boolean, _message: string) {
  const taroAny = Taro as any
  try {
    if (taroAny.disableAlertBeforeUnload) taroAny.disableAlertBeforeUnload()
  } catch (err) {
    console.warn('setBeforeUnloadAlert skipped:', err)
  }
}

async function showSubmittedModal() {
  await Taro.showModal({
    title: '已进入审核',
    content: '你的活动已提交到人工审核队列，通常不会立即展示。审核通过后才会出现在活动列表中。',
    showCancel: false,
    confirmText: '知道了',
  })
  Taro.navigateBack()
}

function clampAge(value: number, min = AGE_RANGE_MIN, max = AGE_RANGE_MAX) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function getTouchPageX(event: any) {
  return Number(event?.touches?.[0]?.pageX ?? event?.changedTouches?.[0]?.pageX ?? 0)
}

function formatAgeRange(minAge: number, maxAge: number) {
  return `${minAge}-${maxAge}${maxAge >= AGE_RANGE_MAX ? '岁+' : '岁'}`
}

function getMinAgeRequirement(minAge: number) {
  return minAge <= AGE_RANGE_MIN ? '全年龄' : `${minAge}岁+`
}

function getMaxAgeRequirement(maxAge: number) {
  return maxAge >= AGE_RANGE_MAX ? '' : `${maxAge}岁以下`
}

function AgeRangeSlider(props: { minValue: number; maxValue: number; onChange: (minValue: number, maxValue: number) => void }) {
  const trackIdRef = useRef(`event-submit-age-range-${Math.random().toString(36).slice(2)}`)
  const activeHandleRef = useRef<'min' | 'max'>('min')
  const minPercent = ((props.minValue - AGE_RANGE_MIN) / (AGE_RANGE_MAX - AGE_RANGE_MIN)) * 100
  const maxPercent = ((props.maxValue - AGE_RANGE_MIN) / (AGE_RANGE_MAX - AGE_RANGE_MIN)) * 100

  const updateFromTouch = (event: any, mode: 'nearest' | 'active' = 'active') => {
    const pageX = getTouchPageX(event)
    if (!pageX) return
    Taro.createSelectorQuery()
      .select(`#${trackIdRef.current}`)
      .boundingClientRect((rect: any) => {
        const width = Number(rect?.width || 0)
        if (!width) return
        const ratio = Math.max(0, Math.min(1, (pageX - Number(rect.left || 0)) / width))
        const nextValue = clampAge(AGE_RANGE_MIN + ratio * (AGE_RANGE_MAX - AGE_RANGE_MIN))
        if (mode === 'nearest') {
          activeHandleRef.current = Math.abs(nextValue - props.minValue) <= Math.abs(nextValue - props.maxValue) ? 'min' : 'max'
        }
        if (activeHandleRef.current === 'min') props.onChange(Math.min(nextValue, props.maxValue), props.maxValue)
        else props.onChange(props.minValue, Math.max(nextValue, props.minValue))
      })
      .exec()
  }

  const startHandle = (handle: 'min' | 'max', event: any) => {
    event?.stopPropagation?.()
    activeHandleRef.current = handle
    updateFromTouch(event)
  }

  return (
    <View style={{ marginBottom: space(4) }}>
      <View style={{ marginBottom: space(2) }}>
        <Text style={{ ...typography.caption, color: palette.subtext }}>{formatAgeRange(props.minValue, props.maxValue)}</Text>
      </View>
      <View
        id={trackIdRef.current}
        onTouchStart={(event: any) => updateFromTouch(event, 'nearest')}
        onTouchMove={(event: any) => updateFromTouch(event)}
        style={{ position: 'relative', height: '44px', margin: `0 ${space(3)}` }}
      >
        <View style={{ position: 'absolute', left: 0, right: 0, top: '20px', height: '4px', borderRadius: radius.pill, backgroundColor: palette.line }} />
        <View style={{ position: 'absolute', left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%`, top: '20px', height: '4px', borderRadius: radius.pill, backgroundColor: palette.accentDeep }} />
        <View onTouchStart={(event: any) => startHandle('min', event)} onTouchMove={(event: any) => updateFromTouch(event)} style={{ position: 'absolute', left: `${minPercent}%`, top: '10px', width: '24px', height: '24px', marginLeft: '-12px', borderRadius: radius.pill, backgroundColor: palette.accentDeep, boxShadow: '0 4px 12px rgba(112, 56, 46, 0.22)' }} />
        <View onTouchStart={(event: any) => startHandle('max', event)} onTouchMove={(event: any) => updateFromTouch(event)} style={{ position: 'absolute', left: `${maxPercent}%`, top: '10px', width: '24px', height: '24px', marginLeft: '-12px', borderRadius: radius.pill, backgroundColor: palette.accentDeep, boxShadow: '0 4px 12px rgba(112, 56, 46, 0.22)' }} />
      </View>
    </View>
  )
}

export default function SubmitEventPage() {
  const [submitting, setSubmitting] = useState(false)
  const submitLockRef = useRef(false)
  const submittedRef = useRef(false)
  const [focusedField, setFocusedField] = useState<FocusField>('')
  const [title, setTitle] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [province, setProvince] = useState('')
  const [cityOption, setCityOption] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [eventTypeOther, setEventTypeOther] = useState('')
  const [audienceWho, setAudienceWho] = useState<string[]>([])
  const [audienceWhoOther, setAudienceWhoOther] = useState('')
  const [ageRangeMin, setAgeRangeMin] = useState(0)
  const [ageRangeMax, setAgeRangeMax] = useState(30)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [signupDeadlineDate, setSignupDeadlineDate] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState('')
  const [recurrenceOther, setRecurrenceOther] = useState('')
  const [location, setLocation] = useState('')
  const [fee, setFee] = useState('')
  const [feeDetail, setFeeDetail] = useState('')
  const [earlyBirdPrice, setEarlyBirdPrice] = useState('')
  const [earlyBirdDeadline, setEarlyBirdDeadline] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [organizerContact, setOrganizerContact] = useState('')
  const [officialUrl, setOfficialUrl] = useState('')
  const [signupNote, setSignupNote] = useState('')
  const [description, setDescription] = useState('')

  const currentCity = cityOption === '其他' ? customCity.trim() : cityOption
  const resolvedRecurrencePattern = recurrencePattern === '其他' ? `其他：${recurrenceOther.trim()}` : recurrencePattern
  const hasUnsavedContent = !!(
    title.trim() || isOnline || province || cityOption || customCity.trim() || eventTypes.length > 0 || eventTypeOther.trim() ||
    audienceWho.length > 0 || audienceWhoOther.trim() || ageRangeMin !== AGE_RANGE_MIN || ageRangeMax !== AGE_RANGE_MAX || startDate || endDate ||
    signupDeadlineDate || isRecurring || recurrencePattern || recurrenceOther.trim() || location.trim() || fee || feeDetail.trim() || earlyBirdPrice.trim() || earlyBirdDeadline || organizer.trim() || organizerContact.trim() || officialUrl.trim() ||
    signupNote.trim() || description.trim()
  )

  useEffect(() => {
    const shouldWarn = hasUnsavedContent && !submitting && !submittedRef.current
    setBeforeUnloadAlert(shouldWarn, '你填写的活动信息还没有提交，确定要离开吗？')
    return () => setBeforeUnloadAlert(false, '')
  }, [hasUnsavedContent, submitting])

  const pickerRange = useMemo(() => {
    const cities = province ? (LOCATION_DATA[province] || ['其他']) : ['请先选择省份']
    return [PROVINCES, cities]
  }, [province])
  const pickerValue = useMemo(() => {
    const provIdx = Math.max(0, PROVINCES.indexOf(province))
    const cities = province ? (LOCATION_DATA[province] || []) : []
    const normalizedCityOption = cityOption || (cities[0] || '')
    return [provIdx, Math.max(0, cities.indexOf(normalizedCityOption))]
  }, [province, cityOption])

  const handlePickerChange = (e: PickerMultiChangeEvent) => {
    const [provIdx, cityIdx] = e.detail.value
    const nextProvince = PROVINCES[provIdx] || ''
    const cities = LOCATION_DATA[nextProvince] || []
    const nextCityOption = cities[cityIdx] || ''
    setProvince(nextProvince)
    setCityOption(nextCityOption)
    if (nextCityOption !== '其他') setCustomCity('')
  }

  const handlePickerColumnChange = (e: PickerColumnChangeEvent) => {
    if (e.detail.column === 0) {
      const nextProvince = PROVINCES[e.detail.value] || ''
      const firstCity = (LOCATION_DATA[nextProvince] || [])[0] || ''
      setProvince(nextProvince)
      setCityOption(firstCity)
      setCustomCity('')
    }
  }

  const handleOnlineChange = (checked: boolean) => {
    setIsOnline(checked)
    if (checked) {
      setProvince('')
      setCityOption('')
      setCustomCity('')
    }
  }

  const handleSubmit = async () => {
    if (submitLockRef.current || submitting) return

    if (!title.trim()) { Taro.showToast({ title: '请填写活动标题', icon: 'none' }); return }
    if (!isOnline && (!province || !currentCity)) { Taro.showToast({ title: '请选择所在城市', icon: 'none' }); return }
    if (!isOnline && cityOption === '其他' && !customCity.trim()) { Taro.showToast({ title: '请输入真实城市名', icon: 'none' }); return }
    if (eventTypes.includes('其他') && !eventTypeOther.trim()) { Taro.showToast({ title: '请补充活动类型中的“其他”', icon: 'none' }); return }
    if (audienceWho.includes('其他') && !audienceWhoOther.trim()) { Taro.showToast({ title: '请补充参与对象中的“其他”', icon: 'none' }); return }
    if (!startDate) { Taro.showToast({ title: '请选择开始日期', icon: 'none' }); return }
    if (endDate && endDate < startDate) { Taro.showToast({ title: '结束日期不能早于开始日期', icon: 'none' }); return }
    if (isRecurring && !recurrencePattern) { Taro.showToast({ title: '请选择周期时间', icon: 'none' }); return }
    if (isRecurring && recurrencePattern === '其他' && !recurrenceOther.trim()) { Taro.showToast({ title: '请填写其他周期时间', icon: 'none' }); return }
    if (!fee) { Taro.showToast({ title: '请选择费用情况', icon: 'none' }); return }
    if (fee === '付费' && !feeDetail.trim()) { Taro.showToast({ title: '请补充付费说明', icon: 'none' }); return }
    if (!!earlyBirdPrice.trim() !== !!earlyBirdDeadline) { Taro.showToast({ title: '早鸟价格和截止日期请一起填写', icon: 'none' }); return }
    if (!organizer.trim()) { Taro.showToast({ title: '请填写组织者', icon: 'none' }); return }
    if (!description.trim()) { Taro.showToast({ title: '请填写活动简介', icon: 'none' }); return }

    submitLockRef.current = true

    const confirm = await Taro.showModal({
      title: '提交活动',
      content: '提交后会进入人工审核队列，审核通过后才会出现在活动列表中。活动页适合提交有明确时间、报名窗口或具体期次的活动、营期或招募；长期存在的学习社区、学校或营地主体请提交到学习社区。',
      confirmText: '确认提交',
      cancelText: '再看看',
    })
    if (!confirm.confirm) {
      submitLockRef.current = false
      return
    }

    try {
      setSubmitting(true)
      const result = await submitEvent({
        title: title.trim(), province: isOnline ? '线上' : province, city: isOnline ? '线上' : currentCity, eventTypes,
        eventTypeOther: eventTypes.includes('其他') ? eventTypeOther.trim() : '',
        audienceWho, audienceWhoOther: audienceWho.includes('其他') ? audienceWhoOther.trim() : '',
        minAgeRequirement: getMinAgeRequirement(ageRangeMin), maxAgeRequirement: getMaxAgeRequirement(ageRangeMax),
        startTime: startDate,
        endTime: endDate,
        signupDeadline: toEndOfDay(signupDeadlineDate),
        isRecurring, recurrencePattern: isRecurring ? resolvedRecurrencePattern : '',
        isOnline, location: location.trim(), fee, feeDetail: fee === '付费' ? feeDetail.trim() : '',
        earlyBirdPrice: fee === '付费' ? earlyBirdPrice.trim() : '',
        earlyBirdDeadline: fee === '付费' ? toEndOfDay(earlyBirdDeadline) : '',
        organizer: organizer.trim(), organizerContact: organizerContact.trim(), officialUrl: officialUrl.trim(),
        signupNote: signupNote.trim(), description: description.trim(),
      })
      if (result?.ok) {
        submittedRef.current = true
        setBeforeUnloadAlert(false, '')
        await showSubmittedModal()
      } else {
        Taro.showToast({ title: result?.message || '提交失败', icon: 'none' })
      }
    } catch (err) {
      console.error('submitEvent error:', err)
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    } finally {
      setSubmitting(false)
      submitLockRef.current = false
    }
  }

  return (
    <AppPage>
      <AppCard>
        <Text style={{ ...typography.title, color: palette.text }}>发布或推荐活动 / 营期</Text>
        <View style={{ marginTop: space(2) }}><Text style={{ ...typography.meta, color: palette.subtext }}>这里收录有明确时间、报名窗口或具体期次的活动、短期营、工作坊、招募、圆桌、聚会等。如果你想推荐的是一个长期存在的学习社区、学校或营地主体，请提交到“学习社区”。</Text></View>
      </AppCard>

      <AppCard>
        <SectionTitle text='活动标题' />
        <FormInputBox focused={focusedField === 'title'}><Input value={title} placeholder='例如：xx空间教育工作坊 / 2026 暑期自然营第一期' onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField('')} onInput={(e) => setTitle(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>
        <SectionTitle text='线上活动' /><FormInputBox><View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, ...typography.body, color: palette.text }}>{isOnline ? '是，主要在线上进行' : '否，主要线下进行'}</Text><Switch checked={isOnline} color={palette.accentDeep} onChange={(e) => handleOnlineChange(!!e.detail.value)} /></View></FormInputBox>
        {!isOnline && <>
          <SectionTitle text='所在城市' />
          <Picker mode='multiSelector' range={pickerRange} value={pickerValue} onChange={handlePickerChange} onColumnChange={handlePickerColumnChange}><FormInputBox marginBottom={cityOption === '其他' ? space(2) : space(4)}><View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}><Text style={{ ...typography.body, flex: 1, color: province ? palette.text : palette.muted }}>{province && currentCity ? `${province} · ${currentCity}` : '点击选择省份和城市'}</Text><Text style={{ ...typography.caption, color: palette.subtext }}>▼</Text></View></FormInputBox></Picker>
          {cityOption === '其他' && <View style={{ marginBottom: space(4) }}><View style={{ marginBottom: space(2) }}><Text style={{ ...typography.caption, color: palette.subtext }}>请输入真实城市名。地图会先按省级近似坐标展示，但列表里会显示你填写的城市。</Text></View><FormInputBox focused={focusedField === 'customCity'} marginBottom='0'><Input value={customCity} placeholder='例如：义乌 / 凯里 / 唐山' onFocus={() => setFocusedField('customCity')} onBlur={() => setFocusedField('')} onInput={(e) => setCustomCity(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox></View>}
        </>}
        {isOnline && <View style={{ marginBottom: space(4) }}><Text style={{ ...typography.caption, color: palette.subtext }}>线上活动不需要填写城市，审核时会按线上活动处理。</Text></View>}
        <SectionTitle text='活动类型（可多选）' /><MultiPillSelect options={EVENT_TYPE_OPTIONS} selected={eventTypes} onChange={setEventTypes} />
        {eventTypes.includes('其他') && <View style={{ marginBottom: space(4) }}><View style={{ marginBottom: space(2) }}><Text style={{ ...typography.caption, color: palette.subtext }}>补充活动类型中的“其他”。</Text></View><FormInputBox focused={focusedField === 'eventTypeOther'} marginBottom='0'><Input value={eventTypeOther} placeholder='例如：展览 / 沙龙 / 读书会' onFocus={() => setFocusedField('eventTypeOther')} onBlur={() => setFocusedField('')} onInput={(e) => setEventTypeOther(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox></View>}
        <SectionTitle text='参与对象（可多选）' /><MultiPillSelect options={AUDIENCE_WHO_OPTIONS} selected={audienceWho} onChange={setAudienceWho} />
        {audienceWho.includes('其他') && <View style={{ marginBottom: space(4) }}><View style={{ marginBottom: space(2) }}><Text style={{ ...typography.caption, color: palette.subtext }}>补充参与对象中的“其他”。</Text></View><FormInputBox focused={focusedField === 'audienceWhoOther'} marginBottom='0'><Input value={audienceWhoOther} placeholder='例如：大学生 / 创作者 / 社区志愿者' onFocus={() => setFocusedField('audienceWhoOther')} onBlur={() => setFocusedField('')} onInput={(e) => setAudienceWhoOther(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox></View>}
        <SectionTitle text='年龄区间' /><AgeRangeSlider minValue={ageRangeMin} maxValue={ageRangeMax} onChange={(minValue, maxValue) => { setAgeRangeMin(minValue); setAgeRangeMax(maxValue) }} />
        <SectionTitle text='开始日期' /><Picker mode='date' value={startDate} onChange={(e) => setStartDate(e.detail.value)}><FormInputBox><Text style={{ ...typography.body, color: startDate ? palette.text : palette.muted }}>{startDate || '选择日期'}</Text></FormInputBox></Picker>
        <SectionTitle text='结束日期（选填）' /><Picker mode='date' value={endDate} onChange={(e) => setEndDate(e.detail.value)}><FormInputBox><Text style={{ ...typography.body, color: endDate ? palette.text : palette.muted }}>{endDate || '选择日期'}</Text></FormInputBox></Picker>
        <SectionTitle text='报名截止日期（选填）' /><Picker mode='date' value={signupDeadlineDate} onChange={(e) => setSignupDeadlineDate(e.detail.value)}><FormInputBox><Text style={{ ...typography.body, color: signupDeadlineDate ? palette.text : palette.muted }}>{signupDeadlineDate || '选择日期'}</Text></FormInputBox></Picker>
        <SectionTitle text='是否周期性进行' /><FormInputBox><View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, ...typography.body, color: palette.text }}>{isRecurring ? '是，周期性进行' : '否，单次或暂未确认'}</Text><Switch checked={isRecurring} color={palette.accentDeep} onChange={(e) => { const next = !!e.detail.value; setIsRecurring(next); if (!next) { setRecurrencePattern(''); setRecurrenceOther('') } }} /></View></FormInputBox>
        {isRecurring && <><SectionTitle text='周期时间' /><SinglePillSelect options={RECURRENCE_OPTIONS} selected={recurrencePattern} onChange={(value) => { setRecurrencePattern(value); if (value !== '其他') setRecurrenceOther('') }} />{recurrencePattern === '其他' && <View style={{ marginBottom: space(4) }}><View style={{ marginBottom: space(2) }}><Text style={{ ...typography.caption, color: palette.subtext }}>请补充周期时间。</Text></View><FormInputBox focused={focusedField === 'recurrenceOther'} marginBottom='0'><Input value={recurrenceOther} placeholder='例如：寒暑假集中进行 / 不定期滚动招募' onFocus={() => setFocusedField('recurrenceOther')} onBlur={() => setFocusedField('')} onInput={(e) => setRecurrenceOther(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox></View>}</>}
        <SectionTitle text={isOnline ? '平台 / 线上说明（选填）' : '地点说明（选填）'} /><FormInputBox focused={focusedField === 'location'}><Input value={location} placeholder={isOnline ? '例如：腾讯会议' : '例如：杭州西湖区某空间'} onFocus={() => setFocusedField('location')} onBlur={() => setFocusedField('')} onInput={(e) => setLocation(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>
        <SectionTitle text='费用' /><SinglePillSelect options={FEE_OPTIONS} selected={fee} onChange={(value) => { setFee(value); if (value !== '付费') { setFeeDetail(''); setEarlyBirdPrice(''); setEarlyBirdDeadline('') } }} />
        {fee === '付费' && <>
          <View style={{ marginBottom: space(4) }}><View style={{ marginBottom: space(2) }}><Text style={{ ...typography.caption, color: palette.subtext }}>补充常规费用说明</Text></View><FormInputBox focused={focusedField === 'feeDetail'} marginBottom='0'><Input value={feeDetail} placeholder='例如：单次 99 元 / 四次 199 元。' onFocus={() => setFocusedField('feeDetail')} onBlur={() => setFocusedField('')} onInput={(e) => setFeeDetail(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox></View>
          <SectionTitle text='早鸟价格（选填）' />
          <FormInputBox focused={focusedField === 'earlyBirdPrice'}><Input value={earlyBirdPrice} placeholder='例如：79 元 / 家庭 299 元' onFocus={() => setFocusedField('earlyBirdPrice')} onBlur={() => setFocusedField('')} onInput={(e) => setEarlyBirdPrice(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>
          <SectionTitle text='早鸟截止日期（选填）' />
          <Picker mode='date' value={earlyBirdDeadline} onChange={(e) => setEarlyBirdDeadline(e.detail.value)}><FormInputBox marginBottom={space(2)}><Text style={{ ...typography.body, color: earlyBirdDeadline ? palette.text : palette.muted }}>{earlyBirdDeadline || '选择日期'}</Text></FormInputBox></Picker>
          <View style={{ marginBottom: space(4) }}><Text style={{ ...typography.micro, color: palette.muted }}>早鸟价格和截止日期需同时填写；截止后活动列表自动显示常规费用。</Text></View>
        </>}
        <SectionTitle text='组织者' /><FormInputBox focused={focusedField === 'organizer'}><Input value={organizer} placeholder='例如：某教育团队 / 个人发起者名字' onFocus={() => setFocusedField('organizer')} onBlur={() => setFocusedField('')} onInput={(e) => setOrganizer(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>
        <SectionTitle text='组织者微信号（选填）' /><View style={{ marginBottom: space(2) }}><Text style={{ ...typography.caption, color: palette.subtext }}>如果你是这个活动的组织者，可以填写你的微信号。仅对填写过资料的可雀用户可见。</Text></View><FormInputBox focused={focusedField === 'organizerContact'}><Input value={organizerContact} placeholder='例如：微信号' onFocus={() => setFocusedField('organizerContact')} onBlur={() => setFocusedField('')} onInput={(e) => setOrganizerContact(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>
        <SectionTitle text='公开链接（选填）' /><FormInputBox focused={focusedField === 'officialUrl'} marginBottom={space(3)}><Input value={officialUrl} placeholder='例如：活动详情链接 / 公众号名' onFocus={() => setFocusedField('officialUrl')} onBlur={() => setFocusedField('')} onInput={(e) => setOfficialUrl(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>
        <SectionTitle text='报名方式补充说明（选填）' /><FormInputBox focused={focusedField === 'signupNote'} marginBottom={space(3)}><Textarea value={signupNote} placeholder='例如：先添加小助手填写问卷；或报名开放时间说明' maxlength={200} onFocus={() => setFocusedField('signupNote')} onBlur={() => setFocusedField('')} onInput={(e) => setSignupNote(e.detail.value)} style={{ width: '100%', minHeight: '60px', ...typography.body, color: palette.text }} /></FormInputBox>
        <SectionTitle text='活动简介' /><FormInputBox focused={focusedField === 'description'} marginBottom={space(2)}><Textarea value={description} placeholder='介绍活动内容、适合谁、预计会发生什么。' maxlength={600} onFocus={() => setFocusedField('description')} onBlur={() => setFocusedField('')} onInput={(e) => setDescription(e.detail.value)} style={{ width: '100%', minHeight: '120px', ...typography.body, color: palette.text }} /></FormInputBox><View style={{ marginBottom: space(4) }}><Text style={{ ...typography.micro, color: palette.muted }}>{description.length}/600</Text></View>
      </AppCard>
      <AppPromptBanner icon='lock' title='提交后进入审核' description='提交内容不会自动公开。这里适合具体发生窗口明确的活动、营期、工作坊或招募；如果是长期存在的主体，管理员审核时也会帮你归类。组织者微信号仅对填写过资料的可雀用户可见。' tone='warm' />
      <AppPrimaryButton text='提交活动' loadingText='提交中...' loading={submitting} onClick={handleSubmit} />
    </AppPage>
  )
}
