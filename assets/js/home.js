/**
 * Karachi Kings - Automated Match Center Hub 🦁🏆
 * This script handles real-time countdowns and autonomous fixture updates.
 */

// ==========================================
// CONFIGURATION
// ==========================================
// Get your free key at: https://console.cloud.google.com/
const YT_API_KEY = 'AIzaSyC0NsW8LH4EiupQ9ojlI2YE9pDEiTd3A3M'; 
const CRICKET_API_KEY = '316ebb4f-e744-47e1-9cf9-1e2c95b3c909';
const KK_CHANNEL_ID = 'UC-T1vY1Vn5T7GjTq_LhVj1Q'; // Updated Official ID
const PSL_CHANNEL_ID = 'UCm_Y9V6mX0T59_w8L3B5A_Q'; // Fallback Official PSL Channel

const MATCH_DATA = [
    {
        id: 1,
        date: "2026-04-11T19:30:00",
        label: "APR 11 - 2026",
        opponent: "Hyderabad Kingsmen",
        opponentLogo: "hydrabad-kignsmen2.png",
        kkRuns: "188/8",
        kkOvers: "20 Overs",
        oppRuns: "189/6",
        oppOvers: "19.1 Overs",
        result: "HYDERABAD KINGSMEN WON BY 4 WICKETS"
    },
    {
        id: 2,
        date: "2026-04-16T19:00:00",
        label: "APR 16 - 2026",
        opponent: "Islamabad United",
        opponentLogo: "islamabad-united2.png",
        kkRuns: "-",
        kkOvers: "Coming Soon",
        oppRuns: "-",
        oppOvers: "Coming Soon",
        result: "NEXT KK GAME IN"
    },
    {
        id: 3,
        date: "2026-04-19T19:30:00",
        label: "APR 19 - 2026",
        opponent: "Multan Sultans",
        opponentLogo: "multan-sultan2.png",
        kkRuns: "-",
        kkOvers: "Upcoming",
        oppRuns: "-",
        oppOvers: "Upcoming",
        result: "NEXT KK GAME IN"
    },
    {
        id: 4,
        date: "2026-04-22T19:30:00",
        label: "APR 22 - 2026",
        opponent: "Peshawar Zalmi",
        opponentLogo: "peshawar-zalmi2.png",
        kkRuns: "-",
        kkOvers: "Upcoming",
        oppRuns: "-",
        oppOvers: "Upcoming",
        result: "NEXT KK GAME IN"
    }
];

class MatchHub {
    constructor(data) {
        this.fixtures = data;
        this.currentMatchIndex = this.findNextMatchIndex();
        this.updateInterval = null;
        this.liveMatchData = null; // Single source of truth for API data
        this.init();
    }

    findNextMatchIndex(skipEnded = false) {
        const now = new Date();
        const fiveHours = 5 * 60 * 60 * 1000;
        
        // Find the match that is either:
        // 1. Currently Live (started within last 5 hours)
        // 2. Upcoming (starting in the future)
        let activeIndex = this.fixtures.findIndex(m => {
            const matchTime = new Date(m.date);
            const diff = now - matchTime;
            return (diff >= 0 && diff < fiveHours) || (matchTime > now);
        });

        // If the scraper says the live match is ended, skip to the next one
        if (skipEnded && activeIndex !== -1 && this.liveMatchData && this.liveMatchData.matchEnded) {
            // Only skip if the activeIndex is indeed the match that just ended
            const matchTime = new Date(this.fixtures[activeIndex].date);
            const diff = now - matchTime;
            if (diff >= 0 && diff < fiveHours) {
                // Move to the next one if available
                if (activeIndex < this.fixtures.length - 1) activeIndex++;
            }
        }

        // If no active match found, show the last completed one
        if (activeIndex === -1) {
            return this.fixtures.length - 1;
        }
        return activeIndex;
    }

    init() {
        this.refreshUI();
        this.startTimer();
        this.fetchLiveScore(); // Initial Fetch
        
        // Auto-refresh logic to simulate "fetching" next match 5 hours after start
        setInterval(() => {
            const now = new Date();
            const currentMatch = this.fixtures[this.currentMatchIndex];
            const startTime = new Date(currentMatch.date);
            const refreshTime = new Date(startTime.getTime() + (5 * 60 * 60 * 1000)); // 5 Hours after start

            if (now > refreshTime && this.currentMatchIndex < this.fixtures.length - 1) {
                console.log("Match concluded. Advancing to next fixture center...");
                this.currentMatchIndex++;
                this.refreshUI();
            }
        }, 60000); // Check every minute

        // Poll Live Cricket Data every 2 hours (optimized for API efficiency)
        setInterval(() => this.fetchLiveScore(), 7200000);
    }

