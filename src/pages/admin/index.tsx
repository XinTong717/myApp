import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { checkAdminAccess } from '../../services/profile'
import AppCard from '../../components/common/AppCard'
import AppChip from '../../components/common/AppChip'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

function AdminConsoleCard(props: { title: string; description: string; tag: string; onClick: () => void }) {
  return (
    <AppCard onClick={props.onClick} border marginBottom={space(3)}>
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(2) }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.cardTitle, color: palette.text }}>{props.title}</Text>
        </View>
        <AppChip text={props.tag} tone='brand' />
      </View>
      <Text style={{ ...typography.meta, color: palette.subtext }}>{props.description}</Text>
      <View style={{ marginTop: space(3) }}>
        <Text style={{ ...typography.meta, color: palette.brand, fontWeight: 'bold' }}>打开 →</Text>
      </View>
    </AppCard>
  )
}

export default function AdminConsolePage() {
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminName, setAdminName] = useState('admin')
  const [error, setError] = useState('')

  const checkAdminAndInit = async () => {
    try {
      setChecking(true)
      setError('')
      const result = await checkAdminAccess()
      if (result?.ok && result?.isAdmin) {
        setIsAdmin(true)
        setAdminName(result.admin?.name || 'admin')
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

  return (
    <ScrollView scrollY style={{ minHeight: '100vh', backgroundColor: palette.bg }}>
      <View style={{ padding: space(4), boxSizing: 'border-box' }}>
        <AppCard border>
          <Text style={{ ...typography.title, color: palette.text }}>审核台</Text>
          <View style={{ marginTop: space(2) }}>
            <Text style={{ ...typography.meta, color: palette.subtext }}>
              管理员专用入口。当前产品不提供私信、好友申请或自动撮合；审核台只处理活动发布和学习社区推荐的人工闭环。
            </Text>
          </View>
          <View style={{ marginTop: space(3), backgroundColor: palette.cardSoft, borderRadius: radius.md, padding: `${space(2)} ${space(3)}` }}>
            <Text style={{ ...typography.caption, color: palette.subtext }}>
              {isAdmin ? `当前管理员：${adminName}` : (error || '你当前没有管理员权限。')}
            </Text>
          </View>
        </AppCard>

        {isAdmin ? (
          <>
            <AdminConsoleCard
              title='活动审核'
              description='查看活动提交，生成发布 payload，一键写入 events，并回写审核状态。'
              tag='event_submissions'
              onClick={() => Taro.navigateTo({ url: '/pages/admin/event-reviews/index' })}
            />
            <AdminConsoleCard
              title='学习社区推荐'
              description='查看用户推荐的学习社区，按详情页字段复制发布信息，再录入或合并到 schools / school_locations。'
              tag='school_submissions'
              onClick={() => Taro.navigateTo({ url: '/pages/admin/school-submissions/index' })}
            />
          </>
        ) : null}
      </View>
    </ScrollView>
  )
}
