import { useState, useMemo } from 'react'
import { View, Text, Input, Textarea, Picker } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  text: '#2F241B',
  subtext: '#7A6756',
  accentDeep: '#E76F51',
  accentSoft: '#FCE6D6',
  line: '#F1DFCF',
  green: '#7BAE7F',
  greenSoft: '#EEF7EE',
}

const LOCATION_DATA: Record<string, string[]> = {
  '北京': ['北京'], '上海': ['上海'], '天津': ['天津'], '重庆': ['重庆'],
  '广东': ['广州', '深圳', '珠海', '佛山', '东莞', '中山', '惠州', '其他'],
  '浙江': ['杭州', '宁波', '温州', '绍兴', '嘉兴', '金华', '台州', '湖州', '丽水', '衢州', '其他'],
  '江苏': ['南京', '苏州', '无锡', '常州', '南通', '徐州', '扬州', '其他'],
  '四川': ['成都', '绵阳', '德阳', '宜宾', '南充', '乐山', '广元', '其他'],
  '福建': ['福州', '厦门', '泉州', '漳州', '莆田', '其他'],
  '山东': ['济南', '青岛', '烟台', '潍坊', '临沂', '威海', '其他'],
  '湖北': ['武汉', '宜昌', '襄阳', '荆州', '其他'],
  '湖南': ['长沙', '株洲', '湘潭', '衡阳', '岳阳', '郴州', '其他'],
  '河南': ['郑州', '洛阳', '开封', '南阳', '其他'],
  '河北': ['石家庄', '唐山', '保定', '邯郸', '衡水', '其他'],
  '安徽': ['合肥', '芜湖', '蚌埠', '阜阳', '宣城', '其他'],
  '陕西': ['西安', '咸阳', '宝鸡', '延安', '其他'],
  '江西': ['南昌', '赣州', '九江', '景德镇', '其他'],
  '广西': ['南宁', '柳州', '桂林', '北海', '其他'],
  '云南': ['昆明', '大理', '丽江', '玉溪', '曲靖', '其他'],
  '贵州': ['贵阳', '遵义', '六盘水', '其他'],
  '山西': ['太原', '大同', '运城', '其他'],
  '辽宁': ['沈阳', '大连', '鞍山', '其他'],
  '吉林': ['长春', '吉林市', '延边', '通化', '其他'],
  '黑龙江': ['哈尔滨', '大庆', '齐齐哈尔', '黑河', '其他'],
  '内蒙古': ['呼和浩特', '包头', '鄂尔多斯', '其他'],
  '新疆': ['乌鲁木齐', '喀什', '伊犁', '其他'],
  '西藏': ['拉萨', '林芝', '日喀则', '其他'],
  '甘肃': ['兰州', '天水', '酒泉', '其他'],
  '青海': ['西宁', '海东', '其他'],
  '宁夏': ['银川', '吴忠', '其他'],
  '海南': ['海口', '三亚', '澄迈', '其他'],
  '香港': ['香港'], '澳门': ['澳门'],
  '台湾': ['台北', '新北', '高雄', '台中', '台南', '其他'],
  '海外': ['其他'],
}
const PROVINCES = Object.keys(LOCATION_DATA)
const GENDER_OPTIONS = ['男', '女', '其他', '不想说']
const AGE_RANGE_OPTIONS = ['18-25', '26-35', '36-45', '46-55', '55以上']
const ROLE_OPTIONS = ['家长', '教育者', '其他']
const CHILD_AGE_OPTIONS = ['学龄前', '小学阶段', '中学阶段']
const CHILD_STATUS_OPTIONS = ['寻找学习社区', '寻找同伴连接', '寻找项目活动', '寻找家庭支持', '自主探索中', '其他']

function SectionTitle(props: { text: string }) {
  return (
    <View style={{ marginBottom: '6px' }}>
      <Text style={{ fontSize: '13px', color: palette.accentDeep, fontWeight: 'bold' }}>{props.text}</Text>
    </View>
  )
}