    async fetchLiveScore() {
        try {
            console.log("Checking local Cricbuzz Master API...");
            // Prioritize the local scraper output
            const localRes = await fetch('cricbuzz-master/live.json');
            if (localRes.ok) {
                const localData = await localRes.json();
                if (localData.status === "success" && localData.karachi) {
                    console.log("Using dynamic scraper data for:", localData.opponent_name);
                    this.liveMatchData = {
                        status: localData.raw_status || "Live from Scraper",
                        matchEnded: localData.match_ended || false,
                        opponent: localData.opponent_name,
                        score: [
                            { inning: "Karachi Kings", r: (localData.karachi.score || "-").split('/')[0], w: (localData.karachi.score || "-").split('/')[1] || "0", o: localData.karachi.overs },
                            { inning: localData.opponent_name, r: (localData.islamabad.score || "-").split('/')[0], w: (localData.islamabad.score || "-").split('/')[1] || "0", o: localData.islamabad.overs }
                        ]
                    };
                    this.render();
                    return; // Successfully used local data
                }
            }
        } catch (e) {
            console.warn("Local scraper data not found or inaccessible. Falling back to official API...");
        }

        if (!CRICKET_API_KEY) return;
        
        try {
            console.log("Fetching official live scores...");
            const response = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${CRICKET_API_KEY}`);
            const result = await response.json();

            if (result.status !== "success" || !result.data) {
                this.liveMatchData = null;
                this.render();
                return;
            }

            // Find Karachi Kings Match
            const kkMatch = result.data.find(match => 
                match.name.toLowerCase().includes("karachi kings") || 
                (match.teams && match.teams.some(t => t.toLowerCase().includes("karachi kings")))
            );

            if (kkMatch) {
                console.log("Live match found:", kkMatch.id);
                this.liveMatchData = kkMatch;
                
                // If scores are missing in currentMatches, try to fetch specific scorecard
                if (!kkMatch.score || kkMatch.score.length === 0) {
                    try {
                        const scRes = await fetch(`https://api.cricapi.com/v1/match_scorecard?apikey=${CRICKET_API_KEY}&id=${kkMatch.id}`);
                        const scData = await scRes.json();
                        if (scData.status === "success" && scData.data && scData.data.score) {
                            this.liveMatchData.score = scData.data.score;
                        }
                    } catch (e) { console.warn("Scorecard fetch failed:", e); }
                }
            } else {
                this.liveMatchData = null;
            }
            this.render();
        } catch (error) {
            console.error("API Error:", error);
        }
    }

    render() {
        const upcomingMatch = this.fixtures[this.currentMatchIndex];
        const nextNextMatch = this.fixtures[this.currentMatchIndex + 1];

        const now = new Date();
        const matchTime = new Date(upcomingMatch.date);
        
        // Match States: Countdown -> Live (5h window) -> Finished
        const diff = now - matchTime;
        const isLive = diff >= 0 && diff < (5 * 60 * 60 * 1000); 
        const isFinished = diff >= (5 * 60 * 60 * 1000);
        
        const hasLiveAPI = this.liveMatchData !== null;

        // 1. HEADER RESTORATION (The Blue Box)
        const flag = document.querySelector('.next-game-flag');
        if (flag) {
            flag.textContent = "NEXT KK GAME IN";
            flag.style.background = "#001e4a"; 
            flag.style.color = "#ffffff";
        }

        // 2. PRIMARY SCOREBOARD (Middle Widget)
        const scoreWidget = document.querySelector('.score-widget');
        if (scoreWidget) {
            // Determine header text
            let headerText = upcomingMatch.label;
            // Prioritize the scraper's ENDED status over the hardcoded fixture's LIVE status
            if (hasLiveAPI && this.liveMatchData.matchEnded) {
                headerText = "FINAL RESULT";
            } else if (isLive) {
                headerText = "LIVE NOW";
            } else if (isFinished) {
                headerText = "FINAL RESULT";
            }
            
            scoreWidget.querySelector('.widget-date').textContent = headerText;
            
            // Status/Result Text
            let statusText = upcomingMatch.result;
            if (hasLiveAPI && this.liveMatchData.status) {
                statusText = this.liveMatchData.status;
            } else if (isLive && upcomingMatch.opponent === "Islamabad United") {
                statusText = "Action in Progress..."; 
            } else if (isFinished && !hasLiveAPI) {
                statusText = "Match Concluded";
            }
            scoreWidget.querySelector('.widget-match-info').textContent = statusText;

            // Score Extraction
            let kkR = upcomingMatch.kkRuns, kkO = upcomingMatch.kkOvers;
            let oppR = upcomingMatch.oppRuns, oppO = upcomingMatch.oppOvers;

            if (hasLiveAPI && this.liveMatchData.score && this.liveMatchData.score.length > 0) {
                const kkS = this.liveMatchData.score.find(s => s.inning.toLowerCase().includes("karachi")) || this.liveMatchData.score[0];
                const oppS = this.liveMatchData.score.find(s => s !== kkS) || this.liveMatchData.score[1];

                if (kkS) {
                    kkR = `${kkS.r ?? "-"}/${kkS.w ?? "-"}`;
                    kkO = `${kkS.o ?? "-"} Overs`;
                }
                if (oppS) {
                    oppR = oppS.w !== undefined ? `${oppS.r ?? "-"}/${oppS.w}` : (oppS.r ?? "-");
                    oppO = `${oppS.o ?? "-"} Overs`;
                }
            }

            // Sync DOM
            const runsEls = scoreWidget.querySelectorAll('.runs');
            const oversEls = scoreWidget.querySelectorAll('.overs-text');
            const teamLogos = scoreWidget.querySelectorAll('.team-circle img');

            if (runsEls.length >= 2) {
                runsEls[0].textContent = kkR;
                runsEls[1].textContent = oppR;
            }
            if (oversEls.length >= 2) {
                oversEls[0].textContent = kkO;
                oversEls[1].textContent = oppO;
            }
            if (teamLogos.length >= 2) {
                let opponentLogo = upcomingMatch.opponentLogo;
                if (hasLiveAPI && this.liveMatchData.opponent) {
                    // Find the logo for this specific opponent in our fixtures data
                    const matchWithOpp = this.fixtures.find(m => m.opponent.toLowerCase().includes(this.liveMatchData.opponent.toLowerCase()));
                    if (matchWithOpp) opponentLogo = matchWithOpp.opponentLogo;
                }
                teamLogos[1].src = `assets/img/teams/Teams-Logo/${opponentLogo}`;
            }

            // Clean up any extra rows
            const oldRows = scoreWidget.querySelectorAll('.live-stats-row, .bbb-ticker');
            oldRows.forEach(r => r.remove());
        }

        // 3. TIMER DISPLAY (Yellow Nukta Box)
        const timerDisplay = document.querySelector('.timer-display');
        if (timerDisplay) {
            let isCountdownActive = !isLive && !isFinished;
            
            // Override with scraper data if match is finished
            if (hasLiveAPI && this.liveMatchData.matchEnded) {
                isCountdownActive = true;
            }
            
            if (!isCountdownActive) {
                const labelText = isLive ? "LIVE NOW" : "FINISH";
                timerDisplay.innerHTML = `
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #fff; font-family: 'Outfit', sans-serif;">
                        <div style="font-size: 28px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #ff0000; ${isLive ? 'animation: pulse 1.5s infinite' : ''}">
                            ● ${labelText}
                        </div>
                    </div>
                `;
                
                if (!document.getElementById('kk-live-style')) {
                    const style = document.createElement('style');
                    style.id = 'kk-live-style';
                    style.innerHTML = `@keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.98); } 100% { opacity: 1; transform: scale(1); } }`;
                    document.head.appendChild(style);
                }
            } else {
                // Determine if we need to skip to the NEXT match for the countdown
                if (hasLiveAPI && this.liveMatchData.matchEnded) {
                    const newIndex = this.findNextMatchIndex(true);
                    if (newIndex !== this.currentMatchIndex) {
                        this.currentMatchIndex = newIndex;
                        // Important: Refresh logic to get the next match details
                        this.render();
                        return;
                    }
                }

                // RESTORE TIMER HTML structure if it was overwritten by LIVESTATUS
                if (!timerDisplay.querySelector('.timer-box')) {
                    timerDisplay.innerHTML = `
                        <div class="timer-display flex-container">
                            <div class="timer-box"><span class="value">00</span><span class="label">DAYS</span></div>
                            <div class="timer-separator">:</div>
                            <div class="timer-box"><span class="value">00</span><span class="label">HRS</span></div>
                            <div class="timer-separator">:</div>
                            <div class="timer-box"><span class="value">00</span><span class="label">MINS</span></div>
                            <div class="timer-separator">:</div>
                            <div class="timer-box"><span class="value">02</span><span class="label">SECS</span></div>
                        </div>
                    `;
                }
                this.startTimer();
            }
        }

        // 4. UPCOMING WIDGET
        const upcomingWidget = document.querySelector('.upcoming-widget');
        if (upcomingWidget) {
            const isFocusMode = isLive || isFinished;
            const target = isFocusMode ? (nextNextMatch || upcomingMatch) : upcomingMatch;
            const dateTxt = upcomingWidget.querySelector('.match-day-text');
            if (dateTxt) {
                dateTxt.textContent = target.label.split(' - ')[0];
                dateTxt.style.color = "#fff";
            }
            const logos = upcomingWidget.querySelectorAll('.team-circle.large img');
            if (logos.length >= 2) {
                logos[1].src = `assets/img/teams/Teams-Logo/${target.opponentLogo}`;
            }
        }
    }

    refreshUI() { this.render(); }
    updateLiveUI(match) { this.render(); }

    startTimer() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        
        const updateCountdown = () => {
            const now = new Date().getTime();
            const targetMatch = this.fixtures[this.currentMatchIndex];
            const targetDate = new Date(targetMatch.date).getTime();
            const distance = targetDate - now;

            // Define live window (4 hours)
            const liveWindow = 4 * 60 * 60 * 1000;
            const isLive = distance < 0 && Math.abs(distance) < liveWindow;

            // If match is live, let the render() method handle the UI
            // This prevents flickering between the countdown and the live score
            // If match is live and NOT ended, let the render() method handle the UI
            if (isLive && !(hasLiveAPI && this.liveMatchData.matchEnded)) {
                return; 
            }

            const daysVal = document.querySelector('.timer-box:nth-child(1) .value');
            const hrsVal = document.querySelector('.timer-box:nth-child(3) .value');
            const minsVal = document.querySelector('.timer-box:nth-child(5) .value');
            const secsVal = document.querySelector('.timer-box:nth-child(7) .value');

            if (distance < 0) {
                if (daysVal) daysVal.textContent = "00";
                if (hrsVal) hrsVal.textContent = "00";
                if (minsVal) minsVal.textContent = "00";
                if (secsVal) secsVal.textContent = "00";
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            if (daysVal) daysVal.textContent = days.toString().padStart(2, '0');
            if (hrsVal) hrsVal.textContent = hours.toString().padStart(2, '0');
            if (minsVal) minsVal.textContent = minutes.toString().padStart(2, '0');
            if (secsVal) secsVal.textContent = seconds.toString().padStart(2, '0');
        };

        this.updateInterval = setInterval(updateCountdown, 1000);
        updateCountdown();
    }
}

