import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Input, Textarea, Picker, Switch } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { LOCATION_DATA, PROVINCES } from '../../../constants/location'
import { submitEvent } from '../../../services/event'
import SectionTitle from '../../../components/profile/SectionTitle'
import { palette } from '../../../theme/palette'
import { typography } from '../../../theme/typography'
import { MultiPillSelect, SinglePillSelect } from '../../../components/common/PillSelect'
import AppPrimaryButton from '../../../components/common/AppPrimaryButton'
import FormInputBox from '../../../components/common/FormInputBox'
import AppIcon from '../../../components/common/AppIcon'

const EVENT_TYPE_OPTIONS = ['圆桌讨论', '工作坊', '线下聚会', '线上活动', '家庭活动', '项目招募', '其他']
const AUDIENCE_WHO_OPTIONS = ['家长', '教育工作者', '儿童/青少年（需家长陪同）', '儿童/青少年（独立参加）', '开放给所有人', '其他']
const MIN_AGE_OPTIONS = ['全年龄', '6岁+', '12岁+', '18岁+（成人活动）']
const FEE_OPTIONS = ['免费', '付费', '公益捐赠', '费用待确认']
const CHINA_TIMEZONE_OFFSET = '+08:00'

type FocusField =
  | 'title'
  | 'customCity'
  | 'eventTypeOther'
  | 'audienceWhoOther'
  | 'location'
  | 'feeDetail'
  | 'organizer'
  | 'organizerContact'
  | 'officialUrl'
  | 'signupNote'
  | 'description'
  | ''

function combineDateTime(date: string, time: string) {
  if (!date || !time) return ''
  return `${date}T${time}:00${CHINA_TIMEZONE_OFFSET}`
}

function setBeforeUnloadAlert(enabled: boolean, message: string) {
  const taroAny = Taro as any
  try {
    if (enabled && taroAny.enableAlertBeforeUnload) {
      taroAny.enableAlertBeforeUnload({ message })
    } else if (!enabled && taroAny.disableAlertBeforeUnload) {
      taroAny.disableAlertBeforeUnload()
    }
  } catch (err) {
    console.warn('setBeforeUnloadAlert skipped:', err)
  }
}

