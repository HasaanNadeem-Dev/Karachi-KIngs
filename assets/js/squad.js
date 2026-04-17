document.addEventListener('DOMContentLoaded', () => {
    const squadRoot = document.getElementById('squad-root');
    if (!squadRoot) return;

    // Load the squad data
    fetch('assets/data/squad.json')
        .then(response => response.json())
        .then(players => {
            renderSquad(players);
        })
        .catch(err => console.error('Error loading squad data:', err));

    function renderSquad(players) {
        // Group players by category
        const categories = {
            'BATTERS': [],
            'ALL-ROUNDERS': [],
            'WICKET KEEPERS': [],
            'BOWLERS': []
        };

        players.forEach(player => {
            const role = player.role.toUpperCase();
            let cat = 'BATTERS';
            if (role.includes('WICKET')) cat = 'WICKET KEEPERS';
            else if (role.includes('ALL')) cat = 'ALL-ROUNDERS';
            else if (role.includes('BOWL')) cat = 'BOWLERS';

            categories[cat].push(player);
        });

        // Generate HTML
        let finalHtml = '';
        for (const [catName, list] of Object.entries(categories)) {
            if (list.length === 0) continue;

            finalHtml += `
                <div class="squad-category">
                    <div class="category-header-line">
                        <span class="category-badge">${catName}</span>
                    </div>
                    <div class="players-grid">
                        ${list.map(p => createPlayerCard(p)).join('')}
                    </div>
                </div>
            `;
        }

        // Add Support Staff placeholder
        finalHtml += `
            <div class="squad-category" style="margin-top: 100px;">
                <div class="category-header-line">
                    <span class="category-badge">SUPPORT STAFF</span>
                </div>
                <div class="staff-note-minimal">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <span>OFFICIAL SUPPORT STAFF LIST WILL BE UPDATED SOON</span>
                </div>
            </div>
        `;

        squadRoot.innerHTML = finalHtml;
    }

    function createPlayerCard(p) {
        const nameParts = p.name.split(' ');
        let fname, lname;
        
        if (nameParts.length === 1) {
            fname = ".";
            lname = nameParts[0].toUpperCase();
        } else {
            fname = nameParts[0].toUpperCase();
            lname = nameParts.slice(1).join(' ').toUpperCase();
        }

        const isBowler = p.role.includes('BOWLER') && !p.role.includes('ALL');
        const hoverGrid = isBowler ? createBowlerGrid(p.stats) : createBatterGrid(p.stats);

        return `
            <div class="player-card">
                <div class="card-bg-layer"></div>
                <div class="hover-detail-panel">
                    <img src="${p.img}" class="hd-player-photo">
                    <div class="hd-header">
                        <span class="hd-label">POSITION :</span>
                        <span class="hd-value">${p.role}</span>
                    </div>
                    ${hoverGrid}
                </div>
                <img src="${p.img}" alt="${p.name}" class="player-photo">
                <div class="player-info-container">
                    <div class="player-name-plate">
                        <div class="p-fname">${fname}</div>
                        <div class="p-lname">${lname}</div>
                    </div>
                    <div class="player-bottom-section">
                        <div class="player-role-badge">
                            <i class="fa-solid fa-bat-ball"></i> ${p.role}
                        </div>
                        <div class="player-card-footer">
                            <div class="player-stats-grid">
                                <div class="stat-box">
                                    <span class="s-val">${p.stats.m || '--'}</span>
                                    <span class="s-lbl">MATCHES</span>
                                </div>
                                <div class="s-divider"></div>
                                <div class="stat-box">
                                    <span class="s-val">${p.stats.r || '--'}</span>
                                    <span class="s-lbl">RUNS</span>
                                </div>
                                <div class="s-divider"></div>
                                <div class="stat-box">
                                    <span class="s-val">${p.stats.w || '--'}</span>
                                    <span class="s-lbl">WICKETS</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function createBatterGrid(s) {
        return `
            <div class="hd-grid">
                <div class="hd-stat">
                    <div class="hd-s-lbl">MATCHES</div>
                    <div class="hd-s-val">${s.m}</div>
                </div>
                <div class="hd-stat">
                    <div class="hd-s-lbl">RUNS</div>
                    <div class="hd-s-val">${s.r}</div>
                </div>
                <div class="hd-stat">
                    <div class="hd-s-lbl">STRIKE RATE</div>
                    <div class="hd-s-val">${s.sr}</div>
                </div>
                <div class="hd-stat">
                    <div class="hd-s-lbl">BEST SCORE</div>
                    <div class="hd-s-val">${s.best}</div>
                </div>
                <div class="hd-stat" style="grid-column: 1 / span 2;">
                    <div class="hd-s-lbl">CENTURIES AND FIFTIES</div>
                    <div class="hd-s-val">${s['100s'] || '--'}</div>
                </div>
            </div>`;
    }

    function createBowlerGrid(s) {
        return `
            <div class="hd-grid">
                <div class="hd-stat">
                    <div class="hd-s-lbl">MATCHES</div>
                    <div class="hd-s-val">${s.m}</div>
                </div>
                <div class="hd-stat">
                    <div class="hd-s-lbl">WICKETS</div>
                    <div class="hd-s-val">${s.w}</div>
                </div>
                <div class="hd-stat">
                    <div class="hd-s-lbl">ECONOMY</div>
                    <div class="hd-s-val">${s.econ}</div>
                </div>
                <div class="hd-stat">
                    <div class="hd-s-lbl">BEST FIGURES</div>
                    <div class="hd-s-val">${s.fig}</div>
                </div>
            </div>`;
    }
});