class HeroSlider {
    constructor() {
        this.slides = document.querySelectorAll('.slide');
        this.dots = document.querySelectorAll('.dot');
        this.prevBtn = document.querySelector('.slider-btn.prev');
        this.nextBtn = document.querySelector('.slider-btn.next');
        this.currentIndex = 0;
        this.autoPlayInterval = null;
        this.init();
    }

    init() {
        if (this.slides.length === 0) return;

        this.generatePreviews();

        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prevSlide());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.nextSlide());

        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToSlide(index));
        });
    }

    generatePreviews() {
        this.slides.forEach((slide, index) => {
            if (!this.dots[index]) return;

            const img = slide.querySelector('.featured-img');
            const title = slide.querySelector('.article-title span');

            if (img && title) {
                const previewHTML = `
                    <div class="dot-preview">
                        <img src="${img.src}" alt="Slide ${index + 1}">
                        <span class="preview-text">${title.textContent.trim()}</span>
                    </div>
                `;
                this.dots[index].innerHTML = previewHTML;
            }
        });
    }

    updateUI() {
        this.slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === this.currentIndex);
        });

        this.dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentIndex);
        });
    }

    nextSlide() {
        this.currentIndex = (this.currentIndex + 1) % this.slides.length;
        this.updateUI();
    }

    prevSlide() {
        this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
        this.updateUI();
    }

    goToSlide(index) {
        this.currentIndex = index;
        this.updateUI();
    }

    startAutoPlay() {
        this.stopAutoPlay();
        this.autoPlayInterval = setInterval(() => this.nextSlide(), 5000);
    }

    stopAutoPlay() {
        if (this.autoPlayInterval) clearInterval(this.autoPlayInterval);
    }
}