export default function SubmitEventPage() {
  const [submitting, setSubmitting] = useState(false)
  const submitLockRef = useRef(false)
  const submittedRef = useRef(false)
  const [focusedField, setFocusedField] = useState<FocusField>('')
  const [title, setTitle] = useState('')
  const [province, setProvince] = useState('')
  const [cityOption, setCityOption] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [eventTypeOther, setEventTypeOther] = useState('')
  const [audienceWho, setAudienceWho] = useState<string[]>([])
  const [audienceWhoOther, setAudienceWhoOther] = useState('')
  const [minAgeRequirement, setMinAgeRequirement] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [location, setLocation] = useState('')
  const [fee, setFee] = useState('')
  const [feeDetail, setFeeDetail] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [organizerContact, setOrganizerContact] = useState('')
  const [officialUrl, setOfficialUrl] = useState('')
  const [signupNote, setSignupNote] = useState('')
  const [description, setDescription] = useState('')

  const currentCity = cityOption === '其他' ? customCity.trim() : cityOption
  const hasUnsavedContent = !!(
    title.trim() || province || cityOption || customCity.trim() || eventTypes.length > 0 || eventTypeOther.trim() ||
    audienceWho.length > 0 || audienceWhoOther.trim() || minAgeRequirement || startDate || startTime || endDate || endTime ||
    isOnline || location.trim() || fee || feeDetail.trim() || organizer.trim() || organizerContact.trim() || officialUrl.trim() ||
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

  const handlePickerChange = (e: any) => {
    const [provIdx, cityIdx] = e.detail.value
    const nextProvince = PROVINCES[provIdx] || ''
    const cities = LOCATION_DATA[nextProvince] || []
    const nextCityOption = cities[cityIdx] || ''
    setProvince(nextProvince)
    setCityOption(nextCityOption)
    if (nextCityOption !== '其他') setCustomCity('')
  }

  const handlePickerColumnChange = (e: any) => {
    if (e.detail.column === 0) {
      const nextProvince = PROVINCES[e.detail.value] || ''
      const firstCity = (LOCATION_DATA[nextProvince] || [])[0] || ''
      setProvince(nextProvince)
      setCityOption(firstCity)
      setCustomCity('')
    }
  }

  const handleSubmit = async () => {
    if (submitLockRef.current || submitting) return

    if (!title.trim()) { Taro.showToast({ title: '请填写活动标题', icon: 'none' }); return }
    if (!province || !currentCity) { Taro.showToast({ title: '请选择所在城市', icon: 'none' }); return }
    if (cityOption === '其他' && !customCity.trim()) { Taro.showToast({ title: '请输入真实城市名', icon: 'none' }); return }
    if (eventTypes.includes('其他') && !eventTypeOther.trim()) { Taro.showToast({ title: '请补充活动类型中的“其他”', icon: 'none' }); return }
    if (audienceWho.includes('其他') && !audienceWhoOther.trim()) { Taro.showToast({ title: '请补充参与对象中的“其他”', icon: 'none' }); return }
    if (!startDate || !startTime) { Taro.showToast({ title: '请完整填写开始时间', icon: 'none' }); return }
    if ((endDate && !endTime) || (!endDate && endTime)) { Taro.showToast({ title: '结束日期和时间请一起填写', icon: 'none' }); return }
    if (!fee) { Taro.showToast({ title: '请选择费用情况', icon: 'none' }); return }
    if (fee === '付费' && !feeDetail.trim()) { Taro.showToast({ title: '请补充付费说明', icon: 'none' }); return }
    if (!organizer.trim()) { Taro.showToast({ title: '请填写组织者', icon: 'none' }); return }
    if (!description.trim()) { Taro.showToast({ title: '请填写活动简介', icon: 'none' }); return }

    submitLockRef.current = true

    const confirm = await Taro.showModal({
      title: '提交活动',
      content: '提交后会进入人工审核队列，审核通过后才会出现在活动列表中。你可以发布自己组织的活动，也可以推荐公开活动。时间会按中国标准时间（UTC+8）保存。',
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
        title: title.trim(), province, city: currentCity, eventTypes,
        eventTypeOther: eventTypes.includes('其他') ? eventTypeOther.trim() : '',
        audienceWho, audienceWhoOther: audienceWho.includes('其他') ? audienceWhoOther.trim() : '',
        minAgeRequirement, startTime: combineDateTime(startDate, startTime),
        endTime: endDate && endTime ? combineDateTime(endDate, endTime) : '',
        isOnline, location: location.trim(), fee, feeDetail: fee === '付费' ? feeDetail.trim() : '',
        organizer: organizer.trim(), organizerContact: organizerContact.trim(), officialUrl: officialUrl.trim(),
        signupNote: signupNote.trim(), description: description.trim(),
      })
      if (result?.ok) {
        submittedRef.current = true
        setBeforeUnloadAlert(false, '')
        Taro.showToast({ title: '提交成功', icon: 'success' })
        setTimeout(() => Taro.navigateBack(), 700)
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
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '16px', boxSizing: 'border-box' }}>
      <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
        <Text style={{ ...typography.title, color: palette.text }}>发布或推荐活动</Text>
        <View style={{ marginTop: '6px' }}><Text style={{ ...typography.meta, color: palette.subtext }}>你可以提交自己组织的活动，也可以推荐你认为值得被看见的公开活动。请优先填写公开链接和公开报名方式。</Text></View>
      </View>

      <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', border: `1px solid ${palette.line}` }}>
        <SectionTitle text='活动标题' />
        <FormInputBox focused={focusedField === 'title'}><Input value={title} placeholder='例如：杭州家长圆桌讨论' onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField('')} onInput={(e) => setTitle(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>
        <SectionTitle text='所在城市' />
        <Picker mode='multiSelector' range={pickerRange} value={pickerValue} onChange={handlePickerChange} onColumnChange={handlePickerColumnChange}><FormInputBox marginBottom={cityOption === '其他' ? '8px' : '16px'}><View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}><Text style={{ ...typography.body, flex: 1, color: province ? palette.text : palette.muted }}>{province && currentCity ? `${province} · ${currentCity}` : '点击选择省份和城市'}</Text><Text style={{ ...typography.caption, color: palette.subtext }}>▼</Text></View></FormInputBox></Picker>
        {cityOption === '其他' && <View style={{ marginBottom: '16px' }}><View style={{ marginBottom: '6px' }}><Text style={{ ...typography.caption, color: palette.subtext }}>请输入真实城市名。地图会先按省级近似坐标展示，但列表里会显示你填写的城市。</Text></View><FormInputBox focused={focusedField === 'customCity'} marginBottom='0'><Input value={customCity} placeholder='例如：义乌 / 凯里 / 唐山' onFocus={() => setFocusedField('customCity')} onBlur={() => setFocusedField('')} onInput={(e) => setCustomCity(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox></View>}
        <SectionTitle text='活动类型（可多选）' /><MultiPillSelect options={EVENT_TYPE_OPTIONS} selected={eventTypes} onChange={setEventTypes} />
        {eventTypes.includes('其他') && <View style={{ marginBottom: '16px' }}><View style={{ marginBottom: '6px' }}><Text style={{ ...typography.caption, color: palette.subtext }}>补充活动类型中的“其他”。</Text></View><FormInputBox focused={focusedField === 'eventTypeOther'} marginBottom='0'><Input value={eventTypeOther} placeholder='例如：读书会 / 展映 / 体验营' onFocus={() => setFocusedField('eventTypeOther')} onBlur={() => setFocusedField('')} onInput={(e) => setEventTypeOther(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox></View>}
        <SectionTitle text='参与对象（可多选）' /><MultiPillSelect options={AUDIENCE_WHO_OPTIONS} selected={audienceWho} onChange={setAudienceWho} />
        {audienceWho.includes('其他') && <View style={{ marginBottom: '16px' }}><View style={{ marginBottom: '6px' }}><Text style={{ ...typography.caption, color: palette.subtext }}>补充参与对象中的“其他”。</Text></View><FormInputBox focused={focusedField === 'audienceWhoOther'} marginBottom='0'><Input value={audienceWhoOther} placeholder='例如：大学生 / 创作者 / 社区志愿者' onFocus={() => setFocusedField('audienceWhoOther')} onBlur={() => setFocusedField('')} onInput={(e) => setAudienceWhoOther(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox></View>}
        <SectionTitle text='最低年龄要求（选填）' /><SinglePillSelect options={MIN_AGE_OPTIONS} selected={minAgeRequirement} onChange={setMinAgeRequirement} />
        <SectionTitle text='开始时间' /><View style={{ display: 'flex', flexDirection: 'row', marginBottom: '12px' }}><Picker mode='date' value={startDate} onChange={(e) => setStartDate(e.detail.value)}><FormInputBox marginBottom='0'><Text style={{ ...typography.body, color: startDate ? palette.text : palette.muted }}>{startDate || '选择日期'}</Text></FormInputBox></Picker><Picker mode='time' value={startTime} onChange={(e) => setStartTime(e.detail.value)}><View style={{ width: '120px', marginLeft: '8px' }}><FormInputBox marginBottom='0'><Text style={{ ...typography.body, color: startTime ? palette.text : palette.muted }}>{startTime || '选择时间'}</Text></FormInputBox></View></Picker></View>
        <View style={{ marginTop: '-6px', marginBottom: '12px' }}><Text style={{ ...typography.micro, color: palette.muted }}>时间按中国标准时间 UTC+8 保存。</Text></View>
        <SectionTitle text='结束时间（选填）' /><View style={{ display: 'flex', flexDirection: 'row', marginBottom: '16px' }}><Picker mode='date' value={endDate} onChange={(e) => setEndDate(e.detail.value)}><FormInputBox marginBottom='0'><Text style={{ ...typography.body, color: endDate ? palette.text : palette.muted }}>{endDate || '选择日期'}</Text></FormInputBox></Picker><Picker mode='time' value={endTime} onChange={(e) => setEndTime(e.detail.value)}><View style={{ width: '120px', marginLeft: '8px' }}><FormInputBox marginBottom='0'><Text style={{ ...typography.body, color: endTime ? palette.text : palette.muted }}>{endTime || '选择时间'}</Text></FormInputBox></View></Picker></View>
        <SectionTitle text='线上活动' /><FormInputBox><View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, ...typography.body, color: palette.text }}>{isOnline ? '是，主要在线上进行' : '否，主要在线下进行'}</Text><Switch checked={isOnline} color={palette.accentDeep} onChange={(e) => setIsOnline(!!e.detail.value)} /></View></FormInputBox>
        <SectionTitle text={isOnline ? '平台 / 线上说明（选填）' : '地点说明（选填）'} /><FormInputBox focused={focusedField === 'location'}><Input value={location} placeholder={isOnline ? '例如：腾讯会议 / Zoom' : '例如：杭州西湖区某空间'} onFocus={() => setFocusedField('location')} onBlur={() => setFocusedField('')} onInput={(e) => setLocation(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>
        <SectionTitle text='费用' /><SinglePillSelect options={FEE_OPTIONS} selected={fee} onChange={(value) => { setFee(value); if (value !== '付费') setFeeDetail('') }} />
        {fee === '付费' && <View style={{ marginBottom: '16px' }}><View style={{ marginBottom: '6px' }}><Text style={{ ...typography.caption, color: palette.subtext }}>补充费用说明，例如：单次 49 元 / 四次 199 元。</Text></View><FormInputBox focused={focusedField === 'feeDetail'} marginBottom='0'><Input value={feeDetail} placeholder='例如：单次 49 元' onFocus={() => setFocusedField('feeDetail')} onBlur={() => setFocusedField('')} onInput={(e) => setFeeDetail(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox></View>}
        <SectionTitle text='组织者' /><FormInputBox focused={focusedField === 'organizer'}><Input value={organizer} placeholder='例如：自由学社 / 某教育团队 / 个人发起者' onFocus={() => setFocusedField('organizer')} onBlur={() => setFocusedField('')} onInput={(e) => setOrganizer(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>
        <SectionTitle text='组织者联系方式（选填）' /><View style={{ marginBottom: '6px' }}><Text style={{ ...typography.caption, color: palette.subtext }}>如果你是这个活动的组织者，可以填写你的微信号、手机号或其他联系方式。仅对填写过资料的可雀用户可见。</Text></View><FormInputBox focused={focusedField === 'organizerContact'}><Input value={organizerContact} placeholder='例如：微信号 / 手机号 / 邮箱' onFocus={() => setFocusedField('organizerContact')} onBlur={() => setFocusedField('')} onInput={(e) => setOrganizerContact(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>
        <SectionTitle text='公开链接（选填）' /><FormInputBox focused={focusedField === 'officialUrl'} marginBottom='12px'><Input value={officialUrl} placeholder='https://...' onFocus={() => setFocusedField('officialUrl')} onBlur={() => setFocusedField('')} onInput={(e) => setOfficialUrl(e.detail.value)} style={{ ...typography.body, color: palette.text }} /></FormInputBox>
        <SectionTitle text='报名方式补充说明（选填）' /><FormInputBox focused={focusedField === 'signupNote'} marginBottom='12px'><Textarea value={signupNote} placeholder='例如：先看公开主页，再联系组织者；或报名开放时间说明' maxlength={200} onFocus={() => setFocusedField('signupNote')} onBlur={() => setFocusedField('')} onInput={(e) => setSignupNote(e.detail.value)} style={{ width: '100%', minHeight: '60px', ...typography.body, color: palette.text }} /></FormInputBox>
        <SectionTitle text='活动简介' /><FormInputBox focused={focusedField === 'description'} marginBottom='8px'><Textarea value={description} placeholder='介绍活动内容、适合谁、预计会发生什么。请尽量填写结构化和公开可验证的信息。' maxlength={600} onFocus={() => setFocusedField('description')} onBlur={() => setFocusedField('')} onInput={(e) => setDescription(e.detail.value)} style={{ width: '100%', minHeight: '120px', ...typography.body, color: palette.text }} /></FormInputBox><View style={{ marginBottom: '16px' }}><Text style={{ ...typography.micro, color: palette.muted }}>{description.length}/600</Text></View>
      </View>
      <View style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'flex-start', backgroundColor: palette.cardSoft, borderRadius: '16px', padding: '12px 14px', marginTop: '14px', marginBottom: '20px', border: `1px dashed ${palette.line}` }}><AppIcon name='lock' size={22} bordered /><Text style={{ ...typography.caption, color: palette.subtext, flex: 1 }}>提交内容不会自动公开。组织者联系方式仅对填写过资料的可雀用户可见。请不要提交未公开的未成年人信息。</Text></View>
      <AppPrimaryButton text='提交活动' loadingText='提交中...' loading={submitting} onClick={handleSubmit} />
    </View>
  )
}
