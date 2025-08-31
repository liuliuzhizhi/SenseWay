// pages/MoodDietReport/MoodDietReport.js
const AV = getApp().AV; // 假定 LeanCloud 已被注入到 getApp().AV
const app = getApp();

Page({
  data: {
    mealScores: null,
    emotionScores: null,
    emotionReasonsCount: {},
    mealScoreBuckets: [0,0,0,0],
    lineTooltip: { show:false, left:0, top:0, text: '' },
    donutTooltip: { show:false, left:0, top:0, text: '' },
    pieTooltip: { show:false, left:0, top:0, text: '' },
    corr: null,
    dpr: 1,
    lineCanvasWH: {w: 0, h: 0},
    smallCanvasWH: {w:0,h:0}
  },

  onLoad() {
    this.fetchAllDataAndDraw();
  },

  async fetchAllDataAndDraw() {
    try {
      const user = AV.User && AV.User.current ? AV.User.current() : null;
      if (!user) {
        wx.showToast({title:'请先登录', icon:'none'});
        return;
      }

      const [mealTable, emotionTable, emotionRecord, mealRecord] = await Promise.all([
        this.querySingleRecord('UserScoreMeal', user),
        this.querySingleRecord('UserScoreEmotion', user),
        this.queryRecords('EmotionRecord', user),
        this.queryRecords('MealRecord', user)
      ]);

      const mealScores = this.extractDaysArray(mealTable);
      const emotionScores = this.extractDaysArray(emotionTable);
      this.setData({ mealScores, emotionScores });

      let corr = null;
      if (mealScores && emotionScores && mealScores.length===7 && emotionScores.length===7) {
        corr = this.pearsonCorrelation(mealScores, emotionScores);
        corr = corr.toFixed(3);
      }
      this.setData({ corr });

      const reasonsCount = { work_pressure:0, poor_sleep:0, weather:0, others:0 };
      if (Array.isArray(emotionRecord)) {
        for (const rec of emotionRecord) {
          const cell = rec.get ? (rec.get('emotionreasons') || rec.attributes && rec.attributes.emotionreasons) : rec.emotionreasons;
          if (!cell) continue;
          let parsed = null;
          if (typeof cell === 'string') {
            try { parsed = JSON.parse(cell); } catch(e){ parsed = null; }
          } else { parsed = cell; }
          if (parsed && parsed.reasons && Array.isArray(parsed.reasons)) {
            parsed.reasons.forEach(r=>{
              if (r === 'work_pressure') reasonsCount.work_pressure++;
              else if (r === 'poor_sleep') reasonsCount.poor_sleep++;
              else if (r === 'weather') reasonsCount.weather++;
              else reasonsCount.others++;
            });
          }
        }
      }
      this.setData({ emotionReasonsCount: reasonsCount });

      const buckets = [0,0,0,0];
      if (Array.isArray(mealRecord)) {
        for (const rec of mealRecord) {
          const sc = rec.get ? rec.get('score') || rec.attributes && rec.attributes.score : rec.score;
          const n = Number(sc);
          if (isNaN(n)) continue;
          if (n >=1 && n <=25) buckets[0]++;
          else if (n <=50) buckets[1]++;
          else if (n <=75) buckets[2]++;
          else buckets[3]++;
        }
      }
      this.setData({ mealScoreBuckets: buckets });

      wx.nextTick(() => {
        this.prepareCanvasesAndDraw();
      });

    } catch (err) {
      console.error(err);
      wx.showToast({ title: '读取数据失败', icon: 'none' });
    }
  },

  async querySingleRecord(tableName, user) {
    const q = new AV.Query(tableName);
    try {
      q.equalTo('user', user);
      q.limit(1);
      const r = await q.find();
      if (r && r.length) return r[0];
    } catch(e){}

    const q2 = new AV.Query(tableName);
    try {
      q2.equalTo('owner', user);
      q2.limit(1);
      const r2 = await q2.find();
      if (r2 && r2.length) return r2[0];
    } catch(e){}

    const q3 = new AV.Query(tableName);
    q3.limit(1);
    const res3 = await q3.find();
    return (res3 && res3.length>0) ? res3[0] : null;
  },

  async queryRecords(tableName, user) {
    const queries = [];
    const q1 = new AV.Query(tableName);
    try { q1.equalTo('user', user); queries.push(q1.find()); } catch(e){}
    const q2 = new AV.Query(tableName);
    try { q2.equalTo('owner', user); queries.push(q2.find()); } catch(e){}
    const q3 = new AV.Query(tableName);
    q3.limit(1000);
    queries.push(q3.find());
    const resultsList = await Promise.all(queries.map(p => p.catch(()=>[])));
    const merged = [].concat(...resultsList);
    const seen = new Set();
    const finalList = [];
    for (const r of merged) {
      const id = r.id || r.objectId || JSON.stringify(r);
      if (!seen.has(id)) { seen.add(id); finalList.push(r); }
    }
    return finalList;
  },

  extractDaysArray(record) {
    if (!record) return null;
    const getVal = (rec, key) => {
      if (!rec) return null;
      if (rec.get) {
        const v = rec.get(key);
        return (v === undefined || v === null) ? null : Number(v);
      } else if (rec.attributes) {
        const v = rec.attributes[key];
        return (v === undefined || v === null) ? null : Number(v);
      } else {
        return rec[key] !== undefined ? Number(rec[key]) : null;
      }
    };
    const arr = [];
    for (let i=1;i<=7;i++) {
      const v = getVal(record, `day${i}`);
      arr.push((v===null || isNaN(v)) ? null : v);
    }
    if (arr.every(v=>v===null)) return null;
    return arr.map(v => v===null ? 0 : v);
  },

  pearsonCorrelation(x, y) {
    const n = x.length;
    let sumX=0,sumY=0,sumXY=0,sumX2=0,sumY2=0;
    for (let i=0;i<n;i++){
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i]*y[i];
      sumX2 += x[i]*x[i];
      sumY2 += y[i]*y[i];
    }
    const numerator = (n*sumXY - sumX*sumY);
    const denom = Math.sqrt((n*sumX2 - sumX*sumX)*(n*sumY2 - sumY*sumY));
    if (denom === 0) return 0;
    return numerator/denom;
  },

  prepareCanvasesAndDraw() {
    const sys = wx.getSystemSetting();
    const dpr = sys.pixelRatio || 1;
    this.setData({ dpr });

    const query = wx.createSelectorQuery();
    query.select('.line-canvas').boundingClientRect();
    query.select('.small-canvas1').boundingClientRect();
    query.exec(res => {
      if (!res || res.length < 2) return;
      const lineRect = res[0];
      const smallRect = res[1];
      const wLine = Math.round(lineRect.width * dpr);
      const hLine = Math.round(lineRect.height * dpr);
      const wSmall = Math.round(smallRect.width * dpr);
      const hSmall = Math.round(smallRect.height * dpr);
      this.setData({ lineCanvasWH: {w: wLine, h: hLine}, smallCanvasWH: {w: wSmall, h: hSmall} }, ()=>{
        this.drawLineChart();
        this.drawDonutChart();
        this.drawPieChart();
      });
    });
  },

  drawLineChart() {
    // 从 data 中获取两条折线的数据，如果不存在则用 0 填充
    const meal = this.data.mealScores || [0,0,0,0,0,0,0];   // 饮食评分（每一天一个点）
    const emo  = this.data.emotionScores || [0,0,0,0,0,0,0]; // 心情评分（每一天一个点）

    // 获取设备像素比 (device pixel ratio)，用来保证高清屏幕下图形不会模糊
    const dpr = this.data.dpr;

    // 获取 canvas 的逻辑宽高（实际像素宽高），是通过前面测量得到的
    const {w,h} = this.data.lineCanvasWH;

    // 创建一个 canvas 绘图上下文（小程序 API）
    const ctx = wx.createCanvasContext('lineCanvas', this);

    // 清空画布区域（注意这里用 w/dpr, h/dpr 转换成 CSS 尺寸）
    ctx.clearRect(0,0,w/dpr,h/dpr);

    ctx.save();                // 保存当前绘图状态
    ctx.scale(1/dpr,1/dpr);    // 将坐标系缩小，保证高清屏幕下绘图比例正常

    // 计算 CSS 尺寸（逻辑像素），用于后续计算坐标
    const cssW = w / dpr;
    const cssH = h / dpr;

    // 填充背景为白色
    ctx.setFillStyle('#fff');
    ctx.fillRect(0,0,cssW,cssH);

    // 定义绘图区的四周留白（padding）
    const left = 50;   // 左边留白（给 y 轴刻度文字用）
    const right = 50;  // 右边留白
    const top = 20;    // 上边留白
    const bottom = 40; // 下边留白（给 x 轴文字用）

    // 计算实际绘图区的宽高
    const plotW = cssW - left - right;
    const plotH = cssH - top - bottom;

    // 定义 y 轴的缩放函数 (把 0~100 的数据值映射到画布坐标)
    const yScale = v => top + plotH*(1 - v/100);
    // v=0 -> 底部 (top+plotH)
    // v=100 -> 顶部 (top)

    // 计算 x 轴上 7 天的横坐标
    const xPositions = [];
    for (let i=0;i<7;i++){
      xPositions.push(left + plotW*(i/6));  // 0~6 均匀分布
    }

    // 设置字体大小
    ctx.setFontSize(12);
    

    // 先设置横线样式为虚线
    ctx.setStrokeStyle('#999');   // 横线颜色
    ctx.setLineDash([4, 4], 0);   // 横线虚线 [线长, 间隔]

    // 绘制 y 轴刻度线和数字 (0,20,40,60,80,100)
    ctx.setFontSize(12);       // 字号
    ctx.setFillStyle('#000');  // 文字颜色
    for (let y = 20; y<=100; y+=20) {
      const yy = yScale(y);      // 计算 y 对应的画布坐标
      ctx.beginPath();
      ctx.moveTo(left, yy);      // 起点 (左边)
      ctx.lineTo(left+plotW, yy);// 终点 (右边)
      ctx.stroke();
      ctx.fillText(String(y), 8, yy+4); // 在左侧绘制刻度值
    }
    
    // 再设置网格线颜色为黑色，绘制横轴（y=0）
    ctx.setStrokeStyle('#000');
    ctx.setLineDash([], 0);
    let y=0
    const yy = yScale(y);      // 计算 y 对应的画布坐标
    ctx.beginPath();
    ctx.moveTo(left, yy);      // 起点 (左边)
    ctx.lineTo(left+plotW, yy);// 终点 (右边)
    ctx.stroke();
    ctx.fillText(String(y), 8, yy+4); // 在左侧绘制刻度值

    // 绘制 x 轴的日期标签（周一到周日）
    const dayNames = ['DAY1','DAY2','DAY3','DAY4','DAY5','DAY6','DAY7'];
    ctx.setFontSize(14);  // 设置字体大小
    ctx.setFillStyle('#000'); // 设置文字颜色
    for (let i=0;i<7;i++){
      const x = xPositions[i];
      ctx.fillText(dayNames[i], x-12, top+plotH+22); // 把文字放在底部
    }

    // 把每个数据点转换成画布坐标 (meal, emo)
    const mealPoints = meal.map((v,i) => ({x:xPositions[i], y: yScale(v), v}));
    const emoPoints = emo.map((v,i) => ({x:xPositions[i], y: yScale(v), v}));

    // 定义一个绘制折线+圆点的函数
    const drawPolyline = (points, color) => {
      ctx.beginPath();
      ctx.setStrokeStyle(color);
      ctx.setLineWidth(2);
      ctx.moveTo(points[0].x, points[0].y);   // 移动到第一个点
      for (let i=1;i<points.length;i++){
        ctx.lineTo(points[i].x, points[i].y); // 连线
      }
      ctx.stroke();

      // 再绘制每个点的小圆圈
      for (const p of points) {
        ctx.beginPath();
        ctx.setFillStyle('#fff');    // 圆心白色
        ctx.setStrokeStyle(color);   // 圆边框为折线颜色
        ctx.setLineWidth(2);
        ctx.arc(p.x, p.y, 5, 0, Math.PI*2); // 半径 5
        ctx.fill();
        ctx.stroke();
      }
    };

    // 绘制两条折线：饮食评分（深红色）、心情评分（深褐色）
    drawPolyline(mealPoints, '#1976d2');
    drawPolyline(emoPoints, '#ff9800');

    // 绘制右上角图例
    ctx.setFontSize(12);
    ctx.setFillStyle('#1976d2');
    ctx.fillRect(cssW-140, 10, 12, 8);  // 蓝色方块
    ctx.setFillStyle('#000');
    ctx.fillText('饮食评分', cssW-120, 18);

    ctx.setFillStyle('#ff9800');
    ctx.fillRect(cssW-140, 30, 12, 8);  // 橙色方块
    ctx.setFillStyle('#000');
    ctx.fillText('心情评分', cssW-120, 38);

    // 恢复绘图状态
    ctx.restore();

    // 把所有绘制提交到画布
    ctx.draw();

    // 把关键数据存起来，方便后续点击事件判断哪个点被点中
    this._linePoints = { mealPoints, emoPoints, left, top, plotW, plotH, xPositions, cssW, cssH };
  },

  drawDonutChart() {
    // 从 data 中取出情绪原因的统计数据，如果没有就用默认值
    const counts = this.data.emotionReasonsCount || { work_pressure:0, poor_sleep:0, weather:0, others:0 };

    // 定义每个类别的 key 和对应的文字标签
    const labelsArr = [
      {key:'work_pressure', text:'工作压力'},
      {key:'poor_sleep', text:'睡眠不足'},
      {key:'weather', text:'天气'},
      {key:'others', text:'其他'}
    ];

    // 按顺序提取每个类别的数值
    const values = labelsArr.map(t => counts[t.key] || 0);

    // 求总和，避免总和为 0 的情况（否则分母为 0）
    const total = values.reduce((a,b)=>a+b,0) || 1;

    // 获取屏幕设备像素比 (device pixel ratio)，保证高分屏绘制清晰
    const dpr = this.data.dpr;

    // 获取 canvas 的宽高
    const {w,h} = this.data.smallCanvasWH;

    // 获取画布上下文
    const ctx = wx.createCanvasContext('donutCanvas', this);

    // 清空画布区域
    ctx.clearRect(0,0,w/dpr,h/dpr);

    // 保存当前绘制状态
    ctx.save();

    // 按 dpr 缩放，解决高清屏模糊问题
    ctx.scale(1/dpr,1/dpr);

    // CSS 尺寸（非物理像素）
    const cssW = w/dpr, cssH = h/dpr;

    // 圆心位置（画布中心点）
    const cx = cssW/2 , cy = cssH/2;

    // 外圆半径（取宽高较小值的一部分）
    const radius = Math.min(cssW, cssH)*0.45;

    // 内圆半径（外圆的 0.6 倍，决定环的厚度）
    const innerR = radius * 0.6;

    // 从正上方开始绘制（-90°，即 -π/2 弧度）
    let start = -Math.PI/2;

    // 定义每个扇区的颜色
    const colors = ['#083a2a','#01704d','#02aa75','#66f1c5'];

    // 存储每个扇区的元数据，用于后续交互
    const segments = [];

    // 逐个绘制每个扇区
    for (let i=0;i<values.length;i++){
      const v = values[i]; // 当前类别的值
      const angle = (v/total) * Math.PI*2; // 占比对应的弧度
      const end = start + angle; // 扇区的结束角度

      ctx.beginPath();
      ctx.moveTo(cx,cy); // 移动到圆心
      ctx.arc(cx,cy, radius, start, end); // 绘制外圆弧
      ctx.closePath();
      ctx.setFillStyle(colors[i%colors.length]); // 设置填充色
      ctx.fill(); // 填充扇区

      // 保存当前扇区的元信息
      segments.push({ start, end, value: v, label: labelsArr[i].text });

      // 下一块扇区从当前结束角度开始
      start = end;
    }

    // 绘制中间的白色圆，形成“甜甜圈”的效果
    ctx.beginPath();
    ctx.setFillStyle('#ffffff');
    ctx.arc(cx,cy, innerR, 0, Math.PI*2);
    ctx.fill();

    // 恢复绘制状态
    ctx.restore();

    // 真正把绘制内容渲染到画布上
    ctx.draw();

    // 保存一些元数据，后续如果要点击判断属于哪个扇区，可以用到
    this._donutMeta = {cx, cy, radius, innerR, segments, total, cssW, cssH, colors, labelsArr};
  },

  drawPieChart() {
    // 从 data 中取出各分数区间的数量（四个桶），如果没有则默认为 [0,0,0,0]
    const buckets = this.data.mealScoreBuckets || [0,0,0,0];

    // 各个桶对应的标签
    const labels = ['非常不健康 (1-25)', '不健康 (26-50)', '较不健康 (51-75)', '健康 (76-100)'];

    // 总和（避免除以 0，如果总和为 0 则设为 1）
    const total = buckets.reduce((a,b)=>a+b,0) || 1;

    // 获取设备像素比（dpr = device pixel ratio）
    const dpr = this.data.dpr;

    // 画布宽高（像素级）
    const {w,h} = this.data.smallCanvasWH;

    // 创建 canvas 上下文对象，id 为 'pieCanvas'
    const ctx = wx.createCanvasContext('pieCanvas', this);

    // 清空画布区域，避免残影
    ctx.clearRect(0,0,w/dpr,h/dpr);

    // 保存当前上下文状态（后面可能修改 scale 等）
    ctx.save();

    // 设置缩放，让高分屏绘制时不会模糊
    ctx.scale(1/dpr,1/dpr);

    // 转换为 CSS 尺寸（逻辑像素）
    const cssW = w/dpr, cssH = h/dpr;

    // 饼图圆心坐标（画布中心点）
    const cx = cssW/2, cy = cssH/2;

    // 半径：取宽高最小值的 45%，保证图形能完整显示
    const radius = Math.min(cssW, cssH)*0.45;

    // 起始角度：从 -90°（也就是 12 点方向）开始绘制
    let start = -Math.PI/2;

    // 定义每个扇形的颜色（红、橙、黄、绿）
    const colors = ['#66f1c5','#02aa75','#01704d','#083a2a'];

    // 用于保存每个扇形的元信息（绘制范围、对应数值、标签等）
    const segments = [];

    // 遍历每个桶，绘制对应的扇形
    for (let i=0;i<buckets.length;i++){
      // 当前桶占的角度
      const ang = (buckets[i]/total)*Math.PI*2;

      // 扇形的结束角度
      const end = start + ang;

      // 开始绘制扇形
      ctx.beginPath();
      ctx.moveTo(cx,cy); // 从圆心开始
      ctx.arc(cx,cy, radius, start, end); // 绘制圆弧
      ctx.closePath(); // 闭合路径形成扇形

      // 设置填充颜色（循环使用 colors）
      ctx.setFillStyle(colors[i%colors.length]);
      ctx.fill(); // 填充扇形

      // 保存该扇形的元数据，后续可能用于交互（比如点击判断在哪个扇形）
      segments.push({start, end, value: buckets[i], label: labels[i]});

      // 下一段扇形从当前 end 开始
      start = end;
    }

    // 恢复到 save() 前的状态（取消 scale 等）
    ctx.restore();

    // 执行绘制（微信小程序 canvas 需要显式 draw()）
    ctx.draw();

    // 把饼图的元信息存到 this._pieMeta，方便后续交互（比如点击时判断点在哪个扇区）
    this._pieMeta = {cx, cy, radius, segments, colors, total, cssW, cssH};
},

  onLineTouch(e) {
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const rectQuery = wx.createSelectorQuery();
    rectQuery.select('.line-canvas').boundingClientRect();
    rectQuery.exec(rects=>{
      if (!rects || !rects[0]) return;
      const rect = rects[0];
      const pxX = touch.clientX - rect.left;
      const pxY = touch.clientY - rect.top;
      const pts = this._linePoints;
      if (!pts) return;
      const threshold = 12;
      let hit = null;
      for (let seriesName of ['mealPoints','emoPoints']) {
        const arr = pts[seriesName];
        for (let i=0;i<arr.length;i++){
          const p = arr[i];
          const dx = pxX - p.x;
          const dy = pxY - p.y;
          if (Math.sqrt(dx*dx+dy*dy) <= threshold) {
            hit = {series: seriesName==='mealPoints' ? '饮食评分' : '心情评分', day: i+1, value: p.v, x: p.x, y: p.y};
            break;
          }
        }
        if (hit) break;
      }

      if (!hit) {
        this.setData({ lineTooltip: {show:false, left:0, top:0, text:''} });
        return;
      }

      const cur = this.data.lineTooltip;
      if (cur.show && cur._hit && cur._hit.series === hit.series && cur._hit.day === hit.day) {
        this.setData({ lineTooltip: {show:false, left:0, top:0, text:''} });
        return;
      }

      const pageLeft = hit.x;
      const pageTop = hit.y;
      const tipText = `${hit.series} 第${hit.day}天\n${hit.value}`;
      this.setData({ lineTooltip: { show: true, left: pageLeft, top: pageTop, text: tipText, _hit: hit } });
    });
  },

  onDonutTouch(e) {
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const rectQuery = wx.createSelectorQuery();
    rectQuery.select('.chart-wrap-small').boundingClientRect();
    rectQuery.select('.small-canvas1').boundingClientRect();
    rectQuery.exec(rects=>{
      if (!rects || rects.length<2) return;
      const canvasRect = rects[1];
      const pxX = touch.clientX - canvasRect.left;
      const pxY = touch.clientY - canvasRect.top;
      const meta = this._donutMeta;
      if (!meta) return;
      const cx = meta.cx, cy = meta.cy;
      const dx = pxX - cx, dy = pxY - cy;
      const r = Math.sqrt(dx*dx + dy*dy);
      if (r < meta.innerR || r > meta.radius) {
        this.setData({ donutTooltip: {show:false, left:0, top:0, text:''} });
        return;
      }
      let ang = Math.atan2(dy, dx);
      if (ang < -Math.PI/2) ang += Math.PI*2;

      let chosenIndex = -1;
      for (let i=0;i<meta.segments.length;i++){
        const seg = meta.segments[i];
        // seg.start/seg.end are in increasing order starting from -pi/2
        if (ang >= seg.start && ang <= seg.end) { chosenIndex = i; break; }
      }

      if (chosenIndex === -1) {
        this.setData({ donutTooltip: {show:false, left:0, top:0, text:''} });
        return;
      }

      const label = meta.segments[chosenIndex].label;
      const value = meta.segments[chosenIndex].value;
      const percent = ((value / meta.total) * 100).toFixed(1) + '%';
      const left = pxX;
      const top = pxY;
      const cur = this.data.donutTooltip;
      if (cur.show && cur._idx === chosenIndex) {
        this.setData({ donutTooltip: {show:false, left:0, top:0, text:''} });
      } else {
        this.setData({ donutTooltip: { show:true, left, top, text: `${label}\n${percent}`, _idx: chosenIndex } });
      }
    });
  },

  onPieTouch(e) {
    const touch = e.touches && e.touches[0];
    console.log('触摸点信息:', touch); // 打印触摸点信息
    if (!touch) return;
  
    const rectQuery = wx.createSelectorQuery();
    rectQuery.select('.chart-wrap-small').boundingClientRect();
    rectQuery.select('.small-canvas2').boundingClientRect();
    rectQuery.exec(rects => {
      console.log('获取到的画布区域:', rects); // 打印获取的画布区域信息
      if (!rects || rects.length < 2) return;
      const canvasRect = rects[1];
      const pxX = touch.clientX - canvasRect.left;
      const pxY = touch.clientY - canvasRect.top;
      console.log('画布左上角的坐标',canvasRect.left)
      console.log('触摸位置在画布上的坐标:', pxX, pxY); // 打印触摸点相对画布的坐标
  
      const meta = this._pieMeta;
      if (!meta) return;
      const cx = meta.cx, cy = meta.cy;
      const dx = pxX - cx, dy = pxY - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      console.log('计算出的距离:', r); // 打印触摸点与饼图中心的距离
  
      if (r > meta.radius) {
        this.setData({ pieTooltip: { show: false, left: 0, top: 0, text: '' } });
        console.log('canvasRect.left:', canvasRect.left); // 画布的左边缘
        console.log('canvasRect.top:', canvasRect.top);   // 画布的上边缘
        console.log('touch.clientX:', touch.clientX);     // 点击点的 x 坐标
        console.log('touch.clientY:', touch.clientY);     // 点击点的 y 坐标

        console.log('meta.cx:', meta.cx); // 饼图的中心 x 坐标
        console.log('meta.cy:', meta.cy); // 饼图的中心 y 坐标

        console.log('meta.radius:', meta.radius);  // 打印半径
        console.log('退出');
        return;
      }
  
      let ang = Math.atan2(dy, dx);
      if (ang < -Math.PI / 2) ang += Math.PI * 2;
      console.log('计算出的角度:', ang); // 打印计算出的角度
  
      let chosenIndex = -1;
      for (let i = 0; i < meta.segments.length; i++) {
        const seg = meta.segments[i];
        if (ang >= seg.start && ang <= seg.end) {
          chosenIndex = i;
          break;
        }
      }
      console.log('选择的扇区索引:', chosenIndex); // 打印选中的扇区索引
  
      if (chosenIndex === -1) {
        this.setData({ pieTooltip: { show: false, left: 0, top: 0, text: '' } });
        return;
      }
  
      const seg = meta.segments[chosenIndex];
      const percent = ((seg.value / meta.total) * 100).toFixed(1) + '%';
      const left = pxX;
      const top = pxY;
      const cur = this.data.pieTooltip;
      console.log('显示的工具提示:', seg.label, percent); // 打印将要显示的工具提示内容
  
      if (cur.show && cur._idx === chosenIndex) {
        this.setData({ pieTooltip: { show: false, left: 0, top: 0, text: '' } });
      } else {
        this.setData({
          pieTooltip: {
            show: true,
            left,
            top,
            text: `${seg.label}\n${percent}`,
            _idx: chosenIndex,
          },
        });
      }
    });
  },

  refreshCharts() {
    this.prepareCanvasesAndDraw();
  }
});