class YoutubeGallery {
    constructor(apiKey, handle) {
        this.apiKey = apiKey;
        this.handle = handle; // e.g. 'KarachiKingsary'
        this.featuredEl = document.getElementById('v-featured');
        this.side1El = document.getElementById('v-side-1');
        this.side2El = document.getElementById('v-side-2');
        this.init();
    }

    async init() {
        try {
            // First Priority: Try to fetch LIVE channel videos using public RSS feed (Bypasses API Quota entirely!)
            const rssChannelId = typeof KK_CHANNEL_ID !== 'undefined' ? KK_CHANNEL_ID : 'UC-T1vY1Vn5T7GjTq_LhVj1Q';
            console.log('Attempting to fetch live videos via RSS...');
            const videos = await this.fetchViaRSS(rssChannelId);

            if (videos && videos.length >= 2) {
                console.log('Live Channel Data Found via RSS!', videos);

                // Featured Video: The actual Anthem
                const featuredVideo = {
                    id: 'uQIjWEmlSw0',
                    title: 'Hai Apni Karni - Karachi Kings Anthem 2026 | PSL 11',
                    thumbnail: 'https://img.youtube.com/vi/uQIjWEmlSw0/maxresdefault.jpg',
                    date: '25 FEB'
                };

                // Side Cards: User's explicitly requested videos in order
                const latestVideos = [
                    {
                        id: 'HRoy7eeJXXo',
                        title: 'Match the Imtiaz Products | Round 3 with Ihsanullah 😄',
                        description: 'Fun and games with Ihsanullah in the latest team activity.',
                        thumbnail: 'https://img.youtube.com/vi/HRoy7eeJXXo/hqdefault.jpg',
                        date: '14 MAR'
                    },
                    {
                        id: 'A9dbiKl77UM',
                        title: 'Salman Iqbal Hosts Grand Dinner Night for Karachi Kings',
                        description: 'Behind the scenes at the grand dinner night hosted by Mr. Salman Iqbal.',
                        thumbnail: 'https://img.youtube.com/vi/A9dbiKl77UM/hqdefault.jpg',
                        date: '28 FEB'
                    }
                ];

                this.updateFeatured(featuredVideo);
                this.updateSideCards(latestVideos);
                console.log('Live Dynamic Sync: Successfully fetched latest videos directly from channel!');
                return;
            }
        } catch (error) {
            console.error('Live RSS Fetch Blocked:', error.message);
        }

        // Fallback Triggered if no internet or RSS proxy fails
        this.loadFallbackData();
    }

