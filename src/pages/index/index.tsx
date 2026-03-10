import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  cardSoft: '#FFF3E6',
  text: '#2F241B',
  subtext: '#7A6756',
  accent: '#F4A261',
  accentDeep: '#E76F51',
  accentSoft: '#FCE6D6',
  line: '#F1DFCF',
  green: '#7BAE7F',
}

export default function Index() {
  const goSchools = () => {
    Taro.switchTab({ url: '/pages/schools/index' })
  }

  const goEvents = () => {
    Taro.switchTab({ url: '/pages/events/index' })
  }

  return (
    <View
      style={{
        minHeight: '100vh',
        backgroundColor: palette.bg,
        padding: '20px 16px 28px',
        boxSizing: 'border-box',
      }}
    >
      <View
        style={{
          backgroundColor: palette.card,
          borderRadius: '22px',
          padding: '20px 18px 18px',
          boxSizing: 'border-box',
          marginBottom: '16px',
          border: `1px solid ${palette.line}`,
        }}
      >
        <View style={{ marginBottom: '10px' }}>
          <View
            style={{
              display: 'inline-block',
              padding: '6px 10px',
              borderRadius: '999px',
              backgroundColor: palette.accentSoft,
              marginBottom: '12px',
            }}
          >
            <Text style={{ fontSize: '12px', color: palette.accentDeep }}>
              自由学社 · 温暖明快版
            </Text>
          </View>

          <View style={{ marginBottom: '10px' }}>
            <Text
              style={{
                fontSize: '26px',
                fontWeight: 'bold',
                color: palette.text,
                lineHeight: '36px',
              }}
            >
              给休学 / 自学 / alternative education 家庭的探索入口
            </Text>
          </View>

          <Text
            style={{
              fontSize: '14px',
              color: palette.subtext,
              lineHeight: '22px',
            }}
          >
            先看学校，再看活动。少一点信息迷路，多一点真实线索与连接。
          </Text>
        </View>

        <View
          style={{
            marginTop: '16px',
            backgroundColor: palette.cardSoft,
            borderRadius: '18px',
            padding: '14px 14px 10px',
            boxSizing: 'border-box',
          }}
        >
          <View style={{ marginBottom: '8px' }}>
            <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>
              你现在可以做什么
            </Text>
          </View>

          <View style={{ marginBottom: '6px' }}>
            <Text style={{ fontSize: '13px', color: palette.subtext }}>
              1. 浏览全国学校信息
            </Text>
          </View>
          <View style={{ marginBottom: '6px' }}>
            <Text style={{ fontSize: '13px', color: palette.subtext }}>
              2. 搜索城市 / 类型 / 年龄段
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: '13px', color: palette.subtext }}>
              3. 查看夜聊与其他活动详情
            </Text>
          </View>
        </View>
      </View>

      <View
        onClick={goSchools}
        style={{
          backgroundColor: palette.card,
          borderRadius: '20px',
          padding: '18px 16px',
          boxSizing: 'border-box',
          marginBottom: '14px',
          border: `1px solid ${palette.line}`,
        }}
      >
        <View
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            backgroundColor: '#FFE8D6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <Text style={{ fontSize: '20px' }}>🏫</Text>
        </View>

        <View style={{ marginBottom: '6px' }}>
          <Text style={{ fontSize: '18px', fontWeight: 'bold', color: palette.text }}>
            进入学校库
          </Text>
        </View>

        <View style={{ marginBottom: '10px' }}>
          <Text style={{ fontSize: '14px', color: palette.subtext, lineHeight: '21px' }}>
            查看全国学校信息，按学校名、城市、类型快速搜索，再点进详情页深入看。
          </Text>
        </View>

        <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
          <View
            style={{
              padding: '5px 10px',
              borderRadius: '999px',
              backgroundColor: '#FFF3E6',
              marginRight: '8px',
              marginBottom: '6px',
            }}
          >
            <Text style={{ fontSize: '12px', color: palette.accentDeep }}>搜索</Text>
          </View>
          <View
            style={{
              padding: '5px 10px',
              borderRadius: '999px',
              backgroundColor: '#EEF7EE',
              marginRight: '8px',
              marginBottom: '6px',
            }}
          >
            <Text style={{ fontSize: '12px', color: palette.green }}>详情</Text>
          </View>
        </View>
      </View>

      <View
        onClick={goEvents}
        style={{
          backgroundColor: palette.card,
          borderRadius: '20px',
          padding: '18px 16px',
          boxSizing: 'border-box',
          marginBottom: '16px',
          border: `1px solid ${palette.line}`,
        }}
      >
        <View
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            backgroundColor: '#FFEFD8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <Text style={{ fontSize: '20px' }}>🌙</Text>
        </View>

        <View style={{ marginBottom: '6px' }}>
          <Text style={{ fontSize: '18px', fontWeight: 'bold', color: palette.text }}>
            进入活动页
          </Text>
        </View>

        <View style={{ marginBottom: '10px' }}>
          <Text style={{ fontSize: '14px', color: palette.subtext, lineHeight: '21px' }}>
            看夜聊和其他活动安排，了解时间、地点、费用、组织者，再决定要不要参加。
          </Text>
        </View>

        <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
          <View
            style={{
              padding: '5px 10px',
              borderRadius: '999px',
              backgroundColor: '#FFF3E6',
              marginRight: '8px',
              marginBottom: '6px',
            }}
          >
            <Text style={{ fontSize: '12px', color: palette.accentDeep }}>时间</Text>
          </View>
          <View
            style={{
              padding: '5px 10px',
              borderRadius: '999px',
              backgroundColor: '#EEF7EE',
              marginRight: '8px',
              marginBottom: '6px',
            }}
          >
            <Text style={{ fontSize: '12px', color: palette.green }}>详情</Text>
          </View>
        </View>
      </View>

      <View
        style={{
          backgroundColor: '#FFFDF9',
          borderRadius: '18px',
          padding: '14px 14px 12px',
          boxSizing: 'border-box',
          border: `1px dashed ${palette.line}`,
        }}
      >
        <View style={{ marginBottom: '6px' }}>
          <Text style={{ fontSize: '14px', fontWeight: 'bold', color: palette.text }}>
            小提醒
          </Text>
        </View>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
          这是一个还在生长中的版本。先把真实信息和真实连接跑起来，再慢慢长出更完整的地图、筛选和报名能力。
        </Text>
      </View>
    </View>
  )
}