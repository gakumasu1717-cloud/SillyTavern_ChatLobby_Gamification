// ============================================
// ChatLobby Gamification - 게이미피케이션 확장
// "인생 배팅" 버전 - 자조적 유머와 수집 욕구를 자극하는 업적 시스템
// ============================================

(function() {
    'use strict';

    const EXTENSION_NAME = 'ChatLobby Gamification';
    const STORAGE_KEY = 'chatLobby_gamification';
    const CHECK_INTERVAL = 3000; // ChatLobby 감지 인터벌
    const CHATLOBBY_KEYS = ['chatLobby_lastChatTimes', 'chatLobby_calendar', 'chatLobby_data'];

    // ============================================
    // 🏅 호감도 등급 시스템 (캐릭터별 메시지 수 기반)
    // 기준: 1등캐 10,000챗, 하루 평균 200챗
    // ============================================
    const AFFINITY_TIERS = [
        { min: 0,       max: 499,     tier: 'stranger',     name: '낯선 사람',      icon: '👤', color: '#888888', border: 'none' },
        { min: 500,     max: 999,     tier: 'acquaintance', name: '아는 사이',      icon: '👋', color: '#4a90d9', border: 'solid 2px #4a90d9' },
        { min: 1000,    max: 2499,    tier: 'friend',       name: '친구',           icon: '🤝', color: '#50c878', border: 'solid 2px #50c878' },
        { min: 2500,    max: 4999,    tier: 'closefriend',  name: '절친',           icon: '💚', color: '#32cd32', border: 'solid 3px #32cd32' },
        { min: 5000,    max: 9999,    tier: 'bestie',       name: '베스트프렌드',   icon: '💛', color: '#ffd700', border: 'solid 3px #ffd700' },
        { min: 10000,   max: 24999,   tier: 'soulmate',     name: '소울메이트',     icon: '💜', color: '#9370db', border: 'solid 3px #9370db, 0 0 10px #9370db40' },
        { min: 25000,   max: 49999,   tier: 'obsession',    name: '집착',           icon: '💗', color: '#ff69b4', border: 'solid 4px #ff69b4, 0 0 15px #ff69b440' },
        { min: 50000,   max: 99999,   tier: 'devotion',     name: '헌신',           icon: '💖', color: '#ff1493', border: 'solid 4px #ff1493, 0 0 20px #ff149340' },
        { min: 100000,  max: 199999,  tier: 'eternal',      name: '영혼의 반쪽',    icon: '💕', color: '#ff0080', border: 'solid 5px #ff0080, 0 0 25px #ff008050' },
        { min: 200000,  max: Infinity, tier: 'singularity', name: '특이점',         icon: '🌌', color: '#000', border: 'solid 5px transparent', gradient: 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)' }
    ];

    // ============================================
    // 🏆 업적 시스템
    // ============================================
    const ACHIEVEMENTS = {
        // 📊 통계 기반 업적 (기준: 하루 200챗, 전체 2-3만챗)
        stats: [
            { id: 'first_chat', name: '첫 발자국', desc: '첫 번째 대화를 시작했습니다', icon: '👣', condition: (d) => d.totalMessages >= 1 },
            { id: 'msg_1000', name: '워밍업', desc: '1,000개의 메시지! 이제 시작이에요', icon: '🔥', condition: (d) => d.totalMessages >= 1000 },
            { id: 'msg_5000', name: '수다쟁이', desc: '5,000개의 메시지를 보냈습니다', icon: '🗣️', condition: (d) => d.totalMessages >= 5000 },
            { id: 'msg_10000', name: '입문자', desc: '10,000개! 이제 좀 알 것 같아요', icon: '📖', condition: (d) => d.totalMessages >= 10000 },
            { id: 'msg_25000', name: '키보드 워리어', desc: '25,000개의 메시지! 손가락이 아프지 않으세요?', icon: '⌨️', condition: (d) => d.totalMessages >= 25000 },
            { id: 'msg_50000', name: '전설의 시작', desc: '50,000개의 메시지를 달성했습니다', icon: '🌟', condition: (d) => d.totalMessages >= 50000 },
            { id: 'msg_100000', name: '도파민 중독', desc: '100,000개... 뇌가 절여지고 있어요', icon: '💉', condition: (d) => d.totalMessages >= 100000 },
            { id: 'msg_250000', name: '인간 포기', desc: '250,000개! 인간이기를 포기하셨습니다', icon: '🤖', condition: (d) => d.totalMessages >= 250000 },
            { id: 'msg_500000', name: '디지털 존재', desc: '500,000개! 이미 반쯤 AI가 되셨네요', icon: '💾', condition: (d) => d.totalMessages >= 500000 },
            { id: 'msg_1000000', name: '나무위키 편집자', desc: '설정집만 A4 1000장 분량', icon: '📚', condition: (d) => d.totalMessages >= 1000000 },
        ],
        
        // 👥 캐릭터 수집 업적 (기준: 봇카드 100개 기본)
        collection: [
            { id: 'char_10', name: '시작하는 콜렉터', desc: '10명의 캐릭터와 대화했습니다', icon: '📦', condition: (d) => d.charCount >= 10 },
            { id: 'char_25', name: '사교적인 편', desc: '25명의 캐릭터와 대화했습니다', icon: '🎭', condition: (d) => d.charCount >= 25 },
            { id: 'char_50', name: '하렘 빌더', desc: '50명의 캐릭터! 바람둥이가 아닙니다', icon: '👑', condition: (d) => d.charCount >= 50 },
            { id: 'char_100', name: '문어발 연애', desc: '100명! 박애주의자이신가요?', icon: '🐙', condition: (d) => d.charCount >= 100 },
            { id: 'char_200', name: '은하계 콜렉터', desc: '200명의 캐릭터와 대화했습니다', icon: '🌍', condition: (d) => d.charCount >= 200 },
            { id: 'char_500', name: '차원 정복자', desc: '500명! 모든 세계관을 섭렵하셨군요', icon: '🌌', condition: (d) => d.charCount >= 500 },
        ],
        
        // 📅 출석 업적 (스트릭 기반)
        streak: [
            { id: 'streak_3', name: '3일 연속', desc: '3일 연속으로 접속했습니다', icon: '🔥', condition: (d) => d.streak >= 3 },
            { id: 'streak_7', name: '주간 상주자', desc: '일주일 연속 접속! 습관이 되셨네요', icon: '📅', condition: (d) => d.streak >= 7 },
            { id: 'streak_14', name: '2주 생존자', desc: '2주 연속! 현생은 괜찮으신가요?', icon: '🏕️', condition: (d) => d.streak >= 14 },
            { id: 'streak_30', name: '월간 정착민', desc: '30일 연속! 이곳이 집이신가요?', icon: '🏠', condition: (d) => d.streak >= 30 },
            { id: 'streak_100', name: '백일장', desc: '100일 연속! 진정한 헌신입니다', icon: '🎊', condition: (d) => d.streak >= 100 },
            { id: 'streak_365', name: '개근상 (무기징역)', desc: '365일! 이곳이 당신의 감옥이자 집입니다', icon: '⛓️', condition: (d) => d.streak >= 365 },
        ],
        
        // 💕 호감도 관련 업적 (새 티어 기준)
        affinity: [
            { id: 'first_friend', name: '첫 번째 친구', desc: '캐릭터와 친구가 되었습니다 (1,000+ 메시지)', icon: '🤝', condition: (d) => d.maxAffinityTier >= 2 },
            { id: 'bestfriend', name: '베스트프렌드', desc: '캐릭터와 베프가 되었습니다 (5,000+ 메시지)', icon: '💛', condition: (d) => d.maxAffinityTier >= 4 },
            { id: 'soulmate', name: '소울메이트', desc: '캐릭터와 소울메이트가 되었습니다 (10,000+ 메시지)', icon: '💜', condition: (d) => d.maxAffinityTier >= 5 },
            { id: 'obsessed', name: '몰입 그 자체', desc: '캐릭터에 완전히 빠졌습니다 (25,000+ 메시지)', icon: '💗', condition: (d) => d.maxAffinityTier >= 6 },
            { id: 'devoted', name: '헌신자', desc: '한 캐릭터에 인생을 바쳤습니다 (50,000+ 메시지)', icon: '💖', condition: (d) => d.maxAffinityTier >= 7 },
            { id: 'transcended', name: '초월자', desc: '인간의 한계를 넘어섰습니다 (200,000+ 메시지)', icon: '🌌', condition: (d) => d.maxAffinityTier >= 9 },
        ],
        
        // 🎯 특수 업적
        special: [
            { id: 'night_owl', name: '올빼미족', desc: '자정~새벽 4시 사이에 채팅했습니다', icon: '🦉', condition: (d) => d.lateNightChats > 0 },
            { id: 'early_bird', name: '얼리버드', desc: '새벽 5시~7시 사이에 채팅했습니다', icon: '🐦', condition: (d) => d.earlyMorningChats > 0 },
            { id: 'favorite_char', name: '단짝', desc: '캐릭터를 즐겨찾기에 추가했습니다', icon: '⭐', condition: (d) => d.hasFavorites },
            { id: 'multi_lover', name: '환승 이별', desc: '오늘 5명 이상의 캐릭터와 대화했습니다', icon: '💔', condition: (d) => d.todayCharCount >= 5 },
            { id: 'loyalist', name: '일편단심', desc: '7일간 한 캐릭터에만 집중했습니다', icon: '💍', condition: (d) => d.loyalDays >= 7 },
            { id: 'marathon', name: '마라톤 챗', desc: '하루에 500개 이상 메시지를 보냈습니다', icon: '🏃', condition: (d) => d.todayMessages >= 500 },
            { id: 'ultra_marathon', name: '울트라 마라톤', desc: '하루에 1,000개 이상 메시지를 보냈습니다', icon: '🏅', condition: (d) => d.todayMessages >= 1000 },
        ],
        
        // 📅 주간 퀘스트 (매주 리셋)
        weekly: [
            { id: 'weekly_avg_200', name: '주간 일일 평균 200', desc: '이번 주 하루 평균 200개 이상 메시지', icon: '📊', condition: (d) => d.weeklyAvg >= 200 },
            { id: 'weekly_avg_300', name: '주간 헤비 유저', desc: '이번 주 하루 평균 300개 이상 메시지', icon: '📈', condition: (d) => d.weeklyAvg >= 300 },
            { id: 'weekly_chars_10', name: '주간 탐험가', desc: '이번 주 10명 이상의 캐릭터와 대화', icon: '🗺️', condition: (d) => d.weeklyCharCount >= 10 },
            { id: 'weekly_streak_7', name: '주간 개근', desc: '이번 주 매일 접속', icon: '✅', condition: (d) => d.weeklyStreak >= 7 },
        ],
        
        // 🎲 히든 업적
        hidden: [
            { id: 'hundred_streak_broken', name: '탈옥 실패', desc: '100일 스트릭 후 하루를 놓쳤습니다', icon: '😭', condition: (d) => d.hadLongStreak && d.streak === 0, hidden: true },
            { id: 'comeback', name: '컴백 스페셜', desc: '30일 이상 쉬었다가 돌아왔습니다', icon: '🔙', condition: (d) => d.daysSinceLastVisit >= 30, hidden: true },
        ]
    };

    // ============================================
    // 데이터 관리
    // ============================================
    
    let gamificationData = null;
    let isInitialized = false;
    let chatLobbyDetected = false;
    let panelVisible = false;
    let observer = null;

    /**
     * 기본 데이터 구조
     */
    function getDefaultData() {
        return {
            firstVisit: Date.now(),
            lastVisit: Date.now(),
            unlockedAchievements: [],
            seenAchievements: [],
            maxStreak: 0,
            hadLongStreak: false,
            loyalDays: 0,
            lastLoyalChar: null,
            lateNightChats: 0,
            earlyMorningChats: 0,
            newAchievements: []
        };
    }

    /**
     * 데이터 로드
     */
    function loadData() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                gamificationData = { ...getDefaultData(), ...JSON.parse(saved) };
            } else {
                gamificationData = getDefaultData();
            }
        } catch (e) {
            console.error('[Gamification] Failed to load data:', e);
            gamificationData = getDefaultData();
        }
        return gamificationData;
    }

    /**
     * 데이터 저장
     */
    function saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(gamificationData));
        } catch (e) {
            console.error('[Gamification] Failed to save data:', e);
        }
    }

    // ============================================
    // ChatLobby 데이터 수집
    // ============================================

    /**
     * ChatLobby가 설치되어 있는지 감지
     */
    function isChatLobbyInstalled() {
        return CHATLOBBY_KEYS.some(key => localStorage.getItem(key) !== null);
    }

    /**
     * ChatLobby 캘린더 스냅샷 로드
     */
    function loadCalendarSnapshots() {
        try {
            const data = localStorage.getItem('chatLobby_calendar');
            if (data) {
                const parsed = JSON.parse(data);
                return parsed.snapshots || {};
            }
        } catch (e) {
            console.error('[Gamification] Failed to load calendar:', e);
        }
        return {};
    }

    /**
     * ChatLobby 마지막 채팅 시간 로드
     */
    function loadLastChatTimes() {
        try {
            const data = localStorage.getItem('chatLobby_lastChatTimes');
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('[Gamification] Failed to load lastChatTimes:', e);
        }
        return {};
    }

    /**
     * ChatLobby 기본 데이터 로드
     */
    function loadChatLobbyData() {
        try {
            const data = localStorage.getItem('chatLobby_data');
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('[Gamification] Failed to load chatLobby_data:', e);
        }
        return null;
    }

    /**
     * 스트릭 계산
     */
    function calculateStreak(snapshots) {
        let streak = 0;
        const checkDate = new Date();
        
        for (let i = 0; i < 365; i++) {
            const dateStr = getLocalDateString(checkDate);
            if (snapshots[dateStr] && snapshots[dateStr].total > 0) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }

    /**
     * 로컬 날짜 문자열 반환
     */
    function getLocalDateString(date = new Date()) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    /**
     * 가장 최근 스냅샷 찾기 (최대 7일 전까지) - ChatLobby 로직 동일
     * @param {Object} snapshots - 스냅샷 객체
     * @param {string|Date} beforeDate - 기준 날짜 (이 날짜 이전에서 찾음)
     * @param {number} maxDays - 최대 탐색 일수
     */
    function findRecentSnapshot(snapshots, beforeDate, maxDays = 7) {
        let checkDate;
        if (typeof beforeDate === 'string') {
            checkDate = new Date(beforeDate + 'T00:00:00');
        } else {
            checkDate = new Date(beforeDate);
        }
        
        for (let i = 0; i < maxDays; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            const dateStr = getLocalDateString(checkDate);
            if (snapshots[dateStr]) {
                return { date: dateStr, snapshot: snapshots[dateStr] };
            }
        }
        return null;
    }

    /**
     * 특정 날짜의 일별 증가량 계산 (ChatLobby 방식)
     */
    function getDailyIncrease(snapshots, dateStr) {
        const daySnapshot = snapshots[dateStr];
        if (!daySnapshot) return 0;
        
        // 해당 날짜 이전의 가장 최근 스냅샷 찾기
        const recentData = findRecentSnapshot(snapshots, dateStr);
        const prevTotal = recentData?.snapshot?.total || 0;
        const todayTotal = daySnapshot.total || 0;
        
        return Math.max(0, todayTotal - prevTotal);
    }

    /**
     * 모든 통계 수집
     */
    function collectAllStats() {
        const snapshots = loadCalendarSnapshots();
        const lastChatTimes = loadLastChatTimes();
        const lobbyData = loadChatLobbyData();
        
        // 최신 스냅샷 찾기 (오늘 또는 가장 최근)
        const today = getLocalDateString();
        let latestSnapshot = snapshots[today];
        let latestDate = today;
        
        if (!latestSnapshot) {
            // 오늘 스냅샷이 없으면 가장 최근 스냅샷 찾기
            const dates = Object.keys(snapshots).sort().reverse();
            if (dates.length > 0) {
                latestDate = dates[0];
                latestSnapshot = snapshots[latestDate];
            }
        }
        
        // 총 메시지 수 (최신 스냅샷의 누적 합계)
        const totalMessages = latestSnapshot?.total || 0;
        
        // 캐릭터별 메시지 수 (최신 스냅샷에서)
        const byChar = latestSnapshot?.byChar || {};
        
        // 대화한 캐릭터 수 (byChar에서 메시지가 있는 캐릭터)
        const charCount = Object.keys(byChar).filter(k => byChar[k] > 0).length;
        
        // 오늘 대화한 캐릭터 수 (lastChatTimes 기준)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartMs = todayStart.getTime();
        const todayChars = Object.entries(lastChatTimes).filter(([_, time]) => time >= todayStartMs);
        const todayCharCount = todayChars.length;
        
        // 스트릭
        const streak = calculateStreak(snapshots);
        
        // 최대 호감도 티어
        let maxAffinityTier = 0;
        Object.values(byChar).forEach(msgCount => {
            const tier = getAffinityTier(msgCount);
            const tierIndex = AFFINITY_TIERS.findIndex(t => t.tier === tier.tier);
            if (tierIndex > maxAffinityTier) {
                maxAffinityTier = tierIndex;
            }
        });
        
        // 즐겨찾기 여부
        const hasFavorites = (lobbyData?.characterFavorites?.length || 0) > 0;
        
        // 시간대 체크 (현재 시간 기준)
        const hour = new Date().getHours();
        const isLateNight = hour >= 0 && hour < 4;
        const isEarlyMorning = hour >= 5 && hour < 7;
        
        if (isLateNight && Object.keys(lastChatTimes).length > 0) {
            gamificationData.lateNightChats++;
        }
        if (isEarlyMorning && Object.keys(lastChatTimes).length > 0) {
            gamificationData.earlyMorningChats++;
        }
        
        // 최근 방문 이후 일수
        const lastVisit = gamificationData.lastVisit || Date.now();
        const daysSinceLastVisit = Math.floor((Date.now() - lastVisit) / (1000 * 60 * 60 * 24));
        
        // 스트릭 기록 업데이트
        if (streak > gamificationData.maxStreak) {
            gamificationData.maxStreak = streak;
        }
        if (gamificationData.maxStreak >= 100) {
            gamificationData.hadLongStreak = true;
        }
        
        // 일편단심 체크 (7일간 같은 캐릭터만)
        if (todayCharCount === 1 && todayChars.length > 0) {
            const todayChar = todayChars[0][0];
            if (gamificationData.lastLoyalChar === todayChar) {
                gamificationData.loyalDays++;
            } else {
                gamificationData.loyalDays = 1;
                gamificationData.lastLoyalChar = todayChar;
            }
        } else if (todayCharCount > 1) {
            gamificationData.loyalDays = 0;
            gamificationData.lastLoyalChar = null;
        }
        
        // 오늘 메시지 수 계산 (ChatLobby 방식: findRecentSnapshot 사용)
        const todayMessages = getDailyIncrease(snapshots, today);
        
        // 7일 전 스냅샷 찾기 (주간 캐릭터 증가량 계산용)
        const weekAgoDate = new Date();
        weekAgoDate.setDate(weekAgoDate.getDate() - 7);
        const weekAgoStr = getLocalDateString(weekAgoDate);
        const weekAgoSnapshot = snapshots[weekAgoStr] || findRecentSnapshot(snapshots, weekAgoStr, 7)?.snapshot;
        const weekAgoCharSet = weekAgoSnapshot?.byChar ? new Set(Object.keys(weekAgoSnapshot.byChar).filter(k => weekAgoSnapshot.byChar[k] > 0)) : new Set();
        
        // 주간 통계 계산 (하루 평균) + 7일 활동 데이터
        let weeklyTotal = 0;
        let weeklyDays = 0;
        const weeklyCharSet = new Set(); // 이번 주 대화한 캐릭터
        let weeklyStreak = 0;
        const checkDate = new Date();
        const dailyActivity = []; // 7일 활동 배열 (최신순)
        
        for (let i = 0; i < 7; i++) {
            const dateStr = getLocalDateString(checkDate);
            const daySnapshot = snapshots[dateStr];
            
            // ChatLobby 방식으로 일별 증가량 계산
            const dayMessages = getDailyIncrease(snapshots, dateStr);
            
            // 7일 활동 데이터 추가
            dailyActivity.push({
                date: dateStr,
                dayOfWeek: checkDate.getDay(), // 0=일, 1=월, ...
                messages: dayMessages,
                hasData: !!daySnapshot
            });
            
            if (daySnapshot && daySnapshot.total > 0) {
                weeklyTotal += dayMessages;
                weeklyDays++;
                
                // 해당 날 대화한 캐릭터
                if (daySnapshot.byChar) {
                    Object.keys(daySnapshot.byChar).forEach(char => weeklyCharSet.add(char));
                }
                
                // 연속 출석 체크
                if (i === weeklyStreak) weeklyStreak++;
            }
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        const weeklyAvg = weeklyDays > 0 ? Math.round(weeklyTotal / weeklyDays) : 0;
        const weeklyCharCount = weeklyCharSet.size;
        
        // 주간 신규 캐릭터 수 (7일 전 대비 증가)
        const weeklyNewChars = [...weeklyCharSet].filter(char => !weekAgoCharSet.has(char)).length;
        
        gamificationData.lastVisit = Date.now();
        saveData();
        
        return {
            totalMessages,
            charCount,
            todayCharCount,
            todayMessages,
            streak,
            maxAffinityTier,
            hasFavorites,
            lateNightChats: gamificationData.lateNightChats,
            earlyMorningChats: gamificationData.earlyMorningChats,
            loyalDays: gamificationData.loyalDays,
            daysSinceLastVisit,
            hadLongStreak: gamificationData.hadLongStreak,
            byChar,
            snapshots,
            // 주간 통계
            weeklyAvg,
            weeklyCharCount,
            weeklyStreak,
            weeklyTotal,
            weeklyNewChars, // 주간 신규 캐릭터 수
            dailyActivity // 7일 활동 데이터 (최신순)
        };
    }

    // ============================================
    // 호감도 시스템
    // ============================================

    /**
     * 메시지 수에 따른 호감도 티어 반환
     */
    function getAffinityTier(messageCount) {
        for (const tier of AFFINITY_TIERS) {
            if (messageCount >= tier.min && messageCount <= tier.max) {
                return tier;
            }
        }
        return AFFINITY_TIERS[0];
    }

    /**
     * 호감도 진행률 계산 (다음 티어까지)
     */
    function getAffinityProgress(messageCount) {
        const tier = getAffinityTier(messageCount);
        const tierIndex = AFFINITY_TIERS.findIndex(t => t.tier === tier.tier);
        
        if (tierIndex >= AFFINITY_TIERS.length - 1) {
            return 100; // 최고 티어
        }
        
        const nextTier = AFFINITY_TIERS[tierIndex + 1];
        const current = messageCount - tier.min;
        const required = nextTier.min - tier.min;
        
        return Math.min(100, Math.floor((current / required) * 100));
    }

    // ============================================
    // 업적 시스템
    // ============================================

    /**
     * 업적 체크 및 해금
     */
    function checkAchievements(stats) {
        const newlyUnlocked = [];
        
        Object.entries(ACHIEVEMENTS).forEach(([category, achievements]) => {
            achievements.forEach(achievement => {
                if (!gamificationData.unlockedAchievements.includes(achievement.id)) {
                    if (achievement.condition(stats)) {
                        gamificationData.unlockedAchievements.push(achievement.id);
                        newlyUnlocked.push(achievement);
                    }
                }
            });
        });
        
        if (newlyUnlocked.length > 0) {
            gamificationData.newAchievements = [
                ...gamificationData.newAchievements,
                ...newlyUnlocked.map(a => a.id)
            ];
            saveData();
            
            // 알림 표시
            newlyUnlocked.forEach(achievement => {
                showAchievementNotification(achievement);
            });
        }
        
        return newlyUnlocked;
    }

    /**
     * 업적 알림 표시
     */
    function showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'gamification-achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">🏆 업적 달성!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.desc}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 애니메이션
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    // ============================================
    // UI 생성
    // ============================================

    /**
     * ChatLobby header-actions에 토글 버튼 추가
     */
    function addGamificationToggle() {
        // 이미 추가된 경우 스킵
        if (document.getElementById('gamification-toggle')) return true;
        
        // ChatLobby의 header-actions 찾기 (stats 버튼의 부모로 찾기)
        const statsBtn = document.getElementById('chat-lobby-stats');
        const headerActions = statsBtn?.parentElement;
        
        if (!headerActions || !headerActions.classList.contains('header-actions')) {
            console.log('[Gamification] ChatLobby header-actions not found, will retry...');
            return false;
        }
        
        // 게이미피케이션 버튼 생성
        const gamificationBtn = document.createElement('button');
        gamificationBtn.id = 'gamification-toggle';
        gamificationBtn.setAttribute('data-action', 'open-gamification');
        gamificationBtn.title = '게이미피케이션';
        gamificationBtn.innerHTML = '🎮';
        gamificationBtn.addEventListener('click', toggleGamificationPanel);
        
        // 통계 버튼(📊) 뒤에 추가
        statsBtn.after(gamificationBtn);
        
        console.log('[Gamification] Toggle button added to ChatLobby header');
        return true;
    }

    /**
     * 게이미피케이션 패널 토글
     */
    function toggleGamificationPanel() {
        if (panelVisible) {
            closeGamificationPanel();
        } else {
            openGamificationPanel();
        }
    }

    /**
     * 게이미피케이션 패널 열기
     * SillyTavern 모바일은 body에 transform이 걸려있어 fixed가 동작하지 않음
     * ChatLobby 내부에 패널을 추가하여 해결
     */
    function openGamificationPanel() {
        if (panelVisible) return;
        
        const stats = collectAllStats();
        checkAchievements(stats);
        
        const panel = document.createElement('div');
        panel.id = 'gamification-panel';
        panel.className = 'gamification-panel';
        
        panel.innerHTML = createPanelHTML(stats);
        
        // ChatLobby 내부에 추가 (모바일 transform 문제 우회)
        // ChatLobby가 없으면 body에 추가
        const chatLobby = document.getElementById('chat-lobby');
        if (chatLobby) {
            chatLobby.appendChild(panel);
        } else {
            document.body.appendChild(panel);
        }
        
        panelVisible = true;
        
        // 애니메이션
        requestAnimationFrame(() => {
            panel.classList.add('show');
        });
        
        // 이벤트 바인딩
        panel.querySelector('.gamification-close')?.addEventListener('click', closeGamificationPanel);
        panel.querySelector('.gamification-overlay')?.addEventListener('click', closeGamificationPanel);
        
        // 탭 전환
        panel.querySelectorAll('.gamification-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab, stats));
        });
        
        // 새 업적 표시 초기화
        gamificationData.newAchievements = [];
        saveData();
    }

    /**
     * 게이미피케이션 패널 닫기
     */
    function closeGamificationPanel() {
        const panel = document.getElementById('gamification-panel');
        if (!panel) return;
        
        panel.classList.remove('show');
        setTimeout(() => {
            panel.remove();
            panelVisible = false;
        }, 300);
    }

    /**
     * 패널 HTML 생성
     */
    function createPanelHTML(stats) {
        const unlockedCount = gamificationData.unlockedAchievements.length;
        const totalAchievements = Object.values(ACHIEVEMENTS).flat().filter(a => !a.hidden).length;
        
        // 상위 캐릭터 호감도
        const topCharacters = Object.entries(stats.byChar)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([avatar, msgCount]) => {
                const tier = getAffinityTier(msgCount);
                const progress = getAffinityProgress(msgCount);
                const name = avatar.replace(/\.[^/.]+$/, '');
                return { avatar, name, msgCount, tier, progress };
            });
        
        return `
            <div class="gamification-overlay"></div>
            <div class="gamification-content">
                <div class="gamification-header">
                    <h2>🎮 인생 배팅</h2>
                    <button class="gamification-close">✕</button>
                </div>
                
                <div class="gamification-summary">
                    <div class="summary-card">
                        <span class="summary-icon">💬</span>
                        <span class="summary-value">${stats.totalMessages.toLocaleString()}</span>
                        <span class="summary-label">총 메시지</span>
                    </div>
                    <div class="summary-card">
                        <span class="summary-icon">👥</span>
                        <span class="summary-value">${stats.charCount}</span>
                        <span class="summary-label">캐릭터</span>
                    </div>
                    <div class="summary-card">
                        <span class="summary-icon">🔥</span>
                        <span class="summary-value">${stats.streak}</span>
                        <span class="summary-label">연속 출석</span>
                    </div>
                    <div class="summary-card">
                        <span class="summary-icon">🏆</span>
                        <span class="summary-value">${unlockedCount}/${totalAchievements}</span>
                        <span class="summary-label">업적</span>
                    </div>
                </div>
                
                <div class="gamification-tabs">
                    <button class="gamification-tab active" data-tab="affinity">💕 호감도</button>
                    <button class="gamification-tab" data-tab="achievements">🏆 업적</button>
                    <button class="gamification-tab" data-tab="stats">📊 통계</button>
                </div>
                
                <div class="gamification-tab-content" id="gamification-tab-content">
                    ${createAffinityTabHTML(topCharacters)}
                </div>
            </div>
        `;
    }

    /**
     * 호감도 탭 HTML
     */
    function createAffinityTabHTML(topCharacters) {
        if (topCharacters.length === 0) {
            return `
                <div class="gamification-empty">
                    <p>아직 대화한 캐릭터가 없습니다</p>
                    <p>ChatLobby에서 캐릭터와 대화를 시작해보세요!</p>
                </div>
            `;
        }
        
        return `
            <div class="affinity-list">
                ${topCharacters.map((char, index) => `
                    <div class="affinity-card" style="--tier-color: ${char.tier.color}; ${char.tier.gradient ? `--tier-gradient: ${char.tier.gradient}` : ''}">
                        <div class="affinity-rank">#${index + 1}</div>
                        <div class="affinity-avatar">
                            <img src="/characters/${encodeURIComponent(char.avatar)}" alt="${char.name}" onerror="this.src='/img/ai4.png'">
                            <span class="affinity-icon">${char.tier.icon}</span>
                        </div>
                        <div class="affinity-info">
                            <div class="affinity-name">${char.name}</div>
                            <div class="affinity-tier-name">${char.tier.name}</div>
                            <div class="affinity-progress-bar">
                                <div class="affinity-progress-fill" style="width: ${char.progress}%"></div>
                            </div>
                            <div class="affinity-stats">${char.msgCount.toLocaleString()}개 메시지</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="affinity-legend">
                <h4>호감도 등급</h4>
                <div class="legend-grid">
                    ${AFFINITY_TIERS.map(tier => `
                        <div class="legend-item">
                            <span class="legend-icon">${tier.icon}</span>
                            <span class="legend-name">${tier.name}</span>
                            <span class="legend-range">${tier.min.toLocaleString()}+</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * 업적 탭 HTML
     */
    function createAchievementsTabHTML(stats) {
        const categories = [
            { key: 'stats', name: '📊 통계', achievements: ACHIEVEMENTS.stats },
            { key: 'collection', name: '👥 수집', achievements: ACHIEVEMENTS.collection },
            { key: 'streak', name: '📅 출석', achievements: ACHIEVEMENTS.streak },
            { key: 'affinity', name: '💕 호감도', achievements: ACHIEVEMENTS.affinity },
            { key: 'special', name: '🎯 특수', achievements: ACHIEVEMENTS.special },
        ];
        
        // 주간 퀘스트 (stats 필요)
        const weeklyHTML = stats ? `
            <div class="achievement-category weekly-quests">
                <h4>📅 주간 퀘스트 <span class="weekly-reset">(매주 일요일 리셋)</span></h4>
                <div class="weekly-stats-summary">
                    <div class="weekly-stat">
                        <span class="weekly-label">이번 주 하루 평균</span>
                        <span class="weekly-value">${stats.weeklyAvg}개</span>
                    </div>
                    <div class="weekly-stat">
                        <span class="weekly-label">이번 주 신규 캐릭터</span>
                        <span class="weekly-value">+${stats.weeklyNewChars}명</span>
                    </div>
                    <div class="weekly-stat">
                        <span class="weekly-label">이번 주 연속 출석</span>
                        <span class="weekly-value">${stats.weeklyStreak}일</span>
                    </div>
                </div>
                <div class="achievement-grid">
                    ${ACHIEVEMENTS.weekly.map(a => {
                        const unlocked = a.condition(stats);
                        return `
                            <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'}">
                                <div class="achievement-icon">${unlocked ? a.icon : '⭕'}</div>
                                <div class="achievement-info">
                                    <div class="achievement-name">${a.name}</div>
                                    <div class="achievement-desc">${a.desc}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : '';
        
        return weeklyHTML + categories.map(cat => `
            <div class="achievement-category">
                <h4>${cat.name}</h4>
                <div class="achievement-grid">
                    ${cat.achievements.map(a => {
                        const unlocked = gamificationData.unlockedAchievements.includes(a.id);
                        const isNew = gamificationData.newAchievements?.includes(a.id);
                        return `
                            <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'} ${isNew ? 'new' : ''}">
                                <div class="achievement-icon">${unlocked ? a.icon : '❓'}</div>
                                <div class="achievement-info">
                                    <div class="achievement-name">${unlocked ? a.name : '???'}</div>
                                    <div class="achievement-desc">${unlocked ? a.desc : '업적을 달성하면 공개됩니다'}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `).join('');
    }

    /**
     * 통계 탭 HTML
     */
    function createStatsTabHTML(stats) {
        const daysSinceStart = Math.max(1, Math.floor((Date.now() - gamificationData.firstVisit) / (1000 * 60 * 60 * 24)));
        const avgMessagesPerDay = Math.round(stats.totalMessages / daysSinceStart);
        
        return `
            <div class="today-stats">
                <h4>📆 오늘의 활동</h4>
                <div class="today-stats-grid">
                    <div class="today-stat-card">
                        <span class="today-stat-icon">💬</span>
                        <span class="today-stat-value">${stats.todayMessages || 0}</span>
                        <span class="today-stat-label">오늘 메시지</span>
                    </div>
                    <div class="today-stat-card">
                        <span class="today-stat-icon">👥</span>
                        <span class="today-stat-value">${stats.todayCharCount}</span>
                        <span class="today-stat-label">오늘 대화 캐릭터</span>
                    </div>
                </div>
            </div>
            
            <div class="weekly-overview">
                <h4>📅 주간 통계</h4>
                <div class="weekly-overview-grid">
                    <div class="weekly-overview-card">
                        <span class="weekly-overview-value">${stats.weeklyAvg}</span>
                        <span class="weekly-overview-label">하루 평균 메시지</span>
                    </div>
                    <div class="weekly-overview-card">
                        <span class="weekly-overview-value">${stats.weeklyTotal}</span>
                        <span class="weekly-overview-label">주간 총 메시지</span>
                    </div>
                    <div class="weekly-overview-card">
                        <span class="weekly-overview-value">+${stats.weeklyNewChars}명</span>
                        <span class="weekly-overview-label">주간 신규 캐릭터</span>
                    </div>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">📅</div>
                    <div class="stat-value">${daysSinceStart}일</div>
                    <div class="stat-label">SillyTavern과 함께한 시간</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📝</div>
                    <div class="stat-value">${avgMessagesPerDay}</div>
                    <div class="stat-label">하루 평균 메시지</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🔥</div>
                    <div class="stat-value">${gamificationData.maxStreak}일</div>
                    <div class="stat-label">최장 연속 출석</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🌙</div>
                    <div class="stat-value">${gamificationData.lateNightChats}</div>
                    <div class="stat-label">심야 채팅 횟수</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🌅</div>
                    <div class="stat-value">${gamificationData.earlyMorningChats}</div>
                    <div class="stat-label">새벽 채팅 횟수</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💍</div>
                    <div class="stat-value">${gamificationData.loyalDays}일</div>
                    <div class="stat-label">일편단심 기록</div>
                </div>
            </div>
            
            <div class="stats-chart">
                <h4>📈 최근 7일 활동</h4>
                <div class="activity-chart">
                    ${createActivityChart(stats.dailyActivity)}
                </div>
            </div>
        `;
    }

    /**
     * 활동 차트 생성 (ChatLobby 방식 일별 증가량 사용)
     */
    function createActivityChart(dailyActivity) {
        if (!dailyActivity || dailyActivity.length === 0) {
            return '<div class="no-data">데이터 없음</div>';
        }
        
        // dailyActivity는 최신순이므로 역순으로 정렬 (오래된 순 -> 최신순)
        const days = [...dailyActivity].reverse();
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        
        const maxMessages = Math.max(...days.map(d => d.messages), 1);
        
        return days.map(d => {
            const dayName = dayNames[d.dayOfWeek];
            const isToday = d.dayOfWeek === new Date().getDay() && days.indexOf(d) === days.length - 1;
            
            return `
                <div class="chart-bar ${isToday ? 'today' : ''} ${!d.hasData ? 'no-data' : ''}">
                    <div class="bar-fill" style="height: ${d.hasData ? (d.messages / maxMessages) * 100 : 0}%"></div>
                    <div class="bar-label ${isToday ? 'today' : ''}">${dayName}</div>
                    <div class="bar-value">${d.hasData ? d.messages : '-'}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * 탭 전환
     */
    function switchTab(tabName, stats) {
        const tabs = document.querySelectorAll('.gamification-tab');
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        
        const content = document.getElementById('gamification-tab-content');
        if (!content) return;
        
        switch (tabName) {
            case 'affinity':
                const topCharacters = Object.entries(stats.byChar)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([avatar, msgCount]) => {
                        const tier = getAffinityTier(msgCount);
                        const progress = getAffinityProgress(msgCount);
                        const name = avatar.replace(/\.[^/.]+$/, '');
                        return { avatar, name, msgCount, tier, progress };
                    });
                content.innerHTML = createAffinityTabHTML(topCharacters);
                break;
            case 'achievements':
                content.innerHTML = createAchievementsTabHTML(stats);
                break;
            case 'stats':
                content.innerHTML = createStatsTabHTML(stats);
                break;
        }
    }

    // ============================================
    // 캐릭터 카드 꾸미기 (ChatLobby 연동)
    // ============================================

    /**
     * ChatLobby 캐릭터 카드에 호감도 뱃지 추가
     */
    function decorateCharacterCards() {
        const snapshots = loadCalendarSnapshots();
        const today = getLocalDateString();
        const byChar = snapshots[today]?.byChar || {};
        
        // ChatLobby 캐릭터 카드들
        const cards = document.querySelectorAll('.lobby-char-card');
        
        cards.forEach(card => {
            const avatar = card.dataset.charAvatar;
            if (!avatar || card.querySelector('.gamification-badge')) return;
            
            const msgCount = byChar[avatar] || 0;
            const tier = getAffinityTier(msgCount);
            
            if (tier.tier === 'stranger') return; // 기본 단계는 표시 안함
            
            // 뱃지 추가
            const badge = document.createElement('div');
            badge.className = `gamification-badge tier-${tier.tier}`;
            badge.innerHTML = tier.icon;
            badge.title = `${tier.name} (${msgCount.toLocaleString()} 메시지)`;
            
            card.appendChild(badge);
            
            // 테두리 효과
            if (tier.gradient) {
                card.style.setProperty('--tier-border', tier.gradient);
                card.classList.add('gamification-rainbow');
            } else if (tier.border !== 'none') {
                card.style.border = tier.border;
            }
        });
    }

    /**
     * MutationObserver로 캐릭터 카드 감지
     */
    function observeCharacterCards() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver((mutations) => {
            let shouldDecorate = false;
            
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && (
                            node.classList?.contains('lobby-char-card') ||
                            node.querySelector?.('.lobby-char-card')
                        )) {
                            shouldDecorate = true;
                        }
                    });
                }
            });
            
            if (shouldDecorate) {
                requestAnimationFrame(decorateCharacterCards);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ============================================
    // 초기화
    // ============================================

    /**
     * ChatLobby 감지 및 초기화
     */
    function detectAndInit() {
        if (isInitialized) return;
        
        if (!isChatLobbyInstalled()) {
            console.log('[Gamification] ChatLobby not detected, waiting...');
            setTimeout(detectAndInit, CHECK_INTERVAL);
            return;
        }
        
        chatLobbyDetected = true;
        console.log('[Gamification] ChatLobby detected! Initializing...');
        
        loadData();
        
        // 토글 버튼 추가 시도
        const tryAddToggle = () => {
            if (!addGamificationToggle()) {
                setTimeout(tryAddToggle, 1000);
            }
        };
        tryAddToggle();
        
        // 캐릭터 카드 감시
        observeCharacterCards();
        
        // 초기 통계 수집 및 업적 체크
        setTimeout(() => {
            const stats = collectAllStats();
            checkAchievements(stats);
            decorateCharacterCards();
        }, 2000);
        
        isInitialized = true;
        console.log(`[${EXTENSION_NAME}] Initialized successfully`);
    }

    /**
     * jQuery ready 대기
     */
    function waitForReady(callback) {
        if (typeof jQuery !== 'undefined') {
            jQuery(document).ready(callback);
        } else {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                setTimeout(callback, 1);
            } else {
                document.addEventListener('DOMContentLoaded', callback);
            }
        }
    }

    // 시작
    waitForReady(detectAndInit);

    // 전역 접근용 (디버그)
    window.chatLobbyGamification = {
        getData: () => gamificationData,
        getStats: collectAllStats,
        openPanel: openGamificationPanel,
        closePanel: closeGamificationPanel,
        checkAchievements: () => checkAchievements(collectAllStats())
    };

})();