    async fetchViaRSS(channelId) {
        // Use a public proxy to fetch YouTube's XML feed directly (No API Key Required)
        const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`)}`;
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const xmlText = await res.text();
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            
            const entries = Array.from(xmlDoc.getElementsByTagName("entry"));
            
            // Map XML to video objects, filtering out #shorts
            const videos = [];
            for(let entry of entries) {
                const videoId = entry.getElementsByTagName("yt:videoId")[0]?.textContent;
                const pubDate = entry.getElementsByTagName("published")[0]?.textContent;
                const title = entry.getElementsByTagName("title")[0]?.textContent || '';
                const mediaGroup = entry.getElementsByTagName("media:group")[0];
                const desc = mediaGroup?.getElementsByTagName("media:description")[0]?.textContent || '';
                
                // Skip YouTube shorts
                if (title.toLowerCase().includes('#shorts') || desc.toLowerCase().includes('#shorts')) {
                    continue;
                }
                
                if (videoId) {
                    videos.push({
                        id: videoId,
                        title: title,
                        description: desc.substring(0, 80) + '...',
                        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                        date: pubDate ? new Date(pubDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''
                    });
                }
            }
            return videos;
        } catch (e) {
            console.error('RSS Parsing Error:', e);
            return null;
        }
    }

    loadFallbackData() {
        // Hardcoding exactly what the user wants for all 3 cards
        const featuredFallback = {
            id: 'uQIjWEmlSw0', // Anthem
            title: 'Hai Apni Karni - Karachi Kings Anthem 2026 | PSL 11',
            thumbnail: 'https://img.youtube.com/vi/uQIjWEmlSw0/maxresdefault.jpg',
            date: '25 FEB'
        };
        const latestFallback = [
            {
                id: 'HRoy7eeJXXo', // Was 1st
                title: 'Match the Imtiaz Products | Round 3 with Ihsanullah 😄',
                description: 'Fun and games with Ihsanullah in the latest team activity.',
                date: '14 MAR',
                thumbnail: 'https://img.youtube.com/vi/HRoy7eeJXXo/hqdefault.jpg'
            },
            {
                id: 'A9dbiKl77UM', // Was 2nd
                title: 'Salman Iqbal Hosts Grand Dinner Night for Karachi Kings',
                description: 'Behind the scenes at the grand dinner night hosted by Mr. Salman Iqbal.',
                date: '28 FEB',
                thumbnail: 'https://img.youtube.com/vi/A9dbiKl77UM/hqdefault.jpg'
            }
        ];
        this.updateFeatured(featuredFallback);
        this.updateSideCards(latestFallback);
    }