function PillSelect(props: {
  options: string[]; selected: string | string[]; multi?: boolean
  onChange: (val: string | string[]) => void
}) {
  const { options, selected, multi, onChange } = props
  const selectedSet = new Set(Array.isArray(selected) ? selected : [selected])
  const handleTap = (opt: string) => {
    if (multi) {
      const arr = Array.isArray(selected) ? [...selected] : []
      onChange(arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt])
    } else {
      onChange(opt === selected ? '' : opt)
    }
  }
  return (
    <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '12px' }}>
      {options.map((opt) => {
        const active = selectedSet.has(opt)
        return (
          <View key={opt} onClick={() => handleTap(opt)} style={{
            padding: '6px 14px', borderRadius: '999px', marginRight: '8px', marginBottom: '8px',
            backgroundColor: active ? palette.accentDeep : '#F5F0EB',
            border: `1px solid ${active ? palette.accentDeep : palette.line}`,
          }}>
            <Text style={{ fontSize: '13px', color: active ? '#FFF' : palette.subtext }}>{opt}</Text>
          </View>
        )
      })}
    </View>
  )
}

type PendingReq = {
  _id: string; fromName: string; fromCity: string; fromRoles: string[]; fromBio: string; createdAt: string
}
type AcceptedConn = {
  _id: string; otherName: string; otherCity: string; otherRoles: string[]; otherBio: string
  otherWechat: string; otherChildInfo: { ageRange: string; status: string; interests: string } | null
  otherEduServices: string
}
type SentReq = {
  _id: string; toName: string; toCity: string; status: string; createdAt: string
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [gender, setGender] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [wechatId, setWechatId] = useState('')

  const [childAgeRange, setChildAgeRange] = useState('')
  const [childDropoutStatus, setChildDropoutStatus] = useState('')
  const [childInterests, setChildInterests] = useState('')

  const [eduServices, setEduServices] = useState('')
  const [bio, setBio] = useState('')

  const [pendingRequests, setPendingRequests] = useState<PendingReq[]>([])
  const [acceptedConnections, setAcceptedConnections] = useState<AcceptedConn[]>([])
  const [sentRequests, setSentRequests] = useState<SentReq[]>([])

  const isParent = roles.includes('家长')
  const isEducator = roles.includes('教育者')

  const pickerRange = useMemo(() => {
    const cities = province ? (LOCATION_DATA[province] || ['其他']) : ['请先选择省份']
    return [PROVINCES, cities]
  }, [province])
  const pickerValue = useMemo(() => {
    const provIdx = Math.max(0, PROVINCES.indexOf(province))
    const cities = province ? (LOCATION_DATA[province] || []) : []
    return [provIdx, Math.max(0, cities.indexOf(city))]
  }, [province, city])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const res: any = await Taro.cloud.callFunction({ name: 'getMe', data: {} })
      const p = res.result?.profile
      if (p) {
        setDisplayName(p.displayName || '')
        setGender(p.gender || '')
        setAgeRange(p.ageRange === '18岁以下' ? '' : (p.ageRange || ''))

        const sanitizedRoles = (Array.isArray(p.roles) ? p.roles : (p.role ? [p.role] : []))
          .filter((role) => role !== '学生')
        setRoles(sanitizedRoles)

        setProvince(p.province || '')
        setCity(p.city || '')
        setWechatId(p.wechatId || '')
        setChildAgeRange(CHILD_AGE_OPTIONS.includes(p.childAgeRange || '') ? (p.childAgeRange || '') : '')
        setChildDropoutStatus(
          CHILD_STATUS_OPTIONS.includes(p.childDropoutStatus || '') ? (p.childDropoutStatus || '') : ''
        )
        setChildInterests(p.childInterests || '')
        setEduServices(p.eduServices || '')
        setBio(p.bio || '')
      }
    } catch (err) {
      console.error('loadProfile error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadRequests = async () => {
    try {
      const res: any = await Taro.cloud.callFunction({ name: 'getMyRequests', data: {} })
      const r = res.result
      if (r?.ok) {
        setPendingRequests(r.pending || [])
        setAcceptedConnections(r.accepted || [])
        setSentRequests(r.sent || [])
      }
    } catch (err) {
      console.error('loadRequests error:', err)
    }
  }

  useDidShow(() => {
    loadProfile()
    loadRequests()
  })

  const handleSave = async () => {
    if (!displayName.trim()) {
      Taro.showToast({ title: '请填写显示名', icon: 'none' }); return
    }
    if (!province || !city) {
      Taro.showToast({ title: '请选择所在城市', icon: 'none' }); return
    }
    try {
      setSaving(true)
      const normalizedRoles = roles.filter((role) => role !== '学生')
      const normalizedAgeRange = ageRange === '18岁以下' ? '' : ageRange
      const normalizedChildStatus = CHILD_STATUS_OPTIONS.includes(childDropoutStatus) ? childDropoutStatus : ''
      const normalizedChildAgeRange = CHILD_AGE_OPTIONS.includes(childAgeRange) ? childAgeRange : ''

      const res: any = await Taro.cloud.callFunction({
        name: 'saveProfile',
        data: {
          displayName: displayName.trim(),
          gender,
          ageRange: normalizedAgeRange,
          roles: normalizedRoles,
          province,
          city,
          wechatId: wechatId.trim(),
          childAgeRange: isParent ? normalizedChildAgeRange : '',
          childDropoutStatus: isParent ? normalizedChildStatus : '',
          childInterests: isParent ? childInterests.trim() : '',
          eduServices: isEducator ? eduServices.trim() : '',
          bio: bio.trim(),
        },
      })
      const r = res.result
      if (r?.ok) {
        Taro.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => { loadProfile() }, 500)
      } else {
        Taro.showToast({ title: r?.message || '保存失败', icon: 'none' })
      }
    } catch (err: any) {
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const handleRespond = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      Taro.showLoading({ title: action === 'accept' ? '同意中...' : '处理中...' })
      const res: any = await Taro.cloud.callFunction({
        name: 'respondRequest',
        data: { requestId, action },
      })
      Taro.hideLoading()
      const r = res.result
      Taro.showToast({ title: r?.message || '已处理', icon: r?.ok ? 'success' : 'none' })
      if (r?.ok) loadRequests()
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const handlePickerChange = (e: any) => {
    const [provIdx, cityIdx] = e.detail.value
    const newProv = PROVINCES[provIdx] || ''
    const cities = LOCATION_DATA[newProv] || []
    setProvince(newProv)
    setCity(cities[cityIdx] || '')
  }
  const handlePickerColumnChange = (e: any) => {
    if (e.detail.column === 0) {
      const newProv = PROVINCES[e.detail.value] || ''
      setProvince(newProv)
      setCity((LOCATION_DATA[newProv] || [])[0] || '')
    }
  }

  const openPrivacyPolicy = () => {
    Taro.navigateTo({ url: '/pages/privacy-policy/index' })
  }

  if (loading) {
    return (
      <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '40px 20px', textAlign: 'center' }}>
        <Text style={{ fontSize: '14px', color: palette.subtext }}>加载中...</Text>
      </View>
    )
  }

  const totalPending = pendingRequests.length

  return (
    <View style={{
      minHeight: '100vh', backgroundColor: palette.bg,
      padding: '16px 16px 100px', boxSizing: 'border-box',
    }}>
      <View style={{
        backgroundColor: palette.card, borderRadius: '20px',
        padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}`,
      }}>
        <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>我的资料</Text>
        <View style={{ marginTop: '6px' }}>
          <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
            填写后你会出现在探索地图上，让同城的家庭和教育者发现你。
          </Text>
        </View>
      </View>

      {totalPending > 0 && (
        <View style={{
          backgroundColor: '#FFF3E6', borderRadius: '16px',
          padding: '12px 14px', marginBottom: '14px', border: `1px solid ${palette.line}`,
          display: 'flex', flexDirection: 'row', alignItems: 'center',
        }}>
          <Text style={{ fontSize: '14px', color: palette.accentDeep, fontWeight: 'bold', flex: 1 }}>
            你有 {totalPending} 条新的联络请求
          </Text>
          <Text style={{ fontSize: '12px', color: palette.subtext }}>下滑查看</Text>
        </View>
      )}

      <View style={{
        backgroundColor: palette.card, borderRadius: '20px',
        padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}`,
      }}>
        <SectionTitle text='显示名' />
        <View style={{
          backgroundColor: '#FFFDF9', borderRadius: '14px',
          padding: '10px 12px', marginBottom: '16px', border: `1px solid ${palette.line}`,
        }}>
          <Input value={displayName} placeholder='你希望别人怎么称呼你'
            onInput={(e) => setDisplayName(e.detail.value)}
            style={{ fontSize: '14px', color: palette.text }} />
        </View>

        <SectionTitle text='性别' />
        <PillSelect options={GENDER_OPTIONS} selected={gender} onChange={(v) => setGender(v as string)} />

        <SectionTitle text='年龄段' />
        <PillSelect options={AGE_RANGE_OPTIONS} selected={ageRange} onChange={(v) => setAgeRange(v as string)} />

        <SectionTitle text='身份（可多选）' />
        <PillSelect options={ROLE_OPTIONS} selected={roles} multi onChange={(v) => setRoles(v as string[])} />

        <SectionTitle text='所在城市' />
        <Picker mode='multiSelector' range={pickerRange} value={pickerValue}
          onChange={handlePickerChange} onColumnChange={handlePickerColumnChange}>
          <View style={{
            backgroundColor: '#FFFDF9', borderRadius: '14px',
            padding: '10px 12px', marginBottom: '12px', border: `1px solid ${palette.line}`,
            display: 'flex', flexDirection: 'row', alignItems: 'center',
          }}>
            <Text style={{ fontSize: '14px', flex: 1, color: province ? palette.text : '#C5B5A5' }}>
              {province && city ? `${province} · ${city}` : '点击选择省份和城市'}
            </Text>
            <Text style={{ fontSize: '12px', color: palette.subtext }}>▼</Text>
          </View>
        </Picker>

        <SectionTitle text='微信号（选填）' />
        <View style={{ marginBottom: '8px' }}>
          <Text style={{ fontSize: '12px', color: palette.subtext }}>
            仅在你同意对方的联络请求后，对方才能看到你的微信号
          </Text>
        </View>
        <View style={{
          backgroundColor: '#FFFDF9', borderRadius: '14px',
          padding: '10px 12px', marginBottom: '12px', border: `1px solid ${palette.line}`,
        }}>
          <Input value={wechatId} placeholder='你的微信号'
            onInput={(e) => setWechatId(e.detail.value)}
            style={{ fontSize: '14px', color: palette.text }} />
        </View>
      </View>

      {isParent && (
        <View style={{
          backgroundColor: palette.card, borderRadius: '20px',
          padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}`,
        }}>
          <View style={{ marginBottom: '10px' }}>
            <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.text }}>家庭教育关注</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '12px', color: palette.subtext }}>
                仅在你主动同意联络请求后展示，用于帮助对方理解你当前在寻找什么支持
              </Text>
            </View>
          </View>
          <SectionTitle text='孩子学段（选填）' />
          <PillSelect options={CHILD_AGE_OPTIONS} selected={childAgeRange} onChange={(v) => setChildAgeRange(v as string)} />
          <SectionTitle text='当前关注方向' />
          <PillSelect options={CHILD_STATUS_OPTIONS} selected={childDropoutStatus} onChange={(v) => setChildDropoutStatus(v as string)} />
          <SectionTitle text='希望补充说明的情况' />
          <View style={{
            backgroundColor: '#FFFDF9', borderRadius: '14px',
            padding: '10px 12px', border: `1px solid ${palette.line}`,
          }}>
            <Textarea value={childInterests} placeholder='比如：希望找线下同伴、项目制活动，或更适合当前阶段的学习支持...'
              maxlength={300} onInput={(e) => setChildInterests(e.detail.value)}
              style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '70px' }} />
          </View>
          <View style={{ marginTop: '4px', marginBottom: '8px' }}>
            <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{childInterests.length}/300</Text>
          </View>
        </View>
      )}

      {isEducator && (
        <View style={{
          backgroundColor: palette.card, borderRadius: '20px',
          padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}`,
        }}>
          <View style={{ marginBottom: '10px' }}>
            <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.text }}>你提供的教育服务</Text>
            <View style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '12px', color: palette.subtext }}>帮助家庭了解你能提供什么样的支持</Text>
            </View>
          </View>
          <View style={{
            backgroundColor: '#FFFDF9', borderRadius: '14px',
            padding: '10px 12px', border: `1px solid ${palette.line}`,
          }}>
            <Textarea value={eduServices} placeholder='比如：一对一升学规划咨询...'
              maxlength={500} onInput={(e) => setEduServices(e.detail.value)}
              style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '90px' }} />
          </View>
          <View style={{ marginTop: '4px', marginBottom: '8px' }}>
            <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{eduServices.length}/500</Text>
          </View>
        </View>
      )}

      <View style={{
        backgroundColor: palette.card, borderRadius: '20px',
        padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}`,
      }}>
        <SectionTitle text='一句话简介（选填）' />
        <View style={{ marginBottom: '8px' }}>
          <Text style={{ fontSize: '12px', color: palette.subtext }}>
            其他用户在地图上点击你的标记后会看到这句话
          </Text>
        </View>
        <View style={{
          backgroundColor: '#FFFDF9', borderRadius: '14px',
          padding: '10px 12px', border: `1px solid ${palette.line}`,
        }}>
          <Textarea value={bio} placeholder='简单介绍一下自己...'
            maxlength={200} onInput={(e) => setBio(e.detail.value)}
            style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '60px' }} />
        </View>
        <View style={{ marginTop: '4px' }}>
          <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{bio.length}/200</Text>
        </View>
      </View>

      <View style={{
        backgroundColor: '#FFFDF9', borderRadius: '16px',
        padding: '12px 14px', marginBottom: '12px', border: `1px dashed ${palette.line}`,
      }}>
        <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>
          🔒 你的显示名、身份、城市和简介会在地图上公开展示。微信号、家庭教育关注信息和教育服务内容仅在你同意联络请求后对特定用户可见。请避免填写可直接识别未成年人的敏感细节。
        </Text>
      </View>

      <View style={{ marginBottom: '20px', alignItems: 'center' }}>
        <Text onClick={openPrivacyPolicy} style={{ fontSize: '12px', color: palette.accentDeep }}>
          查看《用户协议与隐私政策》
        </Text>
      </View>

      <View onClick={saving ? undefined : handleSave} style={{
        backgroundColor: saving ? '#DDD' : palette.accentDeep,
        borderRadius: '16px', padding: '14px', textAlign: 'center', marginBottom: '30px',
      }}>
        <Text style={{ fontSize: '16px', color: '#FFF', fontWeight: 'bold' }}>
          {saving ? '保存中...' : '保存资料'}
        </Text>
      </View>

      <View style={{
        backgroundColor: palette.card, borderRadius: '20px',
        padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}`,
      }}>
        <Text style={{ fontSize: '18px', fontWeight: 'bold', color: palette.text }}>联络动态</Text>
      </View>

      {pendingRequests.length > 0 && (
        <View style={{ marginBottom: '14px' }}>
          <View style={{ marginBottom: '8px' }}>
            <Text style={{ fontSize: '13px', color: palette.accentDeep, fontWeight: 'bold' }}>
              收到的请求（{pendingRequests.length}）
            </Text>
          </View>
          {pendingRequests.map((req) => (
            <View key={req._id} style={{
              backgroundColor: palette.card, borderRadius: '16px',
              padding: '14px', marginBottom: '10px', border: `1px solid ${palette.line}`,
            }}>
              <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>{req.fromName}</Text>
              <View style={{ marginTop: '4px', marginBottom: '8px' }}>
                {req.fromCity ? (
                  <Text style={{ fontSize: '13px', color: palette.subtext }}>
                    {req.fromCity}{req.fromRoles?.length > 0 ? ' · ' + req.fromRoles.join('/') : ''}
                  </Text>
                ) : null}
                {req.fromBio ? (
                  <View style={{ marginTop: '4px' }}>
                    <Text style={{ fontSize: '12px', color: palette.subtext }}>{req.fromBio}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ display: 'flex', flexDirection: 'row' }}>
                <View onClick={() => handleRespond(req._id, 'accept')} style={{
                  padding: '6px 18px', borderRadius: '999px', backgroundColor: palette.green, marginRight: '10px',
                }}>
                  <Text style={{ fontSize: '13px', color: '#FFF', fontWeight: 'bold' }}>同意</Text>
                </View>
                <View onClick={() => handleRespond(req._id, 'reject')} style={{
                  padding: '6px 18px', borderRadius: '999px', backgroundColor: '#F5F0EB',
                }}>
                  <Text style={{ fontSize: '13px', color: palette.subtext }}>忽略</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {acceptedConnections.length > 0 && (
        <View style={{ marginBottom: '14px' }}>
          <View style={{ marginBottom: '8px' }}>
            <Text style={{ fontSize: '13px', color: palette.green, fontWeight: 'bold' }}>
              已建立联络（{acceptedConnections.length}）
            </Text>
          </View>
          {acceptedConnections.map((conn) => (
            <View key={conn._id} style={{
              backgroundColor: palette.card, borderRadius: '16px',
              padding: '14px', marginBottom: '10px', border: `1px solid ${palette.line}`,
            }}>
              <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>{conn.otherName}</Text>
              <View style={{ marginTop: '4px' }}>
                <Text style={{ fontSize: '13px', color: palette.subtext }}>
                  {conn.otherCity}{conn.otherRoles?.length > 0 ? ' · ' + conn.otherRoles.join('/') : ''}
                </Text>
              </View>
              {conn.otherBio ? (
                <View style={{ marginTop: '4px' }}>
                  <Text style={{ fontSize: '12px', color: palette.subtext }}>{conn.otherBio}</Text>
                </View>
              ) : null}

              {conn.otherWechat ? (
                <View
                  onClick={() => { Taro.setClipboardData({ data: conn.otherWechat }) }}
                  style={{
                    marginTop: '8px', backgroundColor: palette.greenSoft, borderRadius: '12px',
                    padding: '8px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: '13px', color: palette.green, flex: 1 }}>
                    微信: {conn.otherWechat}
                  </Text>
                  <Text style={{ fontSize: '11px', color: palette.subtext }}>点击复制</Text>
                </View>
              ) : (
                <View style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '12px', color: '#C5B5A5' }}>对方未填写微信号</Text>
                </View>
              )}

              {conn.otherChildInfo && (conn.otherChildInfo.ageRange || conn.otherChildInfo.status || conn.otherChildInfo.interests) ? (
                <View style={{
                  marginTop: '8px', backgroundColor: '#FFFDF9', borderRadius: '12px', padding: '8px 12px',
                }}>
                  <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold', marginBottom: '4px' }}>家庭教育关注</Text>
                  <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>
                    {[conn.otherChildInfo.ageRange, conn.otherChildInfo.status].filter(Boolean).join(' · ')}
                    {conn.otherChildInfo.interests ? `\n${conn.otherChildInfo.interests}` : ''}
                  </Text>
                </View>
              ) : null}

              {conn.otherEduServices ? (
                <View style={{
                  marginTop: '8px', backgroundColor: '#FFFDF9', borderRadius: '12px', padding: '8px 12px',
                }}>
                  <Text style={{ fontSize: '12px', color: palette.accentDeep, fontWeight: 'bold', marginBottom: '4px' }}>教育服务</Text>
                  <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>{conn.otherEduServices}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {sentRequests.length > 0 && (
        <View style={{ marginBottom: '14px' }}>
          <View style={{ marginBottom: '8px' }}>
            <Text style={{ fontSize: '13px', color: palette.subtext, fontWeight: 'bold' }}>
              我发出的请求（{sentRequests.length}）
            </Text>
          </View>
          {sentRequests.map((req) => (
            <View key={req._id} style={{
              backgroundColor: palette.card, borderRadius: '16px',
              padding: '12px 14px', marginBottom: '8px', border: `1px solid ${palette.line}`,
              display: 'flex', flexDirection: 'row', alignItems: 'center',
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '14px', color: palette.text }}>{req.toName}</Text>
                {req.toCity ? (
                  <Text style={{ fontSize: '12px', color: palette.subtext }}> · {req.toCity}</Text>
                ) : null}
              </View>
              <View style={{ padding: '3px 10px', borderRadius: '999px', backgroundColor: '#FFF3E6' }}>
                <Text style={{ fontSize: '11px', color: palette.accentDeep }}>等待回应</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {pendingRequests.length === 0 && acceptedConnections.length === 0 && sentRequests.length === 0 && (
        <View style={{
          backgroundColor: '#FFFDF9', borderRadius: '16px',
          padding: '20px', textAlign: 'center', marginBottom: '14px',
        }}>
          <Text style={{ fontSize: '13px', color: '#C5B5A5' }}>暂无联络动态</Text>
          <View style={{ marginTop: '6px' }}>
            <Text style={{ fontSize: '12px', color: '#C5B5A5' }}>在探索页点击同路人，发起你的第一个联络请求</Text>
          </View>
        </View>
      )}
    </View>
  )
}
