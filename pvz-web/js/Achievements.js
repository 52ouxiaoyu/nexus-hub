/* ============================================================================
 * v4.0.73 成就系统（Achievements）
 * 6 个模式 × 50 成就 = 300 个：经典冒险 / 融合进化 / 砸罐子 / 我是僵尸 / 双人对战 / 守屋大作战
 * - 累计型成就：跨局累计，localStorage 持久化（pvz_ach_v1）
 * - 单局型成就：本局内达成即解锁（session 统计，开局重置），解锁状态持久化
 * - 解锁即时弹窗 toast；主菜单标题旁「成就」按钮（操作与道具说明右侧，同尺寸）
 * ========================================================================== */
(function () {
    'use strict';

    // —— 数据占位：由生成脚本注入 6×50 条 ——
    const ACHIEVEMENTS = [
 {
  "id": "classic_01",
  "mode": "classic",
  "cat": "参与",
  "icon": "🎮",
  "name": "初次见面",
  "desc": "游玩一局经典冒险",
  "stat": "plays_classic",
  "target": 1,
  "single": false
 },
 {
  "id": "classic_02",
  "mode": "classic",
  "cat": "参与",
  "icon": "🎮",
  "name": "渐渐上手",
  "desc": "游玩 经典冒险 累计 3 局",
  "stat": "plays_classic",
  "target": 3,
  "single": false
 },
 {
  "id": "classic_03",
  "mode": "classic",
  "cat": "参与",
  "icon": "🎮",
  "name": "常客",
  "desc": "游玩 经典冒险 累计 10 局",
  "stat": "plays_classic",
  "target": 10,
  "single": false
 },
 {
  "id": "classic_04",
  "mode": "classic",
  "cat": "参与",
  "icon": "🎮",
  "name": "老玩家",
  "desc": "游玩 经典冒险 累计 25 局",
  "stat": "plays_classic",
  "target": 25,
  "single": false
 },
 {
  "id": "classic_05",
  "mode": "classic",
  "cat": "参与",
  "icon": "🎮",
  "name": "铁杆玩家",
  "desc": "游玩 经典冒险 累计 50 局",
  "stat": "plays_classic",
  "target": 50,
  "single": false
 },
 {
  "id": "classic_06",
  "mode": "classic",
  "cat": "参与",
  "icon": "🎮",
  "name": "传奇之路",
  "desc": "游玩 经典冒险 累计 100 局",
  "stat": "plays_classic",
  "target": 100,
  "single": false
 },
 {
  "id": "classic_07",
  "mode": "classic",
  "cat": "击杀",
  "icon": "💀",
  "name": "初露锋芒",
  "desc": "在 经典冒险 中累计消灭 50 只僵尸",
  "stat": "k_classic",
  "target": 50,
  "single": false
 },
 {
  "id": "classic_08",
  "mode": "classic",
  "cat": "击杀",
  "icon": "💀",
  "name": "除草机初动",
  "desc": "在 经典冒险 中累计消灭 150 只僵尸",
  "stat": "k_classic",
  "target": 150,
  "single": false
 },
 {
  "id": "classic_09",
  "mode": "classic",
  "cat": "击杀",
  "icon": "💀",
  "name": "百尸斩",
  "desc": "在 经典冒险 中累计消灭 400 只僵尸",
  "stat": "k_classic",
  "target": 400,
  "single": false
 },
 {
  "id": "classic_10",
  "mode": "classic",
  "cat": "击杀",
  "icon": "💀",
  "name": "千尸斩",
  "desc": "在 经典冒险 中累计消灭 900 只僵尸",
  "stat": "k_classic",
  "target": 900,
  "single": false
 },
 {
  "id": "classic_11",
  "mode": "classic",
  "cat": "击杀",
  "icon": "💀",
  "name": "僵尸屠夫",
  "desc": "在 经典冒险 中累计消灭 2000 只僵尸",
  "stat": "k_classic",
  "target": 2000,
  "single": false
 },
 {
  "id": "classic_12",
  "mode": "classic",
  "cat": "击杀",
  "icon": "💀",
  "name": "尸山血海",
  "desc": "在 经典冒险 中累计消灭 4000 只僵尸",
  "stat": "k_classic",
  "target": 4000,
  "single": false
 },
 {
  "id": "classic_13",
  "mode": "classic",
  "cat": "击杀",
  "icon": "💀",
  "name": "单局连杀",
  "desc": "单局内消灭 15 只僵尸",
  "stat": "k_classicS",
  "target": 15,
  "single": true
 },
 {
  "id": "classic_14",
  "mode": "classic",
  "cat": "击杀",
  "icon": "💀",
  "name": "收割机",
  "desc": "单局内消灭 40 只僵尸",
  "stat": "k_classicS",
  "target": 40,
  "single": true
 },
 {
  "id": "classic_15",
  "mode": "classic",
  "cat": "击杀",
  "icon": "💀",
  "name": "疯狂收割",
  "desc": "单局内消灭 80 只僵尸",
  "stat": "k_classicS",
  "target": 80,
  "single": true
 },
 {
  "id": "classic_16",
  "mode": "classic",
  "cat": "击杀",
  "icon": "💀",
  "name": "死神降临",
  "desc": "单局内消灭 150 只僵尸",
  "stat": "k_classicS",
  "target": 150,
  "single": true
 },
 {
  "id": "classic_17",
  "mode": "classic",
  "cat": "种植",
  "icon": "🌱",
  "name": "第一次种植",
  "desc": "在 经典冒险 中累计种植 1 株植物",
  "stat": "p_classic",
  "target": 1,
  "single": false
 },
 {
  "id": "classic_18",
  "mode": "classic",
  "cat": "种植",
  "icon": "🌱",
  "name": "园丁上岗",
  "desc": "在 经典冒险 中累计种植 200 株植物",
  "stat": "p_classic",
  "target": 200,
  "single": false
 },
 {
  "id": "classic_19",
  "mode": "classic",
  "cat": "种植",
  "icon": "🌱",
  "name": "绿手指",
  "desc": "在 经典冒险 中累计种植 600 株植物",
  "stat": "p_classic",
  "target": 600,
  "single": false
 },
 {
  "id": "classic_20",
  "mode": "classic",
  "cat": "种植",
  "icon": "🌱",
  "name": "花园主理人",
  "desc": "在 经典冒险 中累计种植 1500 株植物",
  "stat": "p_classic",
  "target": 1500,
  "single": false
 },
 {
  "id": "classic_21",
  "mode": "classic",
  "cat": "种植",
  "icon": "🌱",
  "name": "植物王国",
  "desc": "在 经典冒险 中累计种植 3000 株植物",
  "stat": "p_classic",
  "target": 3000,
  "single": false
 },
 {
  "id": "classic_22",
  "mode": "classic",
  "cat": "种植",
  "icon": "🌱",
  "name": "小试身手",
  "desc": "单局内种植 25 株植物",
  "stat": "p_classicS",
  "target": 25,
  "single": true
 },
 {
  "id": "classic_23",
  "mode": "classic",
  "cat": "种植",
  "icon": "🌱",
  "name": "阵型大师",
  "desc": "单局内种植 50 株植物",
  "stat": "p_classicS",
  "target": 50,
  "single": true
 },
 {
  "id": "classic_24",
  "mode": "classic",
  "cat": "种植",
  "icon": "🌱",
  "name": "满园春色",
  "desc": "单局内种植 90 株植物",
  "stat": "p_classicS",
  "target": 90,
  "single": true
 },
 {
  "id": "classic_25",
  "mode": "classic",
  "cat": "经济",
  "icon": "☀️",
  "name": "第一缕阳光",
  "desc": "在 经典冒险 中累计获得 3000 阳光",
  "stat": "s_classic",
  "target": 3000,
  "single": false
 },
 {
  "id": "classic_26",
  "mode": "classic",
  "cat": "经济",
  "icon": "☀️",
  "name": "阳光富翁",
  "desc": "在 经典冒险 中累计获得 12000 阳光",
  "stat": "s_classic",
  "target": 12000,
  "single": false
 },
 {
  "id": "classic_27",
  "mode": "classic",
  "cat": "经济",
  "icon": "☀️",
  "name": "日光浴",
  "desc": "在 经典冒险 中累计获得 40000 阳光",
  "stat": "s_classic",
  "target": 40000,
  "single": false
 },
 {
  "id": "classic_28",
  "mode": "classic",
  "cat": "经济",
  "icon": "☀️",
  "name": "黄金麦田",
  "desc": "在 经典冒险 中累计获得 120000 阳光",
  "stat": "s_classic",
  "target": 120000,
  "single": false
 },
 {
  "id": "classic_29",
  "mode": "classic",
  "cat": "经济",
  "icon": "☀️",
  "name": "日光银行",
  "desc": "在 经典冒险 中累计获得 300000 阳光",
  "stat": "s_classic",
  "target": 300000,
  "single": false
 },
 {
  "id": "classic_30",
  "mode": "classic",
  "cat": "经济",
  "icon": "☀️",
  "name": "小富即安",
  "desc": "单局内获得 1200 阳光",
  "stat": "s_classicS",
  "target": 1200,
  "single": true
 },
 {
  "id": "classic_31",
  "mode": "classic",
  "cat": "经济",
  "icon": "☀️",
  "name": "日进斗金",
  "desc": "单局内获得 4000 阳光",
  "stat": "s_classicS",
  "target": 4000,
  "single": true
 },
 {
  "id": "classic_32",
  "mode": "classic",
  "cat": "经济",
  "icon": "☀️",
  "name": "阳光瀑布",
  "desc": "单局内获得 10000 阳光",
  "stat": "s_classicS",
  "target": 10000,
  "single": true
 },
 {
  "id": "classic_33",
  "mode": "classic",
  "cat": "时间",
  "icon": "⏳",
  "name": "初入战场",
  "desc": "在 经典冒险 中累计战斗 1 小时",
  "stat": "t_classic",
  "target": 3600,
  "single": false
 },
 {
  "id": "classic_34",
  "mode": "classic",
  "cat": "时间",
  "icon": "⏳",
  "name": "战场老兵",
  "desc": "在 经典冒险 中累计战斗 5 小时",
  "stat": "t_classic",
  "target": 18000,
  "single": false
 },
 {
  "id": "classic_35",
  "mode": "classic",
  "cat": "时间",
  "icon": "⏳",
  "name": "夜战通宵",
  "desc": "在 经典冒险 中累计战斗 20 小时",
  "stat": "t_classic",
  "target": 72000,
  "single": false
 },
 {
  "id": "classic_36",
  "mode": "classic",
  "cat": "时间",
  "icon": "⏳",
  "name": "坚持到底",
  "desc": "在 经典冒险 中累计战斗 60 小时",
  "stat": "t_classic",
  "target": 216000,
  "single": false
 },
 {
  "id": "classic_37",
  "mode": "classic",
  "cat": "时间",
  "icon": "⏳",
  "name": "永恒守护",
  "desc": "在 经典冒险 中累计战斗 160 小时",
  "stat": "t_classic",
  "target": 576000,
  "single": false
 },
 {
  "id": "classic_38",
  "mode": "classic",
  "cat": "时间",
  "icon": "⏳",
  "name": "站住脚跟",
  "desc": "单局坚守 10 分钟",
  "stat": "t_classicS",
  "target": 600,
  "single": true
 },
 {
  "id": "classic_39",
  "mode": "classic",
  "cat": "时间",
  "icon": "⏳",
  "name": "铁壁防线",
  "desc": "单局坚守 25 分钟",
  "stat": "t_classicS",
  "target": 1500,
  "single": true
 },
 {
  "id": "classic_40",
  "mode": "classic",
  "cat": "时间",
  "icon": "⏳",
  "name": "不眠之夜",
  "desc": "单局坚守 50 分钟",
  "stat": "t_classicS",
  "target": 3000,
  "single": true
 },
 {
  "id": "classic_41",
  "mode": "classic",
  "cat": "挑战",
  "icon": "💀",
  "name": "战神",
  "desc": "单局内消灭 250 只僵尸",
  "stat": "k_classicS",
  "target": 250,
  "single": true
 },
 {
  "id": "classic_42",
  "mode": "classic",
  "cat": "挑战",
  "icon": "💀",
  "name": "无双",
  "desc": "单局内消灭 400 只僵尸",
  "stat": "k_classicS",
  "target": 400,
  "single": true
 },
 {
  "id": "classic_43",
  "mode": "classic",
  "cat": "挑战",
  "icon": "🌱",
  "name": "千株成阵",
  "desc": "单局内种植 120 株植物",
  "stat": "p_classicS",
  "target": 120,
  "single": true
 },
 {
  "id": "classic_44",
  "mode": "classic",
  "cat": "挑战",
  "icon": "☀️",
  "name": "日光海啸",
  "desc": "单局内获得 25000 阳光",
  "stat": "s_classicS",
  "target": 25000,
  "single": true
 },
 {
  "id": "classic_45",
  "mode": "classic",
  "cat": "挑战",
  "icon": "⏳",
  "name": "马拉松",
  "desc": "单局坚守 90 分钟",
  "stat": "t_classicS",
  "target": 5400,
  "single": true
 },
 {
  "id": "classic_46",
  "mode": "classic",
  "cat": "挑战",
  "icon": "💀",
  "name": "万人斩",
  "desc": "在 经典冒险 中累计消灭 20000 只僵尸",
  "stat": "k_classic",
  "target": 20000,
  "single": false
 },
 {
  "id": "classic_47",
  "mode": "classic",
  "cat": "挑战",
  "icon": "🌱",
  "name": "万物生长",
  "desc": "在 经典冒险 中累计种植 8000 株植物",
  "stat": "p_classic",
  "target": 8000,
  "single": false
 },
 {
  "id": "classic_48",
  "mode": "classic",
  "cat": "挑战",
  "icon": "☀️",
  "name": "烈日当空",
  "desc": "在 经典冒险 中累计获得 800000 阳光",
  "stat": "s_classic",
  "target": 800000,
  "single": false
 },
 {
  "id": "classic_49",
  "mode": "classic",
  "cat": "挑战",
  "icon": "⏳",
  "name": "时间旅人",
  "desc": "在 经典冒险 中累计战斗 500 小时",
  "stat": "t_classic",
  "target": 1800000,
  "single": false
 },
 {
  "id": "classic_50",
  "mode": "classic",
  "cat": "挑战",
  "icon": "🎮",
  "name": "百局之约",
  "desc": "游玩 经典冒险 累计 200 局",
  "stat": "plays_classic",
  "target": 200,
  "single": false
 },
 {
  "id": "fusion_01",
  "mode": "fusion",
  "cat": "参与",
  "icon": "🎮",
  "name": "初次见面",
  "desc": "游玩一局融合进化",
  "stat": "plays_fusion",
  "target": 1,
  "single": false
 },
 {
  "id": "fusion_02",
  "mode": "fusion",
  "cat": "参与",
  "icon": "🎮",
  "name": "渐渐上手",
  "desc": "游玩 融合进化 累计 3 局",
  "stat": "plays_fusion",
  "target": 3,
  "single": false
 },
 {
  "id": "fusion_03",
  "mode": "fusion",
  "cat": "参与",
  "icon": "🎮",
  "name": "常客",
  "desc": "游玩 融合进化 累计 10 局",
  "stat": "plays_fusion",
  "target": 10,
  "single": false
 },
 {
  "id": "fusion_04",
  "mode": "fusion",
  "cat": "参与",
  "icon": "🎮",
  "name": "老玩家",
  "desc": "游玩 融合进化 累计 25 局",
  "stat": "plays_fusion",
  "target": 25,
  "single": false
 },
 {
  "id": "fusion_05",
  "mode": "fusion",
  "cat": "参与",
  "icon": "🎮",
  "name": "铁杆玩家",
  "desc": "游玩 融合进化 累计 50 局",
  "stat": "plays_fusion",
  "target": 50,
  "single": false
 },
 {
  "id": "fusion_06",
  "mode": "fusion",
  "cat": "参与",
  "icon": "🎮",
  "name": "传奇之路",
  "desc": "游玩 融合进化 累计 100 局",
  "stat": "plays_fusion",
  "target": 100,
  "single": false
 },
 {
  "id": "fusion_07",
  "mode": "fusion",
  "cat": "击杀",
  "icon": "💀",
  "name": "初露锋芒",
  "desc": "在 融合进化 中累计消灭 50 只僵尸",
  "stat": "k_fusion",
  "target": 50,
  "single": false
 },
 {
  "id": "fusion_08",
  "mode": "fusion",
  "cat": "击杀",
  "icon": "💀",
  "name": "除草机初动",
  "desc": "在 融合进化 中累计消灭 150 只僵尸",
  "stat": "k_fusion",
  "target": 150,
  "single": false
 },
 {
  "id": "fusion_09",
  "mode": "fusion",
  "cat": "击杀",
  "icon": "💀",
  "name": "百尸斩",
  "desc": "在 融合进化 中累计消灭 400 只僵尸",
  "stat": "k_fusion",
  "target": 400,
  "single": false
 },
 {
  "id": "fusion_10",
  "mode": "fusion",
  "cat": "击杀",
  "icon": "💀",
  "name": "千尸斩",
  "desc": "在 融合进化 中累计消灭 900 只僵尸",
  "stat": "k_fusion",
  "target": 900,
  "single": false
 },
 {
  "id": "fusion_11",
  "mode": "fusion",
  "cat": "击杀",
  "icon": "💀",
  "name": "僵尸屠夫",
  "desc": "在 融合进化 中累计消灭 2000 只僵尸",
  "stat": "k_fusion",
  "target": 2000,
  "single": false
 },
 {
  "id": "fusion_12",
  "mode": "fusion",
  "cat": "击杀",
  "icon": "💀",
  "name": "尸山血海",
  "desc": "在 融合进化 中累计消灭 4000 只僵尸",
  "stat": "k_fusion",
  "target": 4000,
  "single": false
 },
 {
  "id": "fusion_13",
  "mode": "fusion",
  "cat": "击杀",
  "icon": "💀",
  "name": "单局连杀",
  "desc": "单局内消灭 15 只僵尸",
  "stat": "k_fusionS",
  "target": 15,
  "single": true
 },
 {
  "id": "fusion_14",
  "mode": "fusion",
  "cat": "击杀",
  "icon": "💀",
  "name": "收割机",
  "desc": "单局内消灭 40 只僵尸",
  "stat": "k_fusionS",
  "target": 40,
  "single": true
 },
 {
  "id": "fusion_15",
  "mode": "fusion",
  "cat": "击杀",
  "icon": "💀",
  "name": "疯狂收割",
  "desc": "单局内消灭 80 只僵尸",
  "stat": "k_fusionS",
  "target": 80,
  "single": true
 },
 {
  "id": "fusion_16",
  "mode": "fusion",
  "cat": "击杀",
  "icon": "💀",
  "name": "死神降临",
  "desc": "单局内消灭 150 只僵尸",
  "stat": "k_fusionS",
  "target": 150,
  "single": true
 },
 {
  "id": "fusion_17",
  "mode": "fusion",
  "cat": "种植",
  "icon": "🌱",
  "name": "第一次种植",
  "desc": "在 融合进化 中累计种植 1 株植物",
  "stat": "p_fusion",
  "target": 1,
  "single": false
 },
 {
  "id": "fusion_18",
  "mode": "fusion",
  "cat": "种植",
  "icon": "🌱",
  "name": "园丁上岗",
  "desc": "在 融合进化 中累计种植 200 株植物",
  "stat": "p_fusion",
  "target": 200,
  "single": false
 },
 {
  "id": "fusion_19",
  "mode": "fusion",
  "cat": "种植",
  "icon": "🌱",
  "name": "绿手指",
  "desc": "在 融合进化 中累计种植 600 株植物",
  "stat": "p_fusion",
  "target": 600,
  "single": false
 },
 {
  "id": "fusion_20",
  "mode": "fusion",
  "cat": "种植",
  "icon": "🌱",
  "name": "花园主理人",
  "desc": "在 融合进化 中累计种植 1500 株植物",
  "stat": "p_fusion",
  "target": 1500,
  "single": false
 },
 {
  "id": "fusion_21",
  "mode": "fusion",
  "cat": "种植",
  "icon": "🌱",
  "name": "植物王国",
  "desc": "在 融合进化 中累计种植 3000 株植物",
  "stat": "p_fusion",
  "target": 3000,
  "single": false
 },
 {
  "id": "fusion_22",
  "mode": "fusion",
  "cat": "种植",
  "icon": "🌱",
  "name": "小试身手",
  "desc": "单局内种植 25 株植物",
  "stat": "p_fusionS",
  "target": 25,
  "single": true
 },
 {
  "id": "fusion_23",
  "mode": "fusion",
  "cat": "种植",
  "icon": "🌱",
  "name": "阵型大师",
  "desc": "单局内种植 50 株植物",
  "stat": "p_fusionS",
  "target": 50,
  "single": true
 },
 {
  "id": "fusion_24",
  "mode": "fusion",
  "cat": "种植",
  "icon": "🌱",
  "name": "满园春色",
  "desc": "单局内种植 90 株植物",
  "stat": "p_fusionS",
  "target": 90,
  "single": true
 },
 {
  "id": "fusion_25",
  "mode": "fusion",
  "cat": "经济",
  "icon": "☀️",
  "name": "第一缕阳光",
  "desc": "在 融合进化 中累计获得 3000 阳光",
  "stat": "s_fusion",
  "target": 3000,
  "single": false
 },
 {
  "id": "fusion_26",
  "mode": "fusion",
  "cat": "经济",
  "icon": "☀️",
  "name": "阳光富翁",
  "desc": "在 融合进化 中累计获得 12000 阳光",
  "stat": "s_fusion",
  "target": 12000,
  "single": false
 },
 {
  "id": "fusion_27",
  "mode": "fusion",
  "cat": "经济",
  "icon": "☀️",
  "name": "日光浴",
  "desc": "在 融合进化 中累计获得 40000 阳光",
  "stat": "s_fusion",
  "target": 40000,
  "single": false
 },
 {
  "id": "fusion_28",
  "mode": "fusion",
  "cat": "经济",
  "icon": "☀️",
  "name": "黄金麦田",
  "desc": "在 融合进化 中累计获得 120000 阳光",
  "stat": "s_fusion",
  "target": 120000,
  "single": false
 },
 {
  "id": "fusion_29",
  "mode": "fusion",
  "cat": "经济",
  "icon": "☀️",
  "name": "日光银行",
  "desc": "在 融合进化 中累计获得 300000 阳光",
  "stat": "s_fusion",
  "target": 300000,
  "single": false
 },
 {
  "id": "fusion_30",
  "mode": "fusion",
  "cat": "经济",
  "icon": "☀️",
  "name": "小富即安",
  "desc": "单局内获得 1200 阳光",
  "stat": "s_fusionS",
  "target": 1200,
  "single": true
 },
 {
  "id": "fusion_31",
  "mode": "fusion",
  "cat": "经济",
  "icon": "☀️",
  "name": "日进斗金",
  "desc": "单局内获得 4000 阳光",
  "stat": "s_fusionS",
  "target": 4000,
  "single": true
 },
 {
  "id": "fusion_32",
  "mode": "fusion",
  "cat": "经济",
  "icon": "☀️",
  "name": "阳光瀑布",
  "desc": "单局内获得 10000 阳光",
  "stat": "s_fusionS",
  "target": 10000,
  "single": true
 },
 {
  "id": "fusion_33",
  "mode": "fusion",
  "cat": "时间",
  "icon": "⏳",
  "name": "初入战场",
  "desc": "在 融合进化 中累计战斗 1 小时",
  "stat": "t_fusion",
  "target": 3600,
  "single": false
 },
 {
  "id": "fusion_34",
  "mode": "fusion",
  "cat": "时间",
  "icon": "⏳",
  "name": "战场老兵",
  "desc": "在 融合进化 中累计战斗 5 小时",
  "stat": "t_fusion",
  "target": 18000,
  "single": false
 },
 {
  "id": "fusion_35",
  "mode": "fusion",
  "cat": "时间",
  "icon": "⏳",
  "name": "夜战通宵",
  "desc": "在 融合进化 中累计战斗 20 小时",
  "stat": "t_fusion",
  "target": 72000,
  "single": false
 },
 {
  "id": "fusion_36",
  "mode": "fusion",
  "cat": "时间",
  "icon": "⏳",
  "name": "坚持到底",
  "desc": "在 融合进化 中累计战斗 60 小时",
  "stat": "t_fusion",
  "target": 216000,
  "single": false
 },
 {
  "id": "fusion_37",
  "mode": "fusion",
  "cat": "时间",
  "icon": "⏳",
  "name": "永恒守护",
  "desc": "在 融合进化 中累计战斗 160 小时",
  "stat": "t_fusion",
  "target": 576000,
  "single": false
 },
 {
  "id": "fusion_38",
  "mode": "fusion",
  "cat": "时间",
  "icon": "⏳",
  "name": "站住脚跟",
  "desc": "单局坚守 10 分钟",
  "stat": "t_fusionS",
  "target": 600,
  "single": true
 },
 {
  "id": "fusion_39",
  "mode": "fusion",
  "cat": "时间",
  "icon": "⏳",
  "name": "铁壁防线",
  "desc": "单局坚守 25 分钟",
  "stat": "t_fusionS",
  "target": 1500,
  "single": true
 },
 {
  "id": "fusion_40",
  "mode": "fusion",
  "cat": "时间",
  "icon": "⏳",
  "name": "不眠之夜",
  "desc": "单局坚守 50 分钟",
  "stat": "t_fusionS",
  "target": 3000,
  "single": true
 },
 {
  "id": "fusion_41",
  "mode": "fusion",
  "cat": "挑战",
  "icon": "🧬",
  "name": "初次融合",
  "desc": "在 融合进化 中累计完成 10 次融合",
  "stat": "fuseT",
  "target": 10,
  "single": false
 },
 {
  "id": "fusion_42",
  "mode": "fusion",
  "cat": "挑战",
  "icon": "🧬",
  "name": "合成大师",
  "desc": "在 融合进化 中累计完成 50 次融合",
  "stat": "fuseT",
  "target": 50,
  "single": false
 },
 {
  "id": "fusion_43",
  "mode": "fusion",
  "cat": "挑战",
  "icon": "🧬",
  "name": "百变植物",
  "desc": "在 融合进化 中累计完成 150 次融合",
  "stat": "fuseT",
  "target": 150,
  "single": false
 },
 {
  "id": "fusion_44",
  "mode": "fusion",
  "cat": "挑战",
  "icon": "🧬",
  "name": "单局炼金",
  "desc": "单局内完成 5 次融合",
  "stat": "fuseS",
  "target": 5,
  "single": true
 },
 {
  "id": "fusion_45",
  "mode": "fusion",
  "cat": "挑战",
  "icon": "💀",
  "name": "战神",
  "desc": "单局内消灭 250 只僵尸",
  "stat": "k_fusionS",
  "target": 250,
  "single": true
 },
 {
  "id": "fusion_46",
  "mode": "fusion",
  "cat": "挑战",
  "icon": "💀",
  "name": "无双",
  "desc": "单局内消灭 400 只僵尸",
  "stat": "k_fusionS",
  "target": 400,
  "single": true
 },
 {
  "id": "fusion_47",
  "mode": "fusion",
  "cat": "挑战",
  "icon": "🌱",
  "name": "千株成阵",
  "desc": "单局内种植 120 株植物",
  "stat": "p_fusionS",
  "target": 120,
  "single": true
 },
 {
  "id": "fusion_48",
  "mode": "fusion",
  "cat": "挑战",
  "icon": "☀️",
  "name": "日光海啸",
  "desc": "单局内获得 25000 阳光",
  "stat": "s_fusionS",
  "target": 25000,
  "single": true
 },
 {
  "id": "fusion_49",
  "mode": "fusion",
  "cat": "挑战",
  "icon": "⏳",
  "name": "马拉松",
  "desc": "单局坚守 90 分钟",
  "stat": "t_fusionS",
  "target": 5400,
  "single": true
 },
 {
  "id": "fusion_50",
  "mode": "fusion",
  "cat": "挑战",
  "icon": "🎮",
  "name": "百局之约",
  "desc": "游玩 融合进化 累计 200 局",
  "stat": "plays_fusion",
  "target": 200,
  "single": false
 },
 {
  "id": "vase_01",
  "mode": "vase",
  "cat": "参与",
  "icon": "🎮",
  "name": "初见罐子",
  "desc": "游玩砸罐子 1 局",
  "stat": "plays_vase",
  "target": 1,
  "single": false
 },
 {
  "id": "vase_02",
  "mode": "vase",
  "cat": "参与",
  "icon": "🎮",
  "name": "罐子常客",
  "desc": "游玩砸罐子累计 3 局",
  "stat": "plays_vase",
  "target": 3,
  "single": false
 },
 {
  "id": "vase_03",
  "mode": "vase",
  "cat": "参与",
  "icon": "🎮",
  "name": "砸罐达人",
  "desc": "游玩砸罐子累计 10 局",
  "stat": "plays_vase",
  "target": 10,
  "single": false
 },
 {
  "id": "vase_04",
  "mode": "vase",
  "cat": "参与",
  "icon": "🎮",
  "name": "砸罐狂魔",
  "desc": "游玩砸罐子累计 25 局",
  "stat": "plays_vase",
  "target": 25,
  "single": false
 },
 {
  "id": "vase_05",
  "mode": "vase",
  "cat": "参与",
  "icon": "🎮",
  "name": "罐中传奇",
  "desc": "游玩砸罐子累计 50 局",
  "stat": "plays_vase",
  "target": 50,
  "single": false
 },
 {
  "id": "vase_06",
  "mode": "vase",
  "cat": "参与",
  "icon": "🎮",
  "name": "百罐之巅",
  "desc": "游玩砸罐子累计 100 局",
  "stat": "plays_vase",
  "target": 100,
  "single": false
 },
 {
  "id": "vase_07",
  "mode": "vase",
  "cat": "击杀",
  "icon": "💀",
  "name": "罐中杀机",
  "desc": "在砸罐子中累计消灭 50 只僵尸",
  "stat": "k_vase",
  "target": 50,
  "single": false
 },
 {
  "id": "vase_08",
  "mode": "vase",
  "cat": "击杀",
  "icon": "💀",
  "name": "碎罐诛尸",
  "desc": "在砸罐子中累计消灭 150 只僵尸",
  "stat": "k_vase",
  "target": 150,
  "single": false
 },
 {
  "id": "vase_09",
  "mode": "vase",
  "cat": "击杀",
  "icon": "💀",
  "name": "罐场屠夫",
  "desc": "在砸罐子中累计消灭 400 只僵尸",
  "stat": "k_vase",
  "target": 400,
  "single": false
 },
 {
  "id": "vase_10",
  "mode": "vase",
  "cat": "击杀",
  "icon": "💀",
  "name": "罐场死神",
  "desc": "在砸罐子中累计消灭 900 只僵尸",
  "stat": "k_vase",
  "target": 900,
  "single": false
 },
 {
  "id": "vase_11",
  "mode": "vase",
  "cat": "击杀",
  "icon": "💀",
  "name": "万罐归宗",
  "desc": "在砸罐子中累计消灭 2000 只僵尸",
  "stat": "k_vase",
  "target": 2000,
  "single": false
 },
 {
  "id": "vase_12",
  "mode": "vase",
  "cat": "击杀",
  "icon": "💀",
  "name": "尸横遍野",
  "desc": "在砸罐子中累计消灭 4000 只僵尸",
  "stat": "k_vase",
  "target": 4000,
  "single": false
 },
 {
  "id": "vase_13",
  "mode": "vase",
  "cat": "击杀",
  "icon": "💀",
  "name": "单局连杀",
  "desc": "单局内消灭 15 只僵尸",
  "stat": "k_vaseS",
  "target": 15,
  "single": true
 },
 {
  "id": "vase_14",
  "mode": "vase",
  "cat": "击杀",
  "icon": "💀",
  "name": "罐中收割机",
  "desc": "单局内消灭 40 只僵尸",
  "stat": "k_vaseS",
  "target": 40,
  "single": true
 },
 {
  "id": "vase_15",
  "mode": "vase",
  "cat": "击杀",
  "icon": "💀",
  "name": "罐场风暴",
  "desc": "单局内消灭 80 只僵尸",
  "stat": "k_vaseS",
  "target": 80,
  "single": true
 },
 {
  "id": "vase_16",
  "mode": "vase",
  "cat": "击杀",
  "icon": "💀",
  "name": "罐神降临",
  "desc": "单局内消灭 150 只僵尸",
  "stat": "k_vaseS",
  "target": 150,
  "single": true
 },
 {
  "id": "vase_17",
  "mode": "vase",
  "cat": "种植",
  "icon": "🌱",
  "name": "罐中植物",
  "desc": "在砸罐子中累计种植 60 株植物",
  "stat": "p_vase",
  "target": 60,
  "single": false
 },
 {
  "id": "vase_18",
  "mode": "vase",
  "cat": "种植",
  "icon": "🌱",
  "name": "罐中园丁",
  "desc": "在砸罐子中累计种植 200 株植物",
  "stat": "p_vase",
  "target": 200,
  "single": false
 },
 {
  "id": "vase_19",
  "mode": "vase",
  "cat": "种植",
  "icon": "🌱",
  "name": "罐中绿洲",
  "desc": "在砸罐子中累计种植 600 株植物",
  "stat": "p_vase",
  "target": 600,
  "single": false
 },
 {
  "id": "vase_20",
  "mode": "vase",
  "cat": "种植",
  "icon": "🌱",
  "name": "罐中花园",
  "desc": "在砸罐子中累计种植 1500 株植物",
  "stat": "p_vase",
  "target": 1500,
  "single": false
 },
 {
  "id": "vase_21",
  "mode": "vase",
  "cat": "种植",
  "icon": "🌱",
  "name": "罐中王国",
  "desc": "在砸罐子中累计种植 3000 株植物",
  "stat": "p_vase",
  "target": 3000,
  "single": false
 },
 {
  "id": "vase_22",
  "mode": "vase",
  "cat": "种植",
  "icon": "🌱",
  "name": "小试身手",
  "desc": "单局内种植 25 株植物",
  "stat": "p_vaseS",
  "target": 25,
  "single": true
 },
 {
  "id": "vase_23",
  "mode": "vase",
  "cat": "种植",
  "icon": "🌱",
  "name": "罐阵大师",
  "desc": "单局内种植 50 株植物",
  "stat": "p_vaseS",
  "target": 50,
  "single": true
 },
 {
  "id": "vase_24",
  "mode": "vase",
  "cat": "种植",
  "icon": "🌱",
  "name": "满园春色",
  "desc": "单局内种植 90 株植物",
  "stat": "p_vaseS",
  "target": 90,
  "single": true
 },
 {
  "id": "vase_25",
  "mode": "vase",
  "cat": "经济",
  "icon": "☀️",
  "name": "第一缕阳光",
  "desc": "在砸罐子中累计获得 3000 阳光",
  "stat": "s_vase",
  "target": 3000,
  "single": false
 },
 {
  "id": "vase_26",
  "mode": "vase",
  "cat": "经济",
  "icon": "☀️",
  "name": "罐中富翁",
  "desc": "在砸罐子中累计获得 12000 阳光",
  "stat": "s_vase",
  "target": 12000,
  "single": false
 },
 {
  "id": "vase_27",
  "mode": "vase",
  "cat": "经济",
  "icon": "☀️",
  "name": "罐中金库",
  "desc": "在砸罐子中累计获得 40000 阳光",
  "stat": "s_vase",
  "target": 40000,
  "single": false
 },
 {
  "id": "vase_28",
  "mode": "vase",
  "cat": "经济",
  "icon": "☀️",
  "name": "黄金罐山",
  "desc": "在砸罐子中累计获得 120000 阳光",
  "stat": "s_vase",
  "target": 120000,
  "single": false
 },
 {
  "id": "vase_29",
  "mode": "vase",
  "cat": "经济",
  "icon": "☀️",
  "name": "日光银行",
  "desc": "在砸罐子中累计获得 300000 阳光",
  "stat": "s_vase",
  "target": 300000,
  "single": false
 },
 {
  "id": "vase_30",
  "mode": "vase",
  "cat": "经济",
  "icon": "☀️",
  "name": "小富即安",
  "desc": "单局内获得 1200 阳光",
  "stat": "s_vaseS",
  "target": 1200,
  "single": true
 },
 {
  "id": "vase_31",
  "mode": "vase",
  "cat": "经济",
  "icon": "☀️",
  "name": "日进斗金",
  "desc": "单局内获得 4000 阳光",
  "stat": "s_vaseS",
  "target": 4000,
  "single": true
 },
 {
  "id": "vase_32",
  "mode": "vase",
  "cat": "经济",
  "icon": "☀️",
  "name": "阳光瀑布",
  "desc": "单局内获得 10000 阳光",
  "stat": "s_vaseS",
  "target": 10000,
  "single": true
 },
 {
  "id": "vase_33",
  "mode": "vase",
  "cat": "时间",
  "icon": "⏳",
  "name": "初入战场",
  "desc": "在砸罐子中累计战斗 1 小时",
  "stat": "t_vase",
  "target": 3600,
  "single": false
 },
 {
  "id": "vase_34",
  "mode": "vase",
  "cat": "时间",
  "icon": "⏳",
  "name": "罐场老兵",
  "desc": "在砸罐子中累计战斗 5 小时",
  "stat": "t_vase",
  "target": 18000,
  "single": false
 },
 {
  "id": "vase_35",
  "mode": "vase",
  "cat": "时间",
  "icon": "⏳",
  "name": "通宵砸罐",
  "desc": "在砸罐子中累计战斗 20 小时",
  "stat": "t_vase",
  "target": 72000,
  "single": false
 },
 {
  "id": "vase_36",
  "mode": "vase",
  "cat": "时间",
  "icon": "⏳",
  "name": "罐场常青",
  "desc": "在砸罐子中累计战斗 60 小时",
  "stat": "t_vase",
  "target": 216000,
  "single": false
 },
 {
  "id": "vase_37",
  "mode": "vase",
  "cat": "时间",
  "icon": "⏳",
  "name": "罐场守护神",
  "desc": "在砸罐子中累计战斗 160 小时",
  "stat": "t_vase",
  "target": 576000,
  "single": false
 },
 {
  "id": "vase_38",
  "mode": "vase",
  "cat": "时间",
  "icon": "⏳",
  "name": "站住脚跟",
  "desc": "单局坚守 10 分钟",
  "stat": "t_vaseS",
  "target": 600,
  "single": true
 },
 {
  "id": "vase_39",
  "mode": "vase",
  "cat": "时间",
  "icon": "⏳",
  "name": "铁壁防线",
  "desc": "单局坚守 25 分钟",
  "stat": "t_vaseS",
  "target": 1500,
  "single": true
 },
 {
  "id": "vase_40",
  "mode": "vase",
  "cat": "时间",
  "icon": "⏳",
  "name": "不眠之夜",
  "desc": "单局坚守 50 分钟",
  "stat": "t_vaseS",
  "target": 3000,
  "single": true
 },
 {
  "id": "vase_41",
  "mode": "vase",
  "cat": "挑战",
  "icon": "🔨",
  "name": "碎罐如麻",
  "desc": "在砸罐子中累计砸碎 50 个罐子",
  "stat": "vaseS",
  "target": 50,
  "single": false
 },
 {
  "id": "vase_42",
  "mode": "vase",
  "cat": "挑战",
  "icon": "🔨",
  "name": "罐子粉碎机",
  "desc": "在砸罐子中累计砸碎 150 个罐子",
  "stat": "vaseS",
  "target": 150,
  "single": false
 },
 {
  "id": "vase_43",
  "mode": "vase",
  "cat": "挑战",
  "icon": "🔨",
  "name": "百罐狂砸",
  "desc": "在砸罐子中累计砸碎 400 个罐子",
  "stat": "vaseS",
  "target": 400,
  "single": false
 },
 {
  "id": "vase_44",
  "mode": "vase",
  "cat": "挑战",
  "icon": "🔨",
  "name": "千罐屠场",
  "desc": "在砸罐子中累计砸碎 900 个罐子",
  "stat": "vaseS",
  "target": 900,
  "single": false
 },
 {
  "id": "vase_45",
  "mode": "vase",
  "cat": "挑战",
  "icon": "🎲",
  "name": "重掷达人",
  "desc": "累计重掷罐子 10 次",
  "stat": "vaseR",
  "target": 10,
  "single": false
 },
 {
  "id": "vase_46",
  "mode": "vase",
  "cat": "挑战",
  "icon": "🎲",
  "name": "骰子大师",
  "desc": "累计重掷罐子 30 次",
  "stat": "vaseR",
  "target": 30,
  "single": false
 },
 {
  "id": "vase_47",
  "mode": "vase",
  "cat": "挑战",
  "icon": "💀",
  "name": "无双",
  "desc": "单局内消灭 250 只僵尸",
  "stat": "k_vaseS",
  "target": 250,
  "single": true
 },
 {
  "id": "vase_48",
  "mode": "vase",
  "cat": "挑战",
  "icon": "🌱",
  "name": "千株成阵",
  "desc": "单局内种植 120 株植物",
  "stat": "p_vaseS",
  "target": 120,
  "single": true
 },
 {
  "id": "vase_49",
  "mode": "vase",
  "cat": "挑战",
  "icon": "⏳",
  "name": "马拉松",
  "desc": "单局坚守 90 分钟",
  "stat": "t_vaseS",
  "target": 5400,
  "single": true
 },
 {
  "id": "vase_50",
  "mode": "vase",
  "cat": "挑战",
  "icon": "🎮",
  "name": "百局之约",
  "desc": "游玩砸罐子累计 200 局",
  "stat": "plays_vase",
  "target": 200,
  "single": false
 },
 {
  "id": "iz_01",
  "mode": "iz",
  "cat": "参与",
  "icon": "🧟",
  "name": "僵尸新丁",
  "desc": "游玩《我是僵尸》1 局",
  "stat": "plays_iz",
  "target": 1,
  "single": false
 },
 {
  "id": "iz_02",
  "mode": "iz",
  "cat": "参与",
  "icon": "🧟",
  "name": "脑味迷途",
  "desc": "游玩《我是僵尸》累计 3 局",
  "stat": "plays_iz",
  "target": 3,
  "single": false
 },
 {
  "id": "iz_03",
  "mode": "iz",
  "cat": "参与",
  "icon": "🧟",
  "name": "僵军小队长",
  "desc": "游玩《我是僵尸》累计 10 局",
  "stat": "plays_iz",
  "target": 10,
  "single": false
 },
 {
  "id": "iz_04",
  "mode": "iz",
  "cat": "参与",
  "icon": "🧟",
  "name": "僵军统领",
  "desc": "游玩《我是僵尸》累计 25 局",
  "stat": "plays_iz",
  "target": 25,
  "single": false
 },
 {
  "id": "iz_05",
  "mode": "iz",
  "cat": "参与",
  "icon": "🧟",
  "name": "僵尸王",
  "desc": "游玩《我是僵尸》累计 50 局",
  "stat": "plays_iz",
  "target": 50,
  "single": false
 },
 {
  "id": "iz_06",
  "mode": "iz",
  "cat": "参与",
  "icon": "🧟",
  "name": "僵界霸主",
  "desc": "游玩《我是僵尸》累计 100 局",
  "stat": "plays_iz",
  "target": 100,
  "single": false
 },
 {
  "id": "iz_07",
  "mode": "iz",
  "cat": "击杀",
  "icon": "💀",
  "name": "吃素开胃",
  "desc": "在《我是僵尸》中累计消灭 50 株植物",
  "stat": "k_iz",
  "target": 50,
  "single": false
 },
 {
  "id": "iz_08",
  "mode": "iz",
  "cat": "击杀",
  "icon": "💀",
  "name": "植物收割者",
  "desc": "在《我是僵尸》中累计消灭 150 株植物",
  "stat": "k_iz",
  "target": 150,
  "single": false
 },
 {
  "id": "iz_09",
  "mode": "iz",
  "cat": "击杀",
  "icon": "💀",
  "name": "啃光一片",
  "desc": "在《我是僵尸》中累计消灭 400 株植物",
  "stat": "k_iz",
  "target": 400,
  "single": false
 },
 {
  "id": "iz_10",
  "mode": "iz",
  "cat": "击杀",
  "icon": "💀",
  "name": "植物屠夫",
  "desc": "在《我是僵尸》中累计消灭 900 株植物",
  "stat": "k_iz",
  "target": 900,
  "single": false
 },
 {
  "id": "iz_11",
  "mode": "iz",
  "cat": "击杀",
  "icon": "💀",
  "name": "灭园者",
  "desc": "在《我是僵尸》中累计消灭 2000 株植物",
  "stat": "k_iz",
  "target": 2000,
  "single": false
 },
 {
  "id": "iz_12",
  "mode": "iz",
  "cat": "击杀",
  "icon": "💀",
  "name": "寸草不生",
  "desc": "在《我是僵尸》中累计消灭 4000 株植物",
  "stat": "k_iz",
  "target": 4000,
  "single": false
 },
 {
  "id": "iz_13",
  "mode": "iz",
  "cat": "击杀",
  "icon": "💀",
  "name": "单局连啃",
  "desc": "单局内消灭 15 株植物",
  "stat": "k_izS",
  "target": 15,
  "single": true
 },
 {
  "id": "iz_14",
  "mode": "iz",
  "cat": "击杀",
  "icon": "💀",
  "name": "僵尸风暴",
  "desc": "单局内消灭 40 株植物",
  "stat": "k_izS",
  "target": 40,
  "single": true
 },
 {
  "id": "iz_15",
  "mode": "iz",
  "cat": "击杀",
  "icon": "💀",
  "name": "吞噬一切",
  "desc": "单局内消灭 80 株植物",
  "stat": "k_izS",
  "target": 80,
  "single": true
 },
 {
  "id": "iz_16",
  "mode": "iz",
  "cat": "击杀",
  "icon": "💀",
  "name": "僵尸天灾",
  "desc": "单局内消灭 150 株植物",
  "stat": "k_izS",
  "target": 150,
  "single": true
 },
 {
  "id": "iz_17",
  "mode": "iz",
  "cat": "种植",
  "icon": "🌱",
  "name": "僵尸也会种",
  "desc": "在《我是僵尸》中累计放置 60 只僵尸",
  "stat": "p_iz",
  "target": 60,
  "single": false
 },
 {
  "id": "iz_18",
  "mode": "iz",
  "cat": "种植",
  "icon": "🌱",
  "name": "尸群初成",
  "desc": "在《我是僵尸》中累计放置 200 只僵尸",
  "stat": "p_iz",
  "target": 200,
  "single": false
 },
 {
  "id": "iz_19",
  "mode": "iz",
  "cat": "种植",
  "icon": "🌱",
  "name": "尸海战术",
  "desc": "在《我是僵尸》中累计放置 600 只僵尸",
  "stat": "p_iz",
  "target": 600,
  "single": false
 },
 {
  "id": "iz_20",
  "mode": "iz",
  "cat": "种植",
  "icon": "🌱",
  "name": "僵尸大军",
  "desc": "在《我是僵尸》中累计放置 1500 只僵尸",
  "stat": "p_iz",
  "target": 1500,
  "single": false
 },
 {
  "id": "iz_21",
  "mode": "iz",
  "cat": "种植",
  "icon": "🌱",
  "name": "僵尸帝国",
  "desc": "在《我是僵尸》中累计放置 3000 只僵尸",
  "stat": "p_iz",
  "target": 3000,
  "single": false
 },
 {
  "id": "iz_22",
  "mode": "iz",
  "cat": "种植",
  "icon": "🌱",
  "name": "先派一支",
  "desc": "单局内放置 25 只僵尸",
  "stat": "p_izS",
  "target": 25,
  "single": true
 },
 {
  "id": "iz_23",
  "mode": "iz",
  "cat": "种植",
  "icon": "🌱",
  "name": "尸潮滚滚",
  "desc": "单局内放置 50 只僵尸",
  "stat": "p_izS",
  "target": 50,
  "single": true
 },
 {
  "id": "iz_24",
  "mode": "iz",
  "cat": "种植",
  "icon": "🌱",
  "name": "千军万马",
  "desc": "单局内放置 90 只僵尸",
  "stat": "p_izS",
  "target": 90,
  "single": true
 },
 {
  "id": "iz_25",
  "mode": "iz",
  "cat": "经济",
  "icon": "☀️",
  "name": "第一缕阳光",
  "desc": "在《我是僵尸》中累计获得 3000 阳光",
  "stat": "s_iz",
  "target": 3000,
  "single": false
 },
 {
  "id": "iz_26",
  "mode": "iz",
  "cat": "经济",
  "icon": "☀️",
  "name": "僵尸富翁",
  "desc": "在《我是僵尸》中累计获得 12000 阳光",
  "stat": "s_iz",
  "target": 12000,
  "single": false
 },
 {
  "id": "iz_27",
  "mode": "iz",
  "cat": "经济",
  "icon": "☀️",
  "name": "脑子大户",
  "desc": "在《我是僵尸》中累计获得 40000 阳光",
  "stat": "s_iz",
  "target": 40000,
  "single": false
 },
 {
  "id": "iz_28",
  "mode": "iz",
  "cat": "经济",
  "icon": "☀️",
  "name": "脑子银行",
  "desc": "在《我是僵尸》中累计获得 120000 阳光",
  "stat": "s_iz",
  "target": 120000,
  "single": false
 },
 {
  "id": "iz_29",
  "mode": "iz",
  "cat": "经济",
  "icon": "☀️",
  "name": "僵尸财阀",
  "desc": "在《我是僵尸》中累计获得 300000 阳光",
  "stat": "s_iz",
  "target": 300000,
  "single": false
 },
 {
  "id": "iz_30",
  "mode": "iz",
  "cat": "经济",
  "icon": "☀️",
  "name": "小富即安",
  "desc": "单局内获得 1200 阳光",
  "stat": "s_izS",
  "target": 1200,
  "single": true
 },
 {
  "id": "iz_31",
  "mode": "iz",
  "cat": "经济",
  "icon": "☀️",
  "name": "脑满肠肥",
  "desc": "单局内获得 4000 阳光",
  "stat": "s_izS",
  "target": 4000,
  "single": true
 },
 {
  "id": "iz_32",
  "mode": "iz",
  "cat": "经济",
  "icon": "☀️",
  "name": "脑子瀑布",
  "desc": "单局内获得 10000 阳光",
  "stat": "s_izS",
  "target": 10000,
  "single": true
 },
 {
  "id": "iz_33",
  "mode": "iz",
  "cat": "时间",
  "icon": "⏳",
  "name": "初入战场",
  "desc": "在《我是僵尸》中累计战斗 1 小时",
  "stat": "t_iz",
  "target": 3600,
  "single": false
 },
 {
  "id": "iz_34",
  "mode": "iz",
  "cat": "时间",
  "icon": "⏳",
  "name": "僵尸老兵",
  "desc": "在《我是僵尸》中累计战斗 5 小时",
  "stat": "t_iz",
  "target": 18000,
  "single": false
 },
 {
  "id": "iz_35",
  "mode": "iz",
  "cat": "时间",
  "icon": "⏳",
  "name": "夜行僵尸",
  "desc": "在《我是僵尸》中累计战斗 20 小时",
  "stat": "t_iz",
  "target": 72000,
  "single": false
 },
 {
  "id": "iz_36",
  "mode": "iz",
  "cat": "时间",
  "icon": "⏳",
  "name": "僵尸领主",
  "desc": "在《我是僵尸》中累计战斗 60 小时",
  "stat": "t_iz",
  "target": 216000,
  "single": false
 },
 {
  "id": "iz_37",
  "mode": "iz",
  "cat": "时间",
  "icon": "⏳",
  "name": "不死军团",
  "desc": "在《我是僵尸》中累计战斗 160 小时",
  "stat": "t_iz",
  "target": 576000,
  "single": false
 },
 {
  "id": "iz_38",
  "mode": "iz",
  "cat": "时间",
  "icon": "⏳",
  "name": "站住脚跟",
  "desc": "单局坚守 10 分钟",
  "stat": "t_izS",
  "target": 600,
  "single": true
 },
 {
  "id": "iz_39",
  "mode": "iz",
  "cat": "时间",
  "icon": "⏳",
  "name": "铁壁防线",
  "desc": "单局坚守 25 分钟",
  "stat": "t_izS",
  "target": 1500,
  "single": true
 },
 {
  "id": "iz_40",
  "mode": "iz",
  "cat": "时间",
  "icon": "⏳",
  "name": "不眠之夜",
  "desc": "单局坚守 50 分钟",
  "stat": "t_izS",
  "target": 3000,
  "single": true
 },
 {
  "id": "iz_41",
  "mode": "iz",
  "cat": "挑战",
  "icon": "🧠",
  "name": "第一颗脑子",
  "desc": "累计吃掉 5 颗脑子",
  "stat": "brains",
  "target": 5,
  "single": false
 },
 {
  "id": "iz_42",
  "mode": "iz",
  "cat": "挑战",
  "icon": "🧠",
  "name": "脑香四溢",
  "desc": "累计吃掉 25 颗脑子",
  "stat": "brains",
  "target": 25,
  "single": false
 },
 {
  "id": "iz_43",
  "mode": "iz",
  "cat": "挑战",
  "icon": "🧠",
  "name": "脑宴",
  "desc": "累计吃掉 60 颗脑子",
  "stat": "brains",
  "target": 60,
  "single": false
 },
 {
  "id": "iz_44",
  "mode": "iz",
  "cat": "挑战",
  "icon": "🧠",
  "name": "脑满肠肥",
  "desc": "累计吃掉 120 颗脑子",
  "stat": "brains",
  "target": 120,
  "single": false
 },
 {
  "id": "iz_45",
  "mode": "iz",
  "cat": "挑战",
  "icon": "🧠",
  "name": "单局满脑",
  "desc": "单局内吃掉 5 颗脑子",
  "stat": "brainsS",
  "target": 5,
  "single": true
 },
 {
  "id": "iz_46",
  "mode": "iz",
  "cat": "挑战",
  "icon": "💀",
  "name": "无双",
  "desc": "单局内消灭 250 株植物",
  "stat": "k_izS",
  "target": 250,
  "single": true
 },
 {
  "id": "iz_47",
  "mode": "iz",
  "cat": "挑战",
  "icon": "💀",
  "name": "尸横遍野",
  "desc": "在《我是僵尸》中累计消灭 20000 株植物",
  "stat": "k_iz",
  "target": 20000,
  "single": false
 },
 {
  "id": "iz_48",
  "mode": "iz",
  "cat": "挑战",
  "icon": "☀️",
  "name": "日光海啸",
  "desc": "单局内获得 25000 阳光",
  "stat": "s_izS",
  "target": 25000,
  "single": true
 },
 {
  "id": "iz_49",
  "mode": "iz",
  "cat": "挑战",
  "icon": "⏳",
  "name": "马拉松",
  "desc": "单局坚守 90 分钟",
  "stat": "t_izS",
  "target": 5400,
  "single": true
 },
 {
  "id": "iz_50",
  "mode": "iz",
  "cat": "挑战",
  "icon": "🎮",
  "name": "百局之约",
  "desc": "游玩《我是僵尸》累计 200 局",
  "stat": "plays_iz",
  "target": 200,
  "single": false
 },
 {
  "id": "vs_01",
  "mode": "vs",
  "cat": "参与",
  "icon": "⚔️",
  "name": "第一次对决",
  "desc": "游玩双人对战 1 局",
  "stat": "plays_vs",
  "target": 1,
  "single": false
 },
 {
  "id": "vs_02",
  "mode": "vs",
  "cat": "参与",
  "icon": "⚔️",
  "name": "切磋过招",
  "desc": "游玩双人对战累计 3 局",
  "stat": "plays_vs",
  "target": 3,
  "single": false
 },
 {
  "id": "vs_03",
  "mode": "vs",
  "cat": "参与",
  "icon": "⚔️",
  "name": "棋逢对手",
  "desc": "游玩双人对战累计 10 局",
  "stat": "plays_vs",
  "target": 10,
  "single": false
 },
 {
  "id": "vs_04",
  "mode": "vs",
  "cat": "参与",
  "icon": "⚔️",
  "name": "宿敌",
  "desc": "游玩双人对战累计 25 局",
  "stat": "plays_vs",
  "target": 25,
  "single": false
 },
 {
  "id": "vs_05",
  "mode": "vs",
  "cat": "参与",
  "icon": "⚔️",
  "name": "决战大师",
  "desc": "游玩双人对战累计 50 局",
  "stat": "plays_vs",
  "target": 50,
  "single": false
 },
 {
  "id": "vs_06",
  "mode": "vs",
  "cat": "参与",
  "icon": "⚔️",
  "name": "无双对决",
  "desc": "游玩双人对战累计 100 局",
  "stat": "plays_vs",
  "target": 100,
  "single": false
 },
 {
  "id": "vs_07",
  "mode": "vs",
  "cat": "击杀",
  "icon": "💀",
  "name": "初战告捷",
  "desc": "在双人对战中累计消灭 50 只僵尸",
  "stat": "k_vs",
  "target": 50,
  "single": false
 },
 {
  "id": "vs_08",
  "mode": "vs",
  "cat": "击杀",
  "icon": "💀",
  "name": "战场新星",
  "desc": "在双人对战中累计消灭 150 只僵尸",
  "stat": "k_vs",
  "target": 150,
  "single": false
 },
 {
  "id": "vs_09",
  "mode": "vs",
  "cat": "击杀",
  "icon": "💀",
  "name": "火力全开",
  "desc": "在双人对战中累计消灭 400 只僵尸",
  "stat": "k_vs",
  "target": 400,
  "single": false
 },
 {
  "id": "vs_10",
  "mode": "vs",
  "cat": "击杀",
  "icon": "💀",
  "name": "百斩对决",
  "desc": "在双人对战中累计消灭 900 只僵尸",
  "stat": "k_vs",
  "target": 900,
  "single": false
 },
 {
  "id": "vs_11",
  "mode": "vs",
  "cat": "击杀",
  "icon": "💀",
  "name": "战场死神",
  "desc": "在双人对战中累计消灭 2000 只僵尸",
  "stat": "k_vs",
  "target": 2000,
  "single": false
 },
 {
  "id": "vs_12",
  "mode": "vs",
  "cat": "击杀",
  "icon": "💀",
  "name": "尸山对决",
  "desc": "在双人对战中累计消灭 4000 只僵尸",
  "stat": "k_vs",
  "target": 4000,
  "single": false
 },
 {
  "id": "vs_13",
  "mode": "vs",
  "cat": "击杀",
  "icon": "💀",
  "name": "单局连杀",
  "desc": "单局内消灭 15 只僵尸",
  "stat": "k_vsS",
  "target": 15,
  "single": true
 },
 {
  "id": "vs_14",
  "mode": "vs",
  "cat": "击杀",
  "icon": "💀",
  "name": "战场收割机",
  "desc": "单局内消灭 40 只僵尸",
  "stat": "k_vsS",
  "target": 40,
  "single": true
 },
 {
  "id": "vs_15",
  "mode": "vs",
  "cat": "击杀",
  "icon": "💀",
  "name": "疯狂收割",
  "desc": "单局内消灭 80 只僵尸",
  "stat": "k_vsS",
  "target": 80,
  "single": true
 },
 {
  "id": "vs_16",
  "mode": "vs",
  "cat": "击杀",
  "icon": "💀",
  "name": "死神降临",
  "desc": "单局内消灭 150 只僵尸",
  "stat": "k_vsS",
  "target": 150,
  "single": true
 },
 {
  "id": "vs_17",
  "mode": "vs",
  "cat": "种植",
  "icon": "🌱",
  "name": "第一次种植",
  "desc": "在双人对战中累计种植 1 株植物",
  "stat": "p_vs",
  "target": 1,
  "single": false
 },
 {
  "id": "vs_18",
  "mode": "vs",
  "cat": "种植",
  "icon": "🌱",
  "name": "对战园丁",
  "desc": "在双人对战中累计种植 200 株植物",
  "stat": "p_vs",
  "target": 200,
  "single": false
 },
 {
  "id": "vs_19",
  "mode": "vs",
  "cat": "种植",
  "icon": "🌱",
  "name": "阵地绿化",
  "desc": "在双人对战中累计种植 600 株植物",
  "stat": "p_vs",
  "target": 600,
  "single": false
 },
 {
  "id": "vs_20",
  "mode": "vs",
  "cat": "种植",
  "icon": "🌱",
  "name": "要塞花园",
  "desc": "在双人对战中累计种植 1500 株植物",
  "stat": "p_vs",
  "target": 1500,
  "single": false
 },
 {
  "id": "vs_21",
  "mode": "vs",
  "cat": "种植",
  "icon": "🌱",
  "name": "植物军阵",
  "desc": "在双人对战中累计种植 3000 株植物",
  "stat": "p_vs",
  "target": 3000,
  "single": false
 },
 {
  "id": "vs_22",
  "mode": "vs",
  "cat": "种植",
  "icon": "🌱",
  "name": "小试身手",
  "desc": "单局内种植 25 株植物",
  "stat": "p_vsS",
  "target": 25,
  "single": true
 },
 {
  "id": "vs_23",
  "mode": "vs",
  "cat": "种植",
  "icon": "🌱",
  "name": "阵型大师",
  "desc": "单局内种植 50 株植物",
  "stat": "p_vsS",
  "target": 50,
  "single": true
 },
 {
  "id": "vs_24",
  "mode": "vs",
  "cat": "种植",
  "icon": "🌱",
  "name": "满园春色",
  "desc": "单局内种植 90 株植物",
  "stat": "p_vsS",
  "target": 90,
  "single": true
 },
 {
  "id": "vs_25",
  "mode": "vs",
  "cat": "经济",
  "icon": "☀️",
  "name": "第一缕阳光",
  "desc": "在双人对战中累计获得 3000 阳光",
  "stat": "s_vs",
  "target": 3000,
  "single": false
 },
 {
  "id": "vs_26",
  "mode": "vs",
  "cat": "经济",
  "icon": "☀️",
  "name": "对战富翁",
  "desc": "在双人对战中累计获得 12000 阳光",
  "stat": "s_vs",
  "target": 12000,
  "single": false
 },
 {
  "id": "vs_27",
  "mode": "vs",
  "cat": "经济",
  "icon": "☀️",
  "name": "对战金库",
  "desc": "在双人对战中累计获得 40000 阳光",
  "stat": "s_vs",
  "target": 40000,
  "single": false
 },
 {
  "id": "vs_28",
  "mode": "vs",
  "cat": "经济",
  "icon": "☀️",
  "name": "黄金堡垒",
  "desc": "在双人对战中累计获得 120000 阳光",
  "stat": "s_vs",
  "target": 120000,
  "single": false
 },
 {
  "id": "vs_29",
  "mode": "vs",
  "cat": "经济",
  "icon": "☀️",
  "name": "日光银行",
  "desc": "在双人对战中累计获得 300000 阳光",
  "stat": "s_vs",
  "target": 300000,
  "single": false
 },
 {
  "id": "vs_30",
  "mode": "vs",
  "cat": "经济",
  "icon": "☀️",
  "name": "小富即安",
  "desc": "单局内获得 1200 阳光",
  "stat": "s_vsS",
  "target": 1200,
  "single": true
 },
 {
  "id": "vs_31",
  "mode": "vs",
  "cat": "经济",
  "icon": "☀️",
  "name": "日进斗金",
  "desc": "单局内获得 4000 阳光",
  "stat": "s_vsS",
  "target": 4000,
  "single": true
 },
 {
  "id": "vs_32",
  "mode": "vs",
  "cat": "经济",
  "icon": "☀️",
  "name": "阳光瀑布",
  "desc": "单局内获得 10000 阳光",
  "stat": "s_vsS",
  "target": 10000,
  "single": true
 },
 {
  "id": "vs_33",
  "mode": "vs",
  "cat": "时间",
  "icon": "⏳",
  "name": "初入战场",
  "desc": "在双人对战中累计战斗 1 小时",
  "stat": "t_vs",
  "target": 3600,
  "single": false
 },
 {
  "id": "vs_34",
  "mode": "vs",
  "cat": "时间",
  "icon": "⏳",
  "name": "对战老兵",
  "desc": "在双人对战中累计战斗 5 小时",
  "stat": "t_vs",
  "target": 18000,
  "single": false
 },
 {
  "id": "vs_35",
  "mode": "vs",
  "cat": "时间",
  "icon": "⏳",
  "name": "通宵鏖战",
  "desc": "在双人对战中累计战斗 20 小时",
  "stat": "t_vs",
  "target": 72000,
  "single": false
 },
 {
  "id": "vs_36",
  "mode": "vs",
  "cat": "时间",
  "icon": "⏳",
  "name": "战场常青",
  "desc": "在双人对战中累计战斗 60 小时",
  "stat": "t_vs",
  "target": 216000,
  "single": false
 },
 {
  "id": "vs_37",
  "mode": "vs",
  "cat": "时间",
  "icon": "⏳",
  "name": "不灭战魂",
  "desc": "在双人对战中累计战斗 160 小时",
  "stat": "t_vs",
  "target": 576000,
  "single": false
 },
 {
  "id": "vs_38",
  "mode": "vs",
  "cat": "时间",
  "icon": "⏳",
  "name": "站住脚跟",
  "desc": "单局坚守 10 分钟",
  "stat": "t_vsS",
  "target": 600,
  "single": true
 },
 {
  "id": "vs_39",
  "mode": "vs",
  "cat": "时间",
  "icon": "⏳",
  "name": "铁壁防线",
  "desc": "单局坚守 25 分钟",
  "stat": "t_vsS",
  "target": 1500,
  "single": true
 },
 {
  "id": "vs_40",
  "mode": "vs",
  "cat": "时间",
  "icon": "⏳",
  "name": "不眠之夜",
  "desc": "单局坚守 50 分钟",
  "stat": "t_vsS",
  "target": 3000,
  "single": true
 },
 {
  "id": "vs_41",
  "mode": "vs",
  "cat": "挑战",
  "icon": "🏆",
  "name": "首场胜绩",
  "desc": "在双人对战中获胜 1 局",
  "stat": "wins_vs",
  "target": 1,
  "single": false
 },
 {
  "id": "vs_42",
  "mode": "vs",
  "cat": "挑战",
  "icon": "🏆",
  "name": "连胜之心",
  "desc": "在双人对战中累计获胜 10 局",
  "stat": "wins_vs",
  "target": 10,
  "single": false
 },
 {
  "id": "vs_43",
  "mode": "vs",
  "cat": "挑战",
  "icon": "🏆",
  "name": "常胜将军",
  "desc": "在双人对战中累计获胜 30 局",
  "stat": "wins_vs",
  "target": 30,
  "single": false
 },
 {
  "id": "vs_44",
  "mode": "vs",
  "cat": "挑战",
  "icon": "💀",
  "name": "无双",
  "desc": "单局内消灭 250 只僵尸",
  "stat": "k_vsS",
  "target": 250,
  "single": true
 },
 {
  "id": "vs_45",
  "mode": "vs",
  "cat": "挑战",
  "icon": "💀",
  "name": "尸横遍野",
  "desc": "在双人对战中累计消灭 20000 只僵尸",
  "stat": "k_vs",
  "target": 20000,
  "single": false
 },
 {
  "id": "vs_46",
  "mode": "vs",
  "cat": "挑战",
  "icon": "🌱",
  "name": "千株成阵",
  "desc": "单局内种植 120 株植物",
  "stat": "p_vsS",
  "target": 120,
  "single": true
 },
 {
  "id": "vs_47",
  "mode": "vs",
  "cat": "挑战",
  "icon": "☀️",
  "name": "日光海啸",
  "desc": "单局内获得 30000 阳光",
  "stat": "s_vsS",
  "target": 30000,
  "single": true
 },
 {
  "id": "vs_48",
  "mode": "vs",
  "cat": "挑战",
  "icon": "⏳",
  "name": "马拉松",
  "desc": "单局坚守 90 分钟",
  "stat": "t_vsS",
  "target": 5400,
  "single": true
 },
 {
  "id": "vs_49",
  "mode": "vs",
  "cat": "挑战",
  "icon": "🎮",
  "name": "百局之约",
  "desc": "游玩双人对战累计 200 局",
  "stat": "plays_vs",
  "target": 200,
  "single": false
 },
 {
  "id": "vs_50",
  "mode": "vs",
  "cat": "挑战",
  "icon": "💀",
  "name": "死神降临",
  "desc": "单局内消灭 400 只僵尸",
  "stat": "k_vsS",
  "target": 400,
  "single": true
 },
 {
  "id": "dorm_01",
  "mode": "dorm",
  "cat": "参与",
  "icon": "🏠",
  "name": "入住宿舍",
  "desc": "游玩守屋大作战 1 局",
  "stat": "dPlays",
  "target": 1,
  "single": false
 },
 {
  "id": "dorm_02",
  "mode": "dorm",
  "cat": "参与",
  "icon": "🏠",
  "name": "宿舍常客",
  "desc": "游玩守屋大作战累计 3 局",
  "stat": "dPlays",
  "target": 3,
  "single": false
 },
 {
  "id": "dorm_03",
  "mode": "dorm",
  "cat": "参与",
  "icon": "🏠",
  "name": "守屋达人",
  "desc": "游玩守屋大作战累计 10 局",
  "stat": "dPlays",
  "target": 10,
  "single": false
 },
 {
  "id": "dorm_04",
  "mode": "dorm",
  "cat": "参与",
  "icon": "🏠",
  "name": "宿舍守护神",
  "desc": "游玩守屋大作战累计 25 局",
  "stat": "dPlays",
  "target": 25,
  "single": false
 },
 {
  "id": "dorm_05",
  "mode": "dorm",
  "cat": "参与",
  "icon": "🏠",
  "name": "守夜人",
  "desc": "游玩守屋大作战累计 50 局",
  "stat": "dPlays",
  "target": 50,
  "single": false
 },
 {
  "id": "dorm_06",
  "mode": "dorm",
  "cat": "参与",
  "icon": "🏠",
  "name": "百夜守屋",
  "desc": "游玩守屋大作战累计 100 局",
  "stat": "dPlays",
  "target": 100,
  "single": false
 },
 {
  "id": "dorm_07",
  "mode": "dorm",
  "cat": "胜利",
  "icon": "🏆",
  "name": "首场守卫胜利",
  "desc": "在守屋大作战中获胜 1 局",
  "stat": "dWins",
  "target": 1,
  "single": false
 },
 {
  "id": "dorm_08",
  "mode": "dorm",
  "cat": "胜利",
  "icon": "🏆",
  "name": "连胜守屋",
  "desc": "在守屋大作战中累计获胜 5 局",
  "stat": "dWins",
  "target": 5,
  "single": false
 },
 {
  "id": "dorm_09",
  "mode": "dorm",
  "cat": "胜利",
  "icon": "🏆",
  "name": "守屋名将",
  "desc": "在守屋大作战中累计获胜 15 局",
  "stat": "dWins",
  "target": 15,
  "single": false
 },
 {
  "id": "dorm_10",
  "mode": "dorm",
  "cat": "胜利",
  "icon": "🏆",
  "name": "守屋元帅",
  "desc": "在守屋大作战中累计获胜 40 局",
  "stat": "dWins",
  "target": 40,
  "single": false
 },
 {
  "id": "dorm_11",
  "mode": "dorm",
  "cat": "胜利",
  "icon": "🏆",
  "name": "宿舍传奇",
  "desc": "在守屋大作战中累计获胜 100 局",
  "stat": "dWins",
  "target": 100,
  "single": false
 },
 {
  "id": "dorm_12",
  "mode": "dorm",
  "cat": "击杀",
  "icon": "💀",
  "name": "击退首敌",
  "desc": "在守屋大作战中累计消灭 20 只僵尸",
  "stat": "dKillsT",
  "target": 20,
  "single": false
 },
 {
  "id": "dorm_13",
  "mode": "dorm",
  "cat": "击杀",
  "icon": "💀",
  "name": "守屋初战",
  "desc": "在守屋大作战中累计消灭 60 只僵尸",
  "stat": "dKillsT",
  "target": 60,
  "single": false
 },
 {
  "id": "dorm_14",
  "mode": "dorm",
  "cat": "击杀",
  "icon": "💀",
  "name": "屋前清道夫",
  "desc": "在守屋大作战中累计消灭 150 只僵尸",
  "stat": "dKillsT",
  "target": 150,
  "single": false
 },
 {
  "id": "dorm_15",
  "mode": "dorm",
  "cat": "击杀",
  "icon": "💀",
  "name": "宿舍守护者",
  "desc": "在守屋大作战中累计消灭 400 只僵尸",
  "stat": "dKillsT",
  "target": 400,
  "single": false
 },
 {
  "id": "dorm_16",
  "mode": "dorm",
  "cat": "击杀",
  "icon": "💀",
  "name": "僵尸猎人",
  "desc": "在守屋大作战中累计消灭 900 只僵尸",
  "stat": "dKillsT",
  "target": 900,
  "single": false
 },
 {
  "id": "dorm_17",
  "mode": "dorm",
  "cat": "击杀",
  "icon": "💀",
  "name": "肃清全场",
  "desc": "在守屋大作战中累计消灭 2000 只僵尸",
  "stat": "dKillsT",
  "target": 2000,
  "single": false
 },
 {
  "id": "dorm_18",
  "mode": "dorm",
  "cat": "击杀",
  "icon": "💀",
  "name": "单局卫家",
  "desc": "单局内消灭 10 只僵尸",
  "stat": "dKillsS",
  "target": 10,
  "single": true
 },
 {
  "id": "dorm_19",
  "mode": "dorm",
  "cat": "击杀",
  "icon": "💀",
  "name": "单局护院",
  "desc": "单局内消灭 25 只僵尸",
  "stat": "dKillsS",
  "target": 25,
  "single": true
 },
 {
  "id": "dorm_20",
  "mode": "dorm",
  "cat": "击杀",
  "icon": "💀",
  "name": "单局无双",
  "desc": "单局内消灭 60 只僵尸",
  "stat": "dKillsS",
  "target": 60,
  "single": true
 },
 {
  "id": "dorm_21",
  "mode": "dorm",
  "cat": "种植",
  "icon": "🌱",
  "name": "布置家园",
  "desc": "在守屋大作战中累计种植 60 株植物",
  "stat": "dPlantsT",
  "target": 60,
  "single": false
 },
 {
  "id": "dorm_22",
  "mode": "dorm",
  "cat": "种植",
  "icon": "🌱",
  "name": "绿意盎然",
  "desc": "在守屋大作战中累计种植 200 株植物",
  "stat": "dPlantsT",
  "target": 200,
  "single": false
 },
 {
  "id": "dorm_23",
  "mode": "dorm",
  "cat": "种植",
  "icon": "🌱",
  "name": "屋院成荫",
  "desc": "在守屋大作战中累计种植 600 株植物",
  "stat": "dPlantsT",
  "target": 600,
  "single": false
 },
 {
  "id": "dorm_24",
  "mode": "dorm",
  "cat": "种植",
  "icon": "🌱",
  "name": "植物堡垒",
  "desc": "在守屋大作战中累计种植 1500 株植物",
  "stat": "dPlantsT",
  "target": 1500,
  "single": false
 },
 {
  "id": "dorm_25",
  "mode": "dorm",
  "cat": "种植",
  "icon": "🌱",
  "name": "满园生机",
  "desc": "在守屋大作战中累计种植 3000 株植物",
  "stat": "dPlantsT",
  "target": 3000,
  "single": false
 },
 {
  "id": "dorm_26",
  "mode": "dorm",
  "cat": "种植",
  "icon": "🌱",
  "name": "小试身手",
  "desc": "单局内种植 20 株植物",
  "stat": "dPlantsS",
  "target": 20,
  "single": true
 },
 {
  "id": "dorm_27",
  "mode": "dorm",
  "cat": "种植",
  "icon": "🌱",
  "name": "屋院小园丁",
  "desc": "单局内种植 45 株植物",
  "stat": "dPlantsS",
  "target": 45,
  "single": true
 },
 {
  "id": "dorm_28",
  "mode": "dorm",
  "cat": "经济",
  "icon": "☀️",
  "name": "阳光初积",
  "desc": "在守屋大作战中累计产出 3000 阳光",
  "stat": "dSunT",
  "target": 3000,
  "single": false
 },
 {
  "id": "dorm_29",
  "mode": "dorm",
  "cat": "经济",
  "icon": "☀️",
  "name": "阳光富户",
  "desc": "在守屋大作战中累计产出 12000 阳光",
  "stat": "dSunT",
  "target": 12000,
  "single": false
 },
 {
  "id": "dorm_30",
  "mode": "dorm",
  "cat": "经济",
  "icon": "☀️",
  "name": "阳光小地主",
  "desc": "在守屋大作战中累计产出 40000 阳光",
  "stat": "dSunT",
  "target": 40000,
  "single": false
 },
 {
  "id": "dorm_31",
  "mode": "dorm",
  "cat": "经济",
  "icon": "☀️",
  "name": "单局温饱",
  "desc": "单局内产出 1500 阳光",
  "stat": "dSunS",
  "target": 1500,
  "single": true
 },
 {
  "id": "dorm_32",
  "mode": "dorm",
  "cat": "经济",
  "icon": "☀️",
  "name": "单局丰饶",
  "desc": "单局内产出 5000 阳光",
  "stat": "dSunS",
  "target": 5000,
  "single": true
 },
 {
  "id": "dorm_33",
  "mode": "dorm",
  "cat": "经济",
  "icon": "☀️",
  "name": "单局暴富",
  "desc": "单局内产出 12000 阳光",
  "stat": "dSunS",
  "target": 12000,
  "single": true
 },
 {
  "id": "dorm_34",
  "mode": "dorm",
  "cat": "时间",
  "icon": "⏳",
  "name": "初守之夜",
  "desc": "在守屋大作战中累计战斗 1 小时",
  "stat": "dTimeT",
  "target": 3600,
  "single": false
 },
 {
  "id": "dorm_35",
  "mode": "dorm",
  "cat": "时间",
  "icon": "⏳",
  "name": "守夜老兵",
  "desc": "在守屋大作战中累计战斗 5 小时",
  "stat": "dTimeT",
  "target": 18000,
  "single": false
 },
 {
  "id": "dorm_36",
  "mode": "dorm",
  "cat": "时间",
  "icon": "⏳",
  "name": "守屋二十夜",
  "desc": "在守屋大作战中累计战斗 20 小时",
  "stat": "dTimeT",
  "target": 72000,
  "single": false
 },
 {
  "id": "dorm_37",
  "mode": "dorm",
  "cat": "时间",
  "icon": "⏳",
  "name": "守屋六十夜",
  "desc": "在守屋大作战中累计战斗 60 小时",
  "stat": "dTimeT",
  "target": 216000,
  "single": false
 },
 {
  "id": "dorm_38",
  "mode": "dorm",
  "cat": "时间",
  "icon": "⏳",
  "name": "永夜守护",
  "desc": "在守屋大作战中累计战斗 160 小时",
  "stat": "dTimeT",
  "target": 576000,
  "single": false
 },
 {
  "id": "dorm_39",
  "mode": "dorm",
  "cat": "时间",
  "icon": "⏳",
  "name": "站住脚跟",
  "desc": "单局坚守 10 分钟",
  "stat": "dTimeS",
  "target": 600,
  "single": true
 },
 {
  "id": "dorm_40",
  "mode": "dorm",
  "cat": "时间",
  "icon": "⏳",
  "name": "铁壁宿舍",
  "desc": "单局坚守 25 分钟",
  "stat": "dTimeS",
  "target": 1500,
  "single": true
 },
 {
  "id": "dorm_41",
  "mode": "dorm",
  "cat": "挑战",
  "icon": "⏫",
  "name": "初试跳板",
  "desc": "累计使用房间跳板 5 次",
  "stat": "dJump",
  "target": 5,
  "single": false
 },
 {
  "id": "dorm_42",
  "mode": "dorm",
  "cat": "挑战",
  "icon": "⏫",
  "name": "跳板达人",
  "desc": "累计使用房间跳板 25 次",
  "stat": "dJump",
  "target": 25,
  "single": false
 },
 {
  "id": "dorm_43",
  "mode": "dorm",
  "cat": "挑战",
  "icon": "🔨",
  "name": "初修门板",
  "desc": "累计修复门板 10 次",
  "stat": "dDoors",
  "target": 10,
  "single": false
 },
 {
  "id": "dorm_44",
  "mode": "dorm",
  "cat": "挑战",
  "icon": "🔨",
  "name": "木工大师",
  "desc": "累计修复门板 50 次",
  "stat": "dDoors",
  "target": 50,
  "single": false
 },
 {
  "id": "dorm_45",
  "mode": "dorm",
  "cat": "挑战",
  "icon": "🎁",
  "name": "初次开箱",
  "desc": "累计打开植物盲盒 10 次",
  "stat": "dBlind",
  "target": 10,
  "single": false
 },
 {
  "id": "dorm_46",
  "mode": "dorm",
  "cat": "挑战",
  "icon": "🎁",
  "name": "盲盒收集家",
  "desc": "累计打开植物盲盒 50 次",
  "stat": "dBlind",
  "target": 50,
  "single": false
 },
 {
  "id": "dorm_47",
  "mode": "dorm",
  "cat": "挑战",
  "icon": "⚡",
  "name": "技能频发",
  "desc": "累计释放角色技能 20 次",
  "stat": "dSkill",
  "target": 20,
  "single": false
 },
 {
  "id": "dorm_48",
  "mode": "dorm",
  "cat": "挑战",
  "icon": "👻",
  "name": "双面人生",
  "desc": "累计 3 局中变身为内鬼",
  "stat": "dTraitor",
  "target": 3,
  "single": false
 },
 {
  "id": "dorm_49",
  "mode": "dorm",
  "cat": "挑战",
  "icon": "😇",
  "name": "天使降临",
  "desc": "累计 3 局中变身为天使",
  "stat": "dAngel",
  "target": 3,
  "single": false
 },
 {
  "id": "dorm_50",
  "mode": "dorm",
  "cat": "挑战",
  "icon": "🤖",
  "name": "击败首只机甲",
  "desc": "击败机甲僵王 1 次",
  "stat": "dBoss",
  "target": 1,
  "single": false
 }
];

    const LS_KEY = 'pvz_ach_v1';
    const MODE_NAMES = { classic: '经典冒险', fusion: '融合进化', vase: '砸罐子', iz: '我是僵尸', vs: '双人对战', dorm: '守屋大作战' };
    const MODE_ICONS = { classic: '☀️', fusion: '🧬', vase: '🏺', iz: '🧟', vs: '⚔️', dorm: '🏠' };

    // 持久累计统计（跨局）：totals[stat]
    // 单局统计（本局）：session[stat]
    let state = null;

    function load() {
        try {
            state = JSON.parse(localStorage.getItem(LS_KEY)) || null;
        } catch (e) { state = null; }
        if (!state || typeof state !== 'object') {
            state = { unlocked: {}, totals: {} };
        }
        if (!state.unlocked) state.unlocked = {};
        if (!state.totals) state.totals = {};
        state.session = {};
        state.mode = null;
        state._toast = null;
    }
    function save() {
        try {
            const s = { unlocked: state.unlocked, totals: state.totals };
            localStorage.setItem(LS_KEY, JSON.stringify(s));
        } catch (e) { /* 存储不可用则仅本局有效 */ }
    }
    // v4.0.73：高频统计不逐次写盘（守屋 dTime 每帧触发），3 秒节流落盘 + 页面卸载兜底
    let _saveLast = 0;
    function saveThrottled() {
        const now = Date.now();
        if (now - _saveLast > 3000) { _saveLast = now; save(); }
    }
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', save);
    function cur(key) {
        if (key in state.session) return state.session[key];
        return state.totals[key] || 0;
    }
    function addTotal(key, n) { state.totals[key] = (state.totals[key] || 0) + n; }
    function addSession(key, n) { state.session[key] = (state.session[key] || 0) + n; }

    // 计算某条成就当前进度值
    function prog(a) {
        return a.single ? (state.session[a.stat] || 0) : (state.totals[a.stat] || 0);
    }

    // 解锁检查：对指定模式全部成就扫描一次
    function checkMode(mode) {
        const list = ACHIEVEMENTS.filter(a => a.mode === mode);
        for (const a of list) {
            if (state.unlocked[a.id]) continue;
            if (prog(a) >= a.target) unlock(a);
        }
    }
    function unlock(a) {
        state.unlocked[a.id] = 1;
        save();
        toast(a);
    }

    // ===== 对外 API =====
    const T = {
        // 开局：mode 用字符串，重置单局统计
        sessionStart(mode) {
            state.mode = mode;
            state.session = {};
            addTotal('plays', 1);
            addTotal('plays_' + mode, 1);
            save(); // 开局即持久化参与局数
            checkMode(mode);
        },
        // 通用增量：键在 totals/session 均计；随后检查所属模式成就
        bump(stat, n, single) {
            n = n || 1;
            addTotal(stat, n);
            if (single || !single) addSession(stat, n);
            // 找出用这个 stat 的成就（不管模式），进度满足即解锁
            for (const a of ACHIEVEMENTS) {
                if (a.stat !== stat) continue;
                if (state.unlocked[a.id]) continue;
                if (prog(a) >= a.target) unlock(a);
            }
            saveThrottled(); // 进度节流落盘（未解锁的累计进度也不丢）
        },
        // 击杀（GameLoop 系，按当前模式独立计数）
        kill() { const m = state.mode || 'classic'; T.bump('k_' + m, 1); T.bump('k_' + m + 'S', 1); },
        // 种植
        plant() { const m = state.mode || 'classic'; T.bump('p_' + m, 1); T.bump('p_' + m + 'S', 1); },
        // 阳光
        sun(amount) { const m = state.mode || 'classic'; T.bump('s_' + m, amount); T.bump('s_' + m + 'S', amount); },
        // 对局时间（秒）
        time(dt) { const m = state.mode || 'classic'; T.bump('t_' + m, dt); T.bump('t_' + m + 'S', dt); },
        // 守屋击杀
        dKill() { T.bump('dKillsT', 1); T.bump('dKillsS', 1); },
        // 守屋种植
        dPlant() { T.bump('dPlantsT', 1); T.bump('dPlantsS', 1); },
        // 守屋资源
        dSun(amount) { T.bump('dSunT', amount); T.bump('dSunS', amount); },
        dSpore(amount) { T.bump('dSporeT', amount); T.bump('dSporeS', amount); },
        // 守屋时间
        dTime(dt) { T.bump('dTimeT', dt); T.bump('dTimeS', dt); },
        // 通用：模式胜利/失败（wins_<mode>/losses_<mode>，成就 target 用这两个键）
        win(mode) { addTotal('wins', 1); addTotal('wins_' + mode, 1); save(); checkMode(mode); },
        lose(mode) { addTotal('losses', 1); addTotal('losses_' + mode, 1); save(); checkMode(mode); },
        // 当前模式（守屋用）
        mode() { return state.mode; },
        // 调试/统计查询
        getState() { return state; },
        unlockedCount() { return Object.keys(state.unlocked).filter(id => ACHIEVEMENTS.some(a => a.id === id)).length; },
        totalCount() { return ACHIEVEMENTS.length; },
        achievements() { return ACHIEVEMENTS; },
    };

    // ===== 解锁弹窗 toast =====
    function toast(a) {
        try {
            let el = document.getElementById('ach-toast-box');
            if (!el) {
                el = document.createElement('div');
                el.id = 'ach-toast-box';
                el.style.cssText = 'position:fixed; top:18px; left:50%; transform:translateX(-50%); z-index:99999; display:flex; flex-direction:column; gap:8px; pointer-events:none; align-items:center;';
                document.body.appendChild(el);
            }
            const t = document.createElement('div');
            t.style.cssText = 'background:linear-gradient(180deg,#ffe9a8,#f7cf6b); border:3px solid #a97b2a; border-radius:12px; padding:8px 18px; box-shadow:0 4px 0 #7a5420, 0 10px 24px rgba(0,0,0,.45); font-family:"Kaiti SC","STKaiti","KaiTi",serif; color:#4a2f10; font-size:15px; font-weight:700; text-align:center; animation:achToastIn .35s ease, achToastOut .4s ease 3.2s forwards; white-space:nowrap;';
            t.innerHTML = '🏆 <b style="color:#c0392b;">成就解锁</b> · ' + a.icon + ' ' + a.name;
            el.appendChild(t);
            setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
        } catch (e) { /* toast 失败不影响游戏 */ }
    }

    // ===== 主菜单「成就」按钮 + 面板 =====
    let panelOpen = false;

    function mountMenuButton() {
        try {
            const titleEl = document.querySelector('#start-menu .game-title');
            if (!titleEl) return;
            // 已挂过则跳过
            if (document.getElementById('btn-achievements')) return;
            const btn = document.createElement('button');
            btn.id = 'btn-achievements';
            btn.style.cssText = 'display:inline-flex; align-items:center; gap:7px; white-space:nowrap; font-family:"Kaiti SC","STKaiti","KaiTi",serif; font-size:19px; font-weight:900; letter-spacing:2px; color:#f7e9c0; vertical-align:middle; background:linear-gradient(180deg,#7a5a33 0%,#5d4223 60%,#4a331b 100%); border:3px solid #3a2812; border-radius:12px; padding:8px 20px; box-shadow:inset 0 2px 0 rgba(255,235,180,.25), 0 5px 12px rgba(0,0,0,.45); text-shadow:1px 1px 0 #2a1c0c; cursor:pointer; transition:transform .12s ease, filter .12s ease;';
            btn.onmouseenter = () => { btn.style.transform = 'translateY(-2px)'; btn.style.filter = 'brightness(1.1)'; };
            btn.onmouseleave = () => { btn.style.transform = ''; btn.style.filter = ''; };
            btn.innerHTML = '<span style="font-size:18px;">🏆</span>成就';
            btn.addEventListener('click', openPanel);
            // 排在「操作与道具说明」按钮正右边（同排同尺寸）
            const helpBtn = document.getElementById('btn-help-guide');
            if (helpBtn) helpBtn.parentNode.insertBefore(btn, helpBtn.nextSibling);
            else titleEl.parentNode.insertBefore(btn, titleEl.nextSibling);
        } catch (e) { /* 无主菜单（如守屋页）不挂按钮 */ }
    }

    function openPanel() {
        if (panelOpen) return;
        panelOpen = true;
        const dim = document.createElement('div');
        dim.id = 'ach-modal';
        dim.style.cssText = 'position:fixed; inset:0; z-index:9500; background:rgba(0,0,0,.78); display:flex; align-items:center; justify-content:center;';
        const modes = ['classic', 'fusion', 'vase', 'iz', 'vs', 'dorm'];
        const total = T.totalCount();
        const unlocked = T.unlockedCount();
        dim.innerHTML =
            '<div id="ach-panel" style="width:860px; max-width:92vw; max-height:88vh; display:flex; flex-direction:column; background:linear-gradient(180deg,#fdf3d0,#eeda9f); border:5px solid #6b4a22; border-radius:14px; box-shadow:inset 0 0 0 2px #caa95f, 0 14px 34px rgba(0,0,0,.6); overflow:hidden;">' +
                '<div style="padding:12px 18px 6px; text-align:center; position:relative;">' +
                    '<div style="font-family:"Kaiti SC","STKaiti","KaiTi",serif; font-size:26px; font-weight:900; letter-spacing:6px; color:#4a3414; text-shadow:1px 1px 0 rgba(255,255,255,.7);">🏆 成就</div>' +
                    '<div id="ach-total" style="font-family:monospace; font-size:13px; color:#7a5c22; margin-top:2px;"></div>' +
                '</div>' +
                '<div id="ach-tabs" style="display:flex; gap:6px; padding:6px 14px 10px; justify-content:center;"></div>' +
                '<div id="ach-body" style="flex:1; overflow-y:auto; padding:6px 14px 14px;"></div>' +
                '<div style="padding:10px 14px 14px; text-align:center; border-top:2px solid #caa95f;">' +
                    '<button id="ach-back" style="font-family:"Kaiti SC","STKaiti","KaiTi",serif; font-size:18px; font-weight:900; letter-spacing:4px; color:#f7e9c0; background:linear-gradient(180deg,#7a5a33 0%,#5d4223 60%,#4a331b 100%); border:3px solid #3a2812; border-radius:12px; padding:8px 34px; box-shadow:inset 0 2px 0 rgba(255,235,180,.25), 0 5px 12px rgba(0,0,0,.45); text-shadow:1px 1px 0 #2a1c0c; cursor:pointer;">返回主菜单</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(dim);
        dim.querySelector('#ach-back').onclick = () => { dim.remove(); panelOpen = false; };
        dim.addEventListener('click', e => { if (e.target === dim) { dim.remove(); panelOpen = false; } });
        dim.querySelector('#ach-total').textContent = '已解锁 ' + unlocked + ' / ' + total;

        const tabsWrap = dim.querySelector('#ach-tabs');
        const body = dim.querySelector('#ach-body');
        let activeMode = 'classic';

        function renderTab() {
            const list = ACHIEVEMENTS.filter(a => a.mode === activeMode);
            const un = list.filter(a => state.unlocked[a.id]).length;
            // v4.0.76：修复 tab 计数 bug——原实现所有 tab 共用 activeMode 的解锁数，
            // 导致点开「砸罐子」后 6 个 tab 全部显示同一数字（其他模式也显示 3/50）。每个 tab 独立计算自己模式的解锁数。
            const unByMode = m => ACHIEVEMENTS.filter(a => a.mode === m && state.unlocked[a.id]).length;
            const lenByMode = m => ACHIEVEMENTS.filter(a => a.mode === m).length;
            tabsWrap.innerHTML = modes.map(m =>
                '<div data-m="' + m + '" style="cursor:pointer; font-family:"Kaiti SC","STKaiti","KaiTi",serif; font-size:15px; font-weight:700; letter-spacing:2px; padding:5px 14px; border-radius:9px; border:2px solid #a97b2a; ' +
                (m === activeMode ? 'background:linear-gradient(180deg,#f7cf6b,#e6b24a); color:#4a2f10;' : 'background:rgba(255,255,255,.35); color:#7a5c22;') + '">' + MODE_ICONS[m] + ' ' + MODE_NAMES[m] +
                ' <span style="font-family:monospace; font-size:12px;">(' + unByMode(m) + '/' + lenByMode(m) + ')</span></div>'
            ).join('');
            tabsWrap.querySelectorAll('[data-m]').forEach(tb => tb.onclick = () => { activeMode = tb.dataset.m; renderTab(); });

            body.innerHTML = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">' +
                list.map(a => {
                    const got = !!state.unlocked[a.id];
                    const p = Math.min(1, prog(a) / a.target);
                    const pct = Math.floor(p * 100);
                    return '<div style="display:flex; gap:8px; align-items:flex-start; padding:8px 10px; border-radius:9px; border:2px solid ' + (got ? '#caa95f' : 'rgba(106,74,34,.35)') + '; background:' + (got ? 'rgba(255,236,150,.55)' : 'rgba(255,255,255,.35)') + '; ' + (got ? '' : 'opacity:.92;') + '">' +
                        '<div style="font-size:22px; width:30px; text-align:center; filter:' + (got ? 'none' : 'grayscale(.7) opacity(.55)') + ';">' + a.icon + '</div>' +
                        '<div style="flex:1; min-width:0;">' +
                            '<div style="font-family:"Kaiti SC","STKaiti","KaiTi",serif; font-size:15px; font-weight:700; color:#4a3414;">' + a.name + (got ? ' <span style="color:#c0392b;">✔</span>' : '') + '</div>' +
                            '<div style="font-size:12px; color:#6d5626; line-height:1.45; margin-top:2px;">' + a.desc + '</div>' +
                            '<div style="height:8px; border:1px solid #a97b2a; border-radius:4px; margin-top:5px; background:rgba(255,255,255,.5); overflow:hidden;">' +
                                '<div style="height:100%; width:' + pct + '%; background:linear-gradient(90deg,#8fbf4f,#d9c14a);"></div>' +
                            '</div>' +
                            '<div style="font-family:monospace; font-size:11px; color:#8a6a42; margin-top:2px;">' +
                                (got ? '已达成' : (a.single ? '本局 ' : '累计 ') + Math.min(prog(a), a.target) + ' / ' + a.target) +
                            '</div>' +
                        '</div></div>';
                }).join('') + '</div>';
        }
        renderTab();
    }

    // ===== 初始化 =====
    load();
    // 主菜单按钮（index.html 首页）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountMenuButton);
    } else {
        mountMenuButton();
    }
    // 守屋页面也允许 toast（不挂按钮）
    window.AchTracker = T;
    window.__AchInitDone = true;
})();