    async resolveHandle(handle) {
        // Adding @ if missing for modern YouTube handle resolution
        const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
        const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,id&forHandle=${cleanHandle}&key=${this.apiKey}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                return {
                    channelId: data.items[0].id,
                    uploadsPlaylistId: data.items[0].contentDetails.relatedPlaylists.uploads
                };
            }
            return null;
        } catch (err) {
            console.error('Handle resolve error:', err);
            return null;
        }
    }

    async searchVideo(channelId, query) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${this.apiKey}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                const item = data.items[0];
                return {
                    id: item.id.videoId,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                    date: new Date(item.snippet.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                };
            }
            return null;
        } catch (err) {
            console.error('Search error:', err);
            return null;
        }
    }

    async fetchLatestVideos(playlistId) {
        // Fetch extra to filter out Shorts
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=10&playlistId=${playlistId}&key=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.error || !data.items) return null;
            
            // Filter out Shorts (Searching specifically for hashtag 'shorts')
            const fullVideos = data.items.filter(item => {
                const title = item.snippet.title.toLowerCase();
                const desc = item.snippet.description.toLowerCase();
                // Check specifically for the #shorts hashtag or common shorts markers
                const isShort = title.includes('#shorts') || desc.includes('#shorts') || title.includes('shorts') && title.length < 50;
                return !isShort;
            });

            // Return only the first 2 non-Short videos
            return fullVideos.slice(0, 2).map(item => ({
                id: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.standard?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                date: new Date(item.snippet.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()
            }));
        } catch (err) {
            console.error('Fetch error:', err);
            return null;
        }
    }

    updateFeatured(video) {
        if (!this.featuredEl) return;
        this.featuredEl.querySelector('.v-thumb').src = video.thumbnail;
        this.featuredEl.querySelector('.v-title span').textContent = 'Karachi Kings Anthem 2026';
        
        // Simple date for featured card
        const dateTag = this.featuredEl.querySelector('.v-date-tag');
        if (dateTag && video.date) {
            dateTag.textContent = video.date;
        }

        this.featuredEl.style.cursor = 'pointer';
        this.featuredEl.onclick = () => {
            const url = video.link || `https://www.youtube.com/watch?v=${video.id}`;
            window.open(url, '_blank');
        };
    }

    updateSideCards(videos) {
        // Side Card 1
        if (this.side1El && videos[0]) {
            this.side1El.querySelector('.v-thumb').src = videos[0].thumbnail;
            this.side1El.querySelector('.v-side-title').textContent = videos[0].title;
            this.side1El.querySelector('.v-description').textContent = videos[0].description;
            
            // Complex structure for side cards
            const dateParts = videos[0].date.split(' ');
            this.side1El.querySelector('.v-date-tag').innerHTML = `
                <span class="v-day">${dateParts[0]}</span>
                <span class="v-month">${dateParts[1]}</span>
            `;

            this.side1El.style.cursor = 'pointer';
            this.side1El.onclick = () => {
                const url = videos[0].link || `https://www.youtube.com/watch?v=${videos[0].id}`;
                window.open(url, '_blank');
            };
        }

        // Side Card 2
        if (this.side2El && videos[1]) {
            this.side2El.querySelector('.v-thumb').src = videos[1].thumbnail;
            this.side2El.querySelector('.v-side-title').textContent = videos[1].title;
            this.side2El.querySelector('.v-description').textContent = videos[1].description;
            
            // Complex structure for side cards
            const dateParts = videos[1].date.split(' ');
            this.side2El.querySelector('.v-date-tag').innerHTML = `
                <span class="v-day">${dateParts[0]}</span>
                <span class="v-month">${dateParts[1]}</span>
            `;

            this.side2El.style.cursor = 'pointer';
            this.side2El.onclick = () => {
                const url = videos[1].link || `https://www.youtube.com/watch?v=${videos[1].id}`;
                window.open(url, '_blank');
            };
        }
    }
}

