import { useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { fetchSchools, fetchEvents } from '@/services/api'
//import './index.scss'

export default function Index() {
  const [openid, setOpenid] = useState('')
  const [schools, setSchools] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchOpenId = async () => {
    try {
      const res = await Taro.cloud.callFunction({
        name: 'getOpenId',
        data: {},
      })
      console.log('getOpenId result:', res.result)

      const id = (res.result as any)?.openid || ''
      setOpenid(id)

      Taro.showToast({ title: '拿到 openid 了（看控制台）', icon: 'none' })
    } catch (err) {
      console.error('getOpenId error:', err)
      Taro.showToast({ title: '调用失败（看控制台）', icon: 'none' })
    }
  }

  const testSchools = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await fetchSchools()
      console.log('schools data:', data)
      setSchools(Array.isArray(data) ? data : [])
      Taro.showToast({ title: 'schools 请求成功', icon: 'none' })
    } catch (err: any) {
      console.error('testSchools error:', err)
      setError(err?.message || 'schools 请求失败')
      Taro.showToast({ title: 'schools 请求失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const testEvents = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await fetchEvents()
      console.log('events data:', data)
      setEvents(Array.isArray(data) ? data : [])
      Taro.showToast({ title: 'events 请求成功', icon: 'none' })
    } catch (err: any) {
      console.error('testEvents error:', err)
      setError(err?.message || 'events 请求失败')
      Taro.showToast({ title: 'events 请求失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    console.log('Page loaded.')
  })

  return (
    <View className='index' style={{ padding: '24px' }}>
      <Text>Hello world!</Text>

      <View style={{ marginTop: '16px' }}>
        <Button onClick={fetchOpenId}>测试：调用 getOpenId</Button>
      </View>

      <View style={{ marginTop: '16px' }}>
        <Text selectable>
          {openid ? `openid: ${openid}` : '还没获取 openid（点按钮）'}
        </Text>
      </View>

      <View style={{ marginTop: '24px' }}>
        <Button onClick={testSchools} loading={loading}>
          测试：读取 schools
        </Button>
      </View>

      <View style={{ marginTop: '12px' }}>
        <Button onClick={testEvents} loading={loading}>
          测试：读取 events
        </Button>
      </View>

      <View style={{ marginTop: '16px' }}>
        <Text>{error ? `错误：${error}` : '暂无错误'}</Text>
      </View>

      <View style={{ marginTop: '24px' }}>
        <Text>Schools count: {schools.length}</Text>
      </View>

      {schools.map((item) => (
        <View key={item.id} style={{ marginTop: '8px' }}>
          <Text>
            {item.name} | {item.province} {item.city}
          </Text>
        </View>
      ))}

      <View style={{ marginTop: '24px' }}>
        <Text>Events count: {events.length}</Text>
      </View>

      {events.map((item) => (
        <View key={item.id} style={{ marginTop: '8px' }}>
          <Text>
            {item.title} | {item.event_type}
          </Text>
        </View>
      ))}
    </View>
  )
}