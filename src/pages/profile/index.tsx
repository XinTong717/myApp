import { useState } from 'react'
import { View, Text, Input, Textarea, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getMe, saveProfile } from '../../services/user'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  text: '#2F241B',
  subtext: '#7A6756',
  accentDeep: '#E76F51',
  accentSoft: '#FCE6D6',
  line: '#F1DFCF',
}

const ROLE_OPTIONS = ['学生', '家长', '教育者', '其他']

export default function ProfilePage() {
  const [openid, setOpenid] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [contact, setContact] = useState('')

  const loadMe = async () => {
    try {
      setLoading(true)
      const res = await getMe()

      setOpenid(res.openid || '')

      if (res.profile) {
        setDisplayName(res.profile.displayName || '')
        setRole(res.profile.role || '')
        setCity(res.profile.city || '')
        setBio(res.profile.bio || '')
        setContact(res.profile.contact || '')
      }
    } catch (err) {
      console.error('loadMe error:', err)
      Taro.showToast({ title: '读取资料失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadMe()
  })

  const handleSave = async () => {
    if (!displayName.trim()) {
      Taro.showToast({ title: '请先填写显示名', icon: 'none' })
      return
    }

    try {
      setSaving(true)

      const res = await saveProfile({
        displayName,
        role,
        city,
        bio,
        contact,
      })

      if (!res.ok) {
        Taro.showToast({ title: res.message || '保存失败', icon: 'none' })
        return
      }

      Taro.showToast({ title: '保存成功', icon: 'success' })
      loadMe()
    } catch (err) {
      console.error('saveProfile error:', err)
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View
      style={{
        minHeight: '100vh',
        backgroundColor: palette.bg,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <View
        style={{
          backgroundColor: palette.card,
          borderRadius: '20px',
          padding: '16px',
          border: `1px solid ${palette.line}`,
          marginBottom: '14px',
        }}
      >
        <View style={{ marginBottom: '8px' }}>
          <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>
            我的资料
          </Text>
        </View>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
          先填写一个最小版本，后面再慢慢补充。
        </Text>
      </View>

      <View
        style={{
          backgroundColor: palette.card,
          borderRadius: '20px',
          padding: '16px',
          border: `1px solid ${palette.line}`,
        }}
      >
        {loading ? (
          <Text style={{ color: palette.subtext }}>加载中...</Text>
        ) : (
          <>
            <View style={{ marginBottom: '14px' }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep }}>微信用户 ID</Text>
              <View style={{ marginTop: '6px' }}>
                <Text style={{ fontSize: '13px', color: palette.subtext }}>
                  {openid || '未获取'}
                </Text>
              </View>
            </View>

            <View style={{ marginBottom: '14px' }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep }}>显示名</Text>
              <View
                style={{
                  marginTop: '6px',
                  backgroundColor: '#FFFDF9',
                  borderRadius: '12px',
                  padding: '10px 12px',
                }}
              >
                <Input
                  value={displayName}
                  placeholder='你希望别人怎么称呼你'
                  onInput={(e) => setDisplayName(e.detail.value)}
                />
              </View>
            </View>

            <View style={{ marginBottom: '14px' }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep }}>身份</Text>
              <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '8px' }}>
                {ROLE_OPTIONS.map((item) => {
                  const active = role === item
                  return (
                    <View
                      key={item}
                      onClick={() => setRole(item)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '999px',
                        marginRight: '8px',
                        marginBottom: '8px',
                        backgroundColor: active ? '#FCE6D6' : '#FFFDF9',
                        border: `1px solid ${active ? '#F4A261' : palette.line}`,
                      }}
                    >
                      <Text style={{ fontSize: '13px', color: active ? palette.accentDeep : palette.subtext }}>
                        {item}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>

            <View style={{ marginBottom: '14px' }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep }}>城市</Text>
              <View
                style={{
                  marginTop: '6px',
                  backgroundColor: '#FFFDF9',
                  borderRadius: '12px',
                  padding: '10px 12px',
                }}
              >
                <Input
                  value={city}
                  placeholder='你目前在哪个城市'
                  onInput={(e) => setCity(e.detail.value)}
                />
              </View>
            </View>

            <View style={{ marginBottom: '14px' }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep }}>一句话简介</Text>
              <View
                style={{
                  marginTop: '6px',
                  backgroundColor: '#FFFDF9',
                  borderRadius: '12px',
                  padding: '10px 12px',
                }}
              >
                <Textarea
                  value={bio}
                  placeholder='简单介绍一下自己或你的需求'
                  maxlength={300}
                  autoHeight
                  onInput={(e) => setBio(e.detail.value)}
                />
              </View>
            </View>

            <View style={{ marginBottom: '18px' }}>
              <Text style={{ fontSize: '12px', color: palette.accentDeep }}>联系方式</Text>
              <View
                style={{
                  marginTop: '6px',
                  backgroundColor: '#FFFDF9',
                  borderRadius: '12px',
                  padding: '10px 12px',
                }}
              >
                <Input
                  value={contact}
                  placeholder='比如微信号 / 邮箱（选填）'
                  onInput={(e) => setContact(e.detail.value)}
                />
              </View>
            </View>

            <Button
              loading={saving}
              onClick={handleSave}
              style={{
                backgroundColor: '#F4A261',
                color: '#fff',
                borderRadius: '999px',
              }}
            >
              保存资料
            </Button>
          </>
        )}
      </View>
    </View>
  )
}