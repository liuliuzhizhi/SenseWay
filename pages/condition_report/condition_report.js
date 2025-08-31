// pages/healthReport/healthReport.js
const AV = getApp().AV;  
const NAMES = ['气虚','平和','特禀','气郁','血瘀','湿热','痰湿','阴虚','阳虚']; // 顺时针，从正上方开始

Page({
  data: {
    scores: {},               // {平和: 3, ...} 来自 LeanCloud
    topType: '平和',
    labelPositions: [],       // 9 个标签的绝对定位 rpx 值
    open: { mood:false, diet:false, life:false },
    desc: {
      shape:'', mind:'', body:'', daily:'',
      guide: { mood:'', diet:'', life:'' }
    }
  },

  onLoad() {
    this.prepareLabelPositions();
  },

  onReady() {
    this.fetchScores().then(scores => {
      this.setData({ scores });
      const topType = this.getTopType(scores);
      this.setData({ topType, desc: TIZHI_DESC[topType] || TIZHI_DESC['平和'] });
      this.drawRadar(scores);
    });
  },

  onPullDownRefresh() {
    this.onReady();
    wx.stopPullDownRefresh();
  },

  /* 读取 LeanCloud 的 bodyconditionscore
     1) 优先从当前用户字段读取
     2) 若没有，则尝试从 UserProfile 表读取（按当前用户指针）
     3) 再不行，回落为 0 分模板（保证页面不报错） */
  async fetchScores() {
    try {
      const user = AV.User.current();
      if (user && user.get('bodyconditionscore')) {
        return user.get('bodyconditionscore');
      }
      if (user) {
        const UserProfile = AV.Object.extend('UserProfile');
        const query = new AV.Query(UserProfile);
        query.equalTo('user', user);
        const rec = await query.first();
        if (rec && rec.get('bodyconditionscore')) {
          return rec.get('bodyconditionscore');
        }
      }
    } catch (e) {
      console.warn('Fetch LeanCloud failed:', e);
    }
    // fallback 模板
    const zero = {};
    NAMES.forEach(n => zero[n] = 0);
    return zero;
  },

  getTopType(scores) {
    let top = NAMES[0], max = -Infinity;
    NAMES.forEach(n => {
      const v = Number(scores[n] || 0);
      if (v > max) { max = v; top = n; }
    });
    return top;
  },

  /* 计算九个体质标签的位置 */
  prepareLabelPositions() {
    const cx = 375 ;   // 微信认为所有手机的屏幕宽度是750响应像素，375位于中间。
    const cy = 250;   // rpx，略高一些
    const R  = 210;   // rpx，标签环半径
    const step = 2 * Math.PI / 9;
    const start = -Math.PI / 2; // 顶点从上方开始
    const pos = NAMES.map((name, i) => {
      const ang = start + i * step;
      const x = cx + Math.cos(ang) * (R + 26) - 24;  // 轻微位移，居中字符
      const y = cy + Math.sin(ang) * (R + 26) - 14;
      return { name, x: Math.round(x), y: Math.round(y) };
    });
    this.setData({ labelPositions: pos });
  },

  /* 绘制雷达图（5 层网格 + 折线 + 圆点） */
  drawRadar(scores) {
    const ctx = wx.createCanvasContext('radar', this);
    const cx = 212, cy = 150 ;
    const maxR = 108;           // 雷达半径
    const layers = 5;
    const stepAng = 2 * Math.PI / 9;
    const startAng = -Math.PI / 2;

    // 网格
    ctx.setStrokeStyle('#d6dfd8');
    for (let l = 1; l <= layers; l++) {
      const r = maxR * l / layers;
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const ang = startAng + i * stepAng;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    // 轴线
    for (let i = 0; i < 9; i++) {
      const ang = startAng + i * stepAng;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR);
      ctx.stroke();
    }

    // 数据多边形
    const getR = v => Math.max(0, Math.min(30, Number(v || 0))) / 30 * maxR;

    ctx.setFillStyle('rgba(31,81,52,.15)');
    ctx.setStrokeStyle('#1f5134');
    ctx.setLineWidth(2);

    ctx.beginPath();
    let pts = [];
    for (let i = 0; i < 9; i++) {
      const name = NAMES[i];
      const r = getR(scores[name]);
      const ang = startAng + i * stepAng;
      const x = cx+ Math.cos(ang) * r;
      const y = cy+ Math.sin(ang) * r;
      pts.push([x, y]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.setGlobalAlpha(1);
    ctx.stroke();
    ctx.fill();

    // 顶点小圆点
    ctx.setFillStyle('#1f5134');
    pts.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.draw();
  },

  toggle(e) {
    const key = e.currentTarget.dataset.key;
    const open = Object.assign({}, this.data.open, { [key]: !this.data.open[key] });
    this.setData({ open });
  }
});

/* ---------------- 固定文案（九种体质） ----------------
   文案简洁版，便于移动端阅读。你可按需要细化。 */
const TIZHI_DESC = {
  '平和': {
    shape: '体型匀称、面色红润、精力充沛。',
    mind:  '心态平和、情绪稳定、睡眠佳。',
    body:  '胃口好、二便正常、舌色红润有神。',
    daily: '继续保持，作息规律，适量运动。',
    guide: {
      mood: '保持愉悦，劳逸结合，可做冥想、腹式呼吸放松。',
      diet: '饮食均衡、谷蔬果肉搭配，少油少盐，七分饱。',
      life: '每周≥3次中等强度运动如快走/骑行30分钟。'
    }
  },
  '气虚': {
    shape: '少气懒言、易疲乏、出汗多。',
    mind:  '声音低弱、精神欠佳、易紧张。',
    body:  '舌淡苔白、易感冒、耐寒差。',
    daily: '注意保暖、避免过度劳累、适度午休。',
    guide: {
      mood: '循序渐进，避免情绪透支，建立小目标增强自信。',
      diet: '多食益气：山药、大枣、黄豆、鸡肉；少生冷。',
      life: '散步、八段锦等缓和运动；作息早，保证7–8小时睡眠。'
    }
  },
  '阳虚': {
    shape: '畏寒肢冷、面色白光、喜热饮。',
    mind:  '精神欠振、语声低微。',
    body:  '小便清长、舌淡胖苔白。',
    daily: '重在温阳保暖，避寒凉与久坐。',
    guide: {
      mood: '日照下晒背、温和社交，舒缓心情。',
      diet: '温补为主：羊肉、姜、桂圆；少食冷饮瓜果。',
      life: '温水泡脚，慢跑/快走，冬季注意颈腹腰防寒。'
    }
  },
  '阴虚': {
    shape: '形体偏瘦、手足心热、口干咽燥。',
    mind:  '心烦易躁、睡眠浅。',
    body:  '舌红少津、盗汗、便秘倾向。',
    daily: '滋阴养津，避免熬夜与辛辣烧烤。',
    guide: {
      mood: '练呼吸放松，适度冥想与拉伸舒缓。',
      diet: '养阴润燥：百合、沙参、银耳、芝麻；少辛辣酒咖啡。',
      life: '晚间电子屏少用；太极/瑜伽/慢跑，量以微汗为度。'
    }
  },
  '痰湿': {
    shape: '形体肥胖、肢体困重、胸闷多痰。',
    mind:  '精神困倦、思维迟缓。',
    body:  '口黏苔腻、面部油脂多。',
    daily: '化痰祛湿，控制甜腻与久坐。',
    guide: {
      mood: '规律作息减压，循序运动助代谢。',
      diet: '少甜少油，少奶茶；可取薏米、扁豆、冬瓜、陈皮。',
      life: '每天快走/骑行≥30分钟；室内勤通风，保持体重管理。'
    }
  },
  '湿热': {
    shape: '面垢油光、口苦口黏、易生痘。',
    mind:  '易急躁、心烦不宁。',
    body:  '小便短赤、大便不爽、舌红苔黄腻。',
    daily: '清热利湿，远离熬夜与辛辣烧烤。',
    guide: {
      mood: '晚间放下工作信息流，做10分钟深呼吸。',
      diet: '多绿叶蔬果、绿豆、冬瓜；少酒、烧烤、油炸。',
      life: '保证汗出通畅的有氧运动；晚睡人群先从提前30分钟做起。'
    }
  },
  '气郁': {
    shape: '胸胁胀满、咽中如梗、叹气多。',
    mind:  '情绪低落、敏感多思、易焦虑。',
    body:  '睡眠欠安、月经不调或痛经倾向。',
    daily: '疏肝解郁，多与人沟通，规律作息与运动。',
    guide: {
      mood: '情绪记录、与友人聊天、定期户外晒太阳。',
      diet: '柑橘类、玫瑰花茶、佛手、陈皮；少酒与浓茶咖啡。',
      life: '快走、慢跑、舞蹈等舒展运动；保证午后适度活动。'
    }
  },
  '血瘀': {
    shape: '面色晦暗、肌肤粗糙、疼痛固定。',
    mind:  '易烦躁，记忆力下降。',
    body:  '舌色紫暗或有瘀点，女性经色暗有块。',
    daily: '活血通络，避免久坐久站与熬夜。',
    guide: {
      mood: '做拉伸、泡澡、听舒缓音乐，减少情绪压抑。',
      diet: '山楂、桃仁、黑木耳、洋葱、姜；少冷冰食物。',
      life: '有氧+拉伸结合，久坐每50分钟起身活动。'
    }
  },
  '特禀': {
    shape: '对花粉/冷空气/食物等易过敏或不耐受。',
    mind:  '季节交替时易担忧、紧张。',
    body:  '皮肤瘙痒、打喷嚏、鼻塞流涕等。',
    daily: '避开诱因、增强屏障、规律作息。',
    guide: {
      mood: '减压放松，保持睡眠充足提升免疫调节。',
      diet: '清淡少刺激；可用益生元/富含维C食物；遵医嘱过敏期回避。',
      life: '通风清洁，外出佩戴口罩；循序渐进的耐寒锻炼。'
    }
  },
};