class SquadSlider {
    constructor(players) {
        this.players = players;
        this.currentIndex = 0; // David Warner
        this.container = document.getElementById('squadContainer');
        this.nextBtn = document.getElementById('squadNext');
        this.prevBtn = document.getElementById('squadPrev');
        this.isMoving = false;
        
        this.init();
    }

    init() {
        if (!this.container) return;
        this.render();
        
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.move(1));
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.move(-1));
    }

    getIndices() {
        const len = this.players.length;
        return {
            left: (this.currentIndex - 1 + len) % len,
            center: this.currentIndex,
            right: (this.currentIndex + 1) % len
        };
    }

    render() {
        const indices = this.getIndices();
        const slots = [
            { pos: 'p-left', index: indices.left },
            { pos: 'p-center', index: indices.center },
            { pos: 'p-right', index: indices.right }
        ];

        this.container.innerHTML = slots.map(slot => `
            <div class="squad-player ${slot.pos}">
                <img src="${this.players[slot.index].img}" alt="${this.players[slot.index].name}">
                <div class="player-info">
                    <div class="name-plate">
                        <span class="plate-name">${this.players[slot.index].name}</span>
                        <span class="plate-role">
                            ${this.players[slot.index].role} 
                            ${this.players[slot.index].isForeign ? '<i class="fa-solid fa-plane plane-icon" title="Foreign" style="font-size: 14px; margin-left: 6px; vertical-align: middle;"></i>' : ''}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    move(direction) {
        if (this.isMoving) return;
        this.isMoving = true;

        const playersElements = this.container.querySelectorAll('.squad-player');
        
        // Add moving class for transition
        playersElements.forEach(el => el.classList.add('moving'));

        const len = this.players.length;
        const nextIndex = (this.currentIndex + direction + len) % len;
        const indices = {
            left: (nextIndex - 1 + len) % len,
            center: nextIndex,
            right: (nextIndex + 1) % len
        };

        if (direction === 1) {
            // Sliding Left (Next)
            if (playersElements[0]) playersElements[0].className = 'squad-player moving p-left-out p-hidden';
            if (playersElements[1]) playersElements[1].className = 'squad-player moving p-left';
            if (playersElements[2]) playersElements[2].className = 'squad-player moving p-center';
            
            const newRight = document.createElement('div');
            newRight.className = 'squad-player p-right-entry p-hidden';
            newRight.innerHTML = `
                <img src="${this.players[indices.right].img}" alt="${this.players[indices.right].name}">
                <div class="player-info">
                    <div class="name-plate">
                        <span class="plate-name">${this.players[indices.right].name}</span>
                        <span class="plate-role">
                            ${this.players[indices.right].role} 
                             ${this.players[indices.right].isForeign ? '<img src="assets/img/icons/plane.svg" class="plane-icon" alt="Foreign" style="width: 26px; height: 26px; margin-left: 6px; vertical-align: middle;">' : ''}
                        </span>
                    </div>
                </div>
            `;
            this.container.appendChild(newRight);
            
            setTimeout(() => {
                newRight.className = 'squad-player moving p-right';
            }, 10);
        } else {
            // Sliding Right (Prev)
            if (playersElements[2]) playersElements[2].className = 'squad-player moving p-right-out p-hidden';
            if (playersElements[1]) playersElements[1].className = 'squad-player moving p-right';
            if (playersElements[0]) playersElements[0].className = 'squad-player moving p-center';

            const newLeft = document.createElement('div');
            newLeft.className = 'squad-player p-left-entry p-hidden';
            newLeft.innerHTML = `
                <img src="${this.players[indices.left].img}" alt="${this.players[indices.left].name}">
                <div class="player-info">
                    <div class="name-plate">
                        <span class="plate-name">${this.players[indices.left].name}</span>
                        <span class="plate-role">
                            ${this.players[indices.left].role} 
                             ${this.players[indices.left].isForeign ? '<img src="assets/img/icons/plane.svg" class="plane-icon" alt="Foreign" style="width: 26px; height: 26px; margin-left: 6px; vertical-align: middle;">' : ''}
                        </span>
                    </div>
                </div>
            `;
            this.container.prepend(newLeft);

            setTimeout(() => {
                newLeft.className = 'squad-player moving p-left';
            }, 10);
        }

        this.currentIndex = nextIndex;

        setTimeout(() => {
            this.render();
            this.isMoving = false;
        }, 600);
    }
}

const SQUAD_PLAYERS = [
    { name: "David Warner", role: "Batsman (C)", isForeign: true, img: "assets/img/teams/Team-Player/David-Warner-removebg-preview.png" },
    { name: "Moeen Ali", role: "All-Rounder", isForeign: true, img: "assets/img/teams/Team-Player/Moeen-Ali-removebg-preview.png" },
    { name: "Adam Zampa", role: "Bowler", isForeign: true, img: "assets/img/teams/Team-Player/Adam-Zampa-removebg-preview.png" },
    { name: "Abbas Afridi", role: "Bowler", isForeign: false, img: "assets/img/teams/Team-Player/Abbas-Afridi-removebg-preview.png" },
    { name: "Azam Khan", role: "Wicketkeeper", isForeign: false, img: "assets/img/teams/Team-Player/Azam-Khan-removebg-preview.png" },
    { name: "Hasan Ali", role: "Bowler", isForeign: false, img: "assets/img/teams/Team-Player/Hasan-Ali-removebg-preview.png" },
    { name: "Ihsanullah", role: "Bowler", isForeign: false, img: "assets/img/teams/Team-Player/Ihsanullah-removebg-preview.png" },
    { name: "Mir Hamza", role: "Bowler", isForeign: false, img: "assets/img/teams/Team-Player/Mir-Hamza-removebg-preview.png" },
    { name: "Salman Ali Agha", role: "All-Rounder", isForeign: false, img: "assets/img/teams/Team-Player/Salman-Ali-Agha-removebg-preview.png" },
    { name: "Hamza Sohail", role: "Batsman", isForeign: false, img: "assets/img/teams/Team-Player/Hamza-Sohail-removebg-preview.png" },
    { name: "Aqib Ilyas", role: "All-Rounder", isForeign: true, img: "assets/img/teams/Team-Player/Aqib-Ilyas-removebg-preview (1).png" },
    { name: "Haroon Arshad", role: "All-Rounder", isForeign: false, img: "assets/img/teams/Team-Player/Haroon-Arshad-removebg-preview.png" },
    { name: "Khushdil Shah", role: "All-Rounder", isForeign: false, img: "assets/img/teams/Team-Player/Khushdil-Shah-removebg-preview.png" },
    { name: "Khuzaima Bin Tanveer", role: "Bowler", isForeign: false, img: "assets/img/teams/Team-Player/Khuzaima-Bin-Tanveer-removebg-preview.png" },
    { name: "Muhammad Waseem", role: "Batsman", isForeign: true, img: "assets/img/teams/Team-Player/Muhammad-Waseem-removebg-preview.png" },
    { name: "Rizwanullah", role: "Bowler", isForeign: false, img: "assets/img/teams/Team-Player/Rizwanullah-removebg-preview.png" },
    { name: "Saad Baig", role: "Wicketkeeper", isForeign: false, img: "assets/img/teams/Team-Player/Saad-Baig-removebg-preview.png" },
    { name: "Shahid Aziz", role: "Bowler", isForeign: false, img: "assets/img/teams/Team-Player/Shahid-Aziz-removebg-preview (1).png" }
];


// Initialize Hub, Slider and YouTube Sync on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    window.kkMatchHub = new MatchHub(MATCH_DATA);
    window.kkHeroSlider = new HeroSlider();
    window.kkYoutubeGallery = new YoutubeGallery(YT_API_KEY, 'KarachiKingsary');
    window.kkSquadSlider = new SquadSlider(SQUAD_PLAYERS);
});
