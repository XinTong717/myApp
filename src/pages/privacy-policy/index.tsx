import { View, Text } from '@tarojs/components'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  text: '#2F241B',
  subtext: '#7A6756',
  accentDeep: '#E76F51',
  line: '#F1DFCF',
}

function Section(props: { title: string; children: any }) {
  return (
    <View style={{
      backgroundColor: palette.card,
      borderRadius: '18px',
      padding: '16px',
      marginBottom: '14px',
      border: `1px solid ${palette.line}`,
    }}>
      <View style={{ marginBottom: '8px' }}>
        <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>{props.title}</Text>
      </View>
      {props.children}
    </View>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '16px', boxSizing: 'border-box' }}>
      <View style={{ marginBottom: '14px' }}>
        <Text style={{ fontSize: '24px', fontWeight: 'bold', color: palette.text }}>用户协议与隐私政策</Text>
        <View style={{ marginTop: '6px' }}>
          <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>
            更新日期：2026-04-19
          </Text>
        </View>
      </View>

      <Section title='1. 适用范围'>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '22px' }}>
          本政策适用于可雀小程序内的学习社区浏览、活动查看、同路人联络、资料填写与信息纠错等功能。你在使用这些功能时主动提交的信息，将按本政策处理。
        </Text>
      </Section>

      <Section title='2. 我们会收集哪些信息'>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '22px' }}>
          你主动填写的信息可能包括：显示名、身份、所在省市、个人简介、微信号，以及你选择提供的家庭教育关注信息或教育服务信息。为实现联络功能，我们还会处理联络请求记录、请求状态与相关时间信息。
        </Text>
      </Section>

      <Section title='3. 我们如何使用这些信息'>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '22px' }}>
          我们使用这些信息提供地图浏览、学习社区信息展示、活动查看、同路人联络、资料保存与信息纠错处理等功能；同时用于必要的内容安全校验、故障排查与风险控制。
        </Text>
      </Section>

      <Section title='4. 哪些信息会公开展示'>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '22px' }}>
          默认公开展示的信息包括：显示名、身份、城市和简介。微信号、家庭教育关注信息和教育服务内容，仅在你主动同意联络请求后，才会对特定用户可见。请勿填写可直接识别未成年人的敏感细节。
        </Text>
      </Section>

      <Section title='5. 信息存储与保存期限'>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '22px' }}>
          当前服务的数据存储与处理主要依托腾讯云云开发等中国境内基础设施。我们会在实现前述目的所必需的最短期限内保存你的信息；当你主动清空、修改、撤回相关资料，或在业务上不再需要时，我们会相应减少展示或删除相关数据。
        </Text>
      </Section>

      <Section title='6. 你的权利'>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '22px' }}>
          你可以在【我的】页查看、修改、补充或清空你主动填写的资料。若你希望进一步删除信息、停止展示或反馈隐私问题，可以通过产品内现有入口或后续公示的联系方式与我们联系。
        </Text>
      </Section>

      <Section title='7. 未成年人相关说明'>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '22px' }}>
          本产品当前面向成年人使用。若你以家长身份填写家庭教育关注信息，请仅提供实现联络所必要的概括性信息，避免提交可直接识别未成年人的敏感信息。
        </Text>
      </Section>

      <Section title='8. 政策更新'>
        <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '22px' }}>
          当产品功能、处理方式或合规要求发生变化时，我们可能更新本政策，并通过页面更新的方式向你说明。继续使用相关功能，表示你理解并接受更新后的政策内容。
        </Text>
      </Section>
    </View>
  )
}
