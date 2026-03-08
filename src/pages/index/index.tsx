import { useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import './index.scss'

export default function Index() {
  const [openid, setOpenid] = useState('')

  const fetchOpenId = async () => {
    try {
      // 调用云函数：name 必填，data 可选
      const res = await Taro.cloud.callFunction({
        name: 'getOpenId',
        data: {},
      })
      console.log('getOpenId result:', res.result)

      // 兼容你当前云函数返回结构
      const id = (res.result as any)?.openid || ''
      setOpenid(id)

      Taro.showToast({ title: '拿到 openid 了（看控制台）', icon: 'none' })
    } catch (err) {
      console.error('getOpenId error:', err)
      Taro.showToast({ title: '调用失败（看控制台）', icon: 'none' })
    }
  }

  useLoad(() => {
    console.log('Page loaded.')
    // 你也可以取消注释让它自动调用一次
    // fetchOpenId()
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
    </View>
  )
}