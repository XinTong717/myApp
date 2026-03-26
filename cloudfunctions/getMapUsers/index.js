const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    // 读取有省份+城市的用户（说明填过资料），只返回地图需要的公开字段
    const res = await db.collection('users')
      .where({
        province: _.exists(true),
        city: _.exists(true),
      })
      .field({
        displayName: true,
        roles: true,
        province: true,
        city: true,
        bio: true,
        // 不返回：childGender, childAgeRange, childInterests, eduServices, contact 等隐私字段
      })
      .limit(500)
      .get()

    return {
      ok: true,
      users: res.data || [],
    }
  } catch (err) {
    console.error('getMapUsers error:', err)
    return {
      ok: false,
      users: [],
      error: err.message,
    }
  }
}